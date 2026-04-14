from __future__ import annotations

import hashlib
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.errors import ApiError
from app.tutor import repository
from app.tutor.generation import _safe_filename, ensure_profile_storage_dir
from app.tutor.schemas import (
    serialize_generation_job,
    serialize_message,
    serialize_profile,
    serialize_session,
    serialize_source_document,
    serialize_step,
)


def _require_reader_profile_id(reader_id: int | None) -> int:
    if reader_id is None:
        raise ApiError(403, "reader_profile_missing", "Reader profile is required")
    return reader_id


def _job_type_for_profile(profile) -> str:
    return "generate_book_profile" if profile.source_type == "book" else "ingest_uploaded_profile"


def create_book_profile(
    session: Session,
    *,
    reader_id: int | None,
    book_id: int,
    title: str | None,
    teaching_goal: str | None,
) -> tuple[object, object]:
    owner_id = _require_reader_profile_id(reader_id)
    book = repository.require_book(session, book_id=book_id)
    profile = repository.create_profile(
        session,
        reader_id=owner_id,
        source_type="book",
        book_id=book.id,
        title=(title or f"{book.title}导学本").strip(),
        teaching_goal=teaching_goal,
    )
    repository.create_source_document(
        session,
        profile_id=profile.id,
        reader_id=owner_id,
        kind="book_synthetic",
        mime_type="text/markdown",
        file_name=f"book-{book.id}.md",
        storage_path=None,
        content_hash=None,
        metadata_json={"bookId": book.id, "bookTitle": book.title},
    )
    job = repository.create_generation_job(
        session,
        profile_id=profile.id,
        job_type="generate_book_profile",
        payload_json={"bookId": book.id},
    )
    return profile, job


def create_upload_profile(
    session: Session,
    *,
    reader_id: int | None,
    title: str,
    teaching_goal: str | None,
    file_name: str,
    mime_type: str | None,
    raw_bytes: bytes,
) -> tuple[object, object]:
    owner_id = _require_reader_profile_id(reader_id)
    if not raw_bytes:
        raise ApiError(400, "empty_upload", "Uploaded file is empty")
    profile = repository.create_profile(
        session,
        reader_id=owner_id,
        source_type="upload",
        book_id=None,
        title=title.strip(),
        teaching_goal=teaching_goal,
    )
    base_dir = ensure_profile_storage_dir(reader_id=owner_id, profile_id=profile.id)
    upload_dir = base_dir / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = _safe_filename(Path(file_name or "source.txt").name, fallback="source.txt")
    storage_path = upload_dir / safe_name
    storage_path.write_bytes(raw_bytes)

    source_document = repository.create_source_document(
        session,
        profile_id=profile.id,
        reader_id=owner_id,
        kind="upload_file",
        mime_type=mime_type or "application/octet-stream",
        file_name=safe_name,
        storage_path=str(storage_path),
        content_hash=hashlib.sha256(raw_bytes).hexdigest(),
        metadata_json={"size": len(raw_bytes)},
    )
    job = repository.create_generation_job(
        session,
        profile_id=profile.id,
        job_type="ingest_uploaded_profile",
        payload_json={"sourceDocumentId": source_document.id},
    )
    return profile, job


def retry_profile_generation(session: Session, *, reader_id: int | None, profile_id: int) -> tuple[object, object]:
    owner_id = _require_reader_profile_id(reader_id)
    profile = repository.require_owned_profile(session, profile_id=profile_id, reader_id=owner_id)
    profile.status = "queued"
    profile.failure_code = None
    profile.failure_message = None
    job = repository.create_generation_job(
        session,
        profile_id=profile.id,
        job_type=_job_type_for_profile(profile),
        payload_json={"retry": True},
    )
    return profile, job


def list_profiles(session: Session, *, reader_id: int | None) -> list[dict]:
    owner_id = _require_reader_profile_id(reader_id)
    return [serialize_profile(profile) for profile in repository.list_profiles(session, reader_id=owner_id)]


def get_profile_detail(session: Session, *, reader_id: int | None, profile_id: int) -> dict:
    owner_id = _require_reader_profile_id(reader_id)
    profile = repository.require_owned_profile(session, profile_id=profile_id, reader_id=owner_id)
    sources = repository.list_profile_sources(session, profile_id=profile.id)
    job = repository.get_latest_profile_job(session, profile_id=profile.id)
    return {
        "profile": serialize_profile(profile),
        "sources": [serialize_source_document(source) for source in sources],
        "latestJob": None if job is None else serialize_generation_job(job),
    }


def get_dashboard(session: Session, *, reader_id: int | None) -> dict:
    owner_id = _require_reader_profile_id(reader_id)
    profiles = list(repository.list_profiles(session, reader_id=owner_id))
    sessions = list(repository.list_sessions(session, reader_id=owner_id))
    suggestions: list[dict] = []
    for profile in profiles[:5]:
        if profile.status == "ready":
            suggestions.append({"kind": "start_session", "profileId": profile.id, "title": profile.title})
        elif profile.status == "failed":
            suggestions.append({"kind": "retry_generation", "profileId": profile.id, "title": profile.title})
    return {
        "recentProfiles": [serialize_profile(profile) for profile in profiles[:5]],
        "resumableSessions": [serialize_session(item) for item in sessions[:5] if item.status == "active"],
        "suggestions": suggestions[:5],
    }


def start_session(session: Session, *, reader_id: int | None, profile_id: int) -> dict:
    owner_id = _require_reader_profile_id(reader_id)
    profile = repository.require_owned_profile(session, profile_id=profile_id, reader_id=owner_id)
    if profile.status != "ready":
        raise ApiError(409, "tutor_profile_not_ready", "Tutor profile is not ready yet")
    steps = list((profile.curriculum_json or {}).get("steps") or [])
    if not steps:
        raise ApiError(409, "tutor_profile_missing_curriculum", "Tutor profile does not contain a curriculum")
    first_step = serialize_step(steps[0], default_index=0)
    tutor_session = repository.create_session(
        session,
        reader_id=owner_id,
        profile_id=profile.id,
        current_step_title=first_step["title"],
    )
    welcome_message = repository.create_message(
        session,
        session_id=tutor_session.id,
        role="assistant",
        content=(
            f"我们现在开始《{profile.title}》的导学。"
            f"当前先完成“{first_step['title']}”。"
            f"{first_step['guidingQuestion'] or '你可以先用自己的话概括资料的核心内容。'}"
        ),
        metadata_json={"kind": "welcome", "stepIndex": 0},
    )
    tutor_session.last_message_preview = welcome_message.content[:120]
    session.flush()
    return {
        "session": serialize_session(tutor_session),
        "firstStep": first_step,
        "welcomeMessage": serialize_message(welcome_message),
    }


def list_sessions(session: Session, *, reader_id: int | None) -> list[dict]:
    owner_id = _require_reader_profile_id(reader_id)
    return [serialize_session(item) for item in repository.list_sessions(session, reader_id=owner_id)]


def get_session_detail(session: Session, *, reader_id: int | None, session_id: int) -> dict:
    owner_id = _require_reader_profile_id(reader_id)
    tutor_session = repository.require_owned_session(session, session_id=session_id, reader_id=owner_id)
    return {"session": serialize_session(tutor_session)}


def list_session_messages(session: Session, *, reader_id: int | None, session_id: int) -> list[dict]:
    owner_id = _require_reader_profile_id(reader_id)
    repository.require_owned_session(session, session_id=session_id, reader_id=owner_id)
    return [serialize_message(item) for item in repository.list_messages(session, session_id=session_id)]
