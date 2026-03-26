from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import math

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.analytics.models import SearchLog
from app.catalog.models import Book
from app.inventory.models import BookStock
from app.llm.provider import RecommendationCandidate
from app.orders.models import BorrowOrder
from app.readers.models import ReaderProfile
from app.recommendation.models import RecommendationLog


@dataclass(slots=True)
class RetrievedBook:
    book_id: int
    title: str
    author: str | None
    category: str | None
    keywords: str | None
    summary: str | None
    available_copies: int


@dataclass(slots=True)
class SimilarBookCandidate(RetrievedBook):
    score: float
    retrieval_mode: str


@dataclass(slots=True)
class CollaborativeBookCandidate(RetrievedBook):
    score: float
    overlap_reader_count: int
    source_reader_count: int
    candidate_reader_count: int
    retrieval_mode: str


@dataclass(slots=True)
class HybridBookCandidate(RetrievedBook):
    score: float
    similar_score: float | None
    collaborative_score: float | None
    overlap_reader_count: int
    source_reader_count: int
    candidate_reader_count: int
    signal_sources: tuple[str, ...]
    retrieval_mode: str


@dataclass(slots=True)
class ReaderHistoryBook(RetrievedBook):
    borrowed_at: datetime | None


BORROW_SIGNAL_STATUSES = (
    "picked_from_cabinet",
    "delivering",
    "delivered",
    "completed",
    "returned",
    "returning",
)

HYBRID_SIMILAR_WEIGHT = 0.45
HYBRID_COLLABORATIVE_WEIGHT = 0.55
HYBRID_DUAL_SIGNAL_BONUS = 0.10


def _stock_counts_subquery():
    return (
        select(
            BookStock.book_id.label("book_id"),
            func.sum(BookStock.available_copies).label("available_copies"),
        )
        .group_by(BookStock.book_id)
        .subquery()
    )


def _row_to_retrieved_book(row) -> RetrievedBook:
    return RetrievedBook(
        book_id=row.book_id,
        title=row.title,
        author=row.author,
        category=row.category,
        keywords=row.keywords,
        summary=row.summary,
        available_copies=int(row.available_copies or 0),
    )


def _row_to_reader_history_book(row) -> ReaderHistoryBook:
    return ReaderHistoryBook(
        book_id=row.book_id,
        title=row.title,
        author=row.author,
        category=row.category,
        keywords=row.keywords,
        summary=row.summary,
        available_copies=int(row.available_copies or 0),
        borrowed_at=row.borrowed_at,
    )


def _score_book(query: str, book: RetrievedBook) -> float:
    normalized = query.lower().strip()
    score = 0.0
    haystacks = [
        (book.title or "").lower(),
        (book.author or "").lower(),
        (book.category or "").lower(),
        (book.keywords or "").lower(),
        (book.summary or "").lower(),
    ]
    for haystack in haystacks:
        if normalized and normalized in haystack:
            score += 5.0
        overlap = len(set(normalized) & set(haystack))
        score += overlap * 0.1
    if book.available_copies > 0:
        score += 2.0
    return score


def _matched_fields(query: str, book: RetrievedBook) -> list[str]:
    normalized = query.lower().strip()
    if not normalized:
        return []

    matches = []
    fields = {
        "title": book.title or "",
        "author": book.author or "",
        "category": book.category or "",
        "keywords": book.keywords or "",
        "summary": book.summary or "",
    }
    for field_name, value in fields.items():
        haystack = value.lower()
        if normalized in haystack or len(set(normalized) & set(haystack)) >= 2:
            matches.append(field_name)
    return matches


def _normalize_embedding(embedding: list[float] | None) -> list[float] | None:
    if embedding is None:
        return None
    vector = [float(value) for value in embedding]
    if not vector:
        return None
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return None
    return [value / norm for value in vector]


