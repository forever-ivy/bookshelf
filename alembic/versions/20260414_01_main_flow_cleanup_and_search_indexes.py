"""Main-flow cleanup and search index alignment.

Revision ID: 20260414_01
Revises: 20260402_01
Create Date: 2026-04-14 14:40:00.000000
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260414_01"
down_revision = "20260402_01"
branch_labels = None
depends_on = None


def _table_exists(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _column_names(bind, table_name: str) -> set[str]:
    inspector = sa.inspect(bind)
    if table_name not in inspector.get_table_names():
        return set()
    return {column["name"] for column in inspector.get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        op.execute("CREATE EXTENSION IF NOT EXISTS vector")
        op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    robot_task_columns = _column_names(bind, "robot_tasks")
    if "delivery_order_id" in robot_task_columns:
        op.execute("DROP INDEX IF EXISTS ix_robot_tasks_delivery_order_id")
        op.drop_column("robot_tasks", "delivery_order_id")

    if _table_exists(bind, "delivery_orders"):
        op.execute("DROP TABLE IF EXISTS delivery_orders")

    book_copy_columns = _column_names(bind, "book_copies")
    if "cabinet_id" in book_copy_columns:
        op.execute("DROP INDEX IF EXISTS ix_book_copies_cabinet_id")
        op.drop_column("book_copies", "cabinet_id")

    if _table_exists(bind, "borrow_orders"):
        op.execute(
            """
            DO $$
            BEGIN
              IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'book_id'
              ) AND NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'requested_book_id'
              ) THEN
                ALTER TABLE borrow_orders RENAME COLUMN book_id TO requested_book_id;
              END IF;

              IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'assigned_copy_id'
              ) AND NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'fulfilled_copy_id'
              ) THEN
                ALTER TABLE borrow_orders RENAME COLUMN assigned_copy_id TO fulfilled_copy_id;
              END IF;

              IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'order_mode'
              ) AND NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'borrow_orders' AND column_name = 'fulfillment_mode'
              ) THEN
                ALTER TABLE borrow_orders RENAME COLUMN order_mode TO fulfillment_mode;
              END IF;
            END $$;
            """
        )

    if _table_exists(bind, "book_source_documents"):
        op.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_book_source_documents_primary_per_book
            ON book_source_documents (book_id)
            WHERE is_primary = true
            """
        )

    if _table_exists(bind, "return_requests"):
        op.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_return_requests_active_order
            ON return_requests (borrow_order_id)
            WHERE status IN ('created', 'received')
            """
        )

    if _table_exists(bind, "robot_tasks"):
        op.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS uq_robot_tasks_current_fulfillment
            ON robot_tasks (fulfillment_id)
            WHERE is_current = true
            """
        )

    if dialect == "postgresql" and _table_exists(bind, "books"):
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_books_search_vector_trgm
            ON books
            USING gin (search_vector gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_books_title_trgm
            ON books
            USING gin (title gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_books_author_trgm
            ON books
            USING gin (author gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_books_keywords_trgm
            ON books
            USING gin (keywords gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_books_embedding_hnsw
            ON books
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
            """
        )

    if dialect == "postgresql" and _table_exists(bind, "tutor_document_chunks"):
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_tutor_document_chunks_search_vector_trgm
            ON tutor_document_chunks
            USING gin (search_vector gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_tutor_document_chunks_embedding_hnsw
            ON tutor_document_chunks
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql" and _table_exists(bind, "tutor_document_chunks"):
        op.execute("DROP INDEX IF EXISTS ix_tutor_document_chunks_embedding_hnsw")
        op.execute("DROP INDEX IF EXISTS ix_tutor_document_chunks_search_vector_trgm")

    if dialect == "postgresql" and _table_exists(bind, "books"):
        op.execute("DROP INDEX IF EXISTS ix_books_embedding_hnsw")
        op.execute("DROP INDEX IF EXISTS ix_books_keywords_trgm")
        op.execute("DROP INDEX IF EXISTS ix_books_author_trgm")
        op.execute("DROP INDEX IF EXISTS ix_books_title_trgm")
        op.execute("DROP INDEX IF EXISTS ix_books_search_vector_trgm")

    op.execute("DROP INDEX IF EXISTS uq_robot_tasks_current_fulfillment")
    op.execute("DROP INDEX IF EXISTS uq_return_requests_active_order")
    op.execute("DROP INDEX IF EXISTS uq_book_source_documents_primary_per_book")
