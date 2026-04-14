from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint, select
from sqlalchemy.orm import Mapped, column_property, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


COPY_STATUSES = ("stored", "reserved", "in_delivery", "borrowed")
SLOT_STATUSES = ("empty", "free", "occupied", "locked")


class Cabinet(Base):
    __tablename__ = "cabinets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class BookCopy(Base):
    __tablename__ = "book_copies"
    __table_args__ = (
        UniqueConstraint("id", "book_id", name="uq_book_copies_id_book"),
        CheckConstraint(
            f"inventory_status IN {COPY_STATUSES}",
            name="ck_book_copies_inventory_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    current_slot_id: Mapped[int | None] = mapped_column(ForeignKey("cabinet_slots.id"), nullable=True, index=True)
    inventory_status: Mapped[str] = mapped_column(String(32), default="stored", index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class BookStock(Base):
    __tablename__ = "book_stock"
    __table_args__ = (
        UniqueConstraint("book_id", "cabinet_id", name="uq_book_stock_book_cabinet"),
        CheckConstraint("total_copies >= 0", name="ck_book_stock_total_non_negative"),
        CheckConstraint("available_copies >= 0", name="ck_book_stock_available_non_negative"),
        CheckConstraint("reserved_copies >= 0", name="ck_book_stock_reserved_non_negative"),
        CheckConstraint("available_copies + reserved_copies <= total_copies", name="ck_book_stock_counts_consistent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    cabinet_id: Mapped[str] = mapped_column(ForeignKey("cabinets.id"), index=True)
    total_copies: Mapped[int] = mapped_column(default=0)
    available_copies: Mapped[int] = mapped_column(default=0)
    reserved_copies: Mapped[int] = mapped_column(default=0)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class CabinetSlot(Base):
    __tablename__ = "cabinet_slots"
    __table_args__ = (
        UniqueConstraint("cabinet_id", "slot_code", name="uq_cabinet_slot_code"),
        CheckConstraint(
            f"status IN {SLOT_STATUSES}",
            name="ck_cabinet_slots_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    cabinet_id: Mapped[str] = mapped_column(ForeignKey("cabinets.id"), index=True)
    slot_code: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="empty")
    current_copy_id: Mapped[int | None] = column_property(
        select(BookCopy.id).where(BookCopy.current_slot_id == id).correlate_except(BookCopy).scalar_subquery()
    )
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class InventoryEvent(Base):
    __tablename__ = "inventory_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    cabinet_id: Mapped[str] = mapped_column(ForeignKey("cabinets.id"), index=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    slot_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    book_id: Mapped[int | None] = mapped_column(ForeignKey("books.id"), nullable=True, index=True)
    copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True, index=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)


BookCopy.cabinet_id = column_property(
    select(CabinetSlot.cabinet_id)
    .where(CabinetSlot.id == BookCopy.current_slot_id)
    .correlate_except(CabinetSlot)
    .scalar_subquery()
)
