from __future__ import annotations

import re
from difflib import SequenceMatcher

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.catalog.models import Book
from app.core.errors import ApiError
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent


def _ensure_cabinet(session: Session, cabinet_id: str) -> Cabinet:
    cabinet = session.get(Cabinet, cabinet_id)
    if cabinet is None:
        cabinet = Cabinet(id=cabinet_id, name=f"书柜 {cabinet_id}", status="active")
        session.add(cabinet)
        session.flush()
    return cabinet


def list_slots(session: Session) -> list[dict]:
    rows = session.execute(
        select(CabinetSlot, BookCopy.book_id)
        .outerjoin(BookCopy, CabinetSlot.current_copy_id == BookCopy.id)
        .order_by(CabinetSlot.slot_code.asc())
    ).all()
    return [
        {
            "slot_code": slot.slot_code,
            "status": slot.status,
            "book_id": book_id,
            "current_copy_id": slot.current_copy_id,
        }
        for slot, book_id in rows
    ]


def list_events(session: Session, limit: int = 50) -> list[dict]:
    events = session.scalars(
        select(InventoryEvent).order_by(InventoryEvent.created_at.desc(), InventoryEvent.id.desc()).limit(limit)
    ).all()
    return [
        {
            "id": event.id,
            "event_type": event.event_type,
            "slot_code": event.slot_code,
            "book_id": event.book_id,
            "copy_id": event.copy_id,
            "created_at": event.created_at.isoformat() if event.created_at else None,
        }
        for event in events
    ]


def count_events(session: Session) -> int:
    return session.scalar(select(func.count()).select_from(InventoryEvent)) or 0


def inventory_status(session: Session) -> dict:
    slots = list_slots(session)
    events = list_events(session, limit=20)
    occupied_slots = sum(1 for slot in slots if slot["status"] == "occupied")
    free_slots = sum(1 for slot in slots if slot["status"] in {"free", "empty"})
    return {
        "occupied_slots": occupied_slots,
        "free_slots": free_slots,
        "slots": slots,
        "events": events,
    }


def _normalize(text: str | None) -> str:
    return re.sub(r"\s+", "", (text or "").strip()).lower()


def _similarity(left: str | None, right: str | None) -> float:
    left_normalized = _normalize(left)
    right_normalized = _normalize(right)
    if not left_normalized or not right_normalized:
        return 0.0
    return SequenceMatcher(a=left_normalized, b=right_normalized).ratio()


def _extract_take_title(text: str) -> str:
    source = (text or "").strip()
    if not source:
        return ""

    wrapped = re.search(r"《([^》]{1,80})》", source)
    if wrapped:
        return wrapped.group(1).strip()

    cleaned = re.sub(r"\s+", "", source)
    cleaned = re.sub(r"(帮我|请|请你|麻烦|我要|我想|给我|想要)", "", cleaned)
    cleaned = re.sub(r"(取书|拿书|借书|找书|取出|拿出|取|拿|借|找)+", "", cleaned)
    cleaned = re.sub(r"(这本书|那本书|一本书|这本|那本|本书)", "", cleaned)
    cleaned = re.sub(r"[，。！？,.!?]+", "", cleaned)
    return cleaned.strip()


def _find_free_slot(session: Session, cabinet_id: str) -> CabinetSlot | None:
    slots = session.scalars(
        select(CabinetSlot)
        .where(CabinetSlot.cabinet_id == cabinet_id)
        .order_by(CabinetSlot.slot_code.asc())
    ).all()
    for slot in slots:
        if slot.status in {"empty", "free"} and slot.current_copy_id is None:
            return slot
    return None


def _find_best_catalog_match(session: Session, texts: list[str], threshold: float = 0.6) -> Book | None:
    books = session.scalars(select(Book).order_by(Book.id.asc())).all()
    best: Book | None = None
    best_score = 0.0
    for book in books:
        for text in texts:
            score = _similarity(text, book.title)
            if score > best_score:
                best = book
                best_score = score
    if best is not None and best_score >= threshold:
        return best
    return None


def _find_book_by_title(session: Session, title: str) -> Book | None:
    books = session.scalars(select(Book).order_by(Book.id.asc())).all()
    normalized_title = _normalize(title)
    for book in books:
        if _normalize(book.title) == normalized_title:
            return book
    return None


def adjust_stock_counts(
    session: Session,
    *,
    book_id: int,
    cabinet_id: str,
    total_delta: int = 0,
    available_delta: int = 0,
    reserved_delta: int = 0,
) -> BookStock:
    stock = session.scalars(
        select(BookStock).where(BookStock.book_id == book_id, BookStock.cabinet_id == cabinet_id)
    ).first()
    if stock is None:
        stock = BookStock(
            book_id=book_id,
            cabinet_id=cabinet_id,
            total_copies=0,
            available_copies=0,
            reserved_copies=0,
        )
        session.add(stock)
        session.flush()

    next_total = stock.total_copies + total_delta
    next_available = stock.available_copies + available_delta
    next_reserved = stock.reserved_copies + reserved_delta

    if next_total < 0 or next_available < 0 or next_reserved < 0:
        raise ApiError(409, "inventory_counts_invalid", "Inventory counts cannot become negative")
    if next_available + next_reserved > next_total:
        raise ApiError(409, "inventory_counts_invalid", "Inventory counts would become inconsistent")

    stock.total_copies = next_total
    stock.available_copies = next_available
    stock.reserved_copies = next_reserved
    return stock


