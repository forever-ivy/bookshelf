"""Add learning PDF reader state.

Revision ID: 20260421_01
Revises: 20260420_01
Create Date: 2026-04-21 00:00:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260421_01"
down_revision = "20260420_01"
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
    if not _table_exists(bind, "learning_reader_progress"):
        op.create_table(
            "learning_reader_progress",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("profile_id", sa.Integer(), nullable=False),
            sa.Column("reader_id", sa.Integer(), nullable=False),
            sa.Column("page_number", sa.Integer(), nullable=False),
            sa.Column("scale", sa.Float(), nullable=False),
            sa.Column("layout_mode", sa.String(length=32), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["profile_id"], ["learning_profiles.id"]),
            sa.ForeignKeyConstraint(["reader_id"], ["reader_profiles.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("profile_id", "reader_id", name="uq_learning_reader_progress_profile_reader"),
        )

    if not _table_exists(bind, "learning_pdf_annotations"):
        op.create_table(
            "learning_pdf_annotations",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("profile_id", sa.Integer(), nullable=False),
            sa.Column("reader_id", sa.Integer(), nullable=False),
            sa.Column("annotation_type", sa.String(length=32), nullable=False),
            sa.Column("selected_text", sa.Text(), nullable=False),
            sa.Column("note_text", sa.Text(), nullable=True),
            sa.Column("color", sa.String(length=32), nullable=False),
            sa.Column("page_number", sa.Integer(), nullable=False),
            sa.Column("anchor_json", sa.JSON(), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["profile_id"], ["learning_profiles.id"]),
            sa.ForeignKeyConstraint(["reader_id"], ["reader_profiles.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    for table_name, indexes in {
        "learning_reader_progress": {
            "ix_learning_reader_progress_profile_id": ["profile_id"],
            "ix_learning_reader_progress_reader_id": ["reader_id"],
            "ix_learning_reader_progress_layout_mode": ["layout_mode"],
            "ix_learning_reader_progress_reader_profile": ["reader_id", "profile_id"],
        },
        "learning_pdf_annotations": {
            "ix_learning_pdf_annotations_profile_id": ["profile_id"],
            "ix_learning_pdf_annotations_reader_id": ["reader_id"],
            "ix_learning_pdf_annotations_annotation_type": ["annotation_type"],
            "ix_learning_pdf_annotations_page_number": ["page_number"],
            "ix_learning_pdf_annotations_created_at": ["created_at"],
            "ix_learning_pdf_annotations_reader_profile_page": ["reader_id", "profile_id", "page_number"],
        },
    }.items():
        for index_name, columns in indexes.items():
            if not _index_exists(bind, table_name, index_name):
                op.create_index(index_name, table_name, columns)


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for runtime learning schema updates")
