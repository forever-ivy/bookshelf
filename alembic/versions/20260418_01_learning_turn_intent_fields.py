"""Add intent and redirect metadata fields to learning turns.

Revision ID: 20260418_01
Revises: 20260416_01
Create Date: 2026-04-18 12:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260418_01"
down_revision = "20260416_01"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_exists(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return column_name in {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()

    if not _table_exists(bind, "learning_turns"):
        return

    if not _column_exists(bind, "learning_turns", "intent_kind"):
        op.add_column("learning_turns", sa.Column("intent_kind", sa.String(length=32), nullable=True))
    if not _column_exists(bind, "learning_turns", "response_mode"):
        op.add_column("learning_turns", sa.Column("response_mode", sa.String(length=32), nullable=True))
    if not _column_exists(bind, "learning_turns", "redirected_session_id"):
        op.add_column("learning_turns", sa.Column("redirected_session_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for runtime learning schema updates")
