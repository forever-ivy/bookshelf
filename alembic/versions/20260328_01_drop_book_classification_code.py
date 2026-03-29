"""drop book classification code

Revision ID: 20260328_01
Revises: 20260327_02
Create Date: 2026-03-28 18:20:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260328_01"
down_revision = "20260327_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("books")}
    indexes = {index["name"] for index in inspector.get_indexes("books")}

    if "ix_books_classification_code" in indexes:
        op.drop_index("ix_books_classification_code", table_name="books")
    if "classification_code" in columns:
        op.drop_column("books", "classification_code")


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("books")}
    indexes = {index["name"] for index in inspector.get_indexes("books")}

    if "classification_code" not in columns:
        op.add_column("books", sa.Column("classification_code", sa.String(length=128), nullable=True))
    if "ix_books_classification_code" not in indexes:
        op.create_index("ix_books_classification_code", "books", ["classification_code"], unique=False)
