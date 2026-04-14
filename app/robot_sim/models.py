from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


ROBOT_UNIT_STATUSES = ("idle", "assigned", "carrying", "arriving", "returning", "offline")
ROBOT_TASK_STATUSES = ("assigned", "carrying", "arriving", "returning", "completed", "cancelled")


class RobotUnit(Base):
    __tablename__ = "robot_units"
    __table_args__ = (
        CheckConstraint(f"status IN {ROBOT_UNIT_STATUSES}", name="ck_robot_units_status"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(64), default="idle")
    battery_level: Mapped[int | None] = mapped_column(nullable=True, default=100)
    heartbeat_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class RobotTask(Base):
    __tablename__ = "robot_tasks"
    __table_args__ = (
        CheckConstraint(f"status IN {ROBOT_TASK_STATUSES}", name="ck_robot_tasks_status"),
        Index(
            "uq_robot_tasks_current_fulfillment",
            "fulfillment_id",
            unique=True,
            postgresql_where=text("is_current = true"),
            sqlite_where=text("is_current = 1"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robot_units.id"), index=True)
    fulfillment_id: Mapped[int | None] = mapped_column(ForeignKey("order_fulfillments.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(64), default="assigned")
    path_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    reassigned_from_task_id: Mapped[int | None] = mapped_column(ForeignKey("robot_tasks.id"), nullable=True, index=True)
    superseded_by_task_id: Mapped[int | None] = mapped_column(ForeignKey("robot_tasks.id"), nullable=True, index=True)
    superseded_at: Mapped[datetime | None] = mapped_column(nullable=True)
    sequence_no: Mapped[int | None] = mapped_column(nullable=True, default=1)
    is_current: Mapped[bool | None] = mapped_column(Boolean, nullable=True, default=True, index=True)
    failure_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attempt_count: Mapped[int | None] = mapped_column(nullable=True, default=0)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)


class RobotStatusEvent(Base):
    __tablename__ = "robot_status_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    robot_id: Mapped[int] = mapped_column(ForeignKey("robot_units.id"), index=True)
    task_id: Mapped[int | None] = mapped_column(ForeignKey("robot_tasks.id"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
