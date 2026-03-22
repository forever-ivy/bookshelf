from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.errors import ApiError
from app.orders.models import BorrowOrder
from app.orders.service import get_order_bundle, serialize_order
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _profile_out(profile: ReaderProfile) -> dict:
    return {
        "id": profile.id,
        "account_id": profile.account_id,
        "display_name": profile.display_name,
        "affiliation_type": profile.affiliation_type,
        "college": profile.college,
        "major": profile.major,
        "grade_year": profile.grade_year,
        "created_at": _iso(profile.created_at),
        "updated_at": _iso(profile.updated_at),
    }


def _require_profile(session: Session, reader_id: int) -> ReaderProfile:
    profile = session.get(ReaderProfile, reader_id)
    if profile is None:
        raise ApiError(404, "reader_not_found", "Reader not found")
    return profile


def _reader_last_active_at(session: Session, reader_id: int, *, fallback: datetime | None = None) -> str | None:
    timestamps = [
        fallback,
        session.execute(select(func.max(BorrowOrder.updated_at)).where(BorrowOrder.reader_id == reader_id)).scalar_one(),
        session.execute(select(func.max(SearchLog.created_at)).where(SearchLog.reader_id == reader_id)).scalar_one(),
        session.execute(
            select(func.max(RecommendationLog.created_at)).where(RecommendationLog.reader_id == reader_id)
        ).scalar_one(),
        session.execute(select(func.max(ReadingEvent.created_at)).where(ReadingEvent.reader_id == reader_id)).scalar_one(),
        session.execute(
            select(func.max(ConversationSession.updated_at)).where(ConversationSession.reader_id == reader_id)
        ).scalar_one(),
        session.execute(
            select(func.max(ConversationMessage.created_at))
            .join(ConversationSession, ConversationMessage.session_id == ConversationSession.id)
            .where(ConversationSession.reader_id == reader_id)
        ).scalar_one(),
    ]
    filtered = [value for value in timestamps if value is not None]
    return _iso(max(filtered)) if filtered else None


def get_reader_profile_by_profile_id(session: Session, reader_id: int) -> dict:
    profile = _require_profile(session, reader_id)
    return _profile_out(profile)


def update_reader_profile(session: Session, reader_id: int, payload: dict) -> dict:
    profile = _require_profile(session, reader_id)
    if not payload:
        raise ApiError(400, "empty_profile_update", "At least one profile field is required")
    for field_name in ("display_name", "affiliation_type", "college", "major", "grade_year"):
        if field_name in payload:
            setattr(profile, field_name, payload[field_name])
    session.commit()
    session.refresh(profile)
    return _profile_out(profile)


def list_readers(session: Session, *, q: str | None = None) -> list[dict]:
    stmt = select(ReaderProfile, ReaderAccount).join(ReaderAccount, ReaderProfile.account_id == ReaderAccount.id)
    if q:
        pattern = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                ReaderAccount.username.ilike(pattern),
                ReaderProfile.display_name.ilike(pattern),
                ReaderProfile.college.ilike(pattern),
                ReaderProfile.major.ilike(pattern),
            )
        )
    stmt = stmt.order_by(ReaderProfile.created_at.desc(), ReaderProfile.id.desc())

    items: list[dict] = []
    for profile, account in session.execute(stmt).all():
        active_orders_count = int(
            session.execute(
                select(func.count())
                .select_from(BorrowOrder)
                .where(BorrowOrder.reader_id == profile.id)
                .where(BorrowOrder.status != "completed")
            ).scalar_one()
        )
        items.append(
            {
                "id": profile.id,
                "account_id": account.id,
                "username": account.username,
                "display_name": profile.display_name,
                "affiliation_type": profile.affiliation_type,
                "college": profile.college,
                "major": profile.major,
                "grade_year": profile.grade_year,
                "active_orders_count": active_orders_count,
                "last_active_at": _reader_last_active_at(session, profile.id, fallback=profile.updated_at),
            }
        )
    return items


def get_reader_detail(session: Session, reader_id: int) -> dict:
    stmt = (
        select(ReaderProfile, ReaderAccount)
        .join(ReaderAccount, ReaderProfile.account_id == ReaderAccount.id)
        .where(ReaderProfile.id == reader_id)
    )
    row = session.execute(stmt).first()
    if row is None:
        raise ApiError(404, "reader_not_found", "Reader not found")
    profile, account = row
    active_orders_count = int(
        session.execute(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == profile.id)
            .where(BorrowOrder.status != "completed")
        ).scalar_one()
    )
    return {
        "id": profile.id,
        "account_id": account.id,
        "username": account.username,
        "display_name": profile.display_name,
        "affiliation_type": profile.affiliation_type,
        "college": profile.college,
        "major": profile.major,
        "grade_year": profile.grade_year,
        "active_orders_count": active_orders_count,
        "last_active_at": _reader_last_active_at(session, profile.id, fallback=profile.updated_at),
    }


