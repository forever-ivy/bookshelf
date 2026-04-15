"""Migrate legacy tutor data into learning and drop tutor schema.

Revision ID: 20260415_01
Revises: 20260414_02
Create Date: 2026-04-15 22:10:00.000000
"""

from __future__ import annotations

from alembic import op
from sqlalchemy.orm import Session

from scripts.migrate_tutor_to_learning_v2 import drop_legacy_tutor_tables, migrate_legacy_tutor_records


revision = "20260415_01"
down_revision = "20260414_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    session = Session(bind=bind)
    try:
        migrate_legacy_tutor_records(session)
        session.flush()
    finally:
        session.close()

    drop_legacy_tutor_tables(bind)


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for retired tutor schema")
