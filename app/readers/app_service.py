from __future__ import annotations

from datetime import timezone, timedelta

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.admin.models import TopicBooklist, TopicBooklistItem
from app.catalog.models import Book
from app.catalog.service import build_book_payload, build_book_payloads
from app.core.errors import ApiError
from app.db.base import utc_now
from app.orders.models import BorrowOrder, DeliveryOrder, ReturnRequest
from app.readers.models import (
    DismissedNotification,
    FavoriteBook,
    ReaderBooklist,
    ReaderBooklistItem,
    ReaderProfile,
)
from app.recommendation.models import RecommendationLog


FINAL_READER_ORDER_STATUSES = {"completed", "cancelled", "returned"}
WATCH_LATER_BOOKLIST_TITLE = "稍后再看"


def _iso(value) -> str | None:
    return value.isoformat() if value is not None else None


def _as_utc(value):
    if value is None:
        return None
    if getattr(value, "tzinfo", None) is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _require_profile(session: Session, reader_id: int) -> ReaderProfile:
    profile = session.get(ReaderProfile, reader_id)
    if profile is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return profile


def _require_book(session: Session, book_id: int) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return book


def _favorite_out(session: Session, favorite: FavoriteBook) -> dict:
    book = _require_book(session, favorite.book_id)
    return {
        "id": favorite.id,
        "book_id": favorite.book_id,
        "created_at": _iso(favorite.created_at),
        "book": build_book_payload(session, book),
    }


def _favorite_out_from_payload(favorite: FavoriteBook, book_payload: dict) -> dict:
    return {
        "id": favorite.id,
        "book_id": favorite.book_id,
        "created_at": _iso(favorite.created_at),
        "book": book_payload,
    }


def _normalize_search_text(value: str | None) -> str:
    return (value or "").strip().lower()


def _normalize_notification_id(value: str | None) -> str:
    notification_id = (value or "").strip()
    if not notification_id:
        raise ApiError(400, "notification_id_required", "Notification id is required")
    return notification_id


def list_favorite_books(
    session: Session,
    *,
    reader_id: int,
    query: str | None = None,
    category: str | None = None,
) -> list[dict]:
    _require_profile(session, reader_id)
    stmt = (
        select(FavoriteBook, Book)
        .join(Book, FavoriteBook.book_id == Book.id)
        .where(FavoriteBook.reader_id == reader_id)
        .order_by(FavoriteBook.created_at.desc(), FavoriteBook.id.desc())
    )

    clean_query = _normalize_search_text(query)
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

    clean_category = (category or "").strip()
    if clean_category:
        stmt = stmt.where(func.lower(func.coalesce(Book.category, "")) == clean_category.lower())

    rows = session.execute(stmt).all()
    book_payloads = build_book_payloads(session, [book for _, book in rows])
    return [
        _favorite_out_from_payload(favorite, book_payload)
        for (favorite, _book), book_payload in zip(rows, book_payloads, strict=False)
    ]


def add_favorite_book(session: Session, *, reader_id: int, book_id: int) -> dict:
    _require_profile(session, reader_id)
    _require_book(session, book_id)
    existing = session.scalar(
        select(FavoriteBook).where(FavoriteBook.reader_id == reader_id, FavoriteBook.book_id == book_id)
    )
    if existing is not None:
        return _favorite_out(session, existing)
    favorite = FavoriteBook(reader_id=reader_id, book_id=book_id)
    session.add(favorite)
    session.commit()
    session.refresh(favorite)
    return _favorite_out(session, favorite)


def remove_favorite_book(session: Session, *, reader_id: int, book_id: int) -> None:
    _require_profile(session, reader_id)
    existing = session.scalar(
        select(FavoriteBook).where(FavoriteBook.reader_id == reader_id, FavoriteBook.book_id == book_id)
    )
    if existing is None:
        return
    session.delete(existing)
    session.commit()


