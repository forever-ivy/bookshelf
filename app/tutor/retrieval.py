from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.recommendation.embeddings import build_embedding_provider
from app.tutor import repository


TOKEN_PATTERN = re.compile(r"[A-Za-z0-9_]+|[\u4e00-\u9fff]+")


def _tokenize(value: str) -> list[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(value or "") if token]


def _vector_to_list(value: Any) -> list[float]:
    if value is None:
        return []
    if isinstance(value, list):
        return [float(item) for item in value]
    if hasattr(value, "tolist"):
        return [float(item) for item in value.tolist()]
    try:
        return [float(item) for item in value]
    except TypeError:
        return []


def _dot(left: list[float] | None, right: Any) -> float:
    left_values = _vector_to_list(left)
    right_values = _vector_to_list(right)
    if len(left_values) == 0 or len(right_values) == 0:
        return 0.0
    return float(sum(a * b for a, b in zip(left_values, right_values)))


def _rrf_score(rank: int, *, k: int = 60) -> float:
    return 1.0 / (k + rank + 1)


@dataclass(slots=True)
class RetrievedChunk:
    chunk_id: int
    document_id: int
    chunk_index: int
    content: str
    snippet: str
    score: float
    citation: dict[str, Any]


class TutorRetrievalService:
    def __init__(self) -> None:
        self.embedding_provider = build_embedding_provider()

    def hybrid_search(self, session: Session, *, profile_id: int, query: str, top_k: int = 5) -> list[RetrievedChunk]:
        chunks = list(repository.list_profile_chunks(session, profile_id=profile_id))
        if not chunks:
            return []

        query_embedding = self.embedding_provider.embed_texts([query])[0]
        query_tokens = set(_tokenize(query))

        semantic_rows: list[tuple[Any, float]] = []
        lexical_rows: list[tuple[Any, float]] = []
        semantic_order: dict[int, int] = {}
        lexical_order: dict[int, int] = {}

        for chunk in chunks:
            semantic_rows.append((chunk, _dot(query_embedding, chunk.embedding)))
            chunk_tokens = set(_tokenize(chunk.content_tsv or chunk.content))
            overlap = len(query_tokens & chunk_tokens)
            lexical_score = overlap / max(len(query_tokens), 1)
            if overlap > 0:
                lexical_rows.append((chunk, lexical_score))

        semantic_rows.sort(key=lambda item: item[1], reverse=True)
        lexical_rows.sort(key=lambda item: item[1], reverse=True)

        for index, (chunk, _score) in enumerate(semantic_rows):
            semantic_order[chunk.id] = index
        for index, (chunk, _score) in enumerate(lexical_rows):
            lexical_order[chunk.id] = index

        source_by_id = {
            source.id: source for source in repository.list_profile_sources(session, profile_id=profile_id)
        }

        combined: list[RetrievedChunk] = []
        for chunk, semantic_score in semantic_rows[: max(top_k * 3, top_k)]:
            lexical_rank = lexical_order.get(chunk.id)
            lexical_score = 0.0 if lexical_rank is None else _rrf_score(lexical_rank)
            score = _rrf_score(semantic_order.get(chunk.id, 0)) + lexical_score + max(semantic_score, 0.0) * 0.1
            source = source_by_id.get(chunk.document_id)
            snippet = chunk.content[:180].strip().replace("\n", " ")
            combined.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    snippet=snippet,
                    score=score,
                    citation={
                        "chunkId": chunk.id,
                        "documentId": chunk.document_id,
                        "chunkIndex": chunk.chunk_index,
                        "fileName": getattr(source, "file_name", None),
                        "snippet": snippet,
                    },
                )
            )

        combined.sort(key=lambda item: item.score, reverse=True)
        return combined[:top_k]
