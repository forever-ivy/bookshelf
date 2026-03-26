from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from itertools import chain

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog.models import Book
from app.inventory.models import BookCopy, BookStock, CabinetSlot
from app.orders.models import BorrowOrder


COVER_TONES = ("apricot", "blue", "coral", "lavender", "mint")


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
    delivery_available = compute_delivery_available(available_copies, storage_slots)
    stock_status = compute_stock_status(total_copies, available_copies)
    tags = [tag for tag in chain([book.category], (book.keywords or "").split(",")) if tag]
    deduped_tags = list(dict.fromkeys(tag.strip() for tag in tags if tag.strip()))
    tone_index = (book.id or 0) % len(COVER_TONES)
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "category": book.category,
        "keywords": book.keywords,
        "summary": book.summary,
        "total_copies": total_copies,
        "available_copies": available_copies,
        "stock_status": stock_status,
        "delivery_available": delivery_available,
        "storage_slots": storage_slots,
        "availability_label": "馆藏充足 · 可立即借阅" if available_copies > 0 else "暂不可借",
        "cabinet_label": storage_slots[0] if storage_slots else "主书柜",
        "cover_tone": COVER_TONES[tone_index],
        "cover_url": getattr(book, "cover_url", None),
        "eta_minutes": 15 if delivery_available else None,
        "eta_label": "15 分钟可送达" if delivery_available else "到柜自取",
        "matched_fields": [],
        "recommendation_reason": None,
        "shelf_label": "主馆 2 楼",
        "tag_names": deduped_tags,
        "tags": deduped_tags,
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


def find_related_books(session: Session, *, source_book: Book, limit: int = 5) -> list[Book]:
    candidates = session.scalars(
        select(Book).where(Book.id != source_book.id).order_by(Book.title.asc(), Book.id.asc())
    ).all()
    source_keywords = {item.strip().lower() for item in (source_book.keywords or "").split(",") if item.strip()}
    scored: list[tuple[int, Book]] = []
    for candidate in candidates:
        score = 0
        if candidate.category and candidate.category == source_book.category:
            score += 3
        if candidate.author and source_book.author and candidate.author == source_book.author:
            score += 2
        candidate_keywords = {item.strip().lower() for item in (candidate.keywords or "").split(",") if item.strip()}
        score += len(source_keywords & candidate_keywords)
        if score > 0:
            scored.append((score, candidate))
    scored.sort(key=lambda item: (-item[0], item[1].title, item[1].id))
    return [candidate for _, candidate in scored[:limit]]


def find_people_also_borrowed_books(session: Session, *, source_book_id: int, limit: int = 5) -> list[Book]:
    reader_ids = list(
        session.scalars(
            select(BorrowOrder.reader_id)
            .where(BorrowOrder.book_id == source_book_id)
            .distinct()
        )
    )
    if not reader_ids:
        source_book = get_book_by_id(session, source_book_id)
        if source_book is None:
            return []
        return find_related_books(session, source_book=source_book, limit=limit)

    candidate_rows = session.execute(
        select(BorrowOrder.book_id, func.count().label("borrow_count"))
        .where(BorrowOrder.reader_id.in_(reader_ids), BorrowOrder.book_id != source_book_id)
        .group_by(BorrowOrder.book_id)
        .order_by(func.count().desc(), BorrowOrder.book_id.asc())
        .limit(limit)
    ).all()
    book_ids = [int(row.book_id) for row in candidate_rows]
    if not book_ids:
        source_book = get_book_by_id(session, source_book_id)
        if source_book is None:
            return []
        return find_related_books(session, source_book=source_book, limit=limit)
    books = session.scalars(select(Book).where(Book.id.in_(book_ids))).all()
    order_map = {book_id: index for index, book_id in enumerate(book_ids)}
    return sorted(books, key=lambda book: order_map.get(book.id, book.id))


def build_book_detail_payload(session: Session, book: Book) -> dict:
    payload = build_book_payload(session, book)
    related_books = build_book_payloads(session, find_related_books(session, source_book=book, limit=5))
    people_also_borrowed = build_book_payloads(
        session,
        find_people_also_borrowed_books(session, source_book_id=book.id, limit=5),
    )
    return {
        **payload,
        "contents": [
            "第 1 章 概览",
            "第 2 章 核心概念",
            "第 3 章 应用与实践",
        ],
        "location_note": f"{payload['shelf_label']} · {payload['cabinet_label']}",
        "people_also_borrowed": people_also_borrowed,
        "related_books": related_books,
        "recommendation_reason": payload["recommendation_reason"],
    }
