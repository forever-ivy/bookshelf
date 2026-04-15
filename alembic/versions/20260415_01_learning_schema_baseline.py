"""Align the service schema to the learning-only baseline.

Revision ID: 20260415_01
Revises: 20260402_01
Create Date: 2026-04-15 22:10:00.000000
"""

from __future__ import annotations

from alembic import op
from pgvector.sqlalchemy import Vector
import sqlalchemy as sa


revision = "20260415_01"
down_revision = "20260402_01"
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

    borrow_columns = _column_names(bind, "borrow_orders")
    if "book_id" in borrow_columns and "requested_book_id" not in borrow_columns:
        op.alter_column("borrow_orders", "book_id", new_column_name="requested_book_id")
    if "assigned_copy_id" in borrow_columns and "fulfilled_copy_id" not in borrow_columns:
        op.alter_column("borrow_orders", "assigned_copy_id", new_column_name="fulfilled_copy_id")
    if "order_mode" in borrow_columns and "fulfillment_mode" not in borrow_columns:
        op.alter_column("borrow_orders", "order_mode", new_column_name="fulfillment_mode")

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

    if not _table_exists(bind, "learning_source_bundles"):
        op.create_table(
            "learning_source_bundles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("reader_id", sa.Integer(), sa.ForeignKey("reader_profiles.id"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_source_bundles_reader_id", "learning_source_bundles", ["reader_id"])

    if not _table_exists(bind, "learning_profiles"):
        op.create_table(
            "learning_profiles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("reader_id", sa.Integer(), sa.ForeignKey("reader_profiles.id"), nullable=False),
            sa.Column("source_bundle_id", sa.Integer(), sa.ForeignKey("learning_source_bundles.id"), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("goal_mode", sa.String(length=32), nullable=False),
            sa.Column("difficulty_mode", sa.String(length=32), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_profiles_reader_id", "learning_profiles", ["reader_id"])
        op.create_index("ix_learning_profiles_source_bundle_id", "learning_profiles", ["source_bundle_id"])
        op.create_index("ix_learning_profiles_goal_mode", "learning_profiles", ["goal_mode"])
        op.create_index("ix_learning_profiles_difficulty_mode", "learning_profiles", ["difficulty_mode"])
        op.create_index("ix_learning_profiles_status", "learning_profiles", ["status"])

    if not _table_exists(bind, "learning_source_assets"):
        op.create_table(
            "learning_source_assets",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("bundle_id", sa.Integer(), sa.ForeignKey("learning_source_bundles.id"), nullable=False),
            sa.Column("asset_kind", sa.String(length=32), nullable=False),
            sa.Column("book_id", sa.Integer(), sa.ForeignKey("books.id"), nullable=True),
            sa.Column("book_source_document_id", sa.Integer(), sa.ForeignKey("book_source_documents.id"), nullable=True),
            sa.Column("mime_type", sa.String(length=128), nullable=True),
            sa.Column("file_name", sa.String(length=255), nullable=True),
            sa.Column("storage_path", sa.String(length=1024), nullable=True),
            sa.Column("extracted_text_path", sa.String(length=1024), nullable=True),
            sa.Column("parse_status", sa.String(length=32), nullable=False),
            sa.Column("content_hash", sa.String(length=128), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_source_assets_bundle_id", "learning_source_assets", ["bundle_id"])
        op.create_index("ix_learning_source_assets_asset_kind", "learning_source_assets", ["asset_kind"])
        op.create_index("ix_learning_source_assets_book_id", "learning_source_assets", ["book_id"])
        op.create_index("ix_learning_source_assets_book_source_document_id", "learning_source_assets", ["book_source_document_id"])
        op.create_index("ix_learning_source_assets_parse_status", "learning_source_assets", ["parse_status"])
        op.create_index("ix_learning_source_assets_content_hash", "learning_source_assets", ["content_hash"])

    if not _table_exists(bind, "learning_fragments"):
        op.create_table(
            "learning_fragments",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("learning_profiles.id"), nullable=False),
            sa.Column("asset_id", sa.Integer(), sa.ForeignKey("learning_source_assets.id"), nullable=False),
            sa.Column("chunk_index", sa.Integer(), nullable=False),
            sa.Column("fragment_type", sa.String(length=32), nullable=False),
            sa.Column("chapter_label", sa.String(length=255), nullable=True),
            sa.Column("semantic_summary", sa.Text(), nullable=True),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("content_tsv", sa.Text(), nullable=True),
            sa.Column("search_vector", sa.Text(), nullable=True),
            sa.Column("citation_anchor_json", sa.JSON(), nullable=True),
            sa.Column("embedding", Vector(1536), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_fragments_profile_id", "learning_fragments", ["profile_id"])
        op.create_index("ix_learning_fragments_asset_id", "learning_fragments", ["asset_id"])
        op.create_index("ix_learning_fragments_chunk_index", "learning_fragments", ["chunk_index"])
        op.create_index("ix_learning_fragments_fragment_type", "learning_fragments", ["fragment_type"])
    if dialect == "postgresql" and _table_exists(bind, "learning_fragments"):
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_learning_fragments_search_vector_trgm
            ON learning_fragments
            USING gin (search_vector gin_trgm_ops)
            """
        )
        op.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_learning_fragments_embedding_hnsw
            ON learning_fragments
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 64)
            """
        )

    if not _table_exists(bind, "learning_path_versions"):
        op.create_table(
            "learning_path_versions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("learning_profiles.id"), nullable=False),
            sa.Column("version_number", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("overview", sa.Text(), nullable=True),
            sa.Column("graph_snapshot_json", sa.JSON(), nullable=True),
            sa.Column("graph_provider", sa.String(length=32), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_path_versions_profile_id", "learning_path_versions", ["profile_id"])
        op.create_index("ix_learning_path_versions_status", "learning_path_versions", ["status"])

    if _table_exists(bind, "learning_profiles") and not _column_exists(bind, "learning_profiles", "active_path_version_id"):
        op.add_column("learning_profiles", sa.Column("active_path_version_id", sa.Integer(), nullable=True))
        op.create_foreign_key(
            "fk_learning_profiles_active_path_version_id",
            "learning_profiles",
            "learning_path_versions",
            ["active_path_version_id"],
            ["id"],
        )
        op.create_index("ix_learning_profiles_active_path_version_id", "learning_profiles", ["active_path_version_id"])

    if not _table_exists(bind, "learning_path_steps"):
        op.create_table(
            "learning_path_steps",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("path_version_id", sa.Integer(), sa.ForeignKey("learning_path_versions.id"), nullable=False),
            sa.Column("step_index", sa.Integer(), nullable=False),
            sa.Column("step_type", sa.String(length=32), nullable=False),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("objective", sa.Text(), nullable=True),
            sa.Column("guiding_question", sa.Text(), nullable=True),
            sa.Column("success_criteria", sa.Text(), nullable=True),
            sa.Column("prerequisite_step_ids", sa.JSON(), nullable=True),
            sa.Column("keywords_json", sa.JSON(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_path_steps_path_version_id", "learning_path_steps", ["path_version_id"])
        op.create_index("ix_learning_path_steps_step_index", "learning_path_steps", ["step_index"])
        op.create_index("ix_learning_path_steps_step_type", "learning_path_steps", ["step_type"])

    if not _table_exists(bind, "learning_sessions"):
        op.create_table(
            "learning_sessions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("learning_profiles.id"), nullable=False),
            sa.Column("learning_mode", sa.String(length=32), nullable=False),
            sa.Column("session_kind", sa.String(length=16), nullable=False, server_default="guide"),
            sa.Column("source_session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=True),
            sa.Column("source_turn_id", sa.Integer(), nullable=True),
            sa.Column("focus_step_index", sa.Integer(), nullable=True),
            sa.Column("focus_context_json", sa.JSON(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("current_step_index", sa.Integer(), nullable=False),
            sa.Column("current_step_title", sa.String(length=255), nullable=True),
            sa.Column("mastery_score", sa.Float(), nullable=False),
            sa.Column("remediation_status", sa.String(length=32), nullable=True),
            sa.Column("completed_steps_count", sa.Integer(), nullable=False),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_sessions_profile_id", "learning_sessions", ["profile_id"])
        op.create_index("ix_learning_sessions_learning_mode", "learning_sessions", ["learning_mode"])
        op.create_index("ix_learning_sessions_session_kind", "learning_sessions", ["session_kind"])
        op.create_index("ix_learning_sessions_source_session_id", "learning_sessions", ["source_session_id"])
        op.create_index("ix_learning_sessions_source_turn_id", "learning_sessions", ["source_turn_id"])
        op.create_index("ix_learning_sessions_focus_step_index", "learning_sessions", ["focus_step_index"])
        op.create_index("ix_learning_sessions_status", "learning_sessions", ["status"])
        op.create_index("ix_learning_sessions_remediation_status", "learning_sessions", ["remediation_status"])
    else:
        if not _column_exists(bind, "learning_sessions", "session_kind"):
            op.add_column("learning_sessions", sa.Column("session_kind", sa.String(length=16), nullable=False, server_default="guide"))
            op.create_index("ix_learning_sessions_session_kind", "learning_sessions", ["session_kind"])
        if not _column_exists(bind, "learning_sessions", "source_session_id"):
            op.add_column("learning_sessions", sa.Column("source_session_id", sa.Integer(), nullable=True))
            op.create_foreign_key(
                "fk_learning_sessions_source_session_id",
                "learning_sessions",
                "learning_sessions",
                ["source_session_id"],
                ["id"],
            )
            op.create_index("ix_learning_sessions_source_session_id", "learning_sessions", ["source_session_id"])
        if not _column_exists(bind, "learning_sessions", "source_turn_id"):
            op.add_column("learning_sessions", sa.Column("source_turn_id", sa.Integer(), nullable=True))
            op.create_index("ix_learning_sessions_source_turn_id", "learning_sessions", ["source_turn_id"])
        if not _column_exists(bind, "learning_sessions", "focus_step_index"):
            op.add_column("learning_sessions", sa.Column("focus_step_index", sa.Integer(), nullable=True))
            op.create_index("ix_learning_sessions_focus_step_index", "learning_sessions", ["focus_step_index"])
        if not _column_exists(bind, "learning_sessions", "focus_context_json"):
            op.add_column("learning_sessions", sa.Column("focus_context_json", sa.JSON(), nullable=True))

    if not _table_exists(bind, "learning_turns"):
        op.create_table(
            "learning_turns",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("turn_kind", sa.String(length=24), nullable=False, server_default="guide"),
            sa.Column("user_content", sa.Text(), nullable=True),
            sa.Column("teacher_content", sa.Text(), nullable=True),
            sa.Column("peer_content", sa.Text(), nullable=True),
            sa.Column("assistant_content", sa.Text(), nullable=True),
            sa.Column("citations_json", sa.JSON(), nullable=True),
            sa.Column("evaluation_json", sa.JSON(), nullable=True),
            sa.Column("related_concepts_json", sa.JSON(), nullable=True),
            sa.Column("bridge_metadata_json", sa.JSON(), nullable=True),
            sa.Column("token_usage_json", sa.JSON(), nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_turns_session_id", "learning_turns", ["session_id"])
        op.create_index("ix_learning_turns_turn_kind", "learning_turns", ["turn_kind"])
        op.create_index("ix_learning_turns_created_at", "learning_turns", ["created_at"])
    else:
        if not _column_exists(bind, "learning_turns", "turn_kind"):
            op.add_column("learning_turns", sa.Column("turn_kind", sa.String(length=24), nullable=False, server_default="guide"))
            op.create_index("ix_learning_turns_turn_kind", "learning_turns", ["turn_kind"])
        if not _column_exists(bind, "learning_turns", "related_concepts_json"):
            op.add_column("learning_turns", sa.Column("related_concepts_json", sa.JSON(), nullable=True))
        if not _column_exists(bind, "learning_turns", "bridge_metadata_json"):
            op.add_column("learning_turns", sa.Column("bridge_metadata_json", sa.JSON(), nullable=True))

    if not _table_exists(bind, "learning_step_context_items"):
        op.create_table(
            "learning_step_context_items",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("guide_session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("step_index", sa.Integer(), nullable=False),
            sa.Column("source_session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=True),
            sa.Column("source_turn_id", sa.Integer(), sa.ForeignKey("learning_turns.id"), nullable=True),
            sa.Column("title", sa.String(length=255), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("citations_json", sa.JSON(), nullable=True),
            sa.Column("related_concepts_json", sa.JSON(), nullable=True),
            sa.Column("embedding", Vector(1536), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_step_context_items_guide_session_id", "learning_step_context_items", ["guide_session_id"])
        op.create_index("ix_learning_step_context_items_step_index", "learning_step_context_items", ["step_index"])
        op.create_index("ix_learning_step_context_items_source_session_id", "learning_step_context_items", ["source_session_id"])
        op.create_index("ix_learning_step_context_items_source_turn_id", "learning_step_context_items", ["source_turn_id"])

    if not _table_exists(bind, "learning_bridge_actions"):
        op.create_table(
            "learning_bridge_actions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("action_type", sa.String(length=48), nullable=False),
            sa.Column("from_session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("from_turn_id", sa.Integer(), sa.ForeignKey("learning_turns.id"), nullable=True),
            sa.Column("to_session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=True),
            sa.Column("status", sa.String(length=24), nullable=False),
            sa.Column("payload_json", sa.JSON(), nullable=True),
            sa.Column("result_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_bridge_actions_action_type", "learning_bridge_actions", ["action_type"])
        op.create_index("ix_learning_bridge_actions_from_session_id", "learning_bridge_actions", ["from_session_id"])
        op.create_index("ix_learning_bridge_actions_from_turn_id", "learning_bridge_actions", ["from_turn_id"])
        op.create_index("ix_learning_bridge_actions_to_session_id", "learning_bridge_actions", ["to_session_id"])
        op.create_index("ix_learning_bridge_actions_status", "learning_bridge_actions", ["status"])

    if not _table_exists(bind, "learning_agent_runs"):
        op.create_table(
            "learning_agent_runs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("turn_id", sa.Integer(), sa.ForeignKey("learning_turns.id"), nullable=False),
            sa.Column("agent_name", sa.String(length=32), nullable=False),
            sa.Column("model_name", sa.String(length=128), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("input_summary", sa.Text(), nullable=True),
            sa.Column("output_summary", sa.Text(), nullable=True),
            sa.Column("latency_ms", sa.Integer(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_agent_runs_turn_id", "learning_agent_runs", ["turn_id"])
        op.create_index("ix_learning_agent_runs_agent_name", "learning_agent_runs", ["agent_name"])
        op.create_index("ix_learning_agent_runs_status", "learning_agent_runs", ["status"])

    if not _table_exists(bind, "learning_checkpoints"):
        op.create_table(
            "learning_checkpoints",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("turn_id", sa.Integer(), sa.ForeignKey("learning_turns.id"), nullable=True),
            sa.Column("step_index", sa.Integer(), nullable=False),
            sa.Column("mastery_score", sa.Float(), nullable=False),
            sa.Column("passed", sa.Boolean(), nullable=False),
            sa.Column("missing_concepts_json", sa.JSON(), nullable=True),
            sa.Column("evidence_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_checkpoints_session_id", "learning_checkpoints", ["session_id"])
        op.create_index("ix_learning_checkpoints_turn_id", "learning_checkpoints", ["turn_id"])
        op.create_index("ix_learning_checkpoints_step_index", "learning_checkpoints", ["step_index"])
        op.create_index("ix_learning_checkpoints_passed", "learning_checkpoints", ["passed"])

    if not _table_exists(bind, "learning_remediation_plans"):
        op.create_table(
            "learning_remediation_plans",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("step_index", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("missing_concepts_json", sa.JSON(), nullable=True),
            sa.Column("suggested_questions_json", sa.JSON(), nullable=True),
            sa.Column("plan_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_remediation_plans_session_id", "learning_remediation_plans", ["session_id"])
        op.create_index("ix_learning_remediation_plans_step_index", "learning_remediation_plans", ["step_index"])
        op.create_index("ix_learning_remediation_plans_status", "learning_remediation_plans", ["status"])

    if not _table_exists(bind, "learning_reports"):
        op.create_table(
            "learning_reports",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("session_id", sa.Integer(), sa.ForeignKey("learning_sessions.id"), nullable=False),
            sa.Column("report_type", sa.String(length=32), nullable=False),
            sa.Column("summary", sa.Text(), nullable=True),
            sa.Column("weak_points_json", sa.JSON(), nullable=True),
            sa.Column("suggested_next_action", sa.Text(), nullable=True),
            sa.Column("metadata_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_reports_session_id", "learning_reports", ["session_id"])
        op.create_index("ix_learning_reports_report_type", "learning_reports", ["report_type"])

    if not _table_exists(bind, "learning_jobs"):
        op.create_table(
            "learning_jobs",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("profile_id", sa.Integer(), sa.ForeignKey("learning_profiles.id"), nullable=False),
            sa.Column("job_type", sa.String(length=64), nullable=False),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("attempt_count", sa.Integer(), nullable=False),
            sa.Column("error_message", sa.Text(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_index("ix_learning_jobs_profile_id", "learning_jobs", ["profile_id"])
        op.create_index("ix_learning_jobs_job_type", "learning_jobs", ["job_type"])
        op.create_index("ix_learning_jobs_status", "learning_jobs", ["status"])


def downgrade() -> None:
    raise NotImplementedError("Downgrade is not supported for the learning-only schema baseline")
