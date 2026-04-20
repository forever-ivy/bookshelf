"""Add learning AI run records.

Revision ID: 20260420_01
Revises: 20260418_01
Create Date: 2026-04-20 20:45:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260420_01"
down_revision = "20260418_01"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _index_exists(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return False
    return index_name in {index["name"] for index in inspector.get_indexes(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    if not _table_exists(bind, "learning_ai_runs"):
        op.create_table(
            "learning_ai_runs",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("session_id", sa.Integer(), nullable=False),
            sa.Column("reader_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("provider", sa.String(length=64), nullable=True),
            sa.Column("model_name", sa.String(length=128), nullable=True),
            sa.Column("active_stream_id", sa.String(length=128), nullable=True),
            sa.Column("user_message_json", sa.JSON(), nullable=True),
            sa.Column("assistant_message_json", sa.JSON(), nullable=True),
            sa.Column("reasoning_content", sa.Text(), nullable=True),
            sa.Column("error_code", sa.String(length=64), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["session_id"], ["learning_sessions.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    for index_name, columns in {
        "ix_learning_ai_runs_session_id": ["session_id"],
        "ix_learning_ai_runs_reader_id": ["reader_id"],
        "ix_learning_ai_runs_status": ["status"],
        "ix_learning_ai_runs_active_stream_id": ["active_stream_id"],
        "ix_learning_ai_runs_error_code": ["error_code"],
        "ix_learning_ai_runs_created_at": ["created_at"],
        "ix_learning_ai_runs_session_status": ["session_id", "status"],
    }.items():
        if not _index_exists(bind, "learning_ai_runs", index_name):
            op.create_index(index_name, "learning_ai_runs", columns)


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for runtime learning schema updates")
