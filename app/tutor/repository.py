from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.catalog.models import Book, BookSourceDocument
from app.core.errors import ApiError
from app.tutor.models import (
    TutorDocumentChunk,
    TutorGenerationJob,
    TutorProfile,
    TutorSession,
    TutorSessionMessage,
    TutorSourceDocument,
    TutorStepCompletion,
)


def require_book(session: Session, *, book_id: int) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return book


def create_profile(
    session: Session,
    *,
    reader_id: int,
    source_type: str,
    title: str,
    teaching_goal: str | None,
    book_id: int | None = None,
    book_source_document_id: int | None = None,
) -> TutorProfile:
    profile = TutorProfile(
        reader_id=reader_id,
        source_type=source_type,
        book_id=book_id,
        book_source_document_id=book_source_document_id,
        title=title,
        teaching_goal=teaching_goal,
        status="queued",
    )
    session.add(profile)
    session.flush()
    return profile


def create_source_document(
    session: Session,
    *,
    profile_id: int,
    kind: str,
    origin_book_source_document_id: int | None = None,
    mime_type: str | None,
    file_name: str | None,
    storage_path: str | None,
    content_hash: str | None,
    metadata_json: dict | None = None,
) -> TutorSourceDocument:
    document = TutorSourceDocument(
        profile_id=profile_id,
        kind=kind,
        origin_book_source_document_id=origin_book_source_document_id,
        mime_type=mime_type,
        file_name=file_name,
        storage_path=storage_path,
        content_hash=content_hash,
        metadata_json=metadata_json,
        parse_status="pending",
    )
    session.add(document)
    session.flush()
    return document


def create_generation_job(
    session: Session,
    *,
    profile_id: int,
    job_type: str,
    payload_json: dict | None = None,
) -> TutorGenerationJob:
    job = TutorGenerationJob(
        profile_id=profile_id,
        job_type=job_type,
        status="queued",
        payload_json=payload_json,
        attempt_count=0,
    )
    session.add(job)
    session.flush()
    return job


def list_profiles(session: Session, *, reader_id: int) -> Sequence[TutorProfile]:
    statement = (
        select(TutorProfile)
        .where(TutorProfile.reader_id == reader_id)
        .order_by(TutorProfile.updated_at.desc(), TutorProfile.id.desc())
    )
    return session.execute(statement).scalars().all()


def get_profile(session: Session, *, profile_id: int) -> TutorProfile | None:
    return session.get(TutorProfile, profile_id)


def require_owned_profile(session: Session, *, profile_id: int, reader_id: int) -> TutorProfile:
    profile = get_profile(session, profile_id=profile_id)
    if profile is None:
        raise ApiError(404, "tutor_profile_not_found", "Tutor profile not found")
    if profile.reader_id != reader_id:
        raise ApiError(403, "tutor_profile_forbidden", "Tutor profile does not belong to the current reader")
    return profile


def list_profile_sources(session: Session, *, profile_id: int) -> Sequence[TutorSourceDocument]:
    statement = (
        select(TutorSourceDocument)
        .where(TutorSourceDocument.profile_id == profile_id)
        .order_by(TutorSourceDocument.id.asc())
    )
    return session.execute(statement).scalars().all()


