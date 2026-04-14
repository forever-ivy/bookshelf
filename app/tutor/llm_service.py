from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency during tests
    OpenAI = None  # type: ignore[assignment]

from app.core.config import Settings, get_settings
from app.recommendation.embeddings import TOKEN_PATTERN


PROMPT_DIR = Path(__file__).resolve().parent / "prompts"
logger = logging.getLogger(__name__)


def _load_prompt(name: str) -> str:
    return (PROMPT_DIR / name).read_text(encoding="utf-8")


def _safe_json_parse(value: str) -> dict[str, Any] | None:
    cleaned = value.strip().replace("```json", "").replace("```", "").strip()
    if not cleaned:
        return None
    try:
        parsed = json.loads(cleaned)
    except Exception:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _tokenize(value: str) -> list[str]:
    return [token for token in TOKEN_PATTERN.findall((value or "").lower()) if token]


class TutorLLMService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider_name = (self.settings.llm_provider or "null").strip().lower()
        self.client = self._build_client()

    def _build_client(self) -> Any | None:
        if self.provider_name not in {"openai", "openai-compatible", "sdk"}:
            return None
        if OpenAI is None:
            return None
        api_key = self.settings.llm_api_key
        if not api_key:
            return None
        kwargs: dict[str, Any] = {"api_key": api_key}
        if self.settings.llm_base_url:
            kwargs["base_url"] = self.settings.llm_base_url
        return OpenAI(**kwargs)

    def _chat_text(self, *, system_prompt: str, user_prompt: str, temperature: float = 0.2) -> str | None:
        if self.client is None:
            return None
        try:
            response = self.client.chat.completions.create(
                model=self.settings.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=temperature,
                timeout=self.settings.llm_timeout_seconds,
            )
        except Exception:
            logger.warning("Tutor LLM request failed; falling back to local heuristic output.", exc_info=True)
            return None
        choices = getattr(response, "choices", None) or []
        if not choices:
            return None
        message = getattr(choices[0], "message", None)
        if message is None:
            return None
        content = getattr(message, "content", None)
        if isinstance(content, list):
            return "".join(str(item) for item in content).strip()
        return str(content or "").strip() or None

    def _chat_json(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
    ) -> dict[str, Any] | None:
        text = self._chat_text(system_prompt=system_prompt, user_prompt=user_prompt, temperature=temperature)
        if not text:
            return None
        return _safe_json_parse(text)

    def summarize_source(self, *, title: str, teaching_goal: str | None, text: str) -> str:
        prompt = (
            f"资料标题：{title}\n"
            f"学习目标：{teaching_goal or '帮助读者快速理解核心内容'}\n"
            f"资料内容：\n{text[:3500]}\n\n"
            "请用中文输出一段 120 字以内的资料摘要。"
        )
        text_reply = self._chat_text(
            system_prompt="你是导学资料摘要助手，请返回简洁中文摘要。",
            user_prompt=prompt,
            temperature=0.1,
        )
        if text_reply:
            return text_reply
        fallback = (text or "").strip().replace("\n", " ")
        fallback = fallback[:140]
        if teaching_goal:
            return f"{title}围绕“{teaching_goal}”展开，核心内容包括：{fallback}"
        return f"{title}的核心内容包括：{fallback}"

    def generate_persona(self, *, title: str, teaching_goal: str | None, source_summary: str) -> dict[str, Any]:
        prompt = (
            f"资料主题：{title}\n"
            f"学习目标：{teaching_goal or '帮助读者循序渐进学习'}\n"
            f"资料摘要：{source_summary}"
        )
        payload = self._chat_json(
            system_prompt=_load_prompt("persona_generation.txt"),
            user_prompt=prompt,
            temperature=0.2,
        )
        if payload and payload.get("topicName"):
            return payload
        return {
            "topicName": title,
            "targetAudience": "图书馆读者",
            "personaHints": [
                "循序渐进地追问",
                "先确认理解，再推进下一步",
                "用资料里的概念组织提示",
            ],
            "domainSpecificConstraints": [
                "不直接给出完整实验答案",
                "优先依据资料内容提供引导",
            ],
            "teachingGoal": teaching_goal or "帮助读者建立结构化理解",
        }

    def generate_curriculum(
        self,
        *,
        title: str,
        teaching_goal: str | None,
        source_summary: str,
        source_text: str,
    ) -> dict[str, Any]:
        prompt = (
            f"资料主题：{title}\n"
            f"学习目标：{teaching_goal or '帮助读者完成导学'}\n"
            f"资料摘要：{source_summary}\n"
            f"资料正文节选：\n{source_text[:4000]}"
        )
        payload = self._chat_json(
            system_prompt=_load_prompt("curriculum_generation.txt"),
            user_prompt=prompt,
            temperature=0.2,
        )
        if payload and isinstance(payload.get("steps"), list) and payload["steps"]:
            return payload

        top_tokens: list[str] = []
        seen: set[str] = set()
        for token in _tokenize(f"{title} {source_summary} {source_text[:1200]}"):
            if token in seen or len(token) < 2:
                continue
            seen.add(token)
            top_tokens.append(token)
            if len(top_tokens) >= 8:
                break

        steps = [
            {
                "index": 0,
                "title": "建立整体认知",
                "learningObjective": "说明资料讨论的主题、目标和主要问题。",
                "successCriteria": "能用自己的话概括资料主题，并指出至少两个核心概念。",
                "guidingQuestion": "这份资料最希望你先搞清楚什么？",
                "keywords": top_tokens[:3],
            },
            {
                "index": 1,
                "title": "拆解关键概念",
                "learningObjective": "梳理关键概念之间的联系，理解它们各自的作用。",
                "successCriteria": "能解释两个以上核心概念，并说明它们如何协同工作。",
                "guidingQuestion": "如果把资料拆成几个关键概念，它们分别负责什么？",
                "keywords": top_tokens[2:6] or top_tokens[:4],
            },
            {
                "index": 2,
                "title": "迁移到应用场景",
                "learningObjective": "把资料知识迁移到实验、练习或复盘场景中。",
                "successCriteria": "能结合一个具体场景说明如何应用资料中的关键思路。",
                "guidingQuestion": "如果真正去做实验或解题，你会先用哪条思路？",
                "keywords": top_tokens[4:8] or top_tokens[:4],
            },
        ]
        return {
            "title": f"{title}导学路径",
            "overview": source_summary,
            "steps": steps,
        }

    def compose_reply(
        self,
        *,
        profile_title: str,
        current_step: dict[str, Any],
        retrieved_evidence: list[dict[str, Any]],
        recent_messages: list[dict[str, str]],
        user_content: str,
    ) -> str:
        evidence_lines = [
            f"- {item['snippet']}" for item in retrieved_evidence[:2] if item.get("snippet")
        ]
        history_lines = [f"{item['role']}: {item['content']}" for item in recent_messages[-6:]]
        prompt = (
            f"资料主题：{profile_title}\n"
            f"当前步骤：{current_step.get('title')}\n"
            f"学习目标：{current_step.get('learningObjective')}\n"
            f"成功标准：{current_step.get('successCriteria')}\n"
            f"最近对话：\n" + "\n".join(history_lines) + "\n"
            f"检索证据：\n" + "\n".join(evidence_lines) + "\n"
            f"读者最新输入：{user_content}"
        )
        response = self._chat_text(
            system_prompt=_load_prompt("assistant_system.txt"),
            user_prompt=prompt,
            temperature=0.4,
        )
        if response:
            return response

        evidence_text = evidence_lines[0][2:] if evidence_lines else "资料里强调先抓住核心概念，再把它们放到具体场景里理解。"
        question = current_step.get("guidingQuestion") or "你愿意先试着用自己的话总结一下吗？"
        return (
            f"我们先围绕“{current_step.get('title')}”推进。"
            f"从资料来看，{evidence_text}"
            f"你已经提到了不错的线索，接下来可以回答这个问题：{question}"
        )

    def evaluate_step(
        self,
        *,
        current_step: dict[str, Any],
        conversation_context: list[dict[str, str]],
        user_content: str,
    ) -> dict[str, Any]:
        prompt = (
            f"步骤标题：{current_step.get('title')}\n"
            f"学习目标：{current_step.get('learningObjective')}\n"
            f"成功标准：{current_step.get('successCriteria')}\n"
            f"对话上下文：{json.dumps(conversation_context[-8:], ensure_ascii=False)}\n"
            f"学生最新回答：{user_content}"
        )
        payload = self._chat_json(
            system_prompt=_load_prompt("step_evaluation.txt"),
            user_prompt=prompt,
            temperature=0.0,
        )
        if payload and "confidence" in payload:
            confidence = max(0.0, min(1.0, float(payload.get("confidence", 0.0))))
            meets_criteria = bool(payload.get("meetsCriteria", confidence >= 0.72))
            return {
                "confidence": round(confidence, 2),
                "meetsCriteria": meets_criteria,
                "reasoning": str(payload.get("reasoning") or ""),
            }

        user_tokens = set(_tokenize(user_content))
        step_tokens = set(
            _tokenize(
                " ".join(
                    [
                        str(current_step.get("title") or ""),
                        str(current_step.get("learningObjective") or ""),
                        str(current_step.get("successCriteria") or ""),
                        " ".join(str(item) for item in current_step.get("keywords", [])),
                    ]
                )
            )
        )
        overlap = len(user_tokens & step_tokens)
        density = overlap / max(len(step_tokens), 1)
        length_bonus = min(len(user_content.strip()) / 100.0, 0.3)
        confidence = round(min(0.95, density + length_bonus + 0.2), 2)
        meets_criteria = confidence >= 0.72
        reasoning = (
            "读者已经覆盖了当前步骤里的多个关键点。"
            if meets_criteria
            else "读者已有部分理解，但还需要更明确地解释关键概念和它们之间的关系。"
        )
        return {
            "confidence": confidence,
            "meetsCriteria": meets_criteria,
            "reasoning": reasoning,
        }

    def stream_chunks(self, text: str, *, chunk_size: int = 24) -> list[str]:
        cleaned = (text or "").strip()
        if not cleaned:
            return []
        return [cleaned[index : index + chunk_size] for index in range(0, len(cleaned), chunk_size)]
