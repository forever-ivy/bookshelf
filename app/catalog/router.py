from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.catalog.service import (
    build_book_detail_payload,
    build_book_payload,
    build_book_payloads,
    find_related_books,
    get_book_by_id,
    search_books,
)
from app.core.database import get_db
from app.core.errors import ApiError

router = APIRouter(prefix="/api/v1/catalog", tags=["catalog"])


@router.get("/books")
def list_books(
    query: str | None = Query(default=None, description="Search title, author, category, keywords, or summary"),
    db: Session = Depends(get_db),
) -> dict:
    books = search_books(db, query=query)
    items = build_book_payloads(db, books)
    return {"items": items, "total": len(items), "query": query}


@router.get("/books/search")
def search_books_endpoint(
    query: str = Query(min_length=1),
    db: Session = Depends(get_db),
) -> dict:
    books = search_books(db, query=query)
    items = build_book_payloads(db, books)
    return {"items": items, "total": len(items), "query": query}


@router.get("/books/{book_id}")
def get_book(book_id: int, db: Session = Depends(get_db)) -> dict:
    book = get_book_by_id(db, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return build_book_detail_payload(db, book)


@router.get("/books/{book_id}/related")
def get_related_books(book_id: int, db: Session = Depends(get_db)) -> dict:
    book = get_book_by_id(db, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return {"items": build_book_payloads(db, find_related_books(db, source_book=book, limit=6))}
