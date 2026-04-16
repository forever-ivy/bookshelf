"""Add learning uploads and runtime indexes for async learning flows.

Revision ID: 20260416_01
Revises: 20260415_01
Create Date: 2026-04-16 16:20:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260416_01"
down_revision = "20260415_01"
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

    if not _table_exists(bind, "learning_uploads"):
        op.create_table(
            "learning_uploads",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("reader_id", sa.Integer(), sa.ForeignKey("reader_profiles.id"), nullable=False),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("mime_type", sa.String(length=128), nullable=True),
            sa.Column("storage_path", sa.String(length=1024), nullable=False),
            sa.Column("content_hash", sa.String(length=128), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_uploads_reader_id", "learning_uploads", ["reader_id"])
        op.create_index("ix_learning_uploads_content_hash", "learning_uploads", ["content_hash"])
        op.create_index("ix_learning_uploads_expires_at", "learning_uploads", ["expires_at"])
        op.create_index("ix_learning_uploads_consumed_at", "learning_uploads", ["consumed_at"])

    if not _index_exists(bind, "learning_sessions", "ix_learning_sessions_profile_kind"):
        op.create_index(
            "ix_learning_sessions_profile_kind",
            "learning_sessions",
            ["profile_id", "session_kind"],
        )
    if not _index_exists(bind, "learning_sessions", "ix_learning_sessions_source_focus"):
        op.create_index(
            "ix_learning_sessions_source_focus",
            "learning_sessions",
            ["source_session_id", "focus_step_index"],
        )
    if not _index_exists(bind, "learning_step_context_items", "ix_learning_step_context_items_session_step"):
        op.create_index(
            "ix_learning_step_context_items_session_step",
            "learning_step_context_items",
            ["guide_session_id", "step_index"],
        )
    if not _index_exists(bind, "learning_bridge_actions", "ix_learning_bridge_actions_from_action"):
        op.create_index(
            "ix_learning_bridge_actions_from_action",
            "learning_bridge_actions",
            ["from_session_id", "action_type"],
        )

    if _table_exists(bind, "learning_sessions"):
        op.execute("UPDATE learning_sessions SET session_kind = 'guide' WHERE session_kind IS NULL")
    if _table_exists(bind, "learning_turns"):
        op.execute("UPDATE learning_turns SET turn_kind = 'guide' WHERE turn_kind IS NULL")


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for runtime learning schema updates")