def get_primary_source_document(session: Session, *, profile_id: int) -> TutorSourceDocument | None:
    statement = (
        select(TutorSourceDocument)
        .where(TutorSourceDocument.profile_id == profile_id)
        .order_by(TutorSourceDocument.id.asc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def get_book_source_document(session: Session, *, document_id: int) -> BookSourceDocument | None:
    return session.get(BookSourceDocument, document_id)


def require_book_source_document(session: Session, *, document_id: int) -> BookSourceDocument:
    document = get_book_source_document(session, document_id=document_id)
    if document is None:
        raise ApiError(404, "book_source_document_not_found", "Book source document not found")
    return document


def get_primary_book_source_document(session: Session, *, book_id: int) -> BookSourceDocument | None:
    statement = (
        select(BookSourceDocument)
        .where(BookSourceDocument.book_id == book_id)
        .order_by(BookSourceDocument.is_primary.desc(), BookSourceDocument.id.asc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def list_profile_jobs(session: Session, *, profile_id: int) -> Sequence[TutorGenerationJob]:
    statement = (
        select(TutorGenerationJob)
        .where(TutorGenerationJob.profile_id == profile_id)
        .order_by(TutorGenerationJob.created_at.desc(), TutorGenerationJob.id.desc())
    )
    return session.execute(statement).scalars().all()


def get_latest_profile_job(session: Session, *, profile_id: int) -> TutorGenerationJob | None:
    statement = (
        select(TutorGenerationJob)
        .where(TutorGenerationJob.profile_id == profile_id)
        .order_by(TutorGenerationJob.created_at.desc(), TutorGenerationJob.id.desc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def replace_document_chunks(
    session: Session,
    *,
    profile_id: int,
    document_id: int,
    chunks: list[dict],
) -> list[TutorDocumentChunk]:
    session.execute(delete(TutorDocumentChunk).where(TutorDocumentChunk.document_id == document_id))
    rows: list[TutorDocumentChunk] = []
    for chunk in chunks:
        row = TutorDocumentChunk(
            profile_id=profile_id,
            document_id=document_id,
            chunk_index=int(chunk["chunk_index"]),
            content=str(chunk["content"]),
            content_tsv=chunk.get("content_tsv"),
            search_vector=chunk.get("search_vector") or chunk.get("content_tsv"),
            embedding=chunk.get("embedding"),
            metadata_json=chunk.get("metadata_json"),
        )
        session.add(row)
        rows.append(row)
    session.flush()
    return rows


def list_profile_chunks(session: Session, *, profile_id: int) -> Sequence[TutorDocumentChunk]:
    statement = (
        select(TutorDocumentChunk)
        .where(TutorDocumentChunk.profile_id == profile_id)
        .order_by(TutorDocumentChunk.document_id.asc(), TutorDocumentChunk.chunk_index.asc())
    )
    return session.execute(statement).scalars().all()


def create_session(session: Session, *, profile_id: int, current_step_title: str | None) -> TutorSession:
    tutor_session = TutorSession(
        profile_id=profile_id,
        status="active",
        current_step_index=0,
        current_step_title=current_step_title,
        completed_steps_count=0,
    )
    session.add(tutor_session)
    session.flush()
    return tutor_session


def list_sessions(session: Session, *, reader_id: int) -> Sequence[TutorSession]:
    statement = (
        select(TutorSession)
        .join(TutorProfile, TutorProfile.id == TutorSession.profile_id)
        .where(TutorProfile.reader_id == reader_id)
        .order_by(TutorSession.updated_at.desc(), TutorSession.id.desc())
    )
    return session.execute(statement).scalars().all()


def get_session(session: Session, *, session_id: int) -> TutorSession | None:
    return session.get(TutorSession, session_id)


def require_owned_session(session: Session, *, session_id: int, reader_id: int) -> TutorSession:
    tutor_session = get_session(session, session_id=session_id)
    if tutor_session is None:
        raise ApiError(404, "tutor_session_not_found", "Tutor session not found")
    profile = session.get(TutorProfile, tutor_session.profile_id)
    if profile is None or profile.reader_id != reader_id:
        raise ApiError(403, "tutor_session_forbidden", "Tutor session does not belong to the current reader")
    return tutor_session


def create_message(
    session: Session,
    *,
    session_id: int,
    role: str,
    content: str,
    citations_json: list[dict] | None = None,
    metadata_json: dict | None = None,
) -> TutorSessionMessage:
    message = TutorSessionMessage(
        session_id=session_id,
        role=role,
        content=content,
        citations_json=citations_json,
        metadata_json=metadata_json,
    )
    session.add(message)
    session.flush()
    return message


def list_messages(session: Session, *, session_id: int) -> Sequence[TutorSessionMessage]:
    statement = (
        select(TutorSessionMessage)
        .where(TutorSessionMessage.session_id == session_id)
        .order_by(TutorSessionMessage.created_at.asc(), TutorSessionMessage.id.asc())
    )
    return session.execute(statement).scalars().all()


def create_step_completion(
    session: Session,
    *,
    session_id: int,
    step_index: int,
    confidence: float,
    reasoning: str,
    message_id: int | None,
) -> TutorStepCompletion:
    completion = TutorStepCompletion(
        session_id=session_id,
        step_index=step_index,
        confidence=confidence,
        reasoning=reasoning,
        message_id=message_id,
    )
    session.add(completion)
    session.flush()
    return completion
