from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import sqlalchemy as sa
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.learning import repository as learning_repository
from app.learning.models import LearningProfile


LEGACY_TUTOR_TABLES = (
    "tutor_step_completions",
    "tutor_session_messages",
    "tutor_sessions",
    "tutor_document_chunks",
    "tutor_source_documents",
    "tutor_generation_jobs",
    "tutor_profiles",
)


def _table_exists(session: Session, table_name: str) -> bool:
    bind = session.get_bind()
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _json_value(value: Any) -> Any:
    if value is None or isinstance(value, (dict, list, int, float, bool)):
        return value
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            return json.loads(stripped)
        except json.JSONDecodeError:
            return value
    return value


def _steps_from_legacy_profile(profile: Mapping[str, Any]) -> list[dict[str, Any]]:
    curriculum = _json_value(profile.get("curriculum_json")) or {}
    steps = list(curriculum.get("steps") or [])
    rows: list[dict[str, Any]] = []
    for index, step in enumerate(steps):
        rows.append(
            {
                "step_index": int(step.get("index", index)),
                "step_type": "lesson",
                "title": str(step.get("title") or f"步骤 {index + 1}"),
                "objective": step.get("learningObjective") or step.get("learning_objective"),
                "guiding_question": step.get("guidingQuestion") or step.get("guiding_question"),
                "success_criteria": step.get("successCriteria") or step.get("success_criteria"),
                "prerequisite_step_ids": [max(index - 1, 0)] if index > 0 else [],
                "keywords_json": list(step.get("keywords") or []),
                "metadata_json": {"legacyTutorProfileId": profile["id"]},
            }
        )
    if rows:
        return rows
    return [
        {
            "step_index": 0,
            "step_type": "lesson",
            "title": "建立整体认知",
            "objective": "迁移旧版导学本的核心主题。",
            "guiding_question": "这份资料主要在讲什么？",
            "success_criteria": "能概括主题。",
            "prerequisite_step_ids": [],
            "keywords_json": [],
            "metadata_json": {"legacyTutorProfileId": profile["id"]},
        }
    ]


def _legacy_asset_kind(profile: Mapping[str, Any], source: Mapping[str, Any]) -> str:
    if source.get("origin_book_source_document_id") or profile.get("book_id") or profile.get("source_type") == "book":
        return "book"
    return "inline_text"


def _find_existing_learning_profile(session: Session, legacy_profile_id: int) -> LearningProfile | None:
    profiles = session.execute(select(LearningProfile).order_by(LearningProfile.id.asc())).scalars().all()
    for profile in profiles:
        metadata = profile.metadata_json or {}
        if metadata.get("legacyTutorProfileId") == legacy_profile_id:
            return profile
    return None


