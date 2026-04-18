from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class LearningSourceInput(BaseModel):
    kind: Literal["book", "inline_text"] | str
    book_id: int | None = Field(default=None, alias="bookId")
    book_source_document_id: int | None = Field(default=None, alias="bookSourceDocumentId")
    upload_id: int | None = Field(default=None, alias="uploadId")
    url: str | None = None
    title: str | None = None
    file_name: str | None = Field(default=None, alias="fileName")
    mime_type: str | None = Field(default=None, alias="mimeType")
    content: str | None = None


class LearningProfileCreateRequest(BaseModel):
    title: str
    goal_mode: Literal["preview", "sprint", "deep-dive", "lab"] = Field(alias="goalMode")
    difficulty_mode: str = Field(alias="difficultyMode")
    sources: list[LearningSourceInput]


class LearningSessionCreateRequest(BaseModel):
    profile_id: int = Field(alias="profileId")
    learning_mode: Literal["preview", "sprint", "deep-dive", "lab"] = Field(alias="learningMode")
    session_kind: Literal["guide", "explore"] = Field(default="guide", alias="sessionKind")
    focus_step_index: int | None = Field(default=None, alias="focusStepIndex")
    focus_context: dict[str, Any] | None = Field(default=None, alias="focusContext")


class LearningStreamRequest(BaseModel):
    content: str


class LearningBridgeActionRequest(BaseModel):
    action_type: Literal["expand_step_to_explore", "attach_explore_turn_to_guide_step"] = Field(alias="actionType")
    turn_id: int | None = Field(default=None, alias="turnId")
    target_guide_session_id: int | None = Field(default=None, alias="targetGuideSessionId")
    target_step_index: int | None = Field(default=None, alias="targetStepIndex")


