from __future__ import annotations

from dataclasses import asdict, dataclass

from sqlalchemy.orm import Session

from app.context.engine import ContextEngine
from app.llm.provider import LLMProvider, NullLLMProvider
from app.recommendation.repository import (
    apply_rules,
    recall_candidates,
    record_recommendations,
    record_search,
    vector_retrieve_candidates,
)


@dataclass(slots=True)
class RecommendationResult:
    book_id: int
    title: str
    score: float
    explanation: str
    available_copies: int
    deliverable: bool
    eta_minutes: int | None
    evidence: dict
    provider_note: str


class RecommendationService:
    def __init__(self, session: Session, provider: LLMProvider | None = None) -> None:
        self.session = session
        self.provider = provider or NullLLMProvider()

    def search(self, *, reader_id: int | None, query: str, limit: int = 5) -> dict:
        record_search(self.session, reader_id, query)
        context = ContextEngine(self.session).build_snapshot(reader_id=reader_id, query=query)
        recalled = recall_candidates(self.session)
        candidates = vector_retrieve_candidates(query, recalled, limit=max(limit, 10))
        candidates = apply_rules(candidates, self.session)
        reranked = self.provider.rerank(query, candidates)
        provider_note = "fallback" if isinstance(self.provider, NullLLMProvider) else "provider"
        final_candidates = []
        for candidate in reranked[:limit]:
            candidate.provider_note = provider_note
            candidate.explanation = self.provider.explain(query, candidate, context.__dict__)
            final_candidates.append(candidate)

        results = [
            RecommendationResult(
                book_id=candidate.book_id,
                title=candidate.title,
                score=candidate.score,
                explanation=candidate.explanation,
                available_copies=candidate.available_copies,
                deliverable=candidate.deliverable,
                eta_minutes=candidate.eta_minutes,
                evidence=candidate.evidence or {},
                provider_note=candidate.provider_note,
            )
            for candidate in final_candidates
        ]
        record_recommendations(
            self.session,
            reader_id=reader_id,
            query=query,
            candidates=final_candidates,
        )
        self.session.commit()
        return {
            "query": query,
            "context": context.__dict__,
            "results": [asdict(result) for result in results],
        }
