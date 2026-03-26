from __future__ import annotations

from datetime import timezone, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.admin.models import TopicBooklist, TopicBooklistItem
from app.catalog.models import Book
from app.catalog.service import build_book_payload, build_book_payloads
from app.core.errors import ApiError
from app.db.base import utc_now
from app.orders.models import BorrowOrder, DeliveryOrder, ReturnRequest
from app.readers.models import FavoriteBook, ReaderBooklist, ReaderBooklistItem, ReaderProfile
from app.recommendation.models import RecommendationLog


FINAL_READER_ORDER_STATUSES = {"completed", "cancelled", "returned"}


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


def list_favorite_books(session: Session, *, reader_id: int) -> list[dict]:
    _require_profile(session, reader_id)
    rows = session.scalars(
        select(FavoriteBook)
        .where(FavoriteBook.reader_id == reader_id)
        .order_by(FavoriteBook.created_at.desc(), FavoriteBook.id.desc())
    ).all()
    return [_favorite_out(session, row) for row in rows]


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
    if book_ids:
        found_ids = set(session.scalars(select(Book.id).where(Book.id.in_(book_ids))).all())
        if found_ids != set(book_ids):
            raise ApiError(404, "reader_booklist_book_not_found", "One or more books were not found")
    booklist = ReaderBooklist(reader_id=reader_id, title=clean_title, description=description)
    session.add(booklist)
    session.flush()
    for index, book_id in enumerate(book_ids, start=1):
        session.add(ReaderBooklistItem(booklist_id=booklist.id, book_id=book_id, rank_position=index))
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

    return items[:limit]


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
