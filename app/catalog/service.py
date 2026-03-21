from __future__ import annotations

from collections.abc import Iterable
from collections import defaultdict

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog.models import Book
from app.inventory.models import BookCopy, BookStock, CabinetSlot


def _normalize(value: str | None) -> str:
    return (value or "").strip().lower()


def compute_stock_status(total_copies: int, available_copies: int) -> str:
    if total_copies <= 0 or available_copies <= 0:
        return "out_of_stock"
    return "available"


def compute_delivery_available(available_copies: int, storage_slots: list[str]) -> bool:
    return available_copies > 0 and bool(storage_slots)


def _stock_map(session: Session, book_ids: list[int]) -> dict[int, list[BookStock]]:
    rows = session.scalars(select(BookStock).where(BookStock.book_id.in_(book_ids))).all()
    grouped: dict[int, list[BookStock]] = defaultdict(list)
    for row in rows:
        grouped[row.book_id].append(row)
    return grouped


def _slot_map(session: Session, book_ids: list[int]) -> dict[int, list[CabinetSlot]]:
    rows = session.execute(
        select(CabinetSlot, BookCopy.book_id)
        .join(BookCopy, CabinetSlot.current_copy_id == BookCopy.id)
        .where(BookCopy.book_id.in_(book_ids))
    ).all()
    grouped: dict[int, list[CabinetSlot]] = defaultdict(list)
    for slot, book_id in rows:
        grouped[book_id].append(slot)
    return grouped


def _build_payload_from_maps(
    book: Book,
    stocks_by_book: dict[int, list[BookStock]],
    slots_by_book: dict[int, list[CabinetSlot]],
) -> dict:
    stocks = stocks_by_book.get(book.id, [])
    slots = slots_by_book.get(book.id, [])
    total_copies = sum(stock.total_copies for stock in stocks)
    available_copies = sum(stock.available_copies for stock in stocks)
    storage_slots = [slot.slot_code for slot in slots if slot.status == "occupied"]
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "category": book.category,
        "keywords": book.keywords,
        "summary": book.summary,
        "total_copies": total_copies,
        "available_copies": available_copies,
        "stock_status": compute_stock_status(total_copies, available_copies),
        "delivery_available": compute_delivery_available(available_copies, storage_slots),
        "storage_slots": storage_slots,
    }


def build_book_payload(session: Session, book: Book) -> dict:
    return build_book_payloads(session, [book])[0]


def build_book_payloads(session: Session, books: list[Book]) -> list[dict]:
    if not books:
        return []
    book_ids = [book.id for book in books]
    stocks_by_book = _stock_map(session, book_ids)
    slots_by_book = _slot_map(session, book_ids)
    return [_build_payload_from_maps(book, stocks_by_book, slots_by_book) for book in books]


def search_books(session: Session, query: str | None = None) -> list[Book]:
    stmt = select(Book)
    clean_query = _normalize(query)
    if clean_query:
        pattern = f"%{clean_query}%"
        stmt = stmt.where(
            or_(
                func.lower(Book.title).like(pattern),
                func.lower(func.coalesce(Book.author, "")).like(pattern),
                func.lower(func.coalesce(Book.category, "")).like(pattern),
                func.lower(func.coalesce(Book.keywords, "")).like(pattern),
                func.lower(func.coalesce(Book.summary, "")).like(pattern),
            )
        )
    stmt = stmt.order_by(Book.title.asc(), Book.id.asc())
    return list(session.scalars(stmt).all())


def get_book_by_id(session: Session, book_id: int) -> Book | None:
    return session.get(Book, book_id)
