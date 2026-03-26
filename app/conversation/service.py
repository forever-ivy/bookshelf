from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.context.engine import ContextEngine
from app.conversation.models import ConversationSession
from app.conversation.repository import add_message, add_reading_event, list_message_context, touch_session

DEFAULT_AUTO_REPLY = "我可以继续帮你找书、推荐图书，或者结合你当前借阅记录给出建议。"


def _metadata_json(payload: dict | None) -> str | None:
    return json.dumps(payload, ensure_ascii=False) if payload is not None else None


def create_auto_reply(
    session: Session,
    *,
    conversation_session: ConversationSession,
    content: str,
    metadata: dict | None,
    llm_provider,
) -> dict:
    normalized_content = (content or "").strip()
    if not normalized_content:
        raise ValueError("Content is required")

    user_metadata_json = _metadata_json(metadata)
    user_message = add_message(
        session,
        session_id=conversation_session.id,
        role="user",
        content=normalized_content,
        metadata_json=user_metadata_json,
    )
    touch_session(session, conversation_session)
    add_reading_event(
        session,
        reader_id=conversation_session.reader_id,
        event_type="conversation_message",
        metadata_json=_metadata_json(
            {
                "role": "user",
                "session_id": conversation_session.id,
                "message_metadata": metadata,
            }
        ),
    )
    session.flush()

    snapshot = ContextEngine(session).build_snapshot(
        reader_id=conversation_session.reader_id,
        query=normalized_content,
    )
    llm_context = {
        **snapshot.__dict__,
        "conversation_session": {
            "id": conversation_session.id,
            "status": conversation_session.status,
            "messages": list_message_context(session, conversation_session.id),
        },
    }
    reply = (llm_provider.chat(text=normalized_content, context=llm_context) or "").strip()
    if not reply:
        reply = DEFAULT_AUTO_REPLY

    assistant_metadata = {
        "source": "conversation_auto_reply",
        "session_id": conversation_session.id,
    }
    assistant_message = add_message(
        session,
        session_id=conversation_session.id,
        role="assistant",
        content=reply,
        metadata_json=_metadata_json(assistant_metadata),
    )
    touch_session(session, conversation_session)
    add_reading_event(
        session,
        reader_id=conversation_session.reader_id,
        event_type="conversation_message",
        metadata_json=_metadata_json(
            {
                "role": "assistant",
                "session_id": conversation_session.id,
                "source": "conversation_auto_reply",
            }
        ),
    )
    return {
        "reply": reply,
        "user_message": user_message,
        "assistant_message": assistant_message,
        "snapshot": snapshot,
    }