def _booklist_books(session: Session, *, book_ids: list[int]) -> list[dict]:
    if not book_ids:
        return []
    books = session.scalars(select(Book).where(Book.id.in_(book_ids))).all()
    order_map = {book_id: index for index, book_id in enumerate(book_ids)}
    books = sorted(books, key=lambda item: order_map.get(item.id, item.id))
    return build_book_payloads(session, books)


def _require_reader_booklist(session: Session, *, reader_id: int, booklist_id: int) -> ReaderBooklist:
    booklist = session.scalar(
        select(ReaderBooklist).where(ReaderBooklist.id == booklist_id, ReaderBooklist.reader_id == reader_id)
    )
    if booklist is None:
        raise ApiError(404, "reader_booklist_not_found", "Reader booklist not found")
    return booklist


def _validate_book_ids(session: Session, *, book_ids: list[int]) -> list[int]:
    if not book_ids:
        return []
    found_ids = set(session.scalars(select(Book.id).where(Book.id.in_(book_ids))).all())
    if found_ids != set(book_ids):
        raise ApiError(404, "reader_booklist_book_not_found", "One or more books were not found")
    return book_ids


def _append_books_to_booklist(session: Session, *, booklist: ReaderBooklist, book_ids: list[int]) -> None:
    valid_book_ids = _validate_book_ids(session, book_ids=book_ids)
    if not valid_book_ids:
        return

    existing_book_ids = list(
        session.scalars(
            select(ReaderBooklistItem.book_id)
            .where(ReaderBooklistItem.booklist_id == booklist.id)
            .order_by(ReaderBooklistItem.rank_position.asc(), ReaderBooklistItem.id.asc())
        )
    )
    if not existing_book_ids:
        next_rank = 1
    else:
        next_rank = len(existing_book_ids) + 1
    existing_book_id_set = set(existing_book_ids)

    for book_id in valid_book_ids:
        if book_id in existing_book_id_set:
            continue
        session.add(ReaderBooklistItem(booklist_id=booklist.id, book_id=book_id, rank_position=next_rank))
        next_rank += 1


def _custom_booklist_out(session: Session, booklist: ReaderBooklist) -> dict:
    book_ids = list(
        session.scalars(
            select(ReaderBooklistItem.book_id)
            .where(ReaderBooklistItem.booklist_id == booklist.id)
            .order_by(ReaderBooklistItem.rank_position.asc(), ReaderBooklistItem.id.asc())
        )
    )
    return {
        "id": str(booklist.id),
        "title": booklist.title,
        "description": booklist.description,
        "source": "custom",
        "books": _booklist_books(session, book_ids=book_ids),
    }


def _system_booklist_out(session: Session, topic: TopicBooklist) -> dict:
    book_ids = list(
        session.scalars(
            select(TopicBooklistItem.book_id)
            .where(TopicBooklistItem.topic_booklist_id == topic.id)
            .order_by(TopicBooklistItem.rank_position.asc(), TopicBooklistItem.id.asc())
        )
    )
    return {
        "id": str(topic.id),
        "slug": topic.slug,
        "title": topic.title,
        "description": topic.description,
        "source": "system",
        "books": _booklist_books(session, book_ids=book_ids),
    }


def list_system_booklists(session: Session, *, limit: int = 6) -> list[dict]:
    topics = session.scalars(
        select(TopicBooklist)
        .where(TopicBooklist.status == "active")
        .order_by(TopicBooklist.updated_at.desc(), TopicBooklist.id.desc())
        .limit(limit)
    ).all()
    return [_system_booklist_out(session, topic) for topic in topics]


def list_reader_booklists(session: Session, *, reader_id: int) -> dict:
    _require_profile(session, reader_id)
    custom_booklists = session.scalars(
        select(ReaderBooklist)
        .where(ReaderBooklist.reader_id == reader_id)
        .order_by(ReaderBooklist.updated_at.desc(), ReaderBooklist.id.desc())
    ).all()
    return {
        "custom_items": [_custom_booklist_out(session, item) for item in custom_booklists],
        "system_items": list_system_booklists(session),
    }


