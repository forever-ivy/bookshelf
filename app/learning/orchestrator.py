from __future__ import annotations

import time
from collections.abc import AsyncIterator
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import ApiError
from app.learning import repository
from app.learning.llm_flow import LearningLLMWorkflow
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

try:
    from langgraph.graph import END, START, StateGraph  # type: ignore
except Exception:  # pragma: no cover - optional during tests
    END = START = None  # type: ignore[assignment]
    StateGraph = None  # type: ignore[assignment]


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


def _append_event(state: dict[str, Any], event_name: str, data: dict[str, Any]) -> dict[str, Any]:
    state.setdefault("events", []).append(sse_event(event_name, data))
    return state


class GuideOrchestrator:
    runtime_node_names = [
        "load_session",
        "retrieve_evidence",
        "teacher_node",
        "peer_node",
        "examiner_node",
        "progress_node",
        "remediation_node",
        "persist_turn_and_report",
        "finalize",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()
        self.retrieval_service = LearningRetrievalService()
        self.llm_workflow = LearningLLMWorkflow(self.settings)
        self.runtime = self._build_runtime()

    def _build_runtime(self):
        if StateGraph is None:
            return None
        graph = StateGraph(dict)
        graph.add_node("load_session", self._load_session)
        graph.add_node("retrieve_evidence", self._retrieve_evidence)
        graph.add_node("teacher_node", self._teacher_node)
        graph.add_node("peer_node", self._peer_node)
        graph.add_node("examiner_node", self._examiner_node)
        graph.add_node("progress_node", self._progress_node)
        graph.add_node("remediation_node", self._remediation_node)
        graph.add_node("persist_turn_and_report", self._persist_turn_and_report)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "load_session")
        graph.add_edge("load_session", "retrieve_evidence")
        graph.add_edge("retrieve_evidence", "teacher_node")
        graph.add_edge("teacher_node", "peer_node")
        graph.add_edge("peer_node", "examiner_node")
        graph.add_conditional_edges(
            "examiner_node",
            lambda state: "progress_node" if state["evaluation"]["passed"] else "remediation_node",
            {"progress_node": "progress_node", "remediation_node": "remediation_node"},
        )
        graph.add_edge("progress_node", "persist_turn_and_report")
        graph.add_edge("remediation_node", "persist_turn_and_report")
        graph.add_edge("persist_turn_and_report", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    def _load_session(self, state: dict[str, Any]) -> dict[str, Any]:
        session = state["db_session"]
        learning_session = state["learning_session"]
        profile = state["profile"]
        if profile.active_path_version_id is None:
            raise ApiError(409, "learning_path_missing", "Learning profile does not have an active path version")
        steps = [serialize_path_step(step) for step in repository.list_path_steps(session, path_version_id=profile.active_path_version_id)]
        if not steps:
            raise ApiError(409, "learning_path_missing_steps", "Learning path does not contain any steps")
        current_index = min(learning_session.current_step_index, max(len(steps) - 1, 0))
        state["steps"] = steps
        state["current_index"] = current_index
        state["current_step"] = steps[current_index]
        _append_event(state, "status", {"phase": "retrieving", "sessionId": learning_session.id, "stepIndex": current_index})
        return state

    def _retrieve_evidence(self, state: dict[str, Any]) -> dict[str, Any]:
        bundle = self.retrieval_service.guide_search(
            state["db_session"],
            profile_id=state["profile"].id,
            guide_session_id=state["learning_session"].id,
            step_index=state["current_index"],
            query=state["user_content"].strip(),
            top_k=self.settings.learning_retrieval_top_k,
            preferred_keywords=state["current_step"].get("keywords") or [],
        )
        state["citations"] = bundle.citations
        state["related_concepts"] = bundle.related_concepts
        _append_event(state, "retrieval.evidence", {"items": bundle.citations})
        return state

    def _teacher_node(self, state: dict[str, Any]) -> dict[str, Any]:
        current_step = state["current_step"]
        teacher_text = self.llm_workflow.teacher_reply(
            step=current_step,
            evidence=state["citations"],
            user_content=state["user_content"].strip(),
        ) or _build_teacher_reply(
            step=current_step,
            evidence=state["citations"],
            user_content=state["user_content"].strip(),
        )
        state["teacher_text"] = teacher_text
        _append_event(state, "agent.teacher.delta", {"delta": teacher_text})
        return state

    def _peer_node(self, state: dict[str, Any]) -> dict[str, Any]:
        current_step = state["current_step"]
        evaluation = self.llm_workflow.examine(step=current_step, user_content=state["user_content"].strip()) or _evaluate_answer(
            step=current_step,
            user_content=state["user_content"].strip(),
        )
        peer_text = self.llm_workflow.peer_reply(
            step=current_step,
            user_content=state["user_content"].strip(),
            passed=bool(evaluation["passed"]),
        ) or _build_peer_reply(step=current_step, passed=bool(evaluation["passed"]))
        state["evaluation"] = evaluation
        state["peer_text"] = peer_text
        _append_event(state, "agent.peer.delta", {"delta": peer_text})
        return state

    def _examiner_node(self, state: dict[str, Any]) -> dict[str, Any]:
        _append_event(state, "agent.examiner.result", state["evaluation"])
        return state

    def _progress_node(self, state: dict[str, Any]) -> dict[str, Any]:
        learning_session = state["learning_session"]
        current_index = state["current_index"]
        steps = state["steps"]
        evaluation = state["evaluation"]
        learning_session.mastery_score = float(evaluation["masteryScore"])
        learning_session.completed_steps_count = max(learning_session.completed_steps_count, current_index + 1)
        learning_session.remediation_status = None
        next_index = current_index + 1
        if next_index >= len(steps):
            learning_session.status = "completed"
            learning_session.current_step_index = current_index
            learning_session.current_step_title = state["current_step"]["title"]
        else:
            learning_session.current_step_index = next_index
            learning_session.current_step_title = steps[next_index]["title"]
        state["pending_progress"] = True
        return state

    def _remediation_node(self, state: dict[str, Any]) -> dict[str, Any]:
        learning_session = state["learning_session"]
        evaluation = state["evaluation"]
        learning_session.mastery_score = float(evaluation["masteryScore"])
        learning_session.remediation_status = "active"
        state["pending_progress"] = False
        return state

    def _persist_turn_and_report(self, state: dict[str, Any]) -> dict[str, Any]:
        session = state["db_session"]
        learning_session = state["learning_session"]
        current_step = state["current_step"]
        current_index = state["current_index"]
        evaluation = state["evaluation"]
        teacher_text = state["teacher_text"]
        peer_text = state["peer_text"]
        assistant_text = _merge_assistant_reply(
            teacher_text=teacher_text,
            peer_text=peer_text,
            evaluation=evaluation,
            step=current_step,
        )
        state["assistant_text"] = assistant_text

        turn = repository.create_turn(
            session,
            session_id=learning_session.id,
            turn_kind="guide",
            user_content=state["user_content"].strip(),
            teacher_content=teacher_text,
            peer_content=peer_text,
            assistant_content=assistant_text,
            citations_json=state["citations"],
            evaluation_json=evaluation,
            related_concepts_json=state["related_concepts"],
            latency_ms=int((time.perf_counter() - state["started_at"]) * 1000),
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
            input_summary=state["user_content"][:180],
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
            evidence_json={"citations": state["citations"], "reasoning": evaluation["reasoning"]},
        )
        if evaluation["passed"]:
            _append_event(
                state,
                "session.progress",
                {
                    "checkpoint": serialize_checkpoint(checkpoint),
                    "session": serialize_session(learning_session),
                    "nextStep": None
                    if learning_session.status == "completed"
                    else state["steps"][learning_session.current_step_index],
                },
            )
        else:
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
            _append_event(state, "session.remediation", {"plan": serialize_remediation_plan(remediation_plan)})
        report = repository.upsert_report(
            session,
            session_id=learning_session.id,
            report_type="session_summary",
            summary=assistant_text,
            weak_points_json=list(evaluation["missingConcepts"]),
            suggested_next_action=(
                f"进入下一步：{state['steps'][learning_session.current_step_index]['title']}"
                if evaluation["passed"] and learning_session.status != "completed"
                else f"优先回补：{', '.join(evaluation['missingConcepts'] or [current_step['title']])}"
            ),
            metadata_json={"currentStepTitle": current_step["title"], "relatedConcepts": state["related_concepts"]},
        )
        session.commit()
        agent_runs = [run.agent_name for run in repository.list_turn_agent_runs(session, turn_id=turn.id)]
        state["final_payload"] = {
            "turn": serialize_turn(turn, agent_runs=[{"agentName": name} for name in agent_runs]),
            "session": serialize_session(learning_session),
            "report": serialize_report(report),
        }
        return state

    def _finalize(self, state: dict[str, Any]) -> dict[str, Any]:
        _append_event(state, "assistant.final", state["final_payload"])
        return state

    def _run_without_langgraph(self, state: dict[str, Any]) -> dict[str, Any]:
        for node in (
            self._load_session,
            self._retrieve_evidence,
            self._teacher_node,
            self._peer_node,
            self._examiner_node,
        ):
            state = node(state)
        if state["evaluation"]["passed"]:
            state = self._progress_node(state)
        else:
            state = self._remediation_node(state)
        state = self._persist_turn_and_report(state)
        return self._finalize(state)

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
        initial_state = {
            "db_session": session,
            "learning_session": learning_session,
            "profile": profile,
            "user_content": user_content,
            "started_at": time.perf_counter(),
            "events": [],
        }
        final_state = self.runtime.invoke(initial_state) if self.runtime is not None else self._run_without_langgraph(initial_state)
        for event in final_state["events"]:
            yield event


class ExploreOrchestrator:
    runtime_node_names = [
        "load_session",
        "retrieve_evidence",
        "answer_node",
        "related_concepts_node",
        "persist_turn_and_report",
        "finalize",
    ]

    def __init__(self) -> None:
        self.settings = get_settings()
        self.retrieval_service = LearningRetrievalService()
        self.llm_workflow = LearningLLMWorkflow(self.settings)
        self.runtime = self._build_runtime()

    def _build_runtime(self):
        if StateGraph is None:
            return None
        graph = StateGraph(dict)
        graph.add_node("load_session", self._load_session)
        graph.add_node("retrieve_evidence", self._retrieve_evidence)
        graph.add_node("answer_node", self._answer_node)
        graph.add_node("related_concepts_node", self._related_concepts_node)
        graph.add_node("persist_turn_and_report", self._persist_turn_and_report)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "load_session")
        graph.add_edge("load_session", "retrieve_evidence")
        graph.add_edge("retrieve_evidence", "answer_node")
        graph.add_edge("answer_node", "related_concepts_node")
        graph.add_edge("related_concepts_node", "persist_turn_and_report")
        graph.add_edge("persist_turn_and_report", "finalize")
        graph.add_edge("finalize", END)
        return graph.compile()

    def _load_session(self, state: dict[str, Any]) -> dict[str, Any]:
        _append_event(
            state,
            "status",
            {"phase": "retrieving", "sessionId": state["learning_session"].id, "mode": "explore"},
        )
        state["focus_context"] = getattr(state["learning_session"], "focus_context_json", None) or {}
        return state

    def _retrieve_evidence(self, state: dict[str, Any]) -> dict[str, Any]:
        focus_context = state["focus_context"]
        focus_tokens = " ".join(
            [
                *(focus_context.get("keywords") or []),
                focus_context.get("objective") or "",
                focus_context.get("stepTitle") or "",
            ]
        ).strip()
        retrieval_query = state["user_content"].strip()
        if focus_tokens:
            retrieval_query = f"{retrieval_query} {focus_tokens}".strip()
        bundle = self.retrieval_service.explore_search(
            state["db_session"],
            profile_id=state["profile"].id,
            query=retrieval_query,
            top_k=self.settings.learning_retrieval_top_k,
            focus_keywords=focus_context.get("keywords") or [],
            source_session_id=getattr(state["learning_session"], "source_session_id", None),
            focus_step_index=getattr(state["learning_session"], "focus_step_index", None),
        )
        state["citations"] = bundle.citations
        state["related_concepts"] = bundle.related_concepts
        _append_event(state, "retrieval.evidence", {"items": bundle.citations})
        return state

    def _answer_node(self, state: dict[str, Any]) -> dict[str, Any]:
        focus_context = state["focus_context"]
        llm_answer = self.llm_workflow.explore_answer(
            focus_context=focus_context,
            citations=state["citations"],
            user_content=state["user_content"],
        )
        if llm_answer is not None:
            answer_text = llm_answer["answer"]
            if llm_answer["relatedConcepts"]:
                state["related_concepts"] = llm_answer["relatedConcepts"]
        else:
            answer_text = _build_explore_answer(
                focus_context=focus_context,
                citations=state["citations"],
                user_content=state["user_content"],
                related_concepts=state["related_concepts"],
            )
        state["answer_text"] = answer_text
        _append_event(state, "explore.answer.delta", {"delta": answer_text})
        return state

    def _related_concepts_node(self, state: dict[str, Any]) -> dict[str, Any]:
        _append_event(state, "explore.related_concepts", {"items": state["related_concepts"]})
        return state

    def _persist_turn_and_report(self, state: dict[str, Any]) -> dict[str, Any]:
        session = state["db_session"]
        learning_session = state["learning_session"]
        focus_context = state["focus_context"]
        focus_step_index = getattr(learning_session, "focus_step_index", None)
        turn = repository.create_turn(
            session,
            session_id=learning_session.id,
            turn_kind="explore",
            user_content=state["user_content"].strip(),
            teacher_content=None,
            peer_content=None,
            assistant_content=state["answer_text"],
            citations_json=state["citations"],
            evaluation_json=None,
            related_concepts_json=state["related_concepts"],
            bridge_metadata_json={
                "focusStepIndex": focus_step_index,
                "focusStepTitle": focus_context.get("stepTitle"),
            },
            latency_ms=int((time.perf_counter() - state["started_at"]) * 1000),
            metadata_json={"mode": "explore"},
        )
        repository.create_agent_run(
            session,
            turn_id=turn.id,
            agent_name="Explore",
            model_name=self.settings.llm_model,
            status="completed",
            input_summary=state["user_content"][:180],
            output_summary=state["answer_text"][:180],
            metadata_json={"focusStepIndex": focus_step_index},
        )
        report = repository.upsert_report(
            session,
            session_id=learning_session.id,
            report_type="session_summary",
            summary=state["answer_text"],
            weak_points_json=[],
            suggested_next_action="继续追问，或把这轮自由探索收编回导学步骤。",
            metadata_json={"relatedConcepts": state["related_concepts"]},
        )
        session.commit()
        state["final_payload"] = {
            "turn": serialize_turn(turn, agent_runs=[{"agentName": "Explore"}]),
            "session": serialize_session(learning_session),
            "report": serialize_report(report),
        }
        return state

    def _finalize(self, state: dict[str, Any]) -> dict[str, Any]:
        _append_event(state, "assistant.final", state["final_payload"])
        return state

    def _run_without_langgraph(self, state: dict[str, Any]) -> dict[str, Any]:
        for node in (
            self._load_session,
            self._retrieve_evidence,
            self._answer_node,
            self._related_concepts_node,
            self._persist_turn_and_report,
            self._finalize,
        ):
            state = node(state)
        return state

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
        initial_state = {
            "db_session": session,
            "learning_session": learning_session,
            "profile": profile,
            "user_content": user_content,
            "started_at": time.perf_counter(),
            "events": [],
        }
        final_state = self.runtime.invoke(initial_state) if self.runtime is not None else self._run_without_langgraph(initial_state)
        for event in final_state["events"]:
            yield event


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
