from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utc_now


class BorrowOrder(Base):
    __tablename__ = "borrow_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    assigned_copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True, index=True)
    order_mode: Mapped[str] = mapped_column(String(32), default="cabinet_pickup")
    status: Mapped[str] = mapped_column(String(64), default="created")
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
    picked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrow_order_id: Mapped[int] = mapped_column(ForeignKey("borrow_orders.id"), unique=True, index=True)
    delivery_target: Mapped[str] = mapped_column(String(255))
    eta_minutes: Mapped[int] = mapped_column(default=15)
    status: Mapped[str] = mapped_column(String(64), default="awaiting_pick")
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class ReturnRequest(Base):
    __tablename__ = "return_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrow_order_id: Mapped[int] = mapped_column(ForeignKey("borrow_orders.id"), index=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="created")
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