def create_reader_booklist(
    session: Session,
    *,
    reader_id: int,
    title: str,
    description: str | None,
    book_ids: list[int],
) -> dict:
    _require_profile(session, reader_id)
    clean_title = (title or "").strip()
    if not clean_title:
        raise ApiError(400, "reader_booklist_invalid", "Booklist title is required")

    existing_watch_later = None
    if clean_title == WATCH_LATER_BOOKLIST_TITLE:
        existing_watch_later = session.scalar(
            select(ReaderBooklist)
            .where(ReaderBooklist.reader_id == reader_id, ReaderBooklist.title == WATCH_LATER_BOOKLIST_TITLE)
            .order_by(ReaderBooklist.id.asc())
        )
    if existing_watch_later is not None:
        if not existing_watch_later.description and description:
            existing_watch_later.description = description
        _append_books_to_booklist(session, booklist=existing_watch_later, book_ids=book_ids)
        session.commit()
        session.refresh(existing_watch_later)
        return _custom_booklist_out(session, existing_watch_later)

    _validate_book_ids(session, book_ids=book_ids)
    booklist = ReaderBooklist(reader_id=reader_id, title=clean_title, description=description)
    session.add(booklist)
    session.flush()
    _append_books_to_booklist(session, booklist=booklist, book_ids=book_ids)
    session.commit()
    session.refresh(booklist)
    return _custom_booklist_out(session, booklist)


def add_book_to_reader_booklist(session: Session, *, reader_id: int, booklist_id: int, book_id: int) -> dict:
    _require_profile(session, reader_id)
    booklist = _require_reader_booklist(session, reader_id=reader_id, booklist_id=booklist_id)
    _append_books_to_booklist(session, booklist=booklist, book_ids=[book_id])
    session.commit()
    session.refresh(booklist)
    return _custom_booklist_out(session, booklist)


def remove_book_from_reader_booklist(session: Session, *, reader_id: int, booklist_id: int, book_id: int) -> dict:
    _require_profile(session, reader_id)
    booklist = _require_reader_booklist(session, reader_id=reader_id, booklist_id=booklist_id)
    item = session.scalar(
        select(ReaderBooklistItem).where(
            ReaderBooklistItem.booklist_id == booklist.id,
            ReaderBooklistItem.book_id == book_id,
        )
    )
    if item is not None:
        session.delete(item)
        remaining_items = session.scalars(
            select(ReaderBooklistItem)
            .where(ReaderBooklistItem.booklist_id == booklist.id)
            .order_by(ReaderBooklistItem.rank_position.asc(), ReaderBooklistItem.id.asc())
        ).all()
        for index, remaining_item in enumerate(remaining_items, start=1):
            remaining_item.rank_position = index
        session.commit()
        session.refresh(booklist)
        return _custom_booklist_out(session, booklist)

    session.commit()
    session.refresh(booklist)
    return _custom_booklist_out(session, booklist)


