from __future__ import annotations

from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, JSON_VARIANT, utc_now


class TutorProfile(Base):
    __tablename__ = "tutor_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    reader_id: Mapped[int] = mapped_column(ForeignKey("reader_profiles.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(32), index=True)
    book_id: Mapped[int | None] = mapped_column(ForeignKey("books.id"), nullable=True, index=True)
    book_source_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("book_source_documents.id"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255))
    teaching_goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    persona_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    curriculum_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    source_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class TutorSourceDocument(Base):
    __tablename__ = "tutor_source_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tutor_profiles.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32), index=True)
    origin_book_source_document_id: Mapped[int | None] = mapped_column(
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


class TutorDocumentChunk(Base):
    __tablename__ = "tutor_document_chunks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tutor_profiles.id"), index=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("tutor_source_documents.id"), index=True)
    chunk_index: Mapped[int] = mapped_column(Integer, default=0)
    content: Mapped[str] = mapped_column(Text)
    content_tsv: Mapped[str | None] = mapped_column(Text, nullable=True)
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class TutorSession(Base):
    __tablename__ = "tutor_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tutor_profiles.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    current_step_index: Mapped[int] = mapped_column(Integer, default=0)
    current_step_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    completed_steps_count: Mapped[int] = mapped_column(Integer, default=0)
    last_message_preview: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)


class TutorSessionMessage(Base):
    __tablename__ = "tutor_session_messages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("tutor_sessions.id"), index=True)
    role: Mapped[str] = mapped_column(String(32), index=True)
    content: Mapped[str] = mapped_column(Text)
    citations_json: Mapped[list[dict] | None] = mapped_column(JSON_VARIANT, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True, index=True)


class TutorStepCompletion(Base):
    __tablename__ = "tutor_step_completions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("tutor_sessions.id"), index=True)
    step_index: Mapped[int] = mapped_column(Integer, index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)
    message_id: Mapped[int | None] = mapped_column(ForeignKey("tutor_session_messages.id"), nullable=True, index=True)
    completed_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)


class TutorGenerationJob(Base):
    __tablename__ = "tutor_generation_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    profile_id: Mapped[int] = mapped_column(ForeignKey("tutor_profiles.id"), index=True)
    job_type: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    payload_json: Mapped[dict | None] = mapped_column(JSON_VARIANT, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(default=utc_now, nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(default=utc_now, onupdate=utc_now, nullable=True)
