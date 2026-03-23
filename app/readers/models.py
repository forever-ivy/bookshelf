from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class ReaderAccount(Base):
    __tablename__ = "reader_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class ReaderProfile(Base):
    __tablename__ = "reader_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("reader_accounts.id"), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(128))
    affiliation_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    college: Mapped[str | None] = mapped_column(String(128), nullable=True)
    major: Mapped[str | None] = mapped_column(String(128), nullable=True)
    grade_year: Mapped[str | None] = mapped_column(String(32), nullable=True)
    restriction_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    restriction_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    risk_flags: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    preference_profile_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    segment_code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
