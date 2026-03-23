from __future__ import annotations

from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utc_now


class BookCategory(Base):
    __tablename__ = "book_categories"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class BookTag(Base):
    __tablename__ = "book_tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class BookTagLink(Base):
    __tablename__ = "book_tag_links"
    __table_args__ = (
        UniqueConstraint("book_id", "tag_id", name="uq_book_tag_link"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    tag_id: Mapped[int] = mapped_column(ForeignKey("book_tags.id"), index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), index=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("book_categories.id"), nullable=True, index=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    isbn: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    barcode: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    keywords: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    shelf_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
