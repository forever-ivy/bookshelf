from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class TutorProfileCreateRequest(BaseModel):
    source_type: Literal["book"] = Field(alias="sourceType")
    book_id: int = Field(alias="bookId")
    book_source_document_id: int | None = Field(default=None, alias="bookSourceDocumentId")
    title: str | None = None
    teaching_goal: str | None = Field(default=None, alias="teachingGoal")


class TutorMessageStreamRequest(BaseModel):
    content: str


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def serialize_profile(profile: Any) -> dict[str, Any]:
    return {
        "id": profile.id,
        "readerId": profile.reader_id,
        "sourceType": profile.source_type,
        "bookId": profile.book_id,
        "bookSourceDocumentId": profile.book_source_document_id,
        "title": profile.title,
        "teachingGoal": profile.teaching_goal,
        "status": profile.status,
        "persona": profile.persona_json or {},
        "curriculum": profile.curriculum_json or {},
        "sourceSummary": profile.source_summary,
        "failureCode": profile.failure_code,
        "failureMessage": profile.failure_message,
        "createdAt": _isoformat(profile.created_at),
        "updatedAt": _isoformat(profile.updated_at),
    }


def serialize_source_document(document: Any) -> dict[str, Any]:
    return {
        "id": document.id,
        "profileId": document.profile_id,
        "kind": document.kind,
        "originBookSourceDocumentId": document.origin_book_source_document_id,
        "mimeType": document.mime_type,
        "fileName": document.file_name,
        "storagePath": document.storage_path,
        "extractedTextPath": document.extracted_text_path,
        "parseStatus": document.parse_status,
        "contentHash": document.content_hash,
        "metadata": document.metadata_json or {},
        "createdAt": _isoformat(document.created_at),
        "updatedAt": _isoformat(document.updated_at),
    }


def serialize_generation_job(job: Any) -> dict[str, Any]:
    return {
        "id": job.id,
        "profileId": job.profile_id,
        "jobType": job.job_type,
        "status": job.status,
        "attemptCount": job.attempt_count,
        "payload": job.payload_json or {},
        "errorMessage": job.error_message,
        "createdAt": _isoformat(job.created_at),
        "updatedAt": _isoformat(job.updated_at),
    }


def serialize_session(tutor_session: Any) -> dict[str, Any]:
    return {
        "id": tutor_session.id,
        "tutorProfileId": tutor_session.profile_id,
        "status": tutor_session.status,
        "currentStepIndex": tutor_session.current_step_index,
        "currentStepTitle": tutor_session.current_step_title,
        "completedStepsCount": tutor_session.completed_steps_count,
        "lastMessagePreview": tutor_session.last_message_preview,
        "startedAt": _isoformat(tutor_session.started_at),
        "updatedAt": _isoformat(tutor_session.updated_at),
    }


def serialize_message(message: Any) -> dict[str, Any]:
    return {
        "id": message.id,
        "sessionId": message.session_id,
        "role": message.role,
        "content": message.content,
        "citations": message.citations_json or [],
        "metadata": message.metadata_json or {},
        "createdAt": _isoformat(message.created_at),
    }


def serialize_step(step: dict[str, Any], *, default_index: int = 0) -> dict[str, Any]:
    return {
        "index": int(step.get("index", default_index)),
        "title": str(step.get("title") or ""),
        "learningObjective": step.get("learningObjective") or step.get("learning_objective") or "",
        "successCriteria": step.get("successCriteria") or step.get("success_criteria") or "",
        "guidingQuestion": step.get("guidingQuestion") or step.get("guiding_question") or "",
        "keywords": step.get("keywords") or [],
    }


def sse_event(event: str, data: dict[str, Any]) -> dict[str, Any]:
    return {"event": event, "data": data}
