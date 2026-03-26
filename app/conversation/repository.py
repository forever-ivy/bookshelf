from __future__ import annotations

import json

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent
from app.conversation.models import ConversationMessage, ConversationSession
from app.db.base import utc_now


def create_session(session: Session, reader_id: int | None) -> ConversationSession:
    new_session = ConversationSession(reader_id=reader_id, status="active")
    session.add(new_session)
    session.flush()
    return new_session


def add_message(
    session: Session,
    *,
    session_id: int,
    role: str,
    content: str,
    metadata_json: str | None,
) -> ConversationMessage:
    parsed_metadata = json.loads(metadata_json) if metadata_json else None
    message = ConversationMessage(
        session_id=session_id,
        role=role,
        content=content,
        metadata_json=parsed_metadata,
    )
    session.add(message)
    return message


def touch_session(session: Session, conversation_session: ConversationSession) -> None:
    conversation_session.updated_at = utc_now()
    session.add(conversation_session)


def _iso(value) -> str | None:
    return value.isoformat() if value is not None else None


def list_sessions(session: Session, reader_id: int | None) -> list[dict]:
    rows = session.execute(
        select(ConversationSession)
        .where(ConversationSession.reader_id == reader_id)
        .order_by(ConversationSession.updated_at.desc(), ConversationSession.id.desc())
    ).scalars().all()
    if not rows:
        return []

    session_ids = [row.id for row in rows]
    message_counts = {
        session_id: int(count)
        for session_id, count in session.execute(
            select(ConversationMessage.session_id, func.count())
            .where(ConversationMessage.session_id.in_(session_ids))
            .group_by(ConversationMessage.session_id)
        ).all()
    }
    last_message_by_session: dict[int, tuple[str, object | None]] = {}
    for session_id, content, created_at in session.execute(
        select(
            ConversationMessage.session_id,
            ConversationMessage.content,
            ConversationMessage.created_at,
        )
        .where(ConversationMessage.session_id.in_(session_ids))
        .order_by(
            ConversationMessage.session_id.asc(),
            ConversationMessage.created_at.desc(),
            ConversationMessage.id.desc(),
        )
    ).all():
        if session_id not in last_message_by_session:
            last_message_by_session[session_id] = (content, created_at)

    return [
        {
            "id": row.id,
            "reader_id": row.reader_id,
            "status": row.status,
            "message_count": message_counts.get(row.id, 0),
            "last_message_preview": None
            if row.id not in last_message_by_session
            else last_message_by_session[row.id][0][:80],
            "created_at": _iso(row.created_at),
            "updated_at": _iso(row.updated_at),
            "last_message_at": None
            if row.id not in last_message_by_session
            else _iso(last_message_by_session[row.id][1]),
        }
        for row in rows
    ]


def list_message_context(session: Session, session_id: int, *, limit: int = 8) -> list[dict]:
    stmt = (
        select(ConversationMessage)
        .where(ConversationMessage.session_id == session_id)
        .order_by(ConversationMessage.created_at.desc(), ConversationMessage.id.desc())
        .limit(limit)
    )
    rows = list(session.execute(stmt).scalars().all())
    rows.reverse()
    return [
        {
            "role": row.role,
            "content": row.content,
            "metadata_json": row.metadata_json,
        }
        for row in rows
    ]


def list_messages(session: Session, session_id: int) -> list[dict]:
    stmt = select(ConversationMessage).where(ConversationMessage.session_id == session_id).order_by(
        ConversationMessage.created_at.asc(), ConversationMessage.id.asc()
    )
    return [
        {
            "id": row.id,
            "session_id": row.session_id,
            "role": row.role,
            "content": row.content,
            "metadata_json": json.dumps(row.metadata_json, ensure_ascii=False) if row.metadata_json is not None else None,
        }
        for row in session.execute(stmt).scalars().all()
    ]


def add_reading_event(session: Session, *, reader_id: int | None, event_type: str, metadata_json: str | None) -> None:
    parsed_metadata = json.loads(metadata_json) if metadata_json else None
    session.add(ReadingEvent(reader_id=reader_id, event_type=event_type, metadata_json=parsed_metadata))
