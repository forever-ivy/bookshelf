from __future__ import annotations

import re
from difflib import SequenceMatcher

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog.models import Book
from app.core.errors import ApiError
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent


def _ensure_cabinet(session: Session, cabinet_id: str) -> Cabinet:
    cabinet = session.get(Cabinet, cabinet_id)
    if cabinet is None:
        cabinet_name = "主书柜" if cabinet_id == "cabinet-001" else f"智能书柜 {cabinet_id}"
        cabinet = Cabinet(id=cabinet_id, name=cabinet_name, status="active")
        session.add(cabinet)
        session.flush()
    return cabinet


def list_slots(session: Session) -> list[dict]:
    rows = session.execute(
        select(CabinetSlot, BookCopy.book_id)
        .outerjoin(BookCopy, BookCopy.current_slot_id == CabinetSlot.id)
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


def _normalized_column(column):
    return func.lower(
        func.replace(
            func.replace(
                func.replace(func.coalesce(column, ""), " ", ""),
                "\t",
                "",
            ),
            "\n",
            "",
        )
    )


def _candidate_terms(texts: list[str], *, max_terms: int = 12) -> list[str]:
    items: list[str] = []
    seen: set[str] = set()
    for text in texts:
        raw_text = (text or "").strip()
        if not raw_text:
            continue
        candidates = [_normalize(raw_text)]
        candidates.extend(_normalize(part) for part in re.split(r"[^\w\u4e00-\u9fff]+", raw_text))
        for candidate in candidates:
            if len(candidate) < 2 or candidate in seen:
                continue
            seen.add(candidate)
            items.append(candidate)
            if len(items) >= max_terms:
                return items
    return items


def _score_catalog_match(book: Book, texts: list[str]) -> float:
    best_score = 0.0
    normalized_title = _normalize(book.title)
    normalized_author = _normalize(book.author)
    for text in texts:
        normalized_text = _normalize(text)
        score = max(_similarity(text, book.title), _similarity(text, book.author))
        if normalized_text and normalized_text in normalized_title:
            score += 0.15
        if normalized_text and normalized_author and normalized_text in normalized_author:
            score += 0.1
        best_score = max(best_score, score)
    return best_score


def _extract_take_title(text: str) -> str:
    source = (text or "").strip()
    if not source:
        return ""

    wrapped = re.search(r"[《\"]([^》\"]{1,80})[》\"]", source)
    if wrapped:
        return wrapped.group(1).strip()

    cleaned = re.sub(r"\s+", "", source)
    cleaned = re.sub(r"^(请|麻烦|帮我|请帮我|我想|我要|想要)+", "", cleaned)
    cleaned = re.sub(
        r"(拿一下|取一下|借一下|拿书|取书|借书|拿出|取出|帮我拿|帮我取|帮我借|take|get)",
        "",
        cleaned,
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(r"(这本书|一本书|图书|书籍|那本书)", "", cleaned)
    cleaned = re.sub(r"[，。、“”‘’\"'!！?？:：]+", "", cleaned)
    return cleaned.strip("《》")


def _find_free_slot(session: Session, cabinet_id: str) -> CabinetSlot | None:
    return session.scalars(
        select(CabinetSlot)
        .outerjoin(BookCopy, BookCopy.current_slot_id == CabinetSlot.id)
        .where(
            CabinetSlot.cabinet_id == cabinet_id,
            BookCopy.id.is_(None),
            CabinetSlot.status.in_(["empty", "free"]),
        )
        .order_by(CabinetSlot.slot_code.asc(), CabinetSlot.id.asc())
    ).first()


def _find_book_by_title(session: Session, title: str) -> Book | None:
    normalized_title = _normalize(title)
    if not normalized_title:
        return None
    return session.scalars(
        select(Book)
        .where(_normalized_column(Book.title) == normalized_title)
        .order_by(Book.id.asc())
        .limit(1)
    ).first()


def _find_best_catalog_match(session: Session, texts: list[str], threshold: float = 0.6) -> Book | None:
    for text in texts:
        exact_match = _find_book_by_title(session, text)
        if exact_match is not None:
            return exact_match

    terms = _candidate_terms(texts)
    if not terms:
        return None

    searchable_columns = [
        _normalized_column(Book.title),
        _normalized_column(Book.author),
        _normalized_column(Book.category),
        _normalized_column(Book.keywords),
    ]
    predicates = [column.like(f"%{term}%") for term in terms for column in searchable_columns]
    candidates = session.scalars(
        select(Book)
        .where(or_(*predicates))
        .order_by(Book.id.asc())
        .limit(200)
    ).all()
    if not candidates:
        return None

    best: Book | None = None
    best_score = 0.0
    for candidate in candidates:
        score = _score_catalog_match(candidate, texts)
        if score > best_score:
            best = candidate
            best_score = score
    if best is not None and best_score >= threshold:
        return best
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

    copy = BookCopy(book_id=book.id, current_slot_id=slot.id, inventory_status="stored")
    session.add(copy)
    session.flush()

    slot.status = "occupied"
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
            "current_copy_id": copy.id,
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


def take_by_text(
    session: Session,
    *,
    cabinet_id: str,
    text: str,
    order_id: int | None = None,
    fulfillment_id: int | None = None,
) -> dict:
    from app.orders.models import BorrowOrder, OrderFulfillment

    if fulfillment_id is None and order_id is None:
        raise ApiError(400, "fulfillment_binding_required", "Taking a book requires an order or fulfillment binding")

    title_query = _extract_take_title(text)
    if not title_query:
        raise ApiError(400, "missing_book_title", "Please provide the title to take")

    if fulfillment_id is None and order_id is not None:
        order = session.get(BorrowOrder, order_id)
        if order is None:
            raise ApiError(404, "borrow_order_not_found", "Borrow order not found")
        fulfillment = session.scalars(
            select(OrderFulfillment)
            .where(OrderFulfillment.borrow_order_id == order.id)
            .order_by(OrderFulfillment.id.asc())
            .limit(1)
        ).first()
        if fulfillment is None:
            raise ApiError(404, "fulfillment_not_found", "Fulfillment not found")
        fulfillment_id = fulfillment.id

    fulfillment = session.get(OrderFulfillment, fulfillment_id)
    if fulfillment is None:
        raise ApiError(404, "fulfillment_not_found", "Fulfillment not found")

    order = session.get(BorrowOrder, fulfillment.borrow_order_id)
    if order is None or order.fulfilled_copy_id is None:
        raise ApiError(404, "borrow_order_not_found", "Borrow order not found")
    copy = session.get(BookCopy, order.fulfilled_copy_id)
    book = session.get(Book, order.requested_book_id)
    if copy is None or book is None:
        raise ApiError(404, "order_copy_missing", "Borrow order copy not found")
    if fulfillment.source_cabinet_id and fulfillment.source_cabinet_id != cabinet_id:
        raise ApiError(409, "cabinet_mismatch", "Fulfillment does not belong to the active cabinet")

    score = _similarity(title_query, book.title)
    normalized_query = _normalize(title_query)
    if normalized_query and normalized_query in _normalize(book.title):
        score += 0.2
    if score < 0.5:
        raise ApiError(404, "book_not_found_on_shelf", "No matching book found for the fulfillment")

    source_slot = session.get(CabinetSlot, fulfillment.source_slot_id) if fulfillment.source_slot_id is not None else None
    if source_slot is not None:
        source_slot.status = "empty"

    available_delta = -1 if copy.inventory_status == "stored" else 0
    reserved_delta = -1 if copy.inventory_status in {"reserved", "in_delivery"} else 0
    copy.current_slot_id = None
    if order.fulfillment_mode == "robot_delivery":
        copy.inventory_status = "in_delivery"
        order.status = "picked_from_cabinet"
        fulfillment.status = "picked_from_cabinet"
        if order.picked_at is None:
            order.picked_at = utc_now()
        if fulfillment.picked_at is None:
            fulfillment.picked_at = utc_now()
    else:
        copy.inventory_status = "borrowed"
        order.status = "delivered"
        if order.picked_at is None:
            order.picked_at = utc_now()
        if order.delivered_at is None:
            order.delivered_at = utc_now()
        fulfillment.status = "delivered"
        if fulfillment.picked_at is None:
            fulfillment.picked_at = utc_now()
        if fulfillment.delivered_at is None:
            fulfillment.delivered_at = utc_now()
    adjust_stock_counts(
        session,
        book_id=book.id,
        cabinet_id=cabinet_id,
        available_delta=available_delta,
        reserved_delta=reserved_delta,
    )
    session.add(
        InventoryEvent(
            cabinet_id=cabinet_id,
            event_type="book_taken",
            slot_code=None if source_slot is None else source_slot.slot_code,
            book_id=book.id,
            copy_id=copy.id,
            payload_json={
                "query": title_query,
                "borrowOrderId": order.id,
                "fulfillmentId": fulfillment.id,
            },
        )
    )
    session.commit()

    return {
        "ok": True,
        "slotCode": None if source_slot is None else source_slot.slot_code,
        "book": _serialize_book(book),
        "orderId": order.id,
        "fulfillmentId": fulfillment.id,
    }
