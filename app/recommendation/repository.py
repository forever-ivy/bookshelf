from __future__ import annotations

import json
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.models import SearchLog
from app.catalog.models import Book
from app.inventory.models import BookStock
from app.llm.provider import RecommendationCandidate
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


def _detect_query_mode(query: str) -> str:
    query = query.strip()
    if not query:
        return "keyword"
    if any(ord(ch) > 127 for ch in query) or " " in query:
        return "natural_language"
    return "keyword"


def recall_candidates(session: Session) -> list[RetrievedBook]:
    stock_counts = (
        select(
            Book.id,
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
            BookStock.available_copies,
        )
        .join(BookStock, BookStock.book_id == Book.id)
        .order_by(Book.id.asc())
    )
    rows = session.execute(stock_counts).all()
    retrieved = [
        RetrievedBook(
            book_id=row.id,
            title=row.title,
            author=row.author,
            category=row.category,
            keywords=row.keywords,
            summary=row.summary,
            available_copies=int(row.available_copies or 0),
        )
        for row in rows
    ]
    if not retrieved:
        fallback_rows = session.execute(
            select(Book.id, Book.title, Book.author, Book.category, Book.keywords, Book.summary)
            .order_by(Book.id.asc())
        ).all()
        retrieved = [
            RetrievedBook(
                book_id=row.id,
                title=row.title,
                author=row.author,
                category=row.category,
                keywords=row.keywords,
                summary=row.summary,
                available_copies=0,
            )
            for row in fallback_rows
        ]
    return retrieved


def vector_retrieve_candidates(query: str, retrieved: list[RetrievedBook], *, limit: int = 10) -> list[RecommendationCandidate]:
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
    session.add(SearchLog(reader_id=reader_id, query_text=query, query_mode=_detect_query_mode(query)))


def record_recommendations(
    session: Session,
    *,
    reader_id: int | None,
    query: str,
    candidates: list[RecommendationCandidate],
) -> None:
    for rank_position, candidate in enumerate(candidates, start=1):
        session.add(
            RecommendationLog(
                reader_id=reader_id,
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
