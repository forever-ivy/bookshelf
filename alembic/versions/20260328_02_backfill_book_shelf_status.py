"""backfill book shelf status from stock

Revision ID: 20260328_02
Revises: 20260328_01
Create Date: 2026-03-28 20:20:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260328_02"
down_revision = "20260328_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("books")}

    if "shelf_status" not in columns:
        return

    op.execute(
        """
        UPDATE books AS books
        SET shelf_status = CASE
            WHEN COALESCE(
                (
                    SELECT SUM(book_stock.total_copies)
                    FROM book_stock
                    WHERE book_stock.book_id = books.id
                ),
                0
            ) > 0 THEN 'on_shelf'
            ELSE 'draft'
        END
        WHERE books.shelf_status IS NULL OR BTRIM(books.shelf_status) = '';
        """
    )


def downgrade() -> None:
    # This data backfill is intentionally irreversible.
    return
