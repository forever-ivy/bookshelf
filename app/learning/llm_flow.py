from __future__ import annotations

import json
from typing import Any

from app.core.config import Settings, get_settings
from app.llm.provider import NullLLMProvider, build_llm_provider


def _clean_json_payload(text: str) -> str:
    return (text or "").strip().replace("```json", "").replace("```", "").strip()


def _extract_balanced_json_payload(text: str) -> str | None:
    raw = (text or "").strip()
    if not raw:
        return None

    start_index = next((index for index, char in enumerate(raw) if char in "{["), None)
    if start_index is None:
        return None

    stack: list[str] = []
    in_string = False
    escape = False
    matching = {"{": "}", "[": "]"}

    for index in range(start_index, len(raw)):
        char = raw[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
            continue

        if char in matching:
            stack.append(matching[char])
            continue

        if stack and char == stack[-1]:
            stack.pop()
            if not stack:
                return raw[start_index : index + 1]

    return None


def _parse_json_payload(text: str) -> Any | None:
    cleaned = _clean_json_payload(text)
    for candidate in (cleaned, _extract_balanced_json_payload(cleaned)):
        if not candidate:
            continue
        try:
            return json.loads(candidate)
        except Exception:
            continue
    return None


def _truncate(text: str, *, limit: int = 5000) -> str:
    compact = " ".join((text or "").split())
    return compact[:limit]


class LearningLLMWorkflow:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider = build_llm_provider()
        self.enabled = not isinstance(self.provider, NullLLMProvider)

    def plan_path(
        self,
        *,
        title: str,
        goal_mode: str,
        difficulty_mode: str,
        combined_text: str,
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        reply = self.provider.chat(
            text=_truncate(combined_text),
            context={
                "systemPrompt": "你是一名图书馆导学规划助手。你只返回 JSON，不要输出解释。",
                "instruction": (
                    "请基于资料生成导学规划 JSON，字段固定为 "
                    "summary:string, concepts:string[], steps:{step_index:number,step_type:string,title:string,"
                    "objective:string,guiding_question:string,success_criteria:string,prerequisite_step_ids:number[],"
                    "keywords_json:string[],metadata_json:object}[]。"
                ),
                "title": title,
                "goalMode": goal_mode,
                "difficultyMode": difficulty_mode,
            },
        )
        parsed = _parse_json_payload(reply)
        if not isinstance(parsed, dict):
            return None
        if not isinstance(parsed.get("steps"), list) or not parsed.get("summary"):
            return None
        concepts = [str(item).strip() for item in parsed.get("concepts", []) if str(item).strip()]
        steps: list[dict[str, Any]] = []
        for index, step in enumerate(parsed["steps"]):
            if not isinstance(step, dict) or not step.get("title"):
                continue
            steps.append(
                {
                    "step_index": int(step.get("step_index", index)),
                    "step_type": str(step.get("step_type") or "lesson"),
                    "title": str(step["title"]),
                    "objective": step.get("objective"),
                    "guiding_question": step.get("guiding_question"),
                    "success_criteria": step.get("success_criteria"),
                    "prerequisite_step_ids": step.get("prerequisite_step_ids") or [],
                    "keywords_json": [str(item).strip() for item in step.get("keywords_json", []) if str(item).strip()],
                    "metadata_json": step.get("metadata_json") or {"agent": "Planner"},
                }
            )
        if not steps:
            return None
        return {"summary": str(parsed["summary"]), "concepts": concepts, "steps": steps}

    def teacher_reply(self, *, step: dict[str, Any], evidence: list[dict[str, Any]], user_content: str) -> str | None:
        if not self.enabled:
            return None
        return self.provider.chat(
            text=user_content,
            context={
                "systemPrompt": "你是图书馆导学课堂中的导师角色。请使用中文回答。",
                "instruction": "围绕当前步骤进行主讲，结合证据解释，不要编造资料外事实，输出一段 2-4 句的讲解。",
                "step": step,
                "evidence": evidence[:3],
            },
        ).strip() or None

    def peer_reply(self, *, step: dict[str, Any], user_content: str, passed: bool) -> str | None:
        if not self.enabled:
            return None
        return self.provider.chat(
            text=user_content,
            context={
                "systemPrompt": "你是导学课堂中的学伴角色。请使用中文回答。",
                "instruction": "用更贴近学生口吻的方式提出一个追问或困惑，帮助继续学习，输出 1-2 句。",
                "step": step,
                "passed": passed,
            },
        ).strip() or None

    def examine(self, *, step: dict[str, Any], user_content: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        reply = self.provider.chat(
            text=user_content,
            context={
                "systemPrompt": "你是导学课堂中的考官角色。你只返回 JSON。",
                "instruction": (
                    "根据学生回答判断当前步骤是否达标，返回 JSON："
                    "masteryScore:number, passed:boolean, missingConcepts:string[], reasoning:string。"
                ),
                "step": step,
            },
        )
        parsed = _parse_json_payload(reply)
        if not isinstance(parsed, dict):
            return None
        if "masteryScore" not in parsed or "passed" not in parsed:
            return None
        return {
            "masteryScore": round(float(parsed.get("masteryScore", 0.0)), 2),
            "passed": bool(parsed.get("passed")),
            "missingConcepts": [str(item).strip() for item in parsed.get("missingConcepts", []) if str(item).strip()],
            "reasoning": str(parsed.get("reasoning") or ""),
        }

    def classify_guide_intent(self, *, step: dict[str, Any], user_content: str) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        reply = self.provider.chat(
            text=user_content,
            context={
                "systemPrompt": "你是导学课堂中的意图分类器。你只返回 JSON。",
                "instruction": (
                    "判断当前 Guide 输入的意图，返回 JSON："
                    "kind:string, reason:string。kind 只能是 "
                    "step_answer, step_clarify, offtrack_explore, control。"
                ),
                "step": step,
            },
        )
        parsed = _parse_json_payload(reply)
        if not isinstance(parsed, dict):
            return None
        kind = str(parsed.get("kind") or "").strip()
        if kind not in {"step_answer", "step_clarify", "offtrack_explore", "control"}:
            return None
        return {
            "kind": kind,
            "reason": str(parsed.get("reason") or "").strip(),
        }

    def explore_answer(
        self,
        *,
        focus_context: dict[str, Any],
        citations: list[dict[str, Any]],
        user_content: str,
    ) -> dict[str, Any] | None:
        if not self.enabled:
            return None
        reply = self.provider.chat(
            text=user_content,
            context={
                "systemPrompt": "你是 grounded notebook 问答助手。你只返回 JSON。",
                "instruction": "返回 JSON：answer:string, relatedConcepts:string[]。答案必须基于给定引用和焦点上下文。",
                "focusContext": focus_context,
                "citations": citations[:4],
            },
        )
        parsed = _parse_json_payload(reply)
        if isinstance(parsed, dict) and parsed.get("answer"):
            return {
                "answer": str(parsed["answer"]).strip(),
                "relatedConcepts": [str(item).strip() for item in parsed.get("relatedConcepts", []) if str(item).strip()],
            }

        raw_answer = (reply or "").strip()
        if not raw_answer:
            return None

        return {
            "answer": raw_answer,
            "relatedConcepts": [],
        }
