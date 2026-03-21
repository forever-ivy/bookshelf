from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book
from app.conversation.models import ConversationMessage, ConversationSession
from app.inventory.models import BookStock
from app.orders.models import BorrowOrder
from app.readers.models import ReaderProfile


def get_reader_profile(session: Session, reader_id: int | None) -> dict:
    if reader_id is None:
        return {}
    profile = session.get(ReaderProfile, reader_id)
    if profile is None:
        return {}
    return {
        "id": profile.id,
        "account_id": profile.account_id,
        "display_name": profile.display_name,
        "affiliation_type": profile.affiliation_type,
        "college": profile.college,
        "major": profile.major,
        "grade_year": profile.grade_year,
    }


def get_recent_searches(session: Session, reader_id: int | None, limit: int = 5) -> list[str]:
    if reader_id is None:
        return []
    stmt = (
        select(SearchLog.query_text)
        .where(SearchLog.reader_id == reader_id)
        .order_by(SearchLog.created_at.desc(), SearchLog.id.desc())
        .limit(limit)
    )
    return [row[0] for row in session.execute(stmt).all()]


def get_available_titles(session: Session) -> list[str]:
    stmt = (
        select(Book.title)
        .join(BookStock, BookStock.book_id == Book.id)
        .where(BookStock.available_copies > 0)
        .order_by(Book.id.asc())
    )
    titles = [row[0] for row in session.execute(stmt).all()]
    if titles:
        return titles
    return [row[0] for row in session.execute(select(Book.title).order_by(Book.id.asc())).all()]


def get_active_orders(session: Session, reader_id: int | None) -> list[dict]:
    if reader_id is None:
        return []
    stmt = (
        select(BorrowOrder.id, BorrowOrder.book_id, BorrowOrder.status, BorrowOrder.order_mode)
        .where(BorrowOrder.reader_id == reader_id)
        .where(BorrowOrder.status.not_in(["completed"]))
        .order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc())
    )
    rows = session.execute(stmt).all()
    return [
        {"id": row.id, "book_id": row.book_id, "status": row.status, "order_mode": row.order_mode}
        for row in rows
    ]


def get_borrow_history(session: Session, reader_id: int | None, limit: int = 10) -> list[dict]:
    if reader_id is None:
        return []
    stmt = (
        select(BorrowOrder.id, BorrowOrder.book_id, BorrowOrder.status, BorrowOrder.order_mode)
        .where(BorrowOrder.reader_id == reader_id)
        .order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc())
        .limit(limit)
    )
    rows = session.execute(stmt).all()
    return [
        {"id": row.id, "book_id": row.book_id, "status": row.status, "order_mode": row.order_mode}
        for row in rows
    ]


def get_latest_conversation(session: Session, reader_id: int | None) -> dict:
    if reader_id is None:
        return {"message_count": 0, "messages": []}
    session_stmt = (
        select(ConversationSession.id)
        .where(ConversationSession.reader_id == reader_id)
        .order_by(ConversationSession.created_at.desc(), ConversationSession.id.desc())
        .limit(1)
    )
    session_id = session.execute(session_stmt).scalar_one_or_none()
    if session_id is None:
        return {"message_count": 0, "messages": []}

    stmt = (
        select(ConversationMessage.role, ConversationMessage.content, ConversationMessage.metadata_json)
        .where(ConversationMessage.session_id == session_id)
        .order_by(ConversationMessage.created_at.asc(), ConversationMessage.id.asc())
    )
    messages = [
        {"role": row.role, "content": row.content, "metadata_json": row.metadata_json}
        for row in session.execute(stmt).all()
    ]
    return {"message_count": len(messages), "messages": messages}


def get_search_log_count(session: Session, reader_id: int | None) -> int:
    if reader_id is None:
        return 0
    stmt = select(func.count()).select_from(SearchLog).where(SearchLog.reader_id == reader_id)
    return int(session.execute(stmt).scalar_one())


def get_recent_reading_events(session: Session, reader_id: int | None, limit: int = 5) -> list[dict]:
    if reader_id is None:
        return []
    stmt = (
        select(ReadingEvent.event_type, ReadingEvent.metadata_json)
        .where(ReadingEvent.reader_id == reader_id)
        .order_by(ReadingEvent.created_at.desc(), ReadingEvent.id.desc())
        .limit(limit)
    )
    return [{"event_type": row.event_type, "metadata_json": row.metadata_json} for row in session.execute(stmt).all()]