def _serialize_book(book: Book) -> dict:
    return {
        "id": book.id,
        "title": book.title,
        "author": book.author,
        "category": book.category,
        "keywords": book.keywords,
        "summary": book.summary,
    }


def store_from_ocr_texts(
    session: Session,
    *,
    cabinet_id: str,
    ocr_texts: list[str],
    llm_provider,
) -> dict:
    if not ocr_texts:
        raise ApiError(400, "no_ocr_text", "No OCR text detected")

    _ensure_cabinet(session, cabinet_id)
    slot = _find_free_slot(session, cabinet_id)
    if slot is None:
        raise ApiError(409, "bookshelf_full", "Bookshelf is full")

    session.add(
        InventoryEvent(
            cabinet_id=cabinet_id,
            event_type="book_scanned",
            slot_code=slot.slot_code,
            payload_json={"ocr_texts": ocr_texts},
        )
    )

    book = _find_best_catalog_match(session, ocr_texts)
    source = "catalog_match"
    if book is None:
        metadata = llm_provider.parse_book_from_ocr(ocr_texts)
        title = (metadata.get("title") or (ocr_texts[0] if ocr_texts else "")).strip()
        if not title:
            raise ApiError(422, "book_parse_failed", "Unable to parse book metadata from OCR text")
        book = _find_book_by_title(session, title)
        if book is None:
            book = Book(
                title=title,
                author=metadata.get("author"),
                category=metadata.get("category"),
                keywords=metadata.get("keywords"),
                summary=metadata.get("description"),
            )
            session.add(book)
            session.flush()
        source = "llm_parse"

    copy = BookCopy(book_id=book.id, cabinet_id=cabinet_id, inventory_status="stored")
    session.add(copy)
    session.flush()

    slot.status = "occupied"
    slot.current_copy_id = copy.id
    adjust_stock_counts(
        session,
        book_id=book.id,
        cabinet_id=cabinet_id,
        total_delta=1,
        available_delta=1,
    )
    session.add(
        InventoryEvent(
            cabinet_id=cabinet_id,
            event_type="book_stored",
            slot_code=slot.slot_code,
            book_id=book.id,
            copy_id=copy.id,
            payload_json={"source": source},
        )
    )
    session.commit()

    return {
        "ok": True,
        "source": source,
        "ocr_texts": ocr_texts,
        "book": _serialize_book(book),
        "slot": {
            "slot_code": slot.slot_code,
            "status": slot.status,
            "current_copy_id": slot.current_copy_id,
        },
    }


def store_from_image_bytes(
    session: Session,
    *,
    cabinet_id: str,
    image_bytes: bytes,
    ocr_connector,
    llm_provider,
) -> dict:
    ocr_texts = ocr_connector.extract_texts_from_image_bytes(image_bytes)
    return store_from_ocr_texts(
        session,
        cabinet_id=cabinet_id,
        ocr_texts=ocr_texts,
        llm_provider=llm_provider,
    )


def take_by_text(session: Session, *, cabinet_id: str, text: str) -> dict:
    title_query = _extract_take_title(text)
    if not title_query:
        raise ApiError(400, "missing_book_title", "Please provide the title to take")

    rows = session.execute(
        select(CabinetSlot, BookCopy, Book)
        .join(BookCopy, CabinetSlot.current_copy_id == BookCopy.id)
        .join(Book, BookCopy.book_id == Book.id)
        .where(CabinetSlot.cabinet_id == cabinet_id, CabinetSlot.status == "occupied")
        .order_by(CabinetSlot.slot_code.asc())
    ).all()
    best_slot: CabinetSlot | None = None
    best_copy: BookCopy | None = None
    best_book: Book | None = None
    best_score = 0.0
    for slot, copy, book in rows:
        score = _similarity(title_query, book.title)
        if title_query and title_query in book.title:
            score += 0.2
        if score > best_score:
            best_slot = slot
            best_copy = copy
            best_book = book
            best_score = score

    if best_slot is None or best_book is None or best_copy is None or best_score < 0.5:
        raise ApiError(404, "book_not_found_on_shelf", "No matching book found on shelf")

    best_slot.status = "empty"
    best_slot.current_copy_id = None
    best_copy.inventory_status = "borrowed"
    adjust_stock_counts(
        session,
        book_id=best_book.id,
        cabinet_id=cabinet_id,
        available_delta=-1,
    )
    session.add(
        InventoryEvent(
            cabinet_id=cabinet_id,
            event_type="book_taken",
            slot_code=best_slot.slot_code,
            book_id=best_book.id,
            copy_id=best_copy.id,
            payload_json={"query": title_query},
        )
    )
    session.commit()

    return {
        "ok": True,
        "slot_code": best_slot.slot_code,
        "book": _serialize_book(best_book),
    }
