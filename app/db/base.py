from __future__ import annotations

from importlib import import_module
from datetime import datetime, timezone

from sqlalchemy import DateTime, JSON, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


JSON_VARIANT = JSON().with_variant(JSONB, "postgresql")


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at = DateTime(timezone=True)
    updated_at = DateTime(timezone=True)



MODEL_MODULES = (
    "app.admin.models",
    "app.auth.models",
    "app.readers.models",
    "app.catalog.models",
    "app.inventory.models",
    "app.orders.models",
    "app.robot_sim.models",
    "app.recommendation.models",
    "app.conversation.models",
    "app.learning.models",
    "app.analytics.models",
    "app.system.models",
)


def import_model_modules() -> None:
    for module in MODEL_MODULES:
        import_module(module)
