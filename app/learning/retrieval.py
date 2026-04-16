from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.learning import repository
from app.learning.graph import LearningGraphService
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


def _context_item_to_citation(item: Any) -> dict[str, Any]:
    snippet = (item.content or item.summary or "")[:180].replace("\n", " ").strip()
    return {
        "fragmentId": None,
        "assetId": None,
        "chunkIndex": None,
        "chapterLabel": getattr(item, "title", None),
        "snippet": snippet,
        "citationAnchor": {
            "contextItemId": item.id,
            "sourceSessionId": item.source_session_id,
            "sourceTurnId": item.source_turn_id,
        },
    }


@dataclass(slots=True)
class RetrievedFragment:
    fragment_id: int
    asset_id: int
    chunk_index: int
    content: str
    snippet: str
    score: float
    citation: dict[str, Any]


@dataclass(slots=True)
class EvidenceBundle:
    citations: list[dict[str, Any]]
    related_concepts: list[str]


class LearningRetrievalService:
    def __init__(self) -> None:
        self.embedding_provider = build_embedding_provider()
        self.graph_service = LearningGraphService()

    def hybrid_search(
        self,
        session: Session,
        *,
        profile_id: int,
        query: str,
        top_k: int = 6,
        preferred_keywords: list[str] | None = None,
        exclude_fragment_ids: set[int] | None = None,
    ) -> list[RetrievedFragment]:
        query_embedding = self.embedding_provider.embed_texts([query])[0]
        query_tokens = set(_tokenize(query))
        preferred_tokens = set(_tokenize(" ".join(preferred_keywords or [])))
        fragments = list(repository.list_profile_fragments(session, profile_id=profile_id))
        excluded = set(exclude_fragment_ids or set())

        ranked: list[RetrievedFragment] = []
        for fragment in fragments:
            if int(fragment.id) in excluded:
                continue
            semantic_score = _dot(query_embedding, fragment.embedding)
            fragment_tokens = set(_tokenize(fragment.search_vector or fragment.content_tsv or fragment.content))
            lexical_score = len(query_tokens & fragment_tokens) / max(len(query_tokens), 1)
            step_overlap = len(preferred_tokens & fragment_tokens) / max(len(preferred_tokens), 1) if preferred_tokens else 0.0
            score = semantic_score + lexical_score + step_overlap * 1.5
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

    def guide_search(
        self,
        session: Session,
        *,
        profile_id: int,
        guide_session_id: int,
        step_index: int,
        query: str,
        top_k: int = 6,
        preferred_keywords: list[str] | None = None,
    ) -> EvidenceBundle:
        preferred_keywords = list(preferred_keywords or [])
        context_items = repository.list_step_context_items(session, guide_session_id=guide_session_id, step_index=step_index)
        priority = [_context_item_to_citation(item) for item in context_items]

        graph_candidates = self.graph_service.list_step_fragment_candidates(
            profile_id=profile_id,
            step_index=step_index,
            keywords=preferred_keywords,
            limit=top_k,
        )
        graph_fragment_ids = [candidate.fragment_id for candidate in graph_candidates]
        graph_layer = self._hydrate_graph_citations(session, profile_id=profile_id, fragment_ids=graph_fragment_ids)

        fallback = self.hybrid_search(
            session,
            profile_id=profile_id,
            query=query,
            top_k=top_k,
            preferred_keywords=preferred_keywords,
            exclude_fragment_ids=set(graph_fragment_ids),
        )
        citations = self._merge_citations(priority=priority, graph_layer=graph_layer, fallback=[item.citation for item in fallback], limit=top_k)
        related_concepts = self._merge_related_concepts(
            graph_candidates=[candidate.concepts for candidate in graph_candidates],
            preferred_keywords=preferred_keywords,
            citations=citations,
        )
        return EvidenceBundle(citations=citations, related_concepts=related_concepts)

    def explore_search(
        self,
        session: Session,
        *,
        profile_id: int,
        query: str,
        top_k: int = 6,
        focus_keywords: list[str] | None = None,
        source_session_id: int | None = None,
        focus_step_index: int | None = None,
    ) -> EvidenceBundle:
        focus_keywords = list(focus_keywords or [])
        priority: list[dict[str, Any]] = []
        if source_session_id is not None and focus_step_index is not None:
            context_items = repository.list_step_context_items(
                session,
                guide_session_id=source_session_id,
                step_index=focus_step_index,
            )
            priority = [_context_item_to_citation(item) for item in context_items]

        graph_candidates = self.graph_service.list_focus_fragment_candidates(
            profile_id=profile_id,
            keywords=focus_keywords,
            limit=top_k,
        )
        graph_fragment_ids = [candidate.fragment_id for candidate in graph_candidates]
        graph_layer = self._hydrate_graph_citations(session, profile_id=profile_id, fragment_ids=graph_fragment_ids)
        fallback = self.hybrid_search(
            session,
            profile_id=profile_id,
            query=query,
            top_k=top_k,
            preferred_keywords=focus_keywords,
            exclude_fragment_ids=set(graph_fragment_ids),
        )
        citations = self._merge_citations(priority=priority, graph_layer=graph_layer, fallback=[item.citation for item in fallback], limit=top_k)
        related_concepts = self._merge_related_concepts(
            graph_candidates=[candidate.concepts for candidate in graph_candidates],
            preferred_keywords=focus_keywords,
            citations=citations,
        )
        return EvidenceBundle(citations=citations, related_concepts=related_concepts)

    def _merge_citations(
        self,
        *,
        priority: list[dict[str, Any]],
        graph_layer: list[dict[str, Any]],
        fallback: list[dict[str, Any]],
        limit: int,
    ) -> list[dict[str, Any]]:
        seen: set[tuple[Any, Any, Any, str]] = set()
        merged: list[dict[str, Any]] = []
        for candidate in [*priority, *graph_layer, *fallback]:
            key = (
                candidate.get("fragmentId"),
                candidate.get("assetId"),
                candidate.get("chunkIndex"),
                candidate.get("snippet", ""),
            )
            if key in seen:
                continue
            seen.add(key)
            merged.append(candidate)
            if len(merged) >= limit:
                break
        return merged

    def _merge_related_concepts(
        self,
        *,
        graph_candidates: list[list[str]],
        preferred_keywords: list[str],
        citations: list[dict[str, Any]],
    ) -> list[str]:
        ordered: list[str] = []
        seen: set[str] = set()
        for concept in [*preferred_keywords, *[item for group in graph_candidates for item in group]]:
            normalized = str(concept or "").strip()
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            ordered.append(normalized)
        if ordered:
            return ordered[:6]

        for citation in citations[:2]:
            for token in _tokenize(citation.get("snippet") or "")[:6]:
                if token in seen:
                    continue
                seen.add(token)
                ordered.append(token)
        return ordered[:6]

    def _hydrate_graph_citations(
        self,
        session: Session,
        *,
        profile_id: int,
        fragment_ids: list[int],
    ) -> list[dict[str, Any]]:
        rows = repository.list_profile_fragments_by_ids(session, profile_id=profile_id, fragment_ids=fragment_ids)
        citations: list[dict[str, Any]] = []
        for fragment in rows:
            snippet = fragment.content[:180].replace("\n", " ").strip()
            citations.append(
                {
                    "fragmentId": fragment.id,
                    "assetId": fragment.asset_id,
                    "chunkIndex": fragment.chunk_index,
                    "chapterLabel": fragment.chapter_label,
                    "snippet": snippet,
                    "citationAnchor": fragment.citation_anchor_json or {},
                }
            )
        return citations