def _cosine_similarity(left: list[float] | None, right: list[float] | None) -> float:
    normalized_left = _normalize_embedding(left)
    normalized_right = _normalize_embedding(right)
    if normalized_left is None or normalized_right is None:
        return 0.0
    if len(normalized_left) != len(normalized_right):
        return 0.0
    return float(sum(a * b for a, b in zip(normalized_left, normalized_right, strict=True)))


def _keyword_overlap(source: RetrievedBook, candidate: RetrievedBook) -> list[str]:
    source_keywords = {part.strip() for part in (source.keywords or "").split(",") if part.strip()}
    candidate_keywords = {part.strip() for part in (candidate.keywords or "").split(",") if part.strip()}
    return sorted(source_keywords & candidate_keywords)[:3]


def build_similarity_explanation(source: RetrievedBook, candidate: RetrievedBook) -> str:
    reasons = []
    if source.author and candidate.author and source.author == candidate.author:
        reasons.append("\u540c\u4e00\u4f5c\u8005")
    if source.category and candidate.category and source.category == candidate.category:
        reasons.append(f"\u540c\u5c5e {source.category} \u5206\u7c7b")
    shared_keywords = _keyword_overlap(source, candidate)
    if shared_keywords:
        reasons.append("\u5171\u4eab\u5173\u952e\u8bcd\uff1a" + "\u3001".join(shared_keywords))
    if not reasons:
        reasons.append("\u5411\u91cf\u8bed\u4e49\u76f8\u8fd1")
    return "\uff1b".join(reasons)


def _detect_query_mode(query: str) -> str:
    query = query.strip()
    if not query:
        return "keyword"
    if any(ord(ch) > 127 for ch in query) or " " in query:
        return "natural_language"
    return "keyword"


def _extract_query_terms(query: str) -> list[str]:
    normalized = query.strip().lower()
    replacements = (
        "我想找",
        "我想看",
        "我想学",
        "我想了解",
        "帮我找",
        "帮我推荐",
        "请推荐",
        "推荐",
        "一本",
        "一部",
        "关于",
        "讲",
        "有关",
        "相关",
        "有没有",
        "想找",
        "的书",
        "图书",
        "书籍",
    )
    for text in replacements:
        normalized = normalized.replace(text, " ")
    chunks = []
    current = []
    for ch in normalized:
        if ch.isalnum() or ("\u4e00" <= ch <= "\u9fff"):
            current.append(ch)
        else:
            if current:
                chunks.append("".join(current))
                current = []
    if current:
        chunks.append("".join(current))

    terms = []
    seen = set()
    for chunk in chunks:
        if len(chunk) < 2:
            continue
        if chunk not in seen:
            terms.append(chunk)
            seen.add(chunk)
    return terms


def _normalize_reader_id(session: Session, reader_id: int | None) -> int | None:
    if reader_id is None:
        return None
    return reader_id if session.get(ReaderProfile, reader_id) is not None else None


def recall_candidates(session: Session) -> list[RetrievedBook]:
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            BookStock.available_copies.label("available_copies"),
        )
        .join(BookStock, BookStock.book_id == Book.id)
        .order_by(Book.id.asc())
    ).all()
    retrieved = [_row_to_retrieved_book(row) for row in rows]
    if retrieved:
        return retrieved

    fallback_rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.cast(0, BookStock.available_copies.type).label("available_copies"),
        ).order_by(Book.id.asc())
    ).all()
    return [_row_to_retrieved_book(row) for row in fallback_rows]


def get_book_for_similarity(session: Session, book_id: int) -> tuple[RetrievedBook, list[float] | None]:
    stock_counts = _stock_counts_subquery()
    row = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            Book.embedding,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.id == book_id)
    ).one_or_none()
    if row is None:
        raise LookupError(f"Book {book_id} was not found")
    embedding = [float(value) for value in row.embedding] if row.embedding is not None else None
    return _row_to_retrieved_book(row), embedding


