from __future__ import annotations

from datetime import datetime

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class SystemSetting(Base):
    __tablename__ = "system_settings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    setting_key: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    value_type: Mapped[str] = mapped_column(String(32), default="json")
    value_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True)
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("admin_accounts.id"), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
