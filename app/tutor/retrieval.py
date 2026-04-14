from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import case, desc, func, or_, select
from sqlalchemy.orm import Session

from app.recommendation.embeddings import build_embedding_provider
from app.tutor import repository
from app.tutor.models import TutorDocumentChunk


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
        query_embedding = self.embedding_provider.embed_texts([query])[0]
        query_tokens = set(_tokenize(query))
        candidate_limit = max(top_k * 4, top_k)

        if session.get_bind().dialect.name == "postgresql":
            semantic_rows = self._postgres_semantic_rows(
                session,
                profile_id=profile_id,
                query_embedding=query_embedding,
                limit=candidate_limit,
            )
            lexical_rows = self._sql_lexical_rows(
                session,
                profile_id=profile_id,
                query_tokens=query_tokens,
                limit=candidate_limit,
            )
        else:
            semantic_rows, lexical_rows = self._fallback_rows(
                session,
                profile_id=profile_id,
                query_embedding=query_embedding,
                query_tokens=query_tokens,
            )

        if not semantic_rows and not lexical_rows:
            return []

        semantic_order: dict[int, int] = {}
        lexical_order: dict[int, int] = {}

        semantic_rows.sort(key=lambda item: item[1], reverse=True)
        lexical_rows.sort(key=lambda item: item[1], reverse=True)

        for index, (chunk, _score) in enumerate(semantic_rows):
            semantic_order[chunk.id] = index
        for index, (chunk, _score) in enumerate(lexical_rows):
            lexical_order[chunk.id] = index

        source_by_id = {
            source.id: source for source in repository.list_profile_sources(session, profile_id=profile_id)
        }
        semantic_lookup = {chunk.id: score for chunk, score in semantic_rows}
        lexical_lookup = {chunk.id: score for chunk, score in lexical_rows}
        seen_chunk_ids = {chunk.id for chunk, _score in semantic_rows[:candidate_limit]}
        seen_chunk_ids.update(chunk.id for chunk, _score in lexical_rows[:candidate_limit])

        combined: list[RetrievedChunk] = []
        for chunk_id in seen_chunk_ids:
            chunk = next(
                (
                    candidate
                    for candidate, _score in semantic_rows + lexical_rows
                    if candidate.id == chunk_id
                ),
                None,
            )
            if chunk is None:
                continue
            semantic_score = semantic_lookup.get(chunk_id, 0.0)
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

    def _postgres_semantic_rows(
        self,
        session: Session,
        *,
        profile_id: int,
        query_embedding: list[float],
        limit: int,
    ) -> list[tuple[TutorDocumentChunk, float]]:
        rows = session.execute(
            select(
                TutorDocumentChunk,
                (1 - TutorDocumentChunk.embedding.cosine_distance(query_embedding)).label("semantic_score"),
            )
            .where(
                TutorDocumentChunk.profile_id == profile_id,
                TutorDocumentChunk.embedding.is_not(None),
            )
            .order_by(TutorDocumentChunk.embedding.cosine_distance(query_embedding).asc(), TutorDocumentChunk.id.asc())
            .limit(limit)
        ).all()
        return [(chunk, float(score or 0.0)) for chunk, score in rows]

    def _sql_lexical_rows(
        self,
        session: Session,
        *,
        profile_id: int,
        query_tokens: set[str],
        limit: int,
    ) -> list[tuple[TutorDocumentChunk, float]]:
        if not query_tokens:
            return []
        haystack = func.lower(func.coalesce(TutorDocumentChunk.search_vector, TutorDocumentChunk.content))
        token_filters = [haystack.like(f"%{token}%") for token in query_tokens]
        overlap_score = sum(case((token_filter, 1), else_=0) for token_filter in token_filters).label("lexical_score")
        rows = session.execute(
            select(TutorDocumentChunk, overlap_score)
            .where(
                TutorDocumentChunk.profile_id == profile_id,
                or_(*token_filters),
            )
            .order_by(desc(overlap_score), TutorDocumentChunk.id.asc())
            .limit(limit)
        ).all()
        denominator = max(len(query_tokens), 1)
        return [(chunk, float(score or 0.0) / denominator) for chunk, score in rows]

    def _fallback_rows(
        self,
        session: Session,
        *,
        profile_id: int,
        query_embedding: list[float],
        query_tokens: set[str],
    ) -> tuple[list[tuple[Any, float]], list[tuple[Any, float]]]:
        chunks = list(repository.list_profile_chunks(session, profile_id=profile_id))
        semantic_rows: list[tuple[Any, float]] = []
        lexical_rows: list[tuple[Any, float]] = []
        for chunk in chunks:
            semantic_rows.append((chunk, _dot(query_embedding, chunk.embedding)))
            chunk_tokens = set(_tokenize(chunk.search_vector or chunk.content_tsv or chunk.content))
            overlap = len(query_tokens & chunk_tokens)
            lexical_score = overlap / max(len(query_tokens), 1)
            if overlap > 0:
                lexical_rows.append((chunk, lexical_score))
        return semantic_rows, lexical_rows
