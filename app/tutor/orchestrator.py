from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.tutor import repository
from app.tutor.llm_service import TutorLLMService
from app.tutor.retrieval import TutorRetrievalService
from app.tutor.schemas import serialize_message, serialize_session, serialize_step, sse_event


class TutorOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.llm_service = TutorLLMService(self.settings)
        self.retrieval_service = TutorRetrievalService()

    async def stream_session_reply(
        self,
        session: Session,
        *,
        reader_id: int | None,
        session_id: int,
        user_content: str,
    ) -> AsyncIterator[dict]:
        if not (user_content or "").strip():
            raise ApiError(400, "missing_content", "Content is required")
        if reader_id is None:
            raise ApiError(403, "reader_profile_missing", "Reader profile is required")

        tutor_session = repository.require_owned_session(session, session_id=session_id, reader_id=reader_id)
        profile = repository.require_owned_profile(session, profile_id=tutor_session.profile_id, reader_id=reader_id)
        steps = list((profile.curriculum_json or {}).get("steps") or [])
        if not steps:
            raise ApiError(409, "tutor_profile_missing_curriculum", "Tutor profile does not contain a curriculum")

        current_index = min(tutor_session.current_step_index, max(len(steps) - 1, 0))
        current_step = serialize_step(steps[current_index], default_index=current_index)

        user_message = repository.create_message(
            session,
            session_id=tutor_session.id,
            role="user",
            content=user_content.strip(),
            metadata_json={"stepIndex": current_index},
        )
        tutor_session.last_message_preview = user_message.content[:120]
        session.commit()

        yield sse_event("status", {"phase": "retrieving", "sessionId": tutor_session.id})

        retrieved = self.retrieval_service.hybrid_search(
            session,
            profile_id=profile.id,
            query=user_message.content,
            top_k=self.settings.tutor_retrieval_top_k,
        )
        history = [
            {"role": message.role, "content": message.content}
            for message in repository.list_messages(session, session_id=tutor_session.id)
        ]
        assistant_text = self.llm_service.compose_reply(
            profile_title=profile.title,
            current_step=current_step,
            retrieved_evidence=[item.citation for item in retrieved],
            recent_messages=history,
            user_content=user_message.content,
        )

        for chunk in self.llm_service.stream_chunks(assistant_text):
            yield sse_event("assistant.delta", {"delta": chunk})

        evaluation = self.llm_service.evaluate_step(
            current_step=current_step,
            conversation_context=history,
            user_content=user_message.content,
        )
        citations = [item.citation for item in retrieved]
        assistant_message = repository.create_message(
            session,
            session_id=tutor_session.id,
            role="assistant",
            content=assistant_text,
            citations_json=citations,
            metadata_json={"evaluation": evaluation, "stepIndex": current_index},
        )
        tutor_session.last_message_preview = assistant_text[:120]

        if evaluation["meetsCriteria"]:
            repository.create_step_completion(
                session,
                session_id=tutor_session.id,
                step_index=current_index,
                confidence=float(evaluation["confidence"]),
                reasoning=str(evaluation["reasoning"]),
                message_id=assistant_message.id,
            )
            next_index = current_index + 1
            tutor_session.completed_steps_count = max(tutor_session.completed_steps_count, current_index + 1)
            if next_index >= len(steps):
                tutor_session.status = "completed"
                tutor_session.current_step_index = current_index
                tutor_session.current_step_title = current_step["title"]
            else:
                next_step = serialize_step(steps[next_index], default_index=next_index)
                tutor_session.current_step_index = next_index
                tutor_session.current_step_title = next_step["title"]
        session.commit()

        yield sse_event("evaluation", evaluation)
        yield sse_event("session.updated", serialize_session(tutor_session))
        yield sse_event(
            "assistant.done",
            {
                "message": serialize_message(assistant_message),
                "citations": citations,
            },
        )
