from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class RecommendationLog(Base):
    __tablename__ = "recommendation_logs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int | None] = mapped_column(ForeignKey("reader_profiles.id"), nullable=True, index=True)
    book_id: Mapped[int | None] = mapped_column(ForeignKey("books.id"), nullable=True, index=True)
    query_text: Mapped[str] = mapped_column(Text)
    result_title: Mapped[str] = mapped_column(String(255))
    rank_position: Mapped[int] = mapped_column(default=1)
    score: Mapped[float] = mapped_column(default=0.0)
    provider_note: Mapped[str] = mapped_column(String(32), default="fallback")
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    evidence_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
