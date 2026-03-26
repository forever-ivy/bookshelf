from __future__ import annotations

import hashlib
import math
import re
from typing import Any, Protocol

try:
    from openai import OpenAI  # type: ignore
except Exception:  # pragma: no cover - optional dependency during tests
    OpenAI = None  # type: ignore[assignment]

from app.core.config import Settings, get_settings

EMBEDDING_DIMENSIONS = 1536
TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]+")


class EmbeddingProvider(Protocol):
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        ...


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def build_book_embedding_text(
    *,
    title: str,
    author: str | None = None,
    category: str | None = None,
    keywords: str | None = None,
    summary: str | None = None,
) -> str:
    lines = [f"title: {title.strip()}"]
    optional_fields = [
        ("author", author),
        ("category", category),
        ("keywords", keywords),
        ("summary", summary),
    ]
    for label, value in optional_fields:
        cleaned = _clean_text(value)
        if cleaned:
            lines.append(f"{label}: {cleaned}")
    return "\n".join(lines)


def build_book_embedding_text_from_model(book: Any) -> str:
    return build_book_embedding_text(
        title=str(book.title),
        author=getattr(book, "author", None),
        category=getattr(book, "category", None),
        keywords=getattr(book, "keywords", None),
        summary=getattr(book, "summary", None),
    )


def build_query_embedding_text(query: str) -> str:
    return f"query: {query.strip()}"


def _tokenize_text(text: str) -> list[str]:
    tokens: list[str] = []
    for match in TOKEN_PATTERN.findall(text.lower()):
        if not match:
            continue
        if any("\u4e00" <= ch <= "\u9fff" for ch in match):
            tokens.extend(match)
            if len(match) > 1:
                tokens.extend(match[index : index + 2] for index in range(len(match) - 1))
        else:
            tokens.append(match)
    return tokens


def _normalize_vector(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        vector[0] = 1.0
        return vector
    return [value / norm for value in vector]


class LocalHashEmbeddingProvider:
    def __init__(self, *, expected_dimensions: int = EMBEDDING_DIMENSIONS) -> None:
        self.expected_dimensions = expected_dimensions

    def _embed_one(self, text: str) -> list[float]:
        vector = [0.0] * self.expected_dimensions
        tokens = _tokenize_text(text)
        if not tokens:
            return _normalize_vector(vector)

        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index_a = int.from_bytes(digest[:8], "big") % self.expected_dimensions
            index_b = int.from_bytes(digest[8:16], "big") % self.expected_dimensions
            sign_a = 1.0 if digest[16] % 2 == 0 else -1.0
            sign_b = 1.0 if digest[17] % 2 == 0 else -1.0
            weight = 1.0 + min(len(token), 8) * 0.05
            vector[index_a] += sign_a * weight
            vector[index_b] += sign_b * weight * 0.5

        return _normalize_vector(vector)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(text) for text in texts]


class OpenAICompatibleEmbeddingProvider:
    def __init__(
        self,
        *,
        api_key: str,
        model: str,
        base_url: str | None = None,
        expected_dimensions: int = EMBEDDING_DIMENSIONS,
        client: Any | None = None,
    ) -> None:
        self.model = model
        self.expected_dimensions = expected_dimensions
        self.client = client or self._build_client(api_key=api_key, base_url=base_url)

    def _build_client(self, *, api_key: str, base_url: str | None) -> Any:
        if OpenAI is None:
            raise RuntimeError("openai package is not installed")
        kwargs: dict[str, Any] = {"api_key": api_key}
        if base_url:
            kwargs["base_url"] = base_url
        return OpenAI(**kwargs)

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        response = self.client.embeddings.create(
            model=self.model,
            input=texts,
            encoding_format="float",
        )
        rows = sorted(getattr(response, "data", []) or [], key=lambda item: getattr(item, "index", 0))
        if len(rows) != len(texts):
            raise RuntimeError(
                f"Embedding response count mismatch: expected {len(texts)} rows, got {len(rows)}"
            )

        embeddings: list[list[float]] = []
        for row in rows:
            embedding = [float(value) for value in (getattr(row, "embedding", None) or [])]
            if len(embedding) != self.expected_dimensions:
                raise RuntimeError(
                    f"Embedding dimension mismatch for model '{self.model}': "
                    f"expected {self.expected_dimensions}, got {len(embedding)}"
                )
            embeddings.append(embedding)
        return embeddings


def build_embedding_provider(settings: Settings | None = None) -> EmbeddingProvider:
    active_settings = settings or get_settings()
    provider_name = (active_settings.embedding_provider or "openai-compatible").strip().lower()
    if provider_name in {"hash", "local", "local-hash", "offline"}:
        return LocalHashEmbeddingProvider(expected_dimensions=active_settings.embedding_dimensions)
    if provider_name in {"openai", "openai-compatible", "sdk"}:
        api_key = active_settings.embedding_api_key or active_settings.llm_api_key
        if not api_key:
            raise RuntimeError(
                "LIBRARY_EMBEDDING_API_KEY is required for embeddings. "
                "If you want to reuse the chat key, you can set LIBRARY_LLM_API_KEY instead."
            )
        return OpenAICompatibleEmbeddingProvider(
            api_key=api_key,
            model=active_settings.embedding_model,
            base_url=active_settings.embedding_base_url or active_settings.llm_base_url,
            expected_dimensions=active_settings.embedding_dimensions,
        )
    if provider_name in {"", "null", "none", "off"}:
        raise RuntimeError("Embedding provider is disabled")
    raise RuntimeError(f"Unsupported embedding provider: {active_settings.embedding_provider}")
