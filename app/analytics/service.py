from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog


def record_search(session: Session, *, reader_id: int | None, query_text: str, query_mode: str) -> None:
    session.add(SearchLog(reader_id=reader_id, query_text=query_text, query_mode=query_mode))


def record_reading_event(session: Session, *, reader_id: int | None, event_type: str, metadata_json: str | None) -> None:
    session.add(
        ReadingEvent(
            reader_id=reader_id,
            event_type=event_type,
            metadata_json=json.loads(metadata_json) if metadata_json else None,
        )
    )