def get_reader_recent_history(
    session: Session,
    *,
    reader_id: int,
    limit: int = 5,
) -> list[ReaderHistoryBook]:
    if session.get(ReaderProfile, reader_id) is None:
        raise LookupError(f"Reader {reader_id} was not found")

    stock_counts = _stock_counts_subquery()
    latest_borrow = (
        select(
            BorrowOrder.book_id.label("book_id"),
            func.max(
                func.coalesce(
                    BorrowOrder.completed_at,
                    BorrowOrder.delivered_at,
                    BorrowOrder.picked_at,
                    BorrowOrder.updated_at,
                    BorrowOrder.created_at,
                )
            ).label("borrowed_at"),
        )
        .where(BorrowOrder.reader_id == reader_id)
        .where(BorrowOrder.status.in_(BORROW_SIGNAL_STATUSES))
        .group_by(BorrowOrder.book_id)
        .subquery()
    )
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
            latest_borrow.c.borrowed_at,
        )
        .join(latest_borrow, latest_borrow.c.book_id == Book.id)
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .order_by(latest_borrow.c.borrowed_at.desc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [_row_to_reader_history_book(row) for row in rows]


def _vector_search_similar_books(
    session: Session,
    *,
    source_book_id: int,
    source_embedding: list[float],
    limit: int,
) -> list[SimilarBookCandidate]:
    stock_counts = _stock_counts_subquery()
    score = (1 - Book.embedding.cosine_distance(source_embedding)).label("score")
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
            score,
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.id != source_book_id)
        .where(Book.embedding.is_not(None))
        .order_by(Book.embedding.cosine_distance(source_embedding).asc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [
        SimilarBookCandidate(
            book_id=row.book_id,
            title=row.title,
            author=row.author,
            category=row.category,
            keywords=row.keywords,
            summary=row.summary,
            available_copies=int(row.available_copies or 0),
            score=float(row.score or 0.0),
            retrieval_mode="pgvector_cosine",
        )
        for row in rows
    ]


def _python_search_similar_books(
    session: Session,
    *,
    source_book_id: int,
    source_embedding: list[float],
    limit: int,
) -> list[SimilarBookCandidate]:
    stock_counts = _stock_counts_subquery()
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            Book.embedding,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.id != source_book_id)
        .where(Book.embedding.is_not(None))
        .order_by(Book.id.asc())
    ).all()
    candidates = [
        SimilarBookCandidate(
            book_id=row.book_id,
            title=row.title,
            author=row.author,
            category=row.category,
            keywords=row.keywords,
            summary=row.summary,
            available_copies=int(row.available_copies or 0),
            score=_cosine_similarity(source_embedding, row.embedding),
            retrieval_mode="python_cosine_fallback",
        )
        for row in rows
    ]
    candidates.sort(key=lambda item: (-item.score, item.book_id))
    return candidates[:limit]


def recall_similar_books(
    session: Session,
    *,
    book_id: int,
    limit: int = 5,
) -> tuple[RetrievedBook, list[SimilarBookCandidate]]:
    source, source_embedding = get_book_for_similarity(session, book_id)
    if source_embedding is None or len(source_embedding) == 0:
        raise RuntimeError(f"Book {book_id} does not have an embedding yet")

    backend_name = session.get_bind().dialect.name
    if backend_name == "postgresql":
        results = _vector_search_similar_books(
            session,
            source_book_id=book_id,
            source_embedding=source_embedding,
            limit=limit,
        )
    else:
        results = _python_search_similar_books(
            session,
            source_book_id=book_id,
            source_embedding=source_embedding,
            limit=limit,
        )
    return source, results


def _borrow_events_subquery():
    return (
        select(
            BorrowOrder.reader_id.label("reader_id"),
            BorrowOrder.book_id.label("book_id"),
        )
        .where(BorrowOrder.status.in_(BORROW_SIGNAL_STATUSES))
        .group_by(BorrowOrder.reader_id, BorrowOrder.book_id)
        .subquery()
    )


