from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class SearchLog(Base):
    __tablename__ = "search_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int | None] = mapped_column(ForeignKey("reader_profiles.id"), nullable=True, index=True)
    query_text: Mapped[str] = mapped_column(String(512))
    query_mode: Mapped[str] = mapped_column(String(32), default="keyword")
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)


class ReadingEvent(Base):
    __tablename__ = "reading_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int | None] = mapped_column(ForeignKey("reader_profiles.id"), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
