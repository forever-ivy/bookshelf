from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class AlertRecord(Base):
    __tablename__ = "alert_records"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_type: Mapped[str] = mapped_column(String(64), index=True)
    source_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    alert_type: Mapped[str] = mapped_column(String(64), index=True)
    severity: Mapped[str] = mapped_column(String(32), default="warning", index=True)
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    title: Mapped[str] = mapped_column(String(255))
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    acknowledged_by: Mapped[int | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True)
    acknowledged_at: Mapped[datetime | None] = mapped_column(nullable=True)
    resolved_by: Mapped[int | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, index=True, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class RecommendationPlacement(Base):
    __tablename__ = "recommendation_placements"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    placement_type: Mapped[str] = mapped_column(String(64), default="homepage")
    config_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class TopicBooklist(Base):
    __tablename__ = "topic_booklists"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    audience_segment: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class TopicBooklistItem(Base):
    __tablename__ = "topic_booklist_items"
    __table_args__ = (
        UniqueConstraint("topic_booklist_id", "book_id", name="uq_topic_booklist_book"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    topic_booklist_id: Mapped[int] = mapped_column(ForeignKey("topic_booklists.id"), index=True)
    book_id: Mapped[int] = mapped_column(ForeignKey("books.id"), index=True)
    rank_position: Mapped[int] = mapped_column(default=1)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class AdminRole(Base):
    __tablename__ = "admin_roles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class AdminPermission(Base):
    __tablename__ = "admin_permissions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(128))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class AdminRolePermission(Base):
    __tablename__ = "admin_role_permissions"
    __table_args__ = (
        UniqueConstraint("role_id", "permission_id", name="uq_admin_role_permission"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("admin_roles.id"), index=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("admin_permissions.id"), index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class AdminRoleAssignment(Base):
    __tablename__ = "admin_role_assignments"
    __table_args__ = (
        UniqueConstraint("admin_id", "role_id", name="uq_admin_role_assignment"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    admin_id: Mapped[int] = mapped_column(ForeignKey("admin_accounts.id"), index=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("admin_roles.id"), index=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