def _python_recall_collaborative_books(
    session: Session,
    *,
    source: RetrievedBook,
    book_id: int,
    limit: int,
) -> list[CollaborativeBookCandidate]:
    rows = session.execute(
        select(BorrowOrder.reader_id, BorrowOrder.book_id)
        .where(BorrowOrder.status.in_(BORROW_SIGNAL_STATUSES))
        .group_by(BorrowOrder.reader_id, BorrowOrder.book_id)
    ).all()

    book_to_readers: dict[int, set[int]] = {}
    for row in rows:
        book_to_readers.setdefault(int(row.book_id), set()).add(int(row.reader_id))

    source_readers = book_to_readers.get(book_id, set())
    if not source_readers:
        raise RuntimeError(f"Book {book_id} does not have enough borrow history yet")

    stock_counts = _stock_counts_subquery()
    candidate_rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.id != book_id)
        .order_by(Book.id.asc())
    ).all()

    candidates: list[CollaborativeBookCandidate] = []
    for row in candidate_rows:
        candidate_readers = book_to_readers.get(int(row.book_id), set())
        if not candidate_readers:
            continue
        overlap_reader_count = len(source_readers & candidate_readers)
        if overlap_reader_count == 0:
            continue
        score = overlap_reader_count / math.sqrt(len(source_readers) * len(candidate_readers))
        candidates.append(
            CollaborativeBookCandidate(
                book_id=row.book_id,
                title=row.title,
                author=row.author,
                category=row.category,
                keywords=row.keywords,
                summary=row.summary,
                available_copies=int(row.available_copies or 0),
                score=float(score),
                overlap_reader_count=overlap_reader_count,
                source_reader_count=len(source_readers),
                candidate_reader_count=len(candidate_readers),
                retrieval_mode="borrow_cooccurrence_python",
            )
        )

    candidates.sort(
        key=lambda item: (-item.score, -item.overlap_reader_count, item.book_id)
    )
    return candidates[:limit]


def recall_collaborative_books(
    session: Session,
    *,
    book_id: int,
    limit: int = 5,
) -> tuple[RetrievedBook, list[CollaborativeBookCandidate]]:
    source, _source_embedding = get_book_for_similarity(session, book_id)
    backend_name = session.get_bind().dialect.name
    if backend_name != "postgresql":
        return source, _python_recall_collaborative_books(
            session,
            source=source,
            book_id=book_id,
            limit=limit,
        )

    borrow_events = _borrow_events_subquery()
    stock_counts = _stock_counts_subquery()

    source_readers = (
        select(borrow_events.c.reader_id)
        .where(borrow_events.c.book_id == book_id)
        .subquery()
    )
    source_reader_count = int(
        session.execute(select(func.count()).select_from(source_readers)).scalar_one()
    )
    if source_reader_count == 0:
        raise RuntimeError(f"Book {book_id} does not have enough borrow history yet")

    candidate_reader_totals = (
        select(
            borrow_events.c.book_id.label("book_id"),
            func.count().label("candidate_reader_count"),
        )
        .group_by(borrow_events.c.book_id)
        .subquery()
    )
    overlap_counts = (
        select(
            borrow_events.c.book_id.label("book_id"),
            func.count().label("overlap_reader_count"),
        )
        .join(source_readers, source_readers.c.reader_id == borrow_events.c.reader_id)
        .where(borrow_events.c.book_id != book_id)
        .group_by(borrow_events.c.book_id)
        .subquery()
    )

    score_expr = (
        overlap_counts.c.overlap_reader_count
        / func.sqrt(source_reader_count * candidate_reader_totals.c.candidate_reader_count)
    ).label("score")

    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
            overlap_counts.c.overlap_reader_count,
            candidate_reader_totals.c.candidate_reader_count,
            score_expr,
        )
        .join(overlap_counts, overlap_counts.c.book_id == Book.id)
        .join(candidate_reader_totals, candidate_reader_totals.c.book_id == Book.id)
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .order_by(
            score_expr.desc(),
            overlap_counts.c.overlap_reader_count.desc(),
            Book.id.asc(),
        )
        .limit(limit)
    ).all()

    return source, [
        CollaborativeBookCandidate(
            book_id=row.book_id,
            title=row.title,
            author=row.author,
            category=row.category,
            keywords=row.keywords,
            summary=row.summary,
            available_copies=int(row.available_copies or 0),
            score=float(row.score or 0.0),
            overlap_reader_count=int(row.overlap_reader_count or 0),
            source_reader_count=source_reader_count,
            candidate_reader_count=int(row.candidate_reader_count or 0),
            retrieval_mode="borrow_cooccurrence",
        )
        for row in rows
    ]


