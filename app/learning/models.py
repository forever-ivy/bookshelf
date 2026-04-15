from __future__ import annotations

from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Boolean, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class LearningSourceBundle(Base):
    __tablename__ = "learning_source_bundles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningProfile(Base):
    __tablename__ = "learning_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    source_bundle_id: Mapped[int] = mapped_column(ForeignKey("learning_source_bundles.id"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    goal_mode: Mapped[str] = mapped_column(String(32), default="preview", index=True)
    difficulty_mode: Mapped[str] = mapped_column(String(32), default="guided", index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    active_path_version_id: Mapped[int | None] = mapped_column(
        ForeignKey("learning_path_versions.id"), nullable=True, index=True
    )
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningSourceAsset(Base):
    __tablename__ = "learning_source_assets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    bundle_id: Mapped[int] = mapped_column(ForeignKey("learning_source_bundles.id"), index=True)
    asset_kind: Mapped[str] = mapped_column(String(32), index=True)
    book_id: Mapped[int | None] = mapped_column(ForeignKey("books.id"), nullable=True, index=True)
    book_source_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("book_source_documents.id"), nullable=True, index=True
    )
    mime_type: Mapped[str | None] = mapped_column(String(128), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    extracted_text_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    parse_status: Mapped[str] = mapped_column(String(32), default="pending", index=True)
    content_hash: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningFragment(Base):
    __tablename__ = "learning_fragments"
    __table_args__ = (
        Index(
            "ix_learning_fragments_search_vector_trgm",
            "search_vector",
            postgresql_using="gin",
            postgresql_ops={"search_vector": "gin_trgm_ops"},
        ),
        Index(
            "ix_learning_fragments_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learning_profiles.id"), index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("learning_source_assets.id"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    fragment_type: Mapped[str] = mapped_column(String(32), default="text", index=True)
    chapter_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    semantic_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    content_tsv: Mapped[str | None] = mapped_column(Text, nullable=True)
    search_vector: Mapped[str | None] = mapped_column(Text, nullable=True)
    citation_anchor_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningPathVersion(Base):
    __tablename__ = "learning_path_versions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learning_profiles.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[str] = mapped_column(String(32), default="ready", index=True)
    title: Mapped[str] = mapped_column(String(255))
    overview: Mapped[str | None] = mapped_column(Text, nullable=True)
    graph_snapshot_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    graph_provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningPathStep(Base):
    __tablename__ = "learning_path_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    path_version_id: Mapped[int] = mapped_column(ForeignKey("learning_path_versions.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer, default=0, index=True)
    step_type: Mapped[str] = mapped_column(String(32), default="lesson", index=True)
    title: Mapped[str] = mapped_column(String(255))
    objective: Mapped[str | None] = mapped_column(Text, nullable=True)
    guiding_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    success_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    prerequisite_step_ids: Mapped[list[int] | None] = mapped_column(JSON_VARIANT, nullable=True)
    keywords_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learning_profiles.id"), index=True)
    learning_mode: Mapped[str] = mapped_column(String(32), default="preview", index=True)
    session_kind: Mapped[str] = mapped_column(String(16), default="guide", index=True)
    source_session_id: Mapped[int | None] = mapped_column(ForeignKey("learning_sessions.id"), nullable=True, index=True)
    source_turn_id: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    focus_step_index: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    focus_context_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    current_step_index: Mapped[int] = mapped_column(Integer, default=0)
    current_step_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mastery_score: Mapped[float] = mapped_column(default=0.0)
    remediation_status: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    completed_steps_count: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningTurn(Base):
    __tablename__ = "learning_turns"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    turn_kind: Mapped[str] = mapped_column(String(24), default="guide", index=True)
    user_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    peer_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    assistant_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    citations_json: Mapped[list[dict] | None] = mapped_column(JSON_VARIANT, nullable=True)
    evaluation_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    related_concepts_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    bridge_metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    token_usage_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True, index=True)


class LearningStepContextItem(Base):
    __tablename__ = "learning_step_context_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    guide_session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer, index=True)
    source_session_id: Mapped[int | None] = mapped_column(ForeignKey("learning_sessions.id"), nullable=True, index=True)
    source_turn_id: Mapped[int | None] = mapped_column(ForeignKey("learning_turns.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    content: Mapped[str] = mapped_column(Text)
    citations_json: Mapped[list[dict] | None] = mapped_column(JSON_VARIANT, nullable=True)
    related_concepts_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningBridgeAction(Base):
    __tablename__ = "learning_bridge_actions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    action_type: Mapped[str] = mapped_column(String(48), index=True)
    from_session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    from_turn_id: Mapped[int | None] = mapped_column(ForeignKey("learning_turns.id"), nullable=True, index=True)
    to_session_id: Mapped[int | None] = mapped_column(ForeignKey("learning_sessions.id"), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="completed", index=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    result_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningAgentRun(Base):
    __tablename__ = "learning_agent_runs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    turn_id: Mapped[int] = mapped_column(ForeignKey("learning_turns.id"), index=True)
    agent_name: Mapped[str] = mapped_column(String(32), index=True)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="completed", index=True)
    input_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningCheckpoint(Base):
    __tablename__ = "learning_checkpoints"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    turn_id: Mapped[int | None] = mapped_column(ForeignKey("learning_turns.id"), nullable=True, index=True)
    step_index: Mapped[int] = mapped_column(Integer, index=True)
    mastery_score: Mapped[float] = mapped_column(default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    missing_concepts_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    evidence_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class LearningRemediationPlan(Base):
    __tablename__ = "learning_remediation_plans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer, index=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    missing_concepts_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    suggested_questions_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    plan_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningReport(Base):
    __tablename__ = "learning_reports"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("learning_sessions.id"), index=True)
    report_type: Mapped[str] = mapped_column(String(32), default="session_summary", index=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    weak_points_json: Mapped[list[str] | None] = mapped_column(JSON_VARIANT, nullable=True)
    suggested_next_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class LearningJob(Base):
    __tablename__ = "learning_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("learning_profiles.id"), index=True)
    job_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    payload_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
