from __future__ import annotations

from dataclasses import asdict, dataclass

from sqlalchemy.orm import Session

from app.context.engine import ContextEngine
from app.llm.provider import LLMProvider, NullLLMProvider, RecommendationCandidate
from app.recommendation.embeddings import (
    EmbeddingProvider,
    build_embedding_provider,
    build_query_embedding_text,
)
from app.recommendation.ml import build_recommendation_ml_reranker
from app.recommendation.repository import (
    apply_rules,
    build_hybrid_explanation,
    build_similarity_explanation,
    get_reader_recent_history,
    recall_collaborative_books,
    merge_hybrid_book_candidates,
    hybrid_merge_candidates,
    metadata_retrieve_candidates,
    recall_candidates,
    recall_similar_books,
    record_recommendations,
    record_search,
    semantic_retrieve_candidates,
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


@dataclass(slots=True)
class SimilarBookResult:
    book_id: int
    title: str
    author: str | None
    category: str | None
    score: float
    explanation: str
    available_copies: int
    deliverable: bool
    eta_minutes: int | None
    evidence: dict
    provider_note: str


@dataclass(slots=True)
class CollaborativeBookResult:
    book_id: int
    title: str
    author: str | None
    category: str | None
    score: float
    explanation: str
    available_copies: int
    deliverable: bool
    eta_minutes: int | None
    evidence: dict
    provider_note: str


@dataclass(slots=True)
class HybridBookResult:
    book_id: int
    title: str
    author: str | None
    category: str | None
    score: float
    explanation: str
    available_copies: int
    deliverable: bool
    eta_minutes: int | None
    evidence: dict
    provider_note: str


@dataclass(slots=True)
class PersonalizedBookResult:
    book_id: int
    title: str
    author: str | None
    category: str | None
    score: float
    explanation: str
    available_copies: int
    deliverable: bool
    eta_minutes: int | None
    evidence: dict
    provider_note: str


class RecommendationService:
    def __init__(
        self,
        session: Session,
        provider: LLMProvider | None = None,
        embedding_provider: EmbeddingProvider | None = None,
    ) -> None:
        self.session = session
        self.provider = provider or NullLLMProvider()
        self.embedding_provider = embedding_provider
        self.ml_reranker = build_recommendation_ml_reranker()

    @staticmethod
    def _history_book_ids(history_books: list) -> list[int]:
        return [int(book.book_id) for book in history_books]

    def search(self, *, reader_id: int | None, query: str, limit: int = 5) -> dict:
        record_search(self.session, reader_id, query)
        context = ContextEngine(self.session).build_snapshot(reader_id=reader_id, query=query)
        history_book_ids: list[int] = []
        if reader_id is not None:
            history_book_ids = self._history_book_ids(
                get_reader_recent_history(self.session, reader_id=reader_id, limit=5)
            )
        embedding_provider = self.embedding_provider or build_embedding_provider()
        query_text = build_query_embedding_text(query)
        query_embedding = embedding_provider.embed_texts([query_text])[0]
        semantic_candidates = semantic_retrieve_candidates(
            self.session,
            query=query,
            query_embedding=query_embedding,
            limit=max(limit, 10),
        )
        metadata_candidates = metadata_retrieve_candidates(
            self.session,
            query=query,
            limit=max(limit, 10),
        )
        candidates = hybrid_merge_candidates(
            semantic_candidates=semantic_candidates,
            metadata_candidates=metadata_candidates,
            limit=max(limit, 10),
        )
        if not candidates:
            recalled = recall_candidates(self.session)
            candidates = vector_retrieve_candidates(query, recalled, limit=max(limit, 10))
        candidates = apply_rules(candidates, self.session)
        provider_reranked = self.provider.rerank(query, candidates)
        ranking = self.ml_reranker.rerank(
            mode="search",
            candidates=provider_reranked,
            reader_id=reader_id,
            history_book_ids=history_book_ids,
        )
        provider_note = "fallback" if isinstance(self.provider, NullLLMProvider) else "provider"
        final_candidates = []
        for candidate in provider_reranked[:limit]:
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
            "ranking": ranking,
            "results": [asdict(result) for result in results],
        }

    def similar_books(self, *, reader_id: int | None, book_id: int, limit: int = 5) -> dict:
        source, candidates = recall_similar_books(self.session, book_id=book_id, limit=limit)
        results = [
            SimilarBookResult(
                book_id=candidate.book_id,
                title=candidate.title,
                author=candidate.author,
                category=candidate.category,
                score=candidate.score,
                explanation=build_similarity_explanation(source, candidate),
                available_copies=candidate.available_copies,
                deliverable=candidate.available_copies > 0,
                eta_minutes=15 if candidate.available_copies > 0 else None,
                evidence={"retrieval_mode": candidate.retrieval_mode},
                provider_note="embedding",
            )
            for candidate in candidates
        ]
        ranking = self.ml_reranker.rerank(
            mode="similar",
            candidates=results,
            source_book_id=source.book_id,
        )
        record_recommendations(
            self.session,
            reader_id=reader_id,
            query=f"similar_book:{book_id}",
            candidates=[
                RecommendationCandidate(
                    book_id=result.book_id,
                    title=result.title,
                    score=result.score,
                    explanation=result.explanation,
                    available_copies=result.available_copies,
                    deliverable=result.deliverable,
                    eta_minutes=result.eta_minutes,
                    evidence=result.evidence,
                    provider_note=result.provider_note,
                )
                for result in results
            ],
        )
        self.session.commit()
        return {
            "source_book": {
                "book_id": source.book_id,
                "title": source.title,
                "author": source.author,
                "category": source.category,
                "available_copies": source.available_copies,
            },
            "ranking": ranking,
            "results": [asdict(result) for result in results],
        }

    def collaborative_books(self, *, reader_id: int | None, book_id: int, limit: int = 5) -> dict:
        source, candidates = recall_collaborative_books(self.session, book_id=book_id, limit=limit)
        results = [
            CollaborativeBookResult(
                book_id=candidate.book_id,
                title=candidate.title,
                author=candidate.author,
                category=candidate.category,
                score=candidate.score,
                explanation=(
                    f"\u6709 {candidate.overlap_reader_count} \u4f4d\u501f\u8fc7\u300a{source.title}\u300b"
                    f"\u7684\u8bfb\u8005\u4e5f\u501f\u8fc7\u8fd9\u672c\u4e66"
                ),
                available_copies=candidate.available_copies,
                deliverable=candidate.available_copies > 0,
                eta_minutes=15 if candidate.available_copies > 0 else None,
                evidence={
                    "retrieval_mode": candidate.retrieval_mode,
                    "overlap_reader_count": candidate.overlap_reader_count,
                    "source_reader_count": candidate.source_reader_count,
                    "candidate_reader_count": candidate.candidate_reader_count,
                },
                provider_note="collaborative",
            )
            for candidate in candidates
        ]
        ranking = self.ml_reranker.rerank(
            mode="collaborative",
            candidates=results,
            source_book_id=source.book_id,
        )
        record_recommendations(
            self.session,
            reader_id=reader_id,
            query=f"collaborative_book:{book_id}",
            candidates=[
                RecommendationCandidate(
                    book_id=result.book_id,
                    title=result.title,
                    score=result.score,
                    explanation=result.explanation,
                    available_copies=result.available_copies,
                    deliverable=result.deliverable,
                    eta_minutes=result.eta_minutes,
                    evidence=result.evidence,
                    provider_note=result.provider_note,
                )
                for result in results
            ],
        )
        self.session.commit()
        return {
            "source_book": {
                "book_id": source.book_id,
                "title": source.title,
                "author": source.author,
                "category": source.category,
                "available_copies": source.available_copies,
            },
            "ranking": ranking,
            "results": [asdict(result) for result in results],
        }

    def hybrid_books(self, *, reader_id: int | None, book_id: int, limit: int = 5) -> dict:
        source = None
        similar_candidates = []
        collaborative_candidates = []
        similar_error: RuntimeError | None = None
        collaborative_error: RuntimeError | None = None
        candidate_limit = max(limit * 3, 10)

        try:
            source, similar_candidates = recall_similar_books(
                self.session,
                book_id=book_id,
                limit=candidate_limit,
            )
        except LookupError:
            raise
        except RuntimeError as exc:
            similar_error = exc

        try:
            collaborative_source, collaborative_candidates = recall_collaborative_books(
                self.session,
                book_id=book_id,
                limit=candidate_limit,
            )
            if source is None:
                source = collaborative_source
        except LookupError:
            raise
        except RuntimeError as exc:
            collaborative_error = exc

        if source is None:
            raise LookupError(f"Book {book_id} was not found")

        candidates = merge_hybrid_book_candidates(
            similar_candidates=similar_candidates,
            collaborative_candidates=collaborative_candidates,
            limit=limit,
        )
        if not candidates:
            reasons = [str(exc) for exc in (similar_error, collaborative_error) if exc is not None]
            detail = "; ".join(reasons) or f"Book {book_id} does not have enough recommendation signals yet"
            raise RuntimeError(detail)

        results = [
            HybridBookResult(
                book_id=candidate.book_id,
                title=candidate.title,
                author=candidate.author,
                category=candidate.category,
                score=candidate.score,
                explanation=build_hybrid_explanation(source, candidate),
                available_copies=candidate.available_copies,
                deliverable=candidate.available_copies > 0,
                eta_minutes=15 if candidate.available_copies > 0 else None,
                evidence={
                    "retrieval_mode": candidate.retrieval_mode,
                    "signal_sources": list(candidate.signal_sources),
                    "similar_score": candidate.similar_score,
                    "collaborative_score": candidate.collaborative_score,
                    "overlap_reader_count": candidate.overlap_reader_count,
                    "source_reader_count": candidate.source_reader_count,
                    "candidate_reader_count": candidate.candidate_reader_count,
                },
                provider_note="hybrid",
            )
            for candidate in candidates
        ]
        ranking = self.ml_reranker.rerank(
            mode="hybrid",
            candidates=results,
            source_book_id=source.book_id,
        )
        record_recommendations(
            self.session,
            reader_id=reader_id,
            query=f"hybrid_book:{book_id}",
            candidates=[
                RecommendationCandidate(
                    book_id=result.book_id,
                    title=result.title,
                    score=result.score,
                    explanation=result.explanation,
                    available_copies=result.available_copies,
                    deliverable=result.deliverable,
                    eta_minutes=result.eta_minutes,
                    evidence=result.evidence,
                    provider_note=result.provider_note,
                )
                for result in results
            ],
        )
        self.session.commit()
        return {
            "source_book": {
                "book_id": source.book_id,
                "title": source.title,
                "author": source.author,
                "category": source.category,
                "available_copies": source.available_copies,
            },
            "ranking": ranking,
            "results": [asdict(result) for result in results],
        }

    def personalized_books(self, *, reader_id: int, limit: int = 5, history_limit: int = 3) -> dict:
        if history_limit <= 0:
            raise ValueError("history_limit must be greater than 0")

        history_books = get_reader_recent_history(
            self.session,
            reader_id=reader_id,
            limit=history_limit,
        )
        if not history_books:
            raise RuntimeError(f"Reader {reader_id} does not have enough borrow history yet")

        borrowed_ids = {book.book_id for book in history_books}
        candidate_limit = max(limit * 3, 10)
        aggregated: dict[int, dict] = {}

        for history_index, history_book in enumerate(history_books):
            history_weight = max(0.55, 1.0 - history_index * 0.15)

            try:
                _source, similar_candidates = recall_similar_books(
                    self.session,
                    book_id=history_book.book_id,
                    limit=candidate_limit,
                )
            except RuntimeError:
                similar_candidates = []

            try:
                _source, collaborative_candidates = recall_collaborative_books(
                    self.session,
                    book_id=history_book.book_id,
                    limit=candidate_limit,
                )
            except RuntimeError:
                collaborative_candidates = []

            for candidate in similar_candidates:
                if candidate.book_id in borrowed_ids:
                    continue
                entry = aggregated.setdefault(
                    candidate.book_id,
                    {
                        "book_id": candidate.book_id,
                        "title": candidate.title,
                        "author": candidate.author,
                        "category": candidate.category,
                        "available_copies": candidate.available_copies,
                        "score": 0.0,
                        "similar_score": 0.0,
                        "collaborative_score": 0.0,
                        "overlap_reader_count": 0,
                        "history_book_ids": set(),
                        "history_titles": [],
                        "signal_sources": set(),
                    },
                )
                weighted_score = float(candidate.score) * 0.45 * history_weight
                entry["score"] += weighted_score
                entry["similar_score"] += weighted_score
                entry["history_book_ids"].add(history_book.book_id)
                if history_book.title not in entry["history_titles"]:
                    entry["history_titles"].append(history_book.title)
                entry["signal_sources"].add("similar")

            for candidate in collaborative_candidates:
                if candidate.book_id in borrowed_ids:
                    continue
                entry = aggregated.setdefault(
                    candidate.book_id,
                    {
                        "book_id": candidate.book_id,
                        "title": candidate.title,
                        "author": candidate.author,
                        "category": candidate.category,
                        "available_copies": candidate.available_copies,
                        "score": 0.0,
                        "similar_score": 0.0,
                        "collaborative_score": 0.0,
                        "overlap_reader_count": 0,
                        "history_book_ids": set(),
                        "history_titles": [],
                        "signal_sources": set(),
                    },
                )
                weighted_score = float(candidate.score) * 0.55 * history_weight
                entry["score"] += weighted_score
                entry["collaborative_score"] += weighted_score
                entry["overlap_reader_count"] += int(candidate.overlap_reader_count)
                entry["history_book_ids"].add(history_book.book_id)
                if history_book.title not in entry["history_titles"]:
                    entry["history_titles"].append(history_book.title)
                entry["signal_sources"].add("collaborative")

        if not aggregated:
            raise RuntimeError(f"Reader {reader_id} does not have enough recommendation signals yet")

        ranked_rows = []
        for entry in aggregated.values():
            if len(entry["signal_sources"]) > 1:
                entry["score"] += 0.08
            ranked_rows.append(entry)

        ranked_rows.sort(
            key=lambda item: (-item["score"], -item["overlap_reader_count"], item["book_id"])
        )

        results = []
        for entry in ranked_rows[:limit]:
            history_titles = entry["history_titles"][:2]
            if "collaborative" in entry["signal_sources"] and history_titles:
                explanation = (
                    f"\u7ed3\u5408\u4f60\u6700\u8fd1\u501f\u9605\u7684\u300a{history_titles[0]}\u300b"
                    f"\u7b49\u56fe\u4e66\uff0c\u4e14\u76f8\u4f3c\u8bfb\u8005\u4e5f\u7ecf\u5e38\u501f\u8fd9\u672c\u4e66"
                )
            elif history_titles:
                explanation = f"\u57fa\u4e8e\u4f60\u6700\u8fd1\u501f\u9605\u7684\u300a{history_titles[0]}\u300b\u7b49\u56fe\u4e66\u8fdb\u884c\u5185\u5bb9\u63a8\u8350"
            else:
                explanation = "\u57fa\u4e8e\u4f60\u7684\u501f\u9605\u5386\u53f2\u751f\u6210\u7684\u4e2a\u6027\u5316\u63a8\u8350"

            results.append(
                PersonalizedBookResult(
                    book_id=entry["book_id"],
                    title=entry["title"],
                    author=entry["author"],
                    category=entry["category"],
                    score=entry["score"],
                    explanation=explanation,
                    available_copies=entry["available_copies"],
                    deliverable=entry["available_copies"] > 0,
                    eta_minutes=15 if entry["available_copies"] > 0 else None,
                    evidence={
                        "retrieval_mode": "personalized_hybrid_history",
                        "signal_sources": sorted(entry["signal_sources"]),
                        "history_book_ids": sorted(entry["history_book_ids"]),
                        "history_titles": entry["history_titles"][:3],
                        "similar_score": entry["similar_score"],
                        "collaborative_score": entry["collaborative_score"],
                        "overlap_reader_count": entry["overlap_reader_count"],
                    },
                    provider_note="personalized",
                )
            )

        ranking = self.ml_reranker.rerank(
            mode="personalized",
            candidates=results,
            reader_id=reader_id,
            history_book_ids=self._history_book_ids(history_books),
        )

        record_recommendations(
            self.session,
            reader_id=reader_id,
            query=f"personalized_reader:{reader_id}",
            candidates=[
                RecommendationCandidate(
                    book_id=result.book_id,
                    title=result.title,
                    score=result.score,
                    explanation=result.explanation,
                    available_copies=result.available_copies,
                    deliverable=result.deliverable,
                    eta_minutes=result.eta_minutes,
                    evidence=result.evidence,
                    provider_note=result.provider_note,
                )
                for result in results
            ],
        )
        self.session.commit()
        return {
            "reader_id": reader_id,
            "history_books": [
                {
                    "book_id": book.book_id,
                    "title": book.title,
                    "author": book.author,
                    "category": book.category,
                    "borrowed_at": book.borrowed_at.isoformat() if book.borrowed_at else None,
                }
                for book in history_books
            ],
            "ranking": ranking,
            "results": [asdict(result) for result in results],
        }

    @staticmethod
    def _build_demo_queries(history_books: list[dict]) -> list[str]:
        if not history_books:
            return [
                "\u6211\u60f3\u627e\u4e00\u672c\u81ea\u7136\u79d1\u666e\u7c7b\u7684\u4e66",
                "\u63a8\u8350\u4e00\u672c\u7edf\u8ba1\u5b66\u5165\u95e8\u4e66",
            ]

        first = history_books[0]
        queries = [f"\u6211\u60f3\u627e\u4e00\u672c\u548c\u300a{first['title']}\u300b\u7c7b\u4f3c\u7684\u4e66"]
        category = first.get("category")
        if category:
            queries.append(f"\u6211\u60f3\u627e\u4e00\u672c\u5173\u4e8e{category}\u7684\u4e66")
        if len(history_books) > 1:
            queries.append(
                f"\u8bf7\u6839\u636e\u300a{history_books[0]['title']}\u300b\u548c\u300a{history_books[1]['title']}\u300b\u7ed9\u6211\u63a8\u8350"
            )
        return queries

    def recommendation_dashboard(self, *, reader_id: int, limit: int = 5, history_limit: int = 3) -> dict:
        personalized_payload = self.personalized_books(
            reader_id=reader_id,
            limit=limit,
            history_limit=history_limit,
        )
        history_books = personalized_payload["history_books"]
        focus_book = history_books[0] if history_books else None
        modules = {
            "similar": {"ok": False, "source_book": None, "results": [], "error": None},
            "collaborative": {"ok": False, "source_book": None, "results": [], "error": None},
            "hybrid": {"ok": False, "source_book": None, "results": [], "error": None},
        }

        if focus_book is not None:
            focus_book_id = int(focus_book["book_id"])

            try:
                payload = self.similar_books(reader_id=reader_id, book_id=focus_book_id, limit=limit)
                modules["similar"] = {"ok": True, **payload, "error": None}
            except RuntimeError as exc:
                modules["similar"]["error"] = str(exc)

            try:
                payload = self.collaborative_books(reader_id=reader_id, book_id=focus_book_id, limit=limit)
                modules["collaborative"] = {"ok": True, **payload, "error": None}
            except RuntimeError as exc:
                modules["collaborative"]["error"] = str(exc)

            try:
                payload = self.hybrid_books(reader_id=reader_id, book_id=focus_book_id, limit=limit)
                modules["hybrid"] = {"ok": True, **payload, "error": None}
            except RuntimeError as exc:
                modules["hybrid"]["error"] = str(exc)

        return {
            "reader_id": reader_id,
            "history_books": history_books,
            "personalized": personalized_payload["results"],
            "focus_book": focus_book,
            "modules": modules,
            "suggested_queries": self._build_demo_queries(history_books),
        }
