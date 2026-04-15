from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.learning import repository
from app.learning.retrieval import LearningRetrievalService
from app.learning.schemas import (
    serialize_checkpoint,
    serialize_path_step,
    serialize_remediation_plan,
    serialize_report,
    serialize_session,
    serialize_turn,
    sse_event,
)


def _tokenize(value: str) -> list[str]:
    normalized = (
        (value or "")
        .replace("，", " ")
        .replace("。", " ")
        .replace("、", " ")
        .replace("：", " ")
        .replace("；", " ")
        .replace("?", " ")
        .replace("？", " ")
    )
    return [token.lower() for token in normalized.split() if token]


def _dedupe_strings(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for item in items:
        normalized = (item or "").strip()
        if not normalized:
            continue
        key = normalized.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(normalized)
    return result


def _build_teacher_reply(*, step: dict[str, Any], evidence: list[dict[str, Any]], user_content: str) -> str:
    evidence_snippet = evidence[0]["snippet"] if evidence else "资料强调先从整体框架入手，再逐步拆解关键概念。"
    guiding_question = step.get("guidingQuestion") or "你能继续补充一个关键概念吗？"
    return (
        f"导师：当前我们聚焦“{step.get('title')}”。"
        f"结合资料证据，{evidence_snippet}"
        f"你刚才的理解已经触及主题，接下来请继续回答：{guiding_question}"
    )


def _build_peer_reply(*, step: dict[str, Any], passed: bool) -> str:
    if passed:
        return f"学伴：你的概括已经抓到重点了，我更想知道“{step.get('title')}”和后续应用场景怎么连起来。"
    return f"学伴：我还是有点模糊，尤其是不太明白“{step.get('title')}”里哪些概念最关键。"


def _evaluate_answer(*, step: dict[str, Any], user_content: str) -> dict[str, Any]:
    normalized_user = user_content.strip().lower()
    keyword_hits = [
        keyword for keyword in step.get("keywords", []) if keyword and str(keyword).strip().lower() in normalized_user
    ]
    objective_phrases = [
        phrase
        for phrase in _tokenize(step.get("objective") or "")
        if phrase and phrase in normalized_user
    ]
    coverage_base = len(keyword_hits) + len(objective_phrases)
    length_score = min(len(user_content.strip()) / 80.0, 0.34)
    concept_signal = coverage_base >= 1 or any(marker in normalized_user for marker in ["主要", "决定", "关键", "概念"])
    mastery_score = min(0.96, 0.28 + coverage_base * 0.18 + length_score)
    passed = len(user_content.strip()) >= 24 and concept_signal and mastery_score >= 0.58
    missing_concepts = [
        token for token in step.get("keywords", []) if str(token).strip().lower() not in normalized_user
    ][:3]
    reasoning = "回答已经覆盖了当前步骤的大部分关键点。" if passed else "回答过于笼统，还缺少关键概念与场景联系。"
    return {
        "masteryScore": round(mastery_score, 2),
        "passed": passed,
        "missingConcepts": missing_concepts,
        "reasoning": reasoning,
    }


def _merge_assistant_reply(*, teacher_text: str, peer_text: str, evaluation: dict[str, Any], step: dict[str, Any]) -> str:
    if evaluation["passed"]:
        return (
            f"{teacher_text}\n\n"
            f"{peer_text}\n\n"
            f"考官：这一轮你已经达成了“{step.get('title')}”的要求，我们可以推进到下一步。"
        )
    return (
        f"{teacher_text}\n\n"
        f"{peer_text}\n\n"
        f"考官：这一轮还没有完全达成目标，先补强 {', '.join(evaluation['missingConcepts'] or ['关键概念'])} 再继续。"
    )


def _context_item_to_citation(item: Any) -> dict[str, Any]:
    snippet = (item.content or item.summary or "")[:180].replace("\n", " ").strip()
    return {
        "fragmentId": None,
        "assetId": None,
        "chunkIndex": None,
        "chapterLabel": item.title,
        "snippet": snippet,
        "citationAnchor": {
            "contextItemId": item.id,
            "sourceSessionId": item.source_session_id,
            "sourceTurnId": item.source_turn_id,
        },
    }


def _combine_citations(*, priority: list[dict[str, Any]], fallback: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    seen: set[tuple[Any, Any, Any, str]] = set()
    items: list[dict[str, Any]] = []
    for candidate in [*priority, *fallback]:
        key = (
            candidate.get("fragmentId"),
            candidate.get("assetId"),
            candidate.get("chunkIndex"),
            candidate.get("snippet", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        items.append(candidate)
        if len(items) >= limit:
            break
    return items


def _collect_related_concepts(
    *,
    profile: Any,
    current_step: dict[str, Any] | None,
    learning_session: Any,
    user_content: str,
    citations: list[dict[str, Any]],
) -> list[str]:
    profile_concepts = list((profile.metadata_json or {}).get("concepts") or [])
    step_keywords = list((current_step or {}).get("keywords") or [])
    focus_keywords = list((getattr(learning_session, "focus_context_json", None) or {}).get("keywords") or [])
    snippet_tokens: list[str] = []
    for citation in citations[:2]:
        snippet_tokens.extend(_tokenize(citation.get("snippet") or ""))
    query_tokens = _tokenize(user_content)
    candidates = _dedupe_strings(profile_concepts + step_keywords + focus_keywords + snippet_tokens)
    ranked = [concept for concept in candidates if any(token in concept.lower() for token in query_tokens)] or candidates
    return ranked[:6]


def _build_explore_answer(
    *,
    focus_context: dict[str, Any],
    citations: list[dict[str, Any]],
    user_content: str,
    related_concepts: list[str],
) -> str:
    snippets = [citation.get("snippet", "") for citation in citations[:2] if citation.get("snippet")]
    prefix = "自由探索：" if focus_context else "自由问答："
    focus_line = ""
    if focus_context:
        focus_line = f"当前我会把回答尽量贴近“{focus_context.get('stepTitle', '当前主题')}”这个步骤。"
    evidence_line = " ".join(snippets) if snippets else "资料目前更强调从核心概念差异和应用场景去理解这个问题。"
    concept_line = ""
    if related_concepts:
        concept_line = f"相关概念包括：{'、'.join(related_concepts[:4])}。"
    return f"{prefix}{focus_line}{evidence_line}{concept_line}围绕你的问题“{user_content.strip()}”，建议先抓住定义差异，再看实验或应用里的影响。"


class GuideOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.retrieval_service = LearningRetrievalService()

    async def stream_session_reply(
        self,
        session: Session,
        *,
        reader_id: int,
        learning_session: Any,
        profile: Any,
        user_content: str,
    ) -> AsyncIterator[dict]:
        if profile.active_path_version_id is None:
            raise ApiError(409, "learning_path_missing", "Learning profile does not have an active path version")
        steps = [serialize_path_step(step) for step in repository.list_path_steps(session, path_version_id=profile.active_path_version_id)]
        if not steps:
            raise ApiError(409, "learning_path_missing_steps", "Learning path does not contain any steps")

        started_at = time.perf_counter()
        current_index = min(learning_session.current_step_index, max(len(steps) - 1, 0))
        current_step = steps[current_index]

        yield sse_event("status", {"phase": "retrieving", "sessionId": learning_session.id, "stepIndex": current_index})

        context_items = repository.list_step_context_items(
            session,
            guide_session_id=learning_session.id,
            step_index=current_index,
        )
        retrieved = self.retrieval_service.hybrid_search(
            session,
            profile_id=profile.id,
            query=user_content.strip(),
            top_k=self.settings.learning_retrieval_top_k,
        )
        citations = _combine_citations(
            priority=[_context_item_to_citation(item) for item in context_items],
            fallback=[item.citation for item in retrieved],
            limit=self.settings.learning_retrieval_top_k,
        )
        yield sse_event("retrieval.evidence", {"items": citations})

        evaluation = _evaluate_answer(step=current_step, user_content=user_content.strip())
        teacher_text = _build_teacher_reply(step=current_step, evidence=citations, user_content=user_content.strip())
        peer_text = _build_peer_reply(step=current_step, passed=bool(evaluation["passed"]))
        assistant_text = _merge_assistant_reply(
            teacher_text=teacher_text,
            peer_text=peer_text,
            evaluation=evaluation,
            step=current_step,
        )
        related_concepts = _collect_related_concepts(
            profile=profile,
            current_step=current_step,
            learning_session=learning_session,
            user_content=user_content,
            citations=citations,
        )

        yield sse_event("agent.teacher.delta", {"delta": teacher_text})
        yield sse_event("agent.peer.delta", {"delta": peer_text})
        yield sse_event("agent.examiner.result", evaluation)

        turn = repository.create_turn(
            session,
            session_id=learning_session.id,
            turn_kind="guide",
            user_content=user_content.strip(),
            teacher_content=teacher_text,
            peer_content=peer_text,
            assistant_content=assistant_text,
            citations_json=citations,
            evaluation_json=evaluation,
            related_concepts_json=related_concepts,
            latency_ms=int((time.perf_counter() - started_at) * 1000),
            metadata_json={"stepIndex": current_index},
        )
        repository.create_agent_run(
            session,
            turn_id=turn.id,
            agent_name="Teacher",
            model_name=self.settings.llm_model,
            status="completed",
            input_summary=current_step.get("title"),
            output_summary=teacher_text[:180],
            metadata_json={"stepIndex": current_index},
        )
        repository.create_agent_run(
            session,
            turn_id=turn.id,
            agent_name="Peer",
            model_name=self.settings.llm_model,
            status="completed",
            input_summary=current_step.get("title"),
            output_summary=peer_text[:180],
            metadata_json={"stepIndex": current_index},
        )
        repository.create_agent_run(
            session,
            turn_id=turn.id,
            agent_name="Examiner",
            model_name=self.settings.llm_model,
            status="completed",
            input_summary=user_content[:180],
            output_summary=evaluation["reasoning"],
            metadata_json={"stepIndex": current_index, "passed": bool(evaluation["passed"])},
        )

        checkpoint = repository.create_checkpoint(
            session,
            session_id=learning_session.id,
            turn_id=turn.id,
            step_index=current_index,
            mastery_score=float(evaluation["masteryScore"]),
            passed=bool(evaluation["passed"]),
            missing_concepts_json=list(evaluation["missingConcepts"]),
            evidence_json={"citations": citations, "reasoning": evaluation["reasoning"]},
        )
        learning_session.mastery_score = float(evaluation["masteryScore"])

        if evaluation["passed"]:
            learning_session.completed_steps_count = max(learning_session.completed_steps_count, current_index + 1)
            learning_session.remediation_status = None
            next_index = current_index + 1
            if next_index >= len(steps):
                learning_session.status = "completed"
                learning_session.current_step_index = current_index
                learning_session.current_step_title = current_step["title"]
            else:
                learning_session.current_step_index = next_index
                learning_session.current_step_title = steps[next_index]["title"]
            yield sse_event(
                "session.progress",
                {
                    "checkpoint": serialize_checkpoint(checkpoint),
                    "session": serialize_session(learning_session),
                    "nextStep": None if learning_session.status == "completed" else steps[learning_session.current_step_index],
                },
            )
        else:
            learning_session.remediation_status = "active"
            remediation_plan = repository.create_remediation_plan(
                session,
                session_id=learning_session.id,
                step_index=current_index,
                status="active",
                missing_concepts_json=list(evaluation["missingConcepts"]),
                suggested_questions_json=[
                    f"请先解释“{concept}”在资料里的作用。"
                    for concept in evaluation["missingConcepts"][:2]
                ],
                plan_json={
                    "focusStep": current_step["title"],
                    "missingConcepts": evaluation["missingConcepts"],
                    "recommendedMode": learning_session.learning_mode,
                },
            )
            yield sse_event("session.remediation", {"plan": serialize_remediation_plan(remediation_plan)})

        report = repository.upsert_report(
            session,
            session_id=learning_session.id,
            report_type="session_summary",
            summary=assistant_text,
            weak_points_json=list(evaluation["missingConcepts"]),
            suggested_next_action=(
                f"进入下一步：{steps[learning_session.current_step_index]['title']}"
                if evaluation["passed"] and learning_session.status != "completed"
                else f"优先回补：{', '.join(evaluation['missingConcepts'] or [current_step['title']])}"
            ),
            metadata_json={"currentStepTitle": current_step["title"], "relatedConcepts": related_concepts},
        )
        session.commit()
        agent_runs = [run.agent_name for run in repository.list_turn_agent_runs(session, turn_id=turn.id)]
        yield sse_event(
            "assistant.final",
            {
                "turn": serialize_turn(turn, agent_runs=[{"agentName": name} for name in agent_runs]),
                "session": serialize_session(learning_session),
                "report": serialize_report(report),
            },
        )


class ExploreOrchestrator:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.retrieval_service = LearningRetrievalService()

    async def stream_session_reply(
        self,
        session: Session,
        *,
        reader_id: int,
        learning_session: Any,
        profile: Any,
        user_content: str,
    ) -> AsyncIterator[dict]:
        del reader_id
        started_at = time.perf_counter()
        focus_context = getattr(learning_session, "focus_context_json", None) or {}
        focus_tokens = " ".join(
            [
                *(focus_context.get("keywords") or []),
                focus_context.get("objective") or "",
                focus_context.get("stepTitle") or "",
            ]
        ).strip()
        retrieval_query = user_content.strip()
        if focus_tokens:
            retrieval_query = f"{retrieval_query} {focus_tokens}".strip()

        yield sse_event("status", {"phase": "retrieving", "sessionId": learning_session.id, "mode": "explore"})

        priority_citations: list[dict[str, Any]] = []
        source_session_id = getattr(learning_session, "source_session_id", None)
        focus_step_index = getattr(learning_session, "focus_step_index", None)
        if source_session_id is not None and focus_step_index is not None:
            context_items = repository.list_step_context_items(
                session,
                guide_session_id=source_session_id,
                step_index=focus_step_index,
            )
            priority_citations = [_context_item_to_citation(item) for item in context_items]

        retrieved = self.retrieval_service.hybrid_search(
            session,
            profile_id=profile.id,
            query=retrieval_query,
            top_k=self.settings.learning_retrieval_top_k,
        )
        citations = _combine_citations(
            priority=priority_citations,
            fallback=[item.citation for item in retrieved],
            limit=self.settings.learning_retrieval_top_k,
        )
        related_concepts = _collect_related_concepts(
            profile=profile,
            current_step=None,
            learning_session=learning_session,
            user_content=user_content,
            citations=citations,
        )
        answer_text = _build_explore_answer(
            focus_context=focus_context,
            citations=citations,
            user_content=user_content,
            related_concepts=related_concepts,
        )

        yield sse_event("retrieval.evidence", {"items": citations})
        yield sse_event("explore.answer.delta", {"delta": answer_text})
        yield sse_event("explore.related_concepts", {"items": related_concepts})

        turn = repository.create_turn(
            session,
            session_id=learning_session.id,
            turn_kind="explore",
            user_content=user_content.strip(),
            teacher_content=None,
            peer_content=None,
            assistant_content=answer_text,
            citations_json=citations,
            evaluation_json=None,
            related_concepts_json=related_concepts,
            bridge_metadata_json={
                "focusStepIndex": focus_step_index,
                "focusStepTitle": focus_context.get("stepTitle"),
            },
            latency_ms=int((time.perf_counter() - started_at) * 1000),
            metadata_json={"mode": "explore"},
        )
        repository.create_agent_run(
            session,
            turn_id=turn.id,
            agent_name="Explore",
            model_name=self.settings.llm_model,
            status="completed",
            input_summary=user_content[:180],
            output_summary=answer_text[:180],
            metadata_json={"focusStepIndex": focus_step_index},
        )
        report = repository.upsert_report(
            session,
            session_id=learning_session.id,
            report_type="session_summary",
            summary=answer_text,
            weak_points_json=[],
            suggested_next_action="继续追问，或把这轮自由探索收编回导学步骤。",
            metadata_json={"relatedConcepts": related_concepts},
        )
        session.commit()
        yield sse_event(
            "assistant.final",
            {
                "turn": serialize_turn(turn, agent_runs=[{"agentName": "Explore"}]),
                "session": serialize_session(learning_session),
                "report": serialize_report(report),
            },
        )


class LearningOrchestrator:
    def __init__(self) -> None:
        self.guide_orchestrator = GuideOrchestrator()
        self.explore_orchestrator = ExploreOrchestrator()

    async def stream_session_reply(
        self,
        session: Session,
        *,
        reader_id: int | None,
        session_id: int,
        user_content: str,
    ) -> AsyncIterator[dict]:
        if reader_id is None:
            raise ApiError(403, "reader_profile_missing", "Reader profile is required")
        if not (user_content or "").strip():
            raise ApiError(400, "missing_content", "Content is required")

        learning_session = repository.require_owned_session(session, session_id=session_id, reader_id=reader_id)
        profile = repository.require_owned_profile(session, profile_id=learning_session.profile_id, reader_id=reader_id)
        session_kind = getattr(learning_session, "session_kind", "guide")
        if session_kind == "explore":
            async for event in self.explore_orchestrator.stream_session_reply(
                session,
                reader_id=reader_id,
                learning_session=learning_session,
                profile=profile,
                user_content=user_content,
            ):
                yield event
            return

        async for event in self.guide_orchestrator.stream_session_reply(
            session,
            reader_id=reader_id,
            learning_session=learning_session,
            profile=profile,
            user_content=user_content,
        ):
            yield event