def migrate_legacy_tutor_records(session: Session) -> dict[str, int]:
    if not _table_exists(session, "tutor_profiles"):
        return {"profiles": 0, "sessions": 0, "fragments": 0, "checkpoints": 0}

    migrated_profiles = 0
    migrated_sessions = 0
    migrated_fragments = 0
    migrated_checkpoints = 0

    legacy_profiles = session.execute(text("SELECT * FROM tutor_profiles ORDER BY id ASC")).mappings().all()
    for legacy_profile in legacy_profiles:
        if _find_existing_learning_profile(session, int(legacy_profile["id"])) is not None:
            continue

        persona = _json_value(legacy_profile.get("persona_json")) or {}
        bundle = learning_repository.create_source_bundle(
            session,
            reader_id=int(legacy_profile["reader_id"]),
            title=str(legacy_profile["title"]),
            metadata_json={"legacyTutorProfileId": legacy_profile["id"]},
        )
        profile = learning_repository.create_profile(
            session,
            reader_id=int(legacy_profile["reader_id"]),
            source_bundle_id=bundle.id,
            title=str(legacy_profile["title"]),
            goal_mode="preview",
            difficulty_mode="guided",
            metadata_json={
                "legacyTutorProfileId": legacy_profile["id"],
                "sourceSummary": legacy_profile.get("source_summary"),
                "legacyPersona": persona,
                "legacySourceType": legacy_profile.get("source_type"),
                "legacyTeachingGoal": legacy_profile.get("teaching_goal"),
            },
        )
        profile.status = "ready" if legacy_profile.get("status") == "ready" else "queued"
        profile.created_at = legacy_profile.get("created_at")
        profile.updated_at = legacy_profile.get("updated_at")

        asset_by_legacy_source_id: dict[int, Any] = {}
        if _table_exists(session, "tutor_source_documents"):
            legacy_sources = session.execute(
                text("SELECT * FROM tutor_source_documents WHERE profile_id = :profile_id ORDER BY id ASC"),
                {"profile_id": legacy_profile["id"]},
            ).mappings().all()
        else:
            legacy_sources = []

        for source in legacy_sources:
            asset = learning_repository.create_source_asset(
                session,
                bundle_id=bundle.id,
                asset_kind=_legacy_asset_kind(legacy_profile, source),
                book_id=legacy_profile.get("book_id"),
                book_source_document_id=source.get("origin_book_source_document_id")
                or legacy_profile.get("book_source_document_id"),
                mime_type=source.get("mime_type"),
                file_name=source.get("file_name"),
                storage_path=source.get("storage_path"),
                content_hash=source.get("content_hash"),
                metadata_json={
                    "legacyTutorSourceId": source["id"],
                    "legacyKind": source.get("kind"),
                    "legacyExtractedTextPath": source.get("extracted_text_path"),
                },
            )
            asset.parse_status = str(source.get("parse_status") or "pending")
            asset.extracted_text_path = source.get("extracted_text_path")
            asset.created_at = source.get("created_at")
            asset.updated_at = source.get("updated_at")
            asset_by_legacy_source_id[int(source["id"])] = asset

        if _table_exists(session, "tutor_document_chunks"):
            legacy_chunks = session.execute(
                text("SELECT * FROM tutor_document_chunks WHERE profile_id = :profile_id ORDER BY document_id ASC, chunk_index ASC, id ASC"),
                {"profile_id": legacy_profile["id"]},
            ).mappings().all()
        else:
            legacy_chunks = []

        chunks_by_document: dict[int, list[dict[str, Any]]] = {}
        for chunk in legacy_chunks:
            document_id = int(chunk["document_id"])
            chunks_by_document.setdefault(document_id, []).append(
                {
                    "chunk_index": int(chunk.get("chunk_index") or 0),
                    "fragment_type": "text",
                    "chapter_label": None,
                    "semantic_summary": None,
                    "content": str(chunk.get("content") or ""),
                    "content_tsv": chunk.get("content_tsv"),
                    "search_vector": chunk.get("search_vector"),
                    "citation_anchor_json": {
                        "legacyTutorChunkId": chunk["id"],
                        "legacyTutorDocumentId": document_id,
                        "chunkIndex": int(chunk.get("chunk_index") or 0),
                    },
                    "embedding": _json_value(chunk.get("embedding")),
                    "metadata_json": {
                        "legacyTutorChunkId": chunk["id"],
                        "legacyMetadata": _json_value(chunk.get("metadata_json")) or {},
                    },
                }
            )

        for source_id, asset in asset_by_legacy_source_id.items():
            fragments = chunks_by_document.get(source_id, [])
            if not fragments:
                continue
            created_fragments = learning_repository.replace_asset_fragments(
                session,
                profile_id=profile.id,
                asset_id=asset.id,
                fragments=fragments,
            )
            for fragment in created_fragments:
                fragment.created_at = asset.created_at
            migrated_fragments += len(created_fragments)

        path_version = learning_repository.create_path_version(
            session,
            profile_id=profile.id,
            version_number=1,
            title=(
                (_json_value(legacy_profile.get("curriculum_json")) or {}).get("title")
                or f"{legacy_profile['title']}导学路径"
            ),
            overview=legacy_profile.get("source_summary"),
            graph_snapshot_json={"provider": "migration", "nodes": [], "edges": []},
            graph_provider="migration",
            metadata_json={"legacyTutorProfileId": legacy_profile["id"]},
        )
        path_version.created_at = legacy_profile.get("created_at")
        steps = _steps_from_legacy_profile(legacy_profile)
        learning_repository.replace_path_steps(session, path_version_id=path_version.id, steps=steps)
        profile.active_path_version_id = path_version.id

        if _table_exists(session, "tutor_generation_jobs"):
            legacy_jobs = session.execute(
                text("SELECT * FROM tutor_generation_jobs WHERE profile_id = :profile_id ORDER BY id ASC"),
                {"profile_id": legacy_profile["id"]},
            ).mappings().all()
        else:
            legacy_jobs = []

        if legacy_jobs:
            for legacy_job in legacy_jobs:
                job = learning_repository.create_job(
                    session,
                    profile_id=profile.id,
                    job_type=str(legacy_job.get("job_type") or "migration"),
                    payload_json={
                        "migration": True,
                        "legacyTutorJobId": legacy_job["id"],
                        "legacyPayload": _json_value(legacy_job.get("payload_json")) or {},
                    },
                )
                job.status = str(legacy_job.get("status") or "completed")
                job.attempt_count = int(legacy_job.get("attempt_count") or 0)
                job.error_message = legacy_job.get("error_message")
                job.created_at = legacy_job.get("created_at")
                job.updated_at = legacy_job.get("updated_at")
        else:
            job = learning_repository.create_job(
                session,
                profile_id=profile.id,
                job_type="plan_generate",
                payload_json={"migration": True, "legacyTutorProfileId": legacy_profile["id"]},
            )
            job.status = "completed"

        migrated_profiles += 1

        if not _table_exists(session, "tutor_sessions"):
            continue

        legacy_sessions = session.execute(
            text("SELECT * FROM tutor_sessions WHERE profile_id = :profile_id ORDER BY id ASC"),
            {"profile_id": legacy_profile["id"]},
        ).mappings().all()
        for legacy_session in legacy_sessions:
            new_session = learning_repository.create_session(
                session,
                profile_id=profile.id,
                learning_mode="preview",
                current_step_title=legacy_session.get("current_step_title"),
            )
            new_session.status = str(legacy_session.get("status") or "active")
            new_session.current_step_index = int(legacy_session.get("current_step_index") or 0)
            new_session.current_step_title = legacy_session.get("current_step_title")
            new_session.completed_steps_count = int(legacy_session.get("completed_steps_count") or 0)
            new_session.metadata_json = {"legacyTutorSessionId": legacy_session["id"]}
            new_session.started_at = legacy_session.get("started_at")
            new_session.updated_at = legacy_session.get("updated_at")

            if _table_exists(session, "tutor_session_messages"):
                messages = session.execute(
                    text(
                        "SELECT * FROM tutor_session_messages WHERE session_id = :session_id ORDER BY created_at ASC, id ASC"
                    ),
                    {"session_id": legacy_session["id"]},
                ).mappings().all()
            else:
                messages = []

            pending_user: Mapping[str, Any] | None = None
            assistant_turn_by_legacy_message_id: dict[int, Any] = {}
            for message in messages:
                role = str(message.get("role") or "")
                if role == "user":
                    pending_user = message
                    continue
                if role != "assistant":
                    continue
                turn = learning_repository.create_turn(
                    session,
                    session_id=new_session.id,
                    user_content=None if pending_user is None else pending_user.get("content"),
                    teacher_content=message.get("content"),
                    peer_content=None,
                    assistant_content=message.get("content"),
                    turn_kind="guide",
                    citations_json=_json_value(message.get("citations_json")) or [],
                    evaluation_json=_json_value(message.get("metadata_json")),
                    related_concepts_json=[],
                    metadata_json={
                        "migration": True,
                        "legacyAssistantMessageId": message["id"],
                        "legacyUserMessageId": None if pending_user is None else pending_user["id"],
                    },
                )
                turn.created_at = message.get("created_at")
                assistant_turn_by_legacy_message_id[int(message["id"])] = turn
                pending_user = None

            if _table_exists(session, "tutor_step_completions"):
                completions = session.execute(
                    text("SELECT * FROM tutor_step_completions WHERE session_id = :session_id ORDER BY completed_at ASC, id ASC"),
                    {"session_id": legacy_session["id"]},
                ).mappings().all()
            else:
                completions = []

            for completion in completions:
                linked_turn = None
                legacy_message_id = completion.get("message_id")
                if legacy_message_id is not None:
                    linked_turn = assistant_turn_by_legacy_message_id.get(int(legacy_message_id))
                confidence = float(completion.get("confidence") or 0.0)
                learning_repository.create_checkpoint(
                    session,
                    session_id=new_session.id,
                    turn_id=None if linked_turn is None else linked_turn.id,
                    step_index=int(completion.get("step_index") or 0),
                    mastery_score=confidence,
                    passed=confidence >= 0.6,
                    missing_concepts_json=[],
                    evidence_json={
                        "reasoning": completion.get("reasoning"),
                        "legacyTutorCompletionId": completion["id"],
                    },
                ).created_at = completion.get("completed_at")
                migrated_checkpoints += 1

            migrated_sessions += 1

    session.flush()
    return {
        "profiles": migrated_profiles,
        "sessions": migrated_sessions,
        "fragments": migrated_fragments,
        "checkpoints": migrated_checkpoints,
    }


def drop_legacy_tutor_tables(bind: sa.engine.Connection | sa.engine.Engine) -> None:
    connection = bind.connect() if isinstance(bind, sa.engine.Engine) else bind
    should_close = isinstance(bind, sa.engine.Engine)
    try:
        for table_name in LEGACY_TUTOR_TABLES:
            connection.exec_driver_sql(f"DROP TABLE IF EXISTS {table_name}")
    finally:
        if should_close:
            connection.close()


if __name__ == "__main__":  # pragma: no cover - manual execution helper
    from app.core.database import get_session_factory

    db_session = get_session_factory()()
    try:
        result = migrate_legacy_tutor_records(db_session)
        drop_legacy_tutor_tables(db_session.get_bind())
        db_session.commit()
        print(result)
    finally:
        db_session.close()