def get_reader_orders(session: Session, reader_id: int) -> list[dict]:
    _require_profile(session, reader_id)
    order_ids = session.execute(
        select(BorrowOrder.id)
        .where(BorrowOrder.reader_id == reader_id)
        .order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc())
    ).scalars()
    return [serialize_order(get_order_bundle(session, borrow_order_id)) for borrow_order_id in order_ids]


def get_reader_conversations(session: Session, reader_id: int) -> list[dict]:
    _require_profile(session, reader_id)
    sessions = session.execute(
        select(ConversationSession)
        .where(ConversationSession.reader_id == reader_id)
        .order_by(ConversationSession.created_at.desc(), ConversationSession.id.desc())
    ).scalars()

    items: list[dict] = []
    for conversation in sessions:
        message_count = int(
            session.execute(
                select(func.count())
                .select_from(ConversationMessage)
                .where(ConversationMessage.session_id == conversation.id)
            ).scalar_one()
        )
        last_message = session.execute(
            select(ConversationMessage.content, ConversationMessage.created_at)
            .where(ConversationMessage.session_id == conversation.id)
            .order_by(ConversationMessage.created_at.desc(), ConversationMessage.id.desc())
            .limit(1)
        ).first()
        items.append(
            {
                "id": conversation.id,
                "reader_id": conversation.reader_id,
                "status": conversation.status,
                "message_count": message_count,
                "last_message_preview": None if last_message is None else last_message.content[:80],
                "created_at": _iso(conversation.created_at),
                "updated_at": _iso(conversation.updated_at),
                "last_message_at": None if last_message is None else _iso(last_message.created_at),
            }
        )
    return items


def get_reader_recommendations(session: Session, reader_id: int) -> list[dict]:
    _require_profile(session, reader_id)
    rows = session.execute(
        select(RecommendationLog, Book.title)
        .join(Book, RecommendationLog.book_id == Book.id, isouter=True)
        .where(RecommendationLog.reader_id == reader_id)
        .order_by(RecommendationLog.created_at.desc(), RecommendationLog.id.desc())
    ).all()
    return [
        {
            "id": recommendation.id,
            "reader_id": recommendation.reader_id,
            "book_id": recommendation.book_id,
            "book_title": title or recommendation.result_title,
            "query_text": recommendation.query_text,
            "result_title": recommendation.result_title,
            "rank_position": recommendation.rank_position,
            "score": recommendation.score,
            "provider_note": recommendation.provider_note,
            "explanation": recommendation.explanation,
            "evidence_json": recommendation.evidence_json,
            "created_at": _iso(recommendation.created_at),
        }
        for recommendation, title in rows
    ]


def get_reader_overview(session: Session, reader_id: int) -> dict:
    profile = _require_profile(session, reader_id)
    recent_queries = [
        row[0]
        for row in session.execute(
            select(SearchLog.query_text)
            .where(SearchLog.reader_id == reader_id)
            .order_by(SearchLog.created_at.desc(), SearchLog.id.desc())
            .limit(5)
        ).all()
    ]
    recent_recommendations = get_reader_recommendations(session, reader_id)[:5]
    recent_conversations = get_reader_conversations(session, reader_id)[:5]
    recent_reading_events = [
        {
            "id": event.id,
            "event_type": event.event_type,
            "metadata_json": event.metadata_json,
            "created_at": _iso(event.created_at),
        }
        for event in session.execute(
            select(ReadingEvent)
            .where(ReadingEvent.reader_id == reader_id)
            .order_by(ReadingEvent.created_at.desc(), ReadingEvent.id.desc())
            .limit(5)
        ).scalars()
    ]

    active_orders_count = int(
        session.execute(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == reader_id)
            .where(BorrowOrder.status != "completed")
        ).scalar_one()
    )
    borrow_history_count = int(
        session.execute(select(func.count()).select_from(BorrowOrder).where(BorrowOrder.reader_id == reader_id)).scalar_one()
    )
    search_count = int(
        session.execute(select(func.count()).select_from(SearchLog).where(SearchLog.reader_id == reader_id)).scalar_one()
    )
    recommendation_count = int(
        session.execute(
            select(func.count()).select_from(RecommendationLog).where(RecommendationLog.reader_id == reader_id)
        ).scalar_one()
    )
    conversation_count = int(
        session.execute(
            select(func.count()).select_from(ConversationSession).where(ConversationSession.reader_id == reader_id)
        ).scalar_one()
    )
    reading_event_count = int(
        session.execute(select(func.count()).select_from(ReadingEvent).where(ReadingEvent.reader_id == reader_id)).scalar_one()
    )

    return {
        "profile": _profile_out(profile),
        "stats": {
            "active_orders_count": active_orders_count,
            "borrow_history_count": borrow_history_count,
            "search_count": search_count,
            "recommendation_count": recommendation_count,
            "conversation_count": conversation_count,
            "reading_event_count": reading_event_count,
            "last_active_at": _reader_last_active_at(session, reader_id, fallback=profile.updated_at),
        },
        "recent_queries": recent_queries,
        "recent_orders": get_reader_orders(session, reader_id)[:5],
        "recent_recommendations": recent_recommendations,
        "recent_conversations": recent_conversations,
        "recent_reading_events": recent_reading_events,
    }