def merge_hybrid_book_candidates(
    *,
    similar_candidates: list[SimilarBookCandidate],
    collaborative_candidates: list[CollaborativeBookCandidate],
    limit: int,
) -> list[HybridBookCandidate]:
    merged: dict[int, HybridBookCandidate] = {}

    for candidate in similar_candidates:
        merged[candidate.book_id] = HybridBookCandidate(
            book_id=candidate.book_id,
            title=candidate.title,
            author=candidate.author,
            category=candidate.category,
            keywords=candidate.keywords,
            summary=candidate.summary,
            available_copies=candidate.available_copies,
            score=HYBRID_SIMILAR_WEIGHT * float(candidate.score),
            similar_score=float(candidate.score),
            collaborative_score=None,
            overlap_reader_count=0,
            source_reader_count=0,
            candidate_reader_count=0,
            signal_sources=("similar",),
            retrieval_mode="hybrid_book_recommendation",
        )

    for candidate in collaborative_candidates:
        collaborative_component = HYBRID_COLLABORATIVE_WEIGHT * float(candidate.score)
        existing = merged.get(candidate.book_id)
        if existing is None:
            merged[candidate.book_id] = HybridBookCandidate(
                book_id=candidate.book_id,
                title=candidate.title,
                author=candidate.author,
                category=candidate.category,
                keywords=candidate.keywords,
                summary=candidate.summary,
                available_copies=candidate.available_copies,
                score=collaborative_component,
                similar_score=None,
                collaborative_score=float(candidate.score),
                overlap_reader_count=candidate.overlap_reader_count,
                source_reader_count=candidate.source_reader_count,
                candidate_reader_count=candidate.candidate_reader_count,
                signal_sources=("collaborative",),
                retrieval_mode="hybrid_book_recommendation",
            )
            continue

        existing.score += collaborative_component
        existing.collaborative_score = float(candidate.score)
        existing.overlap_reader_count = candidate.overlap_reader_count
        existing.source_reader_count = candidate.source_reader_count
        existing.candidate_reader_count = candidate.candidate_reader_count
        existing.signal_sources = ("similar", "collaborative")

    for candidate in merged.values():
        if len(candidate.signal_sources) > 1:
            candidate.score += HYBRID_DUAL_SIGNAL_BONUS

    ranked = sorted(
        merged.values(),
        key=lambda item: (-item.score, -item.overlap_reader_count, item.book_id),
    )
    return ranked[:limit]


def build_hybrid_explanation(source: RetrievedBook, candidate: HybridBookCandidate) -> str:
    reasons: list[str] = []
    if candidate.similar_score is not None:
        reasons.append(build_similarity_explanation(source, candidate))
    if candidate.overlap_reader_count > 0:
        reasons.append(
            f"\u6709 {candidate.overlap_reader_count} \u4f4d\u501f\u8fc7\u300a{source.title}\u300b"
            "\u7684\u8bfb\u8005\u4e5f\u501f\u8fc7\u8fd9\u672c\u4e66"
        )
    if not reasons:
        reasons.append("\u6df7\u5408\u4fe1\u53f7\u5339\u914d")
    return "\uff1b".join(dict.fromkeys(reasons))


def _semantic_candidate_from_row(row, *, query: str, retrieval_mode: str) -> RecommendationCandidate:
    book = _row_to_retrieved_book(row)
    matched_fields = _matched_fields(query, book)
    return RecommendationCandidate(
        book_id=book.book_id,
        title=book.title,
        score=float(row.score or 0.0),
        explanation=book.summary or book.category or "matched by semantic retrieval",
        available_copies=book.available_copies,
        deliverable=book.available_copies > 0,
        eta_minutes=15 if book.available_copies > 0 else None,
        evidence={
            "retrieval_mode": retrieval_mode,
            "matched_fields": matched_fields,
        },
    )