def list_reader_notifications(session: Session, *, reader_id: int, limit: int = 8) -> list[dict]:
    _require_profile(session, reader_id)
    now = utc_now()
    items: list[dict] = []

    active_rows = session.execute(
        select(BorrowOrder, Book, DeliveryOrder)
        .join(Book, BorrowOrder.book_id == Book.id)
        .join(DeliveryOrder, DeliveryOrder.borrow_order_id == BorrowOrder.id, isouter=True)
        .where(BorrowOrder.reader_id == reader_id, BorrowOrder.status.not_in(FINAL_READER_ORDER_STATUSES))
        .order_by(BorrowOrder.updated_at.desc(), BorrowOrder.id.desc())
        .limit(3)
    ).all()
    for order, book, delivery in active_rows:
        due_at = _as_utc(order.due_at)
        if due_at is not None and due_at <= now + timedelta(days=2):
            items.append(
                {
                    "id": f"due-{order.id}",
                    "kind": "reminder",
                    "title": "借阅临近到期",
                    "body": f"《{book.title}》将于 {due_at.date().isoformat()} 到期，请尽快续借或归还。",
                }
            )
            continue
        if order.order_mode == "robot_delivery":
            destination = delivery.delivery_target if delivery is not None else "阅览区"
            items.append(
                {
                    "id": f"delivery-{order.id}",
                    "kind": "delivery",
                    "title": "配送状态更新",
                    "body": f"《{book.title}》当前状态为 {order.status}，配送目标：{destination}。",
                }
            )
            continue
        items.append(
            {
                "id": f"borrow-{order.id}",
                "kind": "borrowing",
                "title": "借阅状态更新",
                "body": f"《{book.title}》当前借阅状态为 {order.status}。",
            }
        )

    completed_orders = int(
        session.scalar(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == reader_id, BorrowOrder.status.in_(["completed", "returned"]))
        )
        or 0
    )
    if completed_orders > 0:
        items.append(
            {
                "id": f"achievement-completed-{reader_id}",
                "kind": "achievement",
                "title": "借阅里程碑更新",
                "body": f"你已经完成 {completed_orders} 次借阅闭环，继续保持阅读节奏。",
            }
        )

    if list_system_booklists(session, limit=1):
        items.append(
            {
                "id": f"booklist-refresh-{reader_id}",
                "kind": "achievement",
                "title": "系统书单已更新",
                "body": "推荐模块刚刷新了一批主题书单，可以去首页看看新的精选阅读。",
            }
        )

    items = items[:limit]
    dismissed_rows = session.scalars(
        select(DismissedNotification).where(DismissedNotification.reader_id == reader_id)
    ).all()
    if not dismissed_rows:
        return items

    live_ids = {str(item["id"]) for item in items}
    stale_rows = [row for row in dismissed_rows if row.notification_id not in live_ids]
    if stale_rows:
        for row in stale_rows:
            session.delete(row)
        session.commit()
        dismissed_rows = [row for row in dismissed_rows if row.notification_id in live_ids]

    dismissed_ids = {row.notification_id for row in dismissed_rows}
    if not dismissed_ids:
        return items

    return [item for item in items if str(item["id"]) not in dismissed_ids]


def dismiss_reader_notification(session: Session, *, reader_id: int, notification_id: str) -> dict:
    _require_profile(session, reader_id)
    normalized_notification_id = _normalize_notification_id(notification_id)
    existing = session.scalar(
        select(DismissedNotification).where(
            DismissedNotification.reader_id == reader_id,
            DismissedNotification.notification_id == normalized_notification_id,
        )
    )
    if existing is None:
        session.add(
            DismissedNotification(
                reader_id=reader_id,
                notification_id=normalized_notification_id,
            )
        )
        session.commit()

    return {"notification_id": normalized_notification_id, "ok": True}


def get_reader_achievement_summary(session: Session, *, reader_id: int) -> dict:
    _require_profile(session, reader_id)
    orders = session.scalars(
        select(BorrowOrder)
        .where(BorrowOrder.reader_id == reader_id)
        .order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc())
    ).all()
    completed_orders = len([order for order in orders if order.status in {"completed", "returned"}])
    total_borrowed_books = len([order for order in orders if order.status != "cancelled"])
    reading_days = len(
        {
            (order.completed_at or order.created_at).date().isoformat()
            for order in orders
            if (order.completed_at or order.created_at) is not None
        }
    )
    ai_assists = int(
        session.scalar(
            select(func.count())
            .select_from(RecommendationLog)
            .where(RecommendationLog.reader_id == reader_id)
        )
        or 0
    )
    current_points = completed_orders * 120 + total_borrowed_books * 30 + reading_days * 20 + ai_assists * 10
    return {
        "current_points": current_points,
        "streak_label": f"连续学习 {reading_days} 天",
        "summary": {
            "ai_assists": ai_assists,
            "completed_orders": completed_orders,
            "reading_days": reading_days,
            "total_borrowed_books": total_borrowed_books,
        },
    }