def _isoformat(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()


def serialize_source_bundle(bundle: Any, *, asset_count: int = 0) -> dict[str, Any]:
    return {
        "id": bundle.id,
        "readerId": bundle.reader_id,
        "title": bundle.title,
        "assetCount": asset_count,
        "metadata": bundle.metadata_json or {},
        "createdAt": _isoformat(bundle.created_at),
        "updatedAt": _isoformat(bundle.updated_at),
    }


def serialize_profile(profile: Any) -> dict[str, Any]:
    return {
        "id": profile.id,
        "readerId": profile.reader_id,
        "sourceBundleId": profile.source_bundle_id,
        "title": profile.title,
        "goalMode": profile.goal_mode,
        "difficultyMode": profile.difficulty_mode,
        "status": profile.status,
        "activePathVersionId": profile.active_path_version_id,
        "metadata": profile.metadata_json or {},
        "createdAt": _isoformat(profile.created_at),
        "updatedAt": _isoformat(profile.updated_at),
    }


def serialize_asset(asset: Any) -> dict[str, Any]:
    return {
        "id": asset.id,
        "bundleId": asset.bundle_id,
        "assetKind": asset.asset_kind,
        "bookId": asset.book_id,
        "bookSourceDocumentId": asset.book_source_document_id,
        "mimeType": asset.mime_type,
        "fileName": asset.file_name,
        "storagePath": asset.storage_path,
        "extractedTextPath": asset.extracted_text_path,
        "parseStatus": asset.parse_status,
        "contentHash": asset.content_hash,
        "metadata": asset.metadata_json or {},
        "createdAt": _isoformat(asset.created_at),
        "updatedAt": _isoformat(asset.updated_at),
    }


def serialize_upload(upload: Any) -> dict[str, Any]:
    return {
        "id": upload.id,
        "readerId": upload.reader_id,
        "fileName": upload.file_name,
        "mimeType": upload.mime_type,
        "storagePath": upload.storage_path,
        "contentHash": upload.content_hash,
        "expiresAt": _isoformat(upload.expires_at),
        "consumedAt": _isoformat(upload.consumed_at),
        "metadata": upload.metadata_json or {},
        "createdAt": _isoformat(upload.created_at),
        "updatedAt": _isoformat(upload.updated_at),
    }


def serialize_fragment(fragment: Any) -> dict[str, Any]:
    return {
        "id": fragment.id,
        "profileId": fragment.profile_id,
        "assetId": fragment.asset_id,
        "chunkIndex": fragment.chunk_index,
        "fragmentType": fragment.fragment_type,
        "chapterLabel": fragment.chapter_label,
        "semanticSummary": fragment.semantic_summary,
        "content": fragment.content,
        "citationAnchor": fragment.citation_anchor_json or {},
        "metadata": fragment.metadata_json or {},
        "createdAt": _isoformat(fragment.created_at),
    }


def serialize_job(job: Any) -> dict[str, Any]:
    return {
        "id": job.id,
        "profileId": job.profile_id,
        "jobType": job.job_type,
        "status": job.status,
        "attemptCount": job.attempt_count,
        "errorMessage": job.error_message,
        "payload": job.payload_json or {},
        "createdAt": _isoformat(job.created_at),
        "updatedAt": _isoformat(job.updated_at),
    }


def serialize_path_step(step: Any) -> dict[str, Any]:
    return {
        "id": step.id,
        "pathVersionId": step.path_version_id,
        "stepIndex": step.step_index,
        "stepType": step.step_type,
        "title": step.title,
        "objective": step.objective,
        "guidingQuestion": step.guiding_question,
        "successCriteria": step.success_criteria,
        "prerequisiteStepIds": step.prerequisite_step_ids or [],
        "keywords": step.keywords_json or [],
        "metadata": step.metadata_json or {},
        "createdAt": _isoformat(step.created_at),
    }


def serialize_path_version(path_version: Any, *, step_count: int = 0) -> dict[str, Any]:
    return {
        "id": path_version.id,
        "profileId": path_version.profile_id,
        "versionNumber": path_version.version_number,
        "status": path_version.status,
        "title": path_version.title,
        "overview": path_version.overview,
        "graphProvider": path_version.graph_provider,
        "graphSnapshot": path_version.graph_snapshot_json or {},
        "metadata": path_version.metadata_json or {},
        "stepCount": step_count,
        "createdAt": _isoformat(path_version.created_at),
    }


def serialize_session(learning_session: Any) -> dict[str, Any]:
    return {
        "id": learning_session.id,
        "profileId": learning_session.profile_id,
        "learningMode": learning_session.learning_mode,
        "sessionKind": getattr(learning_session, "session_kind", "guide"),
        "sourceSessionId": getattr(learning_session, "source_session_id", None),
        "sourceTurnId": getattr(learning_session, "source_turn_id", None),
        "focusStepIndex": getattr(learning_session, "focus_step_index", None),
        "focusContext": getattr(learning_session, "focus_context_json", None) or {},
        "status": learning_session.status,
        "currentStepIndex": learning_session.current_step_index,
        "currentStepTitle": learning_session.current_step_title,
        "masteryScore": float(learning_session.mastery_score or 0.0),
        "remediationStatus": learning_session.remediation_status,
        "completedStepsCount": learning_session.completed_steps_count,
        "metadata": learning_session.metadata_json or {},
        "startedAt": _isoformat(learning_session.started_at),
        "updatedAt": _isoformat(learning_session.updated_at),
    }


def serialize_turn(turn: Any, *, agent_runs: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    metadata = turn.metadata_json or {}
    return {
        "id": turn.id,
        "sessionId": turn.session_id,
        "turnKind": getattr(turn, "turn_kind", "guide"),
        "intentKind": getattr(turn, "intent_kind", None),
        "responseMode": getattr(turn, "response_mode", None),
        "redirectedSessionId": getattr(turn, "redirected_session_id", None),
        "userContent": turn.user_content,
        "teacherContent": turn.teacher_content,
        "peerContent": turn.peer_content,
        "assistantContent": turn.assistant_content,
        "citations": turn.citations_json or [],
        "evaluation": turn.evaluation_json,
        "relatedConcepts": getattr(turn, "related_concepts_json", None) or [],
        "bridgeMetadata": getattr(turn, "bridge_metadata_json", None) or {},
        "tokenUsage": turn.token_usage_json or {},
        "latencyMs": turn.latency_ms,
        "metadata": metadata,
        "presentation": metadata.get("presentation"),
        "agentRuns": agent_runs or [],
        "createdAt": _isoformat(turn.created_at),
    }


def serialize_checkpoint(checkpoint: Any) -> dict[str, Any]:
    return {
        "id": checkpoint.id,
        "sessionId": checkpoint.session_id,
        "turnId": checkpoint.turn_id,
        "stepIndex": checkpoint.step_index,
        "masteryScore": float(checkpoint.mastery_score or 0.0),
        "passed": bool(checkpoint.passed),
        "missingConcepts": checkpoint.missing_concepts_json or [],
        "evidence": checkpoint.evidence_json or {},
        "createdAt": _isoformat(checkpoint.created_at),
    }


def serialize_remediation_plan(plan: Any) -> dict[str, Any]:
    return {
        "id": plan.id,
        "sessionId": plan.session_id,
        "stepIndex": plan.step_index,
        "status": plan.status,
        "missingConcepts": plan.missing_concepts_json or [],
        "suggestedQuestions": plan.suggested_questions_json or [],
        "plan": plan.plan_json or {},
        "createdAt": _isoformat(plan.created_at),
        "updatedAt": _isoformat(plan.updated_at),
    }


def serialize_report(report: Any) -> dict[str, Any]:
    return {
        "id": report.id,
        "sessionId": report.session_id,
        "reportType": report.report_type,
        "summary": report.summary,
        "weakPoints": report.weak_points_json or [],
        "suggestedNextAction": report.suggested_next_action,
        "metadata": report.metadata_json or {},
        "createdAt": _isoformat(report.created_at),
        "updatedAt": _isoformat(report.updated_at),
    }


def serialize_step_context_item(item: Any) -> dict[str, Any]:
    return {
        "id": item.id,
        "guideSessionId": item.guide_session_id,
        "stepIndex": item.step_index,
        "sourceSessionId": item.source_session_id,
        "sourceTurnId": item.source_turn_id,
        "title": item.title,
        "summary": item.summary,
        "content": item.content,
        "citations": item.citations_json or [],
        "relatedConcepts": item.related_concepts_json or [],
        "metadata": item.metadata_json or {},
        "createdAt": _isoformat(item.created_at),
    }


def serialize_bridge_action(action: Any) -> dict[str, Any]:
    return {
        "id": action.id,
        "actionType": action.action_type,
        "fromSessionId": action.from_session_id,
        "fromTurnId": action.from_turn_id,
        "toSessionId": action.to_session_id,
        "status": action.status,
        "payload": action.payload_json or {},
        "result": action.result_json or {},
        "createdAt": _isoformat(action.created_at),
    }


def sse_event(event: str, data: dict[str, Any]) -> dict[str, Any]:
    return {"event": event, "data": data}
