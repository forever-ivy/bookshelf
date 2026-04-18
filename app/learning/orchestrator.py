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
    serialize_bridge_action,
    serialize_checkpoint,
    serialize_path_step,
    serialize_remediation_plan,
    serialize_report,
    serialize_session,
    serialize_session_redirect,
    serialize_turn,
    sse_event,
)
from app.learning.service import LearningBridgeService

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


def _build_guide_coach_reply(
    *,
    step: dict[str, Any],
    evidence: list[dict[str, Any]],
    user_content: str,
    intent_kind: str,
) -> str:
    evidence_snippet = evidence[0]["snippet"] if evidence else "资料里更强调先抓住当前步骤的核心概念，再展开例子。"
    if intent_kind == "offtrack_explore":
        return (
            f"导师：你的问题“{user_content.strip()}”值得展开，但它已经有点超出“{step.get('title')}”这一步的主线。"
            f"先给你一个贴着资料的回答：{evidence_snippet}"
            f"如果你愿意，我们可以先记住这个联系，再回到当前步骤。"
        )
    return (
        f"导师：我们先继续聚焦“{step.get('title')}”。"
        f"结合资料，{evidence_snippet}"
        f"你可以先抓住这一步的核心差异，再回头检查看自己还缺哪一块理解。"
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
    del focus_context, citations, related_concepts
    normalized = (user_content or "").strip().lower()
    if normalized in {"hi", "hello", "hey", "你好", "您好", "嗨"}:
        return "模型暂时不可用。请稍后重试，或直接输入一个更具体的问题。"
    return "模型暂时不可用，当前无法生成这轮 Explore 回答。请稍后重试。"


def _append_event(state: dict[str, Any], event_name: str, data: dict[str, Any]) -> dict[str, Any]:
    state.setdefault("events", []).append(sse_event(event_name, data))
    return state


def _fallback_classify_guide_intent(*, step: dict[str, Any], user_content: str) -> dict[str, str]:
    del step
    normalized = (user_content or "").strip().lower()
    compact = normalized.replace(" ", "")
    has_question = ("?" in normalized or "？" in normalized) or any(
        token in compact for token in ["什么", "为什么", "怎么", "吗", "哪", "哪些", "区别", "关系"]
    )
    if compact in {"继续", "下一步", "继续下一步", "回顾一下", "总结我的当前差距"}:
        return {"kind": "control", "source": "heuristic"}

    clarify_markers = [
        "这一步",
        "当前步骤",
        "这里",
        "我还缺",
        "我还差",
        "哪里没懂",
        "不明白",
        "什么意思",
        "关键",
        "区别",
    ]
    offtrack_markers = [
        "举例",
        "例子",
        "现实",
        "实际",
        "数据库",
        "分布式",
        "事务",
        "一致性",
        "原文",
        "来源",
        "推荐",
        "跳出去",
        "扩展",
        "延伸",
        "关系",
        "比较",
        "对比",
    ]
    answer_markers = [
        "我理解",
        "我觉得",
        "我认为",
        "我的回答",
        "主要",
        "核心",
        "重点",
        "决定",
        "总结",
    ]
    has_clarify_marker = any(marker in compact for marker in clarify_markers)
    has_offtrack_marker = any(marker in compact for marker in offtrack_markers)

    if has_question and has_offtrack_marker and not has_clarify_marker:
        return {"kind": "offtrack_explore", "source": "heuristic"}
    if has_question and has_clarify_marker:
        return {"kind": "step_clarify", "source": "heuristic"}
    if has_question and has_offtrack_marker:
        return {"kind": "offtrack_explore", "source": "heuristic"}
    if not has_question and any(marker in compact for marker in answer_markers):
        return {"kind": "step_answer", "source": "heuristic"}
    if not has_question and len(compact) >= 24:
        return {"kind": "step_answer", "source": "heuristic"}
    if has_question:
        return {"kind": "step_clarify", "source": "heuristic"}
    return {"kind": "step_answer", "source": "heuristic"}


def _dedupe_strings(values: list[str]) -> list[str]:
    deduped: list[str] = []
    for value in values:
        normalized = value.strip()
        if normalized and normalized not in deduped:
            deduped.append(normalized)
    return deduped


def _build_guide_followups(*, step: dict[str, Any], evaluation: dict[str, Any]) -> list[str]:
    if evaluation["passed"]:
        followups = [
            f"试着把“{step.get('title')}”和后续应用场景连起来。",
            step.get("guidingQuestion") or "",
            f"如果要向同学解释“{step.get('title')}”，你会先讲哪一个关键词？",
        ]
    else:
        missing_concepts = evaluation.get("missingConcepts") or []
        followups = [
            f"请先用自己的话解释“{concept}”在这一部分里的作用。"
            for concept in missing_concepts[:2]
        ]
        followups.extend(
            [
                step.get("guidingQuestion") or "",
                f"结合资料，再说明“{step.get('title')}”为什么重要。",
            ]
        )
    return _dedupe_strings([item for item in followups if item])


def _build_guide_followups_without_evaluation(*, step: dict[str, Any], intent_kind: str) -> list[str]:
    if intent_kind == "offtrack_explore":
        followups = [
            f"先回到“{step.get('title')}”，你觉得这一步真正要抓住的是什么？",
            "如果要继续横向展开，我们可以转去 Explore 深挖。",
        ]
    else:
        followups = [
            step.get("guidingQuestion") or "",
            f"试着用自己的话再解释一次“{step.get('title')}”的关键差异。",
        ]
    return _dedupe_strings([item for item in followups if item])


def _build_guide_bridge_actions(*, step: dict[str, Any], step_index: int) -> list[dict[str, Any]]:
    return [
        {
            "actionType": "expand_step_to_explore",
            "label": "转去 Explore 深挖",
            "description": f"围绕“{step.get('title')}”做一轮自由探索，再把结果收回主线。",
            "targetStepIndex": step_index,
        }
    ]


def _build_guide_presentation(
    *,
    step: dict[str, Any],
    step_index: int,
    teacher_text: str | None,
    peer_text: str | None,
    evaluation: dict[str, Any] | None,
    citations: list[dict[str, Any]],
    related_concepts: list[str],
    followups: list[str],
    bridge_actions: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "kind": "guide",
        "step": {
            "index": step_index,
            "title": step.get("title"),
            "objective": step.get("objective"),
            "guidingQuestion": step.get("guidingQuestion"),
            "successCriteria": step.get("successCriteria"),
        },
        "teacher": {"content": teacher_text} if teacher_text else None,
        "peer": {"content": peer_text} if peer_text else None,
        "examiner": None
        if evaluation is None
        else {
            **evaluation,
            "label": "通过当前步骤" if evaluation["passed"] else "还需要再打磨",
        },
        "evidence": citations,
        "relatedConcepts": related_concepts,
        "followups": followups,
        "bridgeActions": bridge_actions,
    }


def _build_explore_followups(*, focus_context: dict[str, Any], related_concepts: list[str]) -> list[str]:
    step_title = focus_context.get("stepTitle") or "当前主题"
    followups = [
        f"如果回到“{step_title}”，这个问题最值得继续追问哪一层？",
        f"给我一个和“{step_title}”相关的更具体例子。",
    ]
    followups.extend([f"继续解释“{concept}”和当前问题的关系。" for concept in related_concepts[:1]])
    return _dedupe_strings([item for item in followups if item])


def _build_explore_bridge_actions(
    *,
    focus_context: dict[str, Any],
    guide_session_id: int | None,
    step_index: int | None,
    turn_id: int | None = None,
) -> list[dict[str, Any]]:
    step_title = focus_context.get("stepTitle") or "当前步骤"
    payload: dict[str, Any] = {}
    if turn_id is not None:
        payload["turnId"] = turn_id
    if guide_session_id is not None:
        payload["targetGuideSessionId"] = guide_session_id
    if step_index is not None:
        payload["targetStepIndex"] = step_index
    return [
        {
            "actionType": "attach_explore_turn_to_guide_step",
            "label": "收编回 Guide",
            "description": f"把这轮围绕“{step_title}”的探索结果挂回当前主线步骤。",
            **payload,
        }
    ]


def _build_explore_presentation(
    *,
    focus_context: dict[str, Any],
    answer_text: str,
    citations: list[dict[str, Any]],
    related_concepts: list[str],
    followups: list[str],
    bridge_actions: list[dict[str, Any]],
) -> dict[str, Any]:
    return {
        "kind": "explore",
        "focus": {
            "stepIndex": focus_context.get("stepIndex"),
            "stepTitle": focus_context.get("stepTitle"),
            "objective": focus_context.get("objective"),
            "guidingQuestion": focus_context.get("guidingQuestion"),
        },
        "answer": {"content": answer_text},
        "evidence": citations,
        "relatedConcepts": related_concepts,
        "followups": followups,
        "bridgeActions": bridge_actions,
    }


class GuideOrchestrator:
    runtime_node_names = [
        "load_session",
        "classify_intent",
        "control_node",
        "retrieve_evidence",
        "redirect_node",
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
        self.bridge_service = LearningBridgeService(self.settings)
        self.runtime = self._build_runtime()

    def _build_runtime(self):
        if StateGraph is None:
            return None
        graph = StateGraph(dict)
        graph.add_node("load_session", self._load_session)
        graph.add_node("classify_intent", self._classify_intent)
        graph.add_node("control_node", self._control_node)
        graph.add_node("retrieve_evidence", self._retrieve_evidence)
        graph.add_node("redirect_node", self._redirect_node)
        graph.add_node("teacher_node", self._teacher_node)
        graph.add_node("peer_node", self._peer_node)
        graph.add_node("examiner_node", self._examiner_node)
        graph.add_node("progress_node", self._progress_node)
        graph.add_node("remediation_node", self._remediation_node)
        graph.add_node("persist_turn_and_report", self._persist_turn_and_report)
        graph.add_node("finalize", self._finalize)
        graph.add_edge(START, "load_session")
        graph.add_edge("load_session", "classify_intent")
        graph.add_conditional_edges(
            "classify_intent",
            lambda state: "control_node" if state["intent_kind"] == "control" else "retrieve_evidence",
            {"control_node": "control_node", "retrieve_evidence": "retrieve_evidence"},
        )
        graph.add_edge("control_node", "persist_turn_and_report")
        graph.add_conditional_edges(
            "retrieve_evidence",
            lambda state: "redirect_node" if state["intent_kind"] == "offtrack_explore" else "teacher_node",
            {"redirect_node": "redirect_node", "teacher_node": "teacher_node"},
        )
        graph.add_edge("redirect_node", "persist_turn_and_report")
        graph.add_conditional_edges(
            "teacher_node",
            lambda state: "peer_node" if state["intent_kind"] == "step_answer" else "persist_turn_and_report",
            {"peer_node": "peer_node", "persist_turn_and_report": "persist_turn_and_report"},
        )
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

    def _classify_intent(self, state: dict[str, Any]) -> dict[str, Any]:
        user_content = state["user_content"].strip()
        llm_result = self.llm_workflow.classify_guide_intent(
            step=state["current_step"],
            user_content=user_content,
        )
        classification = llm_result or _fallback_classify_guide_intent(
            step=state["current_step"],
            user_content=user_content,
        )
        state["intent_kind"] = classification["kind"]
        state["intent_source"] = classification.get("source", "llm" if llm_result else "heuristic")
        state["response_mode"] = None
        _append_event(
            state,
            "guide.intent",
            {
                "kind": state["intent_kind"],
                "source": state["intent_source"],
                "stepIndex": state["current_index"],
            },
        )
        return state

    def _control_node(self, state: dict[str, Any]) -> dict[str, Any]:
        learning_session = state["learning_session"]
        steps = state["steps"]
        command = state["user_content"].strip().replace(" ", "")
        current_index = state["current_index"]
        state["citations"] = []
        state["related_concepts"] = []
        state["followups"] = []
        state["bridge_actions"] = []
        state["evaluation"] = None
        state["teacher_text"] = None
        state["peer_text"] = None
        state["response_mode"] = "coach"

        if command in {"继续", "下一步", "继续下一步"}:
            next_index = min(current_index + 1, len(steps) - 1)
            learning_session.current_step_index = next_index
            learning_session.current_step_title = steps[next_index]["title"]
            state["current_index"] = next_index
            state["current_step"] = steps[next_index]
            state["assistant_text"] = f"好的，我们继续到下一步：{steps[next_index]['title']}。"
        elif command in {"回顾一下", "总结我的当前差距"}:
            learning_session.current_step_title = state["current_step"]["title"]
            state["assistant_text"] = f"当前我们还停留在“{state['current_step']['title']}”，先把这个步骤讲清楚。"
        else:
            learning_session.current_step_title = state["current_step"]["title"]
            state["assistant_text"] = f"已收到指令“{state['user_content'].strip()}”，我们继续保持当前导学节奏。"
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
        _append_event(state, "evidence.items", {"items": bundle.citations})
        return state

    def _redirect_node(self, state: dict[str, Any]) -> dict[str, Any]:
        result = self.bridge_service.expand_step_to_explore(
            state["db_session"],
            reader_id=state["reader_id"],
            guide_session_id=state["learning_session"].id,
            trigger="auto",
            reason="offtrack_explore",
        )
        target_session = result["session"]
        bridge_action = result["action"]
        state["response_mode"] = "redirected"
        state["redirected_session_id"] = target_session.id
        state["bridge_metadata"] = {
            "trigger": "auto",
            "reason": "offtrack_explore",
            "bridgeAction": serialize_bridge_action(bridge_action),
        }
        state["teacher_text"] = None
        state["peer_text"] = None
        state["evaluation"] = None
        state["followups"] = []
        state["bridge_actions"] = []
        state["assistant_text"] = (
            f"这个问题更适合放到 Explore 里继续深挖，我已经为你准备好相关探索会话：{target_session.current_step_title}。"
        )
        _append_event(
            state,
            "session.redirect",
            serialize_session_redirect(
                target_session=target_session,
                bridge_action=bridge_action,
                recommended_prompts=result["recommended_prompts"],
            ),
        )
        return state

    def _teacher_node(self, state: dict[str, Any]) -> dict[str, Any]:
        current_step = state["current_step"]
        if state["intent_kind"] == "step_answer":
            teacher_text = self.llm_workflow.teacher_reply(
                step=current_step,
                evidence=state["citations"],
                user_content=state["user_content"].strip(),
            ) or _build_teacher_reply(
                step=current_step,
                evidence=state["citations"],
                user_content=state["user_content"].strip(),
            )
        else:
            teacher_text = _build_guide_coach_reply(
                step=current_step,
                evidence=state["citations"],
                user_content=state["user_content"].strip(),
                intent_kind=state["intent_kind"],
            )
            state["response_mode"] = "coach"
        state["teacher_text"] = teacher_text
        _append_event(state, "agent.teacher.delta", {"delta": teacher_text})
        _append_event(state, "teacher.delta", {"delta": teacher_text})
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
        _append_event(state, "peer.delta", {"delta": peer_text})
        return state

    def _examiner_node(self, state: dict[str, Any]) -> dict[str, Any]:
        followups = _build_guide_followups(
            step=state["current_step"],
            evaluation=state["evaluation"],
        )
        bridge_actions = _build_guide_bridge_actions(
            step=state["current_step"],
            step_index=state["current_index"],
        )
        state["followups"] = followups
        state["bridge_actions"] = bridge_actions
        _append_event(state, "agent.examiner.result", state["evaluation"])
        _append_event(state, "examiner.result", state["evaluation"])
        _append_event(state, "followups.items", {"items": followups})
        _append_event(state, "bridge.actions", {"items": bridge_actions})
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
        evaluation = state.get("evaluation")
        teacher_text = state.get("teacher_text")
        peer_text = state.get("peer_text")
        followups = state.get("followups", [])
        bridge_actions = state.get("bridge_actions", [])
        if evaluation is not None:
            assistant_text = _merge_assistant_reply(
                teacher_text=teacher_text or "",
                peer_text=peer_text or "",
                evaluation=evaluation,
                step=current_step,
            )
        else:
            assistant_text = state.get("assistant_text") or teacher_text or ""
        state["assistant_text"] = assistant_text
        if (
            evaluation is None
            and not followups
            and state["intent_kind"] != "control"
            and state.get("response_mode") != "redirected"
        ):
            followups = _build_guide_followups_without_evaluation(
                step=current_step,
                intent_kind=state["intent_kind"],
            )
        if (
            evaluation is None
            and not bridge_actions
            and state["intent_kind"] != "control"
            and state.get("response_mode") != "redirected"
        ):
            bridge_actions = _build_guide_bridge_actions(
                step=current_step,
                step_index=current_index,
            )
        presentation = _build_guide_presentation(
            step=current_step,
            step_index=current_index,
            teacher_text=teacher_text,
            peer_text=peer_text,
            evaluation=evaluation,
            citations=state["citations"],
            related_concepts=state["related_concepts"],
            followups=followups,
            bridge_actions=bridge_actions,
        )
        state["presentation"] = presentation

        turn = repository.create_turn(
            session,
            session_id=learning_session.id,
            turn_kind="guide",
            intent_kind=state.get("intent_kind"),
            response_mode=state.get("response_mode"),
            redirected_session_id=state.get("redirected_session_id"),
            user_content=state["user_content"].strip(),
            teacher_content=teacher_text,
            peer_content=peer_text,
            assistant_content=assistant_text,
            citations_json=state["citations"],
            evaluation_json=evaluation,
            related_concepts_json=state["related_concepts"],
            bridge_metadata_json=state.get("bridge_metadata"),
            latency_ms=int((time.perf_counter() - state["started_at"]) * 1000),
            metadata_json={"stepIndex": current_index, "presentation": presentation},
        )
        if teacher_text:
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
        if peer_text:
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
        if evaluation is not None:
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
            weak_points_json=[] if evaluation is None else list(evaluation["missingConcepts"]),
            suggested_next_action=(
                f"进入下一步：{state['steps'][learning_session.current_step_index]['title']}"
                if evaluation is not None and evaluation["passed"] and learning_session.status != "completed"
                else (
                    f"优先回补：{', '.join(evaluation['missingConcepts'] or [current_step['title']])}"
                    if evaluation is not None
                    else (
                        "已自动转去 Explore 深挖"
                        if state.get("response_mode") == "redirected"
                        else (
                            f"当前步骤：{learning_session.current_step_title}"
                            if state["intent_kind"] == "control"
                            else f"继续围绕：{current_step['title']}"
                        )
                    )
                )
            ),
            metadata_json={
                "currentStepTitle": learning_session.current_step_title or current_step["title"],
                "relatedConcepts": state.get("related_concepts", []),
            },
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
        state = self._load_session(state)
        state = self._classify_intent(state)
        if state["intent_kind"] == "control":
            state = self._control_node(state)
        else:
            state = self._retrieve_evidence(state)
            if state["intent_kind"] == "offtrack_explore":
                state = self._redirect_node(state)
            else:
                state = self._teacher_node(state)
            if state["intent_kind"] == "step_answer":
                state = self._peer_node(state)
                state = self._examiner_node(state)
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
        initial_state = {
            "db_session": session,
            "reader_id": reader_id,
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
        _append_event(state, "evidence.items", {"items": bundle.citations})
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
        followups = _build_explore_followups(
            focus_context=state["focus_context"],
            related_concepts=state["related_concepts"],
        )
        bridge_actions = _build_explore_bridge_actions(
            focus_context=state["focus_context"],
            guide_session_id=getattr(state["learning_session"], "source_session_id", None),
            step_index=getattr(state["learning_session"], "focus_step_index", None),
        )
        state["followups"] = followups
        state["bridge_actions"] = bridge_actions
        _append_event(state, "explore.related_concepts", {"items": state["related_concepts"]})
        _append_event(state, "followups.items", {"items": followups})
        _append_event(state, "bridge.actions", {"items": bridge_actions})
        return state

    def _persist_turn_and_report(self, state: dict[str, Any]) -> dict[str, Any]:
        session = state["db_session"]
        learning_session = state["learning_session"]
        focus_context = state["focus_context"]
        focus_step_index = getattr(learning_session, "focus_step_index", None)
        followups = state.get("followups", [])
        presentation = _build_explore_presentation(
            focus_context=focus_context,
            answer_text=state["answer_text"],
            citations=state["citations"],
            related_concepts=state["related_concepts"],
            followups=followups,
            bridge_actions=[],
        )
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
            metadata_json={"mode": "explore", "presentation": presentation},
        )
        bridge_actions = _build_explore_bridge_actions(
            focus_context=focus_context,
            guide_session_id=getattr(learning_session, "source_session_id", None),
            step_index=focus_step_index,
            turn_id=turn.id,
        )
        presentation["bridgeActions"] = bridge_actions
        turn.metadata_json = {
            **(turn.metadata_json or {}),
            "presentation": presentation,
        }
        state["presentation"] = presentation
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
