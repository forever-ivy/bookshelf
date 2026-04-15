from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.learning import repository
from app.recommendation.embeddings import build_embedding_provider


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


def _tokenize(value: str) -> list[str]:
    return [token.lower() for token in (value or "").split() if token]


@dataclass(slots=True)
class RetrievedFragment:
    fragment_id: int
    asset_id: int
    chunk_index: int
    content: str
    snippet: str
    score: float
    citation: dict[str, Any]


class LearningRetrievalService:
    def __init__(self) -> None:
        self.embedding_provider = build_embedding_provider()

    def hybrid_search(self, session: Session, *, profile_id: int, query: str, top_k: int = 6) -> list[RetrievedFragment]:
        query_embedding = self.embedding_provider.embed_texts([query])[0]
        query_tokens = set(_tokenize(query))
        fragments = list(repository.list_profile_fragments(session, profile_id=profile_id))

        ranked: list[RetrievedFragment] = []
        for fragment in fragments:
            semantic_score = _dot(query_embedding, fragment.embedding)
            fragment_tokens = set(_tokenize(fragment.search_vector or fragment.content_tsv or fragment.content))
            lexical_score = len(query_tokens & fragment_tokens) / max(len(query_tokens), 1)
            score = semantic_score + lexical_score
            if score <= 0:
                continue
            snippet = fragment.content[:180].replace("\n", " ").strip()
            ranked.append(
                RetrievedFragment(
                    fragment_id=fragment.id,
                    asset_id=fragment.asset_id,
                    chunk_index=fragment.chunk_index,
                    content=fragment.content,
                    snippet=snippet,
                    score=score,
                    citation={
                        "fragmentId": fragment.id,
                        "assetId": fragment.asset_id,
                        "chunkIndex": fragment.chunk_index,
                        "chapterLabel": fragment.chapter_label,
                        "snippet": snippet,
                        "citationAnchor": fragment.citation_anchor_json or {},
                    },
                )
            )
        ranked.sort(key=lambda item: item.score, reverse=True)
        return ranked[:top_k]
