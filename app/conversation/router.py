from __future__ import annotations

import json

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Literal

from app.context.engine import ContextEngine
from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.conversation.models import ConversationSession
from app.conversation.repository import add_message, add_reading_event, create_session, list_messages

router = APIRouter(prefix="/api/v1/conversation", tags=["conversation"])


class MessageCreateRequest(BaseModel):
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    metadata: dict | None = None


def _owned_session(db: Session, session_id: int, *, reader_profile_id: int | None) -> ConversationSession:
    conversation_session = db.get(ConversationSession, session_id)
    if conversation_session is None:
        raise ApiError(404, "session_not_found", "Session not found")
    if conversation_session.reader_id != reader_profile_id:
        raise ApiError(403, "session_forbidden", "Session does not belong to the current reader")
    return conversation_session


@router.post("/sessions")
def create_conversation_session(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    new_session = create_session(db, identity.profile_id)
    db.commit()
    return {"ok": True, "session": {"id": new_session.id, "reader_id": new_session.reader_id, "status": new_session.status}}


@router.post("/sessions/{session_id}/messages")
def create_message(
    session_id: int,
    payload: MessageCreateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    conversation_session = _owned_session(db, session_id, reader_profile_id=identity.profile_id)
    metadata_json = json.dumps(payload.metadata, ensure_ascii=False) if payload.metadata is not None else None
    message = add_message(
        db,
        session_id=session_id,
        role=payload.role,
        content=payload.content,
        metadata_json=metadata_json,
    )
    add_reading_event(
        db,
        reader_id=conversation_session.reader_id,
        event_type="conversation_message",
        metadata_json=metadata_json,
    )
    snapshot = ContextEngine(db).build_snapshot(reader_id=conversation_session.reader_id, query=payload.content)
    db.commit()
    return {
        "ok": True,
        "message": {
            "id": message.id,
            "session_id": message.session_id,
            "role": message.role,
            "content": message.content,
            "metadata_json": json.dumps(message.metadata_json, ensure_ascii=False) if message.metadata_json is not None else None,
        },
        "snapshot": snapshot.__dict__,
    }


@router.get("/sessions/{session_id}/messages")
def get_messages(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    _owned_session(db, session_id, reader_profile_id=identity.profile_id)
    return {"ok": True, "messages": list_messages(db, session_id)}
