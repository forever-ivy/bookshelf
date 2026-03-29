"""backfill book category taxonomy

Revision ID: 20260327_02
Revises: 20260327_01
Create Date: 2026-03-27 23:15:00
"""
from __future__ import annotations

from alembic import op
from sqlalchemy.orm import Session

from app.catalog.taxonomy import backfill_book_taxonomy


# revision identifiers, used by Alembic.
revision = "20260327_02"
down_revision = "20260327_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    session = Session(bind=op.get_bind())
    try:
        backfill_book_taxonomy(session)
        session.commit()
    finally:
        session.close()


def downgrade() -> None:
    pass
