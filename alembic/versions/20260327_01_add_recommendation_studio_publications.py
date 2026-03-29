"""add recommendation studio publications

Revision ID: 20260327_01
Revises: 20260322_01
Create Date: 2026-03-27 20:58:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260327_01"
down_revision = "20260322_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "recommendation_studio_publications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("version", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=True),
        sa.Column("published_by", sa.Integer(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["published_by"], ["admin_accounts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_recommendation_studio_publications_version",
        "recommendation_studio_publications",
        ["version"],
        unique=False,
    )
    op.create_index(
        "ix_recommendation_studio_publications_status",
        "recommendation_studio_publications",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_recommendation_studio_publications_status", table_name="recommendation_studio_publications")
    op.drop_index("ix_recommendation_studio_publications_version", table_name="recommendation_studio_publications")
    op.drop_table("recommendation_studio_publications")