def _vector_search_by_query_embedding(
    session: Session,
    *,
    query: str,
    query_embedding: list[float],
    limit: int,
) -> list[RecommendationCandidate]:
    stock_counts = _stock_counts_subquery()
    score = (1 - Book.embedding.cosine_distance(query_embedding)).label("score")
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
            score,
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.embedding.is_not(None))
        .order_by(Book.embedding.cosine_distance(query_embedding).asc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [
        _semantic_candidate_from_row(row, query=query, retrieval_mode="pgvector_query_embedding")
        for row in rows
    ]


def _python_search_by_query_embedding(
    session: Session,
    *,
    query: str,
    query_embedding: list[float],
    limit: int,
) -> list[RecommendationCandidate]:
    stock_counts = _stock_counts_subquery()
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            Book.embedding,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(Book.embedding.is_not(None))
        .order_by(Book.id.asc())
    ).all()
    ranked_rows = sorted(
        rows,
        key=lambda row: (
            -_cosine_similarity(query_embedding, row.embedding),
            row.book_id,
        ),
    )[:limit]
    candidates = []
    for row in ranked_rows:
        row_with_score = type("RowWithScore", (), {
            "book_id": row.book_id,
            "title": row.title,
            "author": row.author,
            "category": row.category,
            "keywords": row.keywords,
            "summary": row.summary,
            "available_copies": row.available_copies,
            "score": _cosine_similarity(query_embedding, row.embedding),
        })()
        candidates.append(
            _semantic_candidate_from_row(
                row_with_score,
                query=query,
                retrieval_mode="python_query_embedding_fallback",
            )
        )
    return candidates


def semantic_retrieve_candidates(
    session: Session,
    *,
    query: str,
    query_embedding: list[float],
    limit: int = 10,
) -> list[RecommendationCandidate]:
    if not query_embedding:
        return []
    backend_name = session.get_bind().dialect.name
    if backend_name == "postgresql":
        return _vector_search_by_query_embedding(
            session,
            query=query,
            query_embedding=query_embedding,
            limit=limit,
        )
    return _python_search_by_query_embedding(
        session,
        query=query,
        query_embedding=query_embedding,
        limit=limit,
    )


