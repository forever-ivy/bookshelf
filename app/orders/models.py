from __future__ import annotations

from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, utc_now


BORROW_ORDER_STATUSES = (
    "created",
    "awaiting_pick",
    "picked_from_cabinet",
    "delivering",
    "delivered",
    "completed",
    "cancelled",
    "returned",
)
FULFILLMENT_STATUSES = (
    "awaiting_pick",
    "picked_from_cabinet",
    "delivering",
    "delivered",
    "completed",
    "cancelled",
)
RETURN_REQUEST_STATUSES = ("created", "received", "completed", "cancelled")
FULFILLMENT_MODES = ("cabinet_pickup", "robot_delivery")


class BorrowOrder(Base):
    __tablename__ = "borrow_orders"
    __table_args__ = (
        CheckConstraint(
            f"status IN {BORROW_ORDER_STATUSES}",
            name="ck_borrow_orders_status",
        ),
        CheckConstraint(
            f"order_mode IN {FULFILLMENT_MODES}",
            name="ck_borrow_orders_mode",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    assigned_copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True, index=True)
    order_mode: Mapped[str] = mapped_column(String(32), default="cabinet_pickup")
    status: Mapped[str] = mapped_column(String(64), default="created")
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    due_at: Mapped[datetime | None] = mapped_column(nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intervention_status: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    attempt_count: Mapped[int | None] = mapped_column(nullable=True, default=0)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
    picked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    @property
    def requested_book_id(self) -> int:
        return self.book_id

    @property
    def fulfilled_copy_id(self) -> int | None:
        return self.assigned_copy_id

    @property
    def fulfillment_mode(self) -> str:
        return self.order_mode


class OrderFulfillment(Base):
    __tablename__ = "order_fulfillments"
    __table_args__ = (
        UniqueConstraint("borrow_order_id", name="uq_order_fulfillments_borrow_order"),
        CheckConstraint(
            f"mode IN {FULFILLMENT_MODES}",
            name="ck_order_fulfillments_mode",
        ),
        CheckConstraint(
            f"status IN {FULFILLMENT_STATUSES}",
            name="ck_order_fulfillments_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrow_order_id: Mapped[int] = mapped_column(ForeignKey("borrow_orders.id"), index=True)
    mode: Mapped[str] = mapped_column(String(32), default="cabinet_pickup", index=True)
    source_cabinet_id: Mapped[str | None] = mapped_column(ForeignKey("cabinets.id"), nullable=True, index=True)
    source_slot_id: Mapped[int | None] = mapped_column(ForeignKey("cabinet_slots.id"), nullable=True, index=True)
    delivery_target: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="awaiting_pick", index=True)
    picked_at: Mapped[datetime | None] = mapped_column(nullable=True)
    delivered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrow_order_id: Mapped[int] = mapped_column(ForeignKey("borrow_orders.id"), unique=True, index=True)
    delivery_target: Mapped[str] = mapped_column(String(255))
    eta_minutes: Mapped[int] = mapped_column(default=15)
    status: Mapped[str] = mapped_column(String(64), default="awaiting_pick")
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    due_at: Mapped[datetime | None] = mapped_column(nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intervention_status: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    attempt_count: Mapped[int | None] = mapped_column(nullable=True, default=0)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class ReturnRequest(Base):
    __tablename__ = "return_requests"
    __table_args__ = (
        CheckConstraint(
            f"status IN {RETURN_REQUEST_STATUSES}",
            name="ck_return_requests_status",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    borrow_order_id: Mapped[int] = mapped_column(ForeignKey("borrow_orders.id"), index=True)
    copy_id: Mapped[int | None] = mapped_column(ForeignKey("book_copies.id"), nullable=True, index=True)
    receive_cabinet_id: Mapped[str | None] = mapped_column(ForeignKey("cabinets.id"), nullable=True, index=True)
    receive_slot_id: Mapped[int | None] = mapped_column(ForeignKey("cabinet_slots.id"), nullable=True, index=True)
    processed_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True, index=True)
    processed_at: Mapped[datetime | None] = mapped_column(nullable=True)
    result: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    condition_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    received_at: Mapped[datetime | None] = mapped_column(nullable=True)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="created")
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
