from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Protocol

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency during tests
    OpenAI = None  # type: ignore[assignment]

from app.core.config import get_settings


@dataclass(slots=True)
class RecommendationCandidate:
    book_id: int
    title: str
    score: float
    explanation: str
    available_copies: int = 0
    deliverable: bool = False
    eta_minutes: int | None = None
    evidence: dict | None = None
    provider_note: str = "fallback"


class LLMProvider(Protocol):
    def rerank(self, query: str, candidates: list[RecommendationCandidate]) -> list[RecommendationCandidate]:
        ...

    def explain(self, query: str, candidate: RecommendationCandidate, context: dict) -> str:
        ...

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        ...

    def chat(self, *, text: str, context: dict) -> str:
        ...


class NullLLMProvider:
    def rerank(self, query: str, candidates: list[RecommendationCandidate]) -> list[RecommendationCandidate]:
        return candidates

    def explain(self, query: str, candidate: RecommendationCandidate, context: dict) -> str:
        return candidate.explanation

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {
            "title": ocr_texts[0] if ocr_texts else "未识别图书",
            "author": "",
            "category": "",
            "keywords": "",
            "description": "",
        }

    def chat(self, *, text: str, context: dict) -> str:
        instruction = (context or {}).get("instruction")
        if instruction:
            return f"根据当前资料，我先给出一个保守回答：{text[:80]}。"
        available_titles = context.get("inventory", {}).get("available_titles", [])
        if available_titles:
            return f"可以先看看这些书：{'、'.join(available_titles[:3])}。"
        return f"我已经收到你的问题：{text}。如果你愿意，我可以继续帮你找书或推荐图书。"


class OpenAICompatibleLLMProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str | None = None,
        client: Any | None = None,
        timeout_seconds: float = 5.0,
    ) -> None:
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.client = client or self._build_client(api_key=api_key, base_url=base_url)

    def _build_client(self, *, api_key: str, base_url: str | None) -> Any:
        if OpenAI is None:
            raise RuntimeError("openai package is not installed")
        kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return OpenAI(**kwargs)

    @staticmethod
    def _extract_text(response: Any) -> str:
        choices = getattr(response, "choices", None) or []
        if not choices:
            return ""
        message = getattr(choices[0], "message", None)
        if message is None:
            return ""
        content = getattr(message, "content", "")
        if isinstance(content, list):
            return "".join(str(item) for item in content)
        return str(content or "")

    @staticmethod
    def _clean_json_payload(text: str) -> str:
        cleaned = text.strip()
        cleaned = cleaned.replace("```json", "").replace("```", "").strip()
        return cleaned

    def _chat(self, messages: list[dict[str, str]]) -> str:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0,
            timeout=self.timeout_seconds,
        )
        return self._extract_text(response)

    def rerank(self, query: str, candidates: list[RecommendationCandidate]) -> list[RecommendationCandidate]:
        if len(candidates) <= 1:
            return candidates
        prompt = {
            "query": query,
            "candidates": [
                {
                    "book_id": candidate.book_id,
                    "title": candidate.title,
                    "explanation": candidate.explanation,
                    "available_copies": candidate.available_copies,
                    "deliverable": candidate.deliverable,
                }
                for candidate in candidates
            ],
            "instruction": "Return a JSON array of book_id values ordered from best to worst match.",
        }
        text = self._chat(
            [
                {
                    "role": "system",
                    "content": "You rank library book candidates and return JSON only.",
                },
                {
                    "role": "user",
                    "content": json.dumps(prompt, ensure_ascii=False),
                },
            ]
        )
        try:
            ordered_ids = json.loads(self._clean_json_payload(text))
            if not isinstance(ordered_ids, list):
                return candidates
            order = {int(book_id): index for index, book_id in enumerate(ordered_ids)}
            ranked = sorted(candidates, key=lambda candidate: order.get(candidate.book_id, len(order)))
            if ranked == candidates:
                return candidates
            return ranked
        except Exception:
            return candidates

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        text = self._chat(
            [
                {
                    "role": "system",
                    "content": "You extract book metadata from OCR and return JSON only.",
                },
                {
                    "role": "user",
                    "content": "OCR 文本如下：\n" + "\n".join(ocr_texts),
                },
            ]
        )
        try:
            parsed = json.loads(self._clean_json_payload(text))
            if isinstance(parsed, dict) and parsed.get("title"):
                return parsed
        except Exception:
            pass
        return {
            "title": ocr_texts[0] if ocr_texts else "未识别图书",
            "author": "",
            "category": "",
            "keywords": "",
            "description": "",
        }

    def explain(self, query: str, candidate: RecommendationCandidate, context: dict) -> str:
        book_id = getattr(candidate, "book_id", None)
        text = self._chat(
            [
                {
                    "role": "system",
                    "content": "You explain why a book matches a user's need in Chinese, in one short sentence.",
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "query": query,
                            "candidate": {
                                "title": candidate.title,
                                "book_id": book_id,
                                "explanation": candidate.explanation,
                            },
                            "context": context,
                        },
                        ensure_ascii=False,
                    ),
                },
            ]
        )
        return text.strip() or candidate.explanation

    def chat(self, *, text: str, context: dict) -> str:
        system_prompt = context.get("systemPrompt") or "You are a helpful library assistant. Reply in Chinese."
        instruction = context.get("instruction") or "Reply in Chinese with one concise helpful sentence for a library reader."
        prompt = {
            "text": text,
            "context": {key: value for key, value in context.items() if key not in {"systemPrompt", "instruction"}},
            "instruction": instruction,
        }
        reply = self._chat(
            [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": json.dumps(prompt, ensure_ascii=False),
                },
            ]
        )
        return reply.strip()


class MockLLMProvider:
    def __init__(self, titles_in_order: list[str] | None = None) -> None:
        self.titles_in_order = titles_in_order

    def rerank(self, query: str, candidates: list[RecommendationCandidate]) -> list[RecommendationCandidate]:
        if not self.titles_in_order:
            return candidates
        order = {title: index for index, title in enumerate(self.titles_in_order)}
        return sorted(candidates, key=lambda candidate: order.get(candidate.title, len(order)))

    def explain(self, query: str, candidate: RecommendationCandidate, context: dict) -> str:
        return f"Recommended for '{query}' based on {candidate.title}."

    def chat(self, *, text: str, context: dict) -> str:
        return f"Mock reply for '{text}'."

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {
            "title": ocr_texts[0] if ocr_texts else "未识别图书",
            "author": "",
            "category": "",
            "keywords": "",
            "description": "",
        }


def build_llm_provider() -> LLMProvider:
    settings = get_settings()
    provider_name = (settings.llm_provider or "null").strip().lower()
    if provider_name in {"", "null", "none", "off"}:
        return NullLLMProvider()
    if provider_name in {"openai", "openai-compatible", "sdk"}:
        if not settings.llm_api_key:
            raise RuntimeError("LIBRARY_LLM_API_KEY is required for the OpenAI-compatible provider")
        return OpenAICompatibleLLMProvider(
            api_key=settings.llm_api_key,
            model=settings.llm_model,
            base_url=settings.llm_base_url,
            timeout_seconds=settings.llm_timeout_seconds,
        )
    return NullLLMProvider()
