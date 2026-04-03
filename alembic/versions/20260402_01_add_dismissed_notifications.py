"""add dismissed notifications

Revision ID: 20260402_01
Revises: 20260328_02
Create Date: 2026-04-02 15:30:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260402_01"
down_revision = "20260328_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "dismissed_notifications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("reader_id", sa.Integer(), nullable=False),
        sa.Column("notification_id", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["reader_id"], ["reader_profiles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reader_id", "notification_id", name="uq_dismissed_notification_reader_item"),
    )
    op.create_index(
        "ix_dismissed_notifications_reader_id",
        "dismissed_notifications",
        ["reader_id"],
        unique=False,
    )
    op.create_index(
        "ix_dismissed_notifications_notification_id",
        "dismissed_notifications",
        ["notification_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_dismissed_notifications_notification_id", table_name="dismissed_notifications")
    op.drop_index("ix_dismissed_notifications_reader_id", table_name="dismissed_notifications")
    op.drop_table("dismissed_notifications")
