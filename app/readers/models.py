from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
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
    interest_tags: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    reading_profile_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    restriction_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    restriction_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    risk_flags: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    preference_profile_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    segment_code: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class FavoriteBook(Base):
    __tablename__ = "favorite_books"
    __table_args__ = (
        UniqueConstraint("reader_id", "book_id", name="uq_favorite_book"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class ReaderBooklist(Base):
    __tablename__ = "reader_booklists"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class ReaderBooklistItem(Base):
    __tablename__ = "reader_booklist_items"
    __table_args__ = (
        UniqueConstraint("booklist_id", "book_id", name="uq_reader_booklist_book"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    booklist_id: Mapped[int] = mapped_column(ForeignKey("reader_booklists.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    rank_position: Mapped[int] = mapped_column(default=1)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
