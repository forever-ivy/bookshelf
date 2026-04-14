from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.security import AuthIdentity
from app.core.sse import sse_response
from app.tutor.orchestrator import TutorOrchestrator
from app.tutor.schemas import TutorMessageStreamRequest, TutorProfileCreateRequest, serialize_generation_job, serialize_profile
from app.tutor.service import (
    create_book_profile,
    create_upload_profile,
    get_dashboard,
    get_profile_detail,
    get_session_detail,
    list_profiles,
    list_session_messages,
    list_sessions,
    retry_profile_generation,
    start_session,
)
from app.tutor.tasks import enqueue_profile_generation_job

router = APIRouter(prefix="/api/v1/tutor", tags=["tutor"])


@router.get("/dashboard")
def tutor_dashboard(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, **get_dashboard(db, reader_id=identity.profile_id)}


@router.get("/profiles")
def list_tutor_profiles(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, "items": list_profiles(db, reader_id=identity.profile_id)}


@router.get("/profiles/{profile_id}")
def get_tutor_profile(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, **get_profile_detail(db, reader_id=identity.profile_id, profile_id=profile_id)}


@router.post("/profiles", status_code=201)
def create_tutor_profile(
    payload: TutorProfileCreateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile, job = create_book_profile(
        db,
        reader_id=identity.profile_id,
        book_id=payload.book_id,
        book_source_document_id=payload.book_source_document_id,
        title=payload.title,
        teaching_goal=payload.teaching_goal,
    )
    db.commit()
    enqueue_profile_generation_job(profile.id)
    return {"ok": True, "profile": serialize_profile(profile), "job": serialize_generation_job(job)}


@router.post("/profiles/upload", status_code=201)
async def upload_tutor_profile(
    title: str = Form(...),
    teaching_goal: str | None = Form(default=None, alias="teachingGoal"),
    file: UploadFile = File(...),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    raw_bytes = await file.read()
    profile, job = create_upload_profile(
        db,
        reader_id=identity.profile_id,
        title=title,
        teaching_goal=teaching_goal,
        file_name=file.filename or "source.txt",
        mime_type=file.content_type,
        raw_bytes=raw_bytes,
    )
    db.commit()
    enqueue_profile_generation_job(profile.id)
    return {"ok": True, "profile": serialize_profile(profile), "job": serialize_generation_job(job)}


@router.post("/profiles/{profile_id}/retry")
def retry_tutor_profile(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile, job = retry_profile_generation(db, reader_id=identity.profile_id, profile_id=profile_id)
    db.commit()
    enqueue_profile_generation_job(profile.id)
    return {"ok": True, "profile": serialize_profile(profile), "job": serialize_generation_job(job)}


@router.post("/profiles/{profile_id}/sessions", status_code=201)
def start_tutor_session(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    payload = start_session(db, reader_id=identity.profile_id, profile_id=profile_id)
    db.commit()
    return {"ok": True, **payload}


@router.get("/sessions")
def list_tutor_sessions(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, "items": list_sessions(db, reader_id=identity.profile_id)}


@router.get("/sessions/{session_id}")
def get_tutor_session(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, **get_session_detail(db, reader_id=identity.profile_id, session_id=session_id)}


@router.get("/sessions/{session_id}/messages")
def get_tutor_session_messages(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    return {"ok": True, "items": list_session_messages(db, reader_id=identity.profile_id, session_id=session_id)}


@router.post("/sessions/{session_id}/messages/stream")
async def stream_tutor_message(
    session_id: int,
    payload: TutorMessageStreamRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
):
    orchestrator = TutorOrchestrator()
    return sse_response(
        orchestrator.stream_session_reply(
            db,
            reader_id=identity.profile_id,
            session_id=session_id,
            user_content=payload.content,
        )
    )
