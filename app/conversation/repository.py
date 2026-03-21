from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent
from app.conversation.models import ConversationMessage, ConversationSession


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