def metadata_retrieve_candidates(
    session: Session,
    *,
    query: str,
    limit: int = 10,
) -> list[RecommendationCandidate]:
    terms = _extract_query_terms(query)
    if not terms:
        return []

    stock_counts = _stock_counts_subquery()
    score_parts = []
    filters = []
    for term in terms:
        pattern = f"%{term}%"
        term_filters = [
            Book.title.ilike(pattern),
            Book.author.ilike(pattern),
            Book.category.ilike(pattern),
            Book.keywords.ilike(pattern),
            Book.summary.ilike(pattern),
        ]
        filters.extend(term_filters)
        score_parts.extend(
            [
                case((Book.title.ilike(pattern), 6.0), else_=0.0),
                case((Book.keywords.ilike(pattern), 4.0), else_=0.0),
                case((Book.summary.ilike(pattern), 3.0), else_=0.0),
                case((Book.category.ilike(pattern), 2.0), else_=0.0),
                case((Book.author.ilike(pattern), 2.0), else_=0.0),
            ]
        )

    score_expr = sum(score_parts[1:], score_parts[0]).label("score")
    rows = session.execute(
        select(
            Book.id.label("book_id"),
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            func.coalesce(stock_counts.c.available_copies, 0).label("available_copies"),
            score_expr,
        )
        .outerjoin(stock_counts, stock_counts.c.book_id == Book.id)
        .where(or_(*filters))
        .order_by(score_expr.desc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [
        _semantic_candidate_from_row(row, query=query, retrieval_mode="metadata_query_match")
        for row in rows
        if float(row.score or 0.0) > 0.0
    ]


def hybrid_merge_candidates(
    *,
    semantic_candidates: list[RecommendationCandidate],
    metadata_candidates: list[RecommendationCandidate],
    limit: int,
) -> list[RecommendationCandidate]:
    merged: dict[int, RecommendationCandidate] = {}

    for candidate in semantic_candidates:
        copy = RecommendationCandidate(
            book_id=candidate.book_id,
            title=candidate.title,
            score=float(candidate.score),
            explanation=candidate.explanation,
            available_copies=candidate.available_copies,
            deliverable=candidate.deliverable,
            eta_minutes=candidate.eta_minutes,
            evidence=dict(candidate.evidence or {}),
            provider_note=candidate.provider_note,
        )
        merged[candidate.book_id] = copy

    for candidate in metadata_candidates:
        existing = merged.get(candidate.book_id)
        if existing is None:
            merged[candidate.book_id] = RecommendationCandidate(
                book_id=candidate.book_id,
                title=candidate.title,
                score=float(candidate.score),
                explanation=candidate.explanation,
                available_copies=candidate.available_copies,
                deliverable=candidate.deliverable,
                eta_minutes=candidate.eta_minutes,
                evidence=dict(candidate.evidence or {}),
                provider_note=candidate.provider_note,
            )
            continue

        semantic_score = float(existing.score)
        metadata_score = float(candidate.score)
        existing.score = semantic_score + metadata_score
        evidence = dict(existing.evidence or {})
        evidence["retrieval_mode"] = "hybrid_query_search"
        evidence["semantic_score"] = semantic_score
        evidence["metadata_score"] = metadata_score
        existing.evidence = evidence
        if candidate.explanation and candidate.explanation != existing.explanation:
            existing.explanation = candidate.explanation

    ranked = sorted(merged.values(), key=lambda item: (-item.score, item.book_id))
    return ranked[:limit]


def vector_retrieve_candidates(
    query: str,
    retrieved: list[RetrievedBook],
    *,
    limit: int = 10,
) -> list[RecommendationCandidate]:
    candidates = []
    for book in retrieved:
        matched_fields = _matched_fields(query, book)
        candidates.append(
            RecommendationCandidate(
                book_id=book.book_id,
                title=book.title,
                score=_score_book(query, book),
                explanation=book.summary or book.category or "matched by catalog metadata",
                available_copies=book.available_copies,
                deliverable=book.available_copies > 0,
                eta_minutes=15 if book.available_copies > 0 else None,
                evidence={
                    "retrieval_mode": "vector_fallback",
                    "matched_fields": matched_fields,
                },
            )
        )
    candidates.sort(key=lambda candidate: (-candidate.score, candidate.title))
    return candidates[:limit]


def apply_rules(candidates: list[RecommendationCandidate], session: Session) -> list[RecommendationCandidate]:
    available_book_ids = {
        row[0]
        for row in session.execute(
            select(Book.id).join(BookStock, BookStock.book_id == Book.id).where(BookStock.available_copies > 0)
        ).all()
    }
    if not available_book_ids:
        return candidates
    filtered = [candidate for candidate in candidates if candidate.book_id in available_book_ids]
    return filtered or candidates


def record_search(session: Session, reader_id: int | None, query: str) -> None:
    session.add(
        SearchLog(
            reader_id=_normalize_reader_id(session, reader_id),
            query_text=query,
            query_mode=_detect_query_mode(query),
        )
    )


def record_recommendations(
    session: Session,
    *,
    reader_id: int | None,
    query: str,
    candidates: list[RecommendationCandidate],
) -> None:
    normalized_reader_id = _normalize_reader_id(session, reader_id)
    for rank_position, candidate in enumerate(candidates, start=1):
        session.add(
            RecommendationLog(
                reader_id=normalized_reader_id,
                book_id=candidate.book_id,
                query_text=query,
                result_title=candidate.title,
                rank_position=rank_position,
                score=candidate.score,
                provider_note=candidate.provider_note,
                explanation=candidate.explanation,
                evidence_json=candidate.evidence or None,
            )
        )
