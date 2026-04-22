from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import quote

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, Request, UploadFile
from fastapi import Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.core.sse import sse_response
from app.learning import repository
from app.learning.orchestrator import LearningOrchestrator
from app.learning.schemas import (
    LearningAiRunCallbackRequest,
    LearningBridgeActionRequest,
    LearningPdfAnnotationCreateRequest,
    LearningPdfAnnotationUpdateRequest,
    LearningProfileCreateRequest,
    LearningProfileUpdateRequest,
    LearningQuickExplainRequest,
    LearningReaderProgressRequest,
    LearningSessionCreateRequest,
    LearningStreamRequest,
    serialize_pdf_annotation,
    serialize_asset,
    serialize_bridge_action,
    serialize_job,
    serialize_path_step,
    serialize_path_version,
    serialize_profile,
    serialize_reader_progress,
    serialize_report,
    serialize_session,
    serialize_step_context_item,
    serialize_source_bundle,
    serialize_turn,
    serialize_upload,
)
from app.learning.service import LearningBridgeService, LearningService
from app.learning.storage import LearningBlobStore
from app.llm.provider import build_llm_provider


router = APIRouter(prefix="/api/v2/learning", tags=["learning"])
internal_router = APIRouter(prefix="/internal/learning", tags=["learning-internal"])
PDF_MIME_TYPES = {"application/pdf", "application/x-pdf"}


def _encode_ai_sdk_sse(payload: dict | str) -> str:
    if payload == "[DONE]":
        return "data: [DONE]\n\n"
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


def _normalize_sse_chunk(chunk: str) -> str:
    return chunk.replace("\r\n", "\n").replace("\r", "\n")


def _decode_sse_frames(buffer: str) -> tuple[list[str], str]:
    normalized = _normalize_sse_chunk(buffer)
    segments = normalized.split("\n\n")
    remainder = "" if normalized.endswith("\n\n") else (segments.pop() if segments else "")
    return [segment.strip() for segment in segments if segment.strip()], remainder


def _parse_ai_sdk_sse_frame(frame: str) -> dict | str | None:
    payload_lines: list[str] = []
    for line in _normalize_sse_chunk(frame).split("\n"):
        if line.startswith("data:"):
            payload_lines.append(line[5:].lstrip())
    payload = "\n".join(payload_lines).strip()
    if not payload:
        return None
    if payload == "[DONE]":
        return "[DONE]"
    return json.loads(payload)


def _ai_sdk_delta_text(part: dict) -> str:
    for key in ("delta", "text", "content"):
        value = part.get(key)
        if isinstance(value, str):
            return value
    return ""


def _dispatch_generation_task(profile_id: int, reader_id: int) -> None:
    from app.learning.tasks import generate_learning_profile_task

    generate_learning_profile_task(profile_id, reader_id)


def _is_pdf_source(*, mime_type: str | None, file_name: str | None) -> bool:
    normalized_mime = (mime_type or "").strip().lower()
    normalized_name = (file_name or "").strip().lower()
    return normalized_mime in PDF_MIME_TYPES or normalized_name.endswith(".pdf")


def _resolve_learning_profile_document(
    db: Session,
    *,
    profile_id: int,
    reader_id: int,
) -> tuple[str, str]:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=reader_id)
    assets = list(repository.list_bundle_assets(db, bundle_id=profile.source_bundle_id))

    seen_document_ids: set[int] = set()
    candidate_documents: list[tuple[str | None, str | None, str | None]] = []

    for asset in assets:
        if asset.book_source_document_id is not None and asset.book_source_document_id not in seen_document_ids:
            seen_document_ids.add(asset.book_source_document_id)
            source_document = repository.get_book_source_document(
                db,
                document_id=asset.book_source_document_id,
            )
            if source_document is not None:
                candidate_documents.append(
                    (
                        source_document.file_name,
                        source_document.mime_type,
                        source_document.storage_path,
                    )
                )

        if asset.book_id is not None:
            for source_document in repository.list_book_source_documents(db, book_id=asset.book_id):
                if source_document.id in seen_document_ids:
                    continue
                seen_document_ids.add(source_document.id)
                candidate_documents.append(
                    (
                        source_document.file_name,
                        source_document.mime_type,
                        source_document.storage_path,
                    )
                )

        candidate_documents.append((asset.file_name, asset.mime_type, asset.storage_path))

    for file_name, mime_type, storage_path in candidate_documents:
        if storage_path and _is_pdf_source(mime_type=mime_type, file_name=file_name):
            resolved_name = (file_name or Path(storage_path).name or "document.pdf").strip() or "document.pdf"
            return storage_path, resolved_name

    raise ApiError(404, "learning_pdf_not_available", "PDF document is not available for this profile")


def _build_inline_pdf_headers(file_name: str) -> dict[str, str]:
    return {
        "Content-Disposition": f'inline; filename="{file_name}"; filename*=UTF-8\'\'{quote(file_name)}'
    }


@router.post("/uploads", status_code=201)
async def create_learning_upload(
    file: UploadFile = File(...),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    raw_bytes = await file.read()
    if not raw_bytes:
        raise ApiError(400, "learning_upload_empty", "Uploaded file is empty")
    service = LearningService()
    upload = service.create_upload(
        db,
        reader_id=identity.profile_id,
        file_name=file.filename or "upload.bin",
        mime_type=file.content_type,
        raw_bytes=raw_bytes,
    )
    db.commit()
    return {"ok": True, "upload": serialize_upload(upload)}


@router.post("/profiles", status_code=201)
def create_learning_profile(
    payload: LearningProfileCreateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = LearningService()
    created = service.create_profile(
        db,
        reader_id=identity.profile_id,
        title=payload.title.strip(),
        goal_mode=payload.goal_mode,
        difficulty_mode=payload.difficulty_mode,
        sources=[item.model_dump(by_alias=True) for item in payload.sources],
    )
    db.commit()
    return {
        "ok": True,
        "profile": serialize_profile(created["profile"]),
        "sourceBundle": serialize_source_bundle(created["source_bundle"], asset_count=len(created["assets"])),
        "assets": [serialize_asset(asset) for asset in created["assets"]],
        "jobs": [serialize_job(job) for job in created["jobs"]],
    }


@router.get("/profiles")
def list_learning_profiles(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    items = []
    for profile in repository.list_owned_profiles(db, reader_id=identity.profile_id):
        assets = list(repository.list_bundle_assets(db, bundle_id=profile.source_bundle_id))
        jobs = list(repository.list_profile_jobs(db, profile_id=profile.id))
        active_path_version = (
            None
            if profile.active_path_version_id is None
            else repository.get_path_version(db, path_version_id=profile.active_path_version_id)
        )
        steps = [] if active_path_version is None else repository.list_path_steps(db, path_version_id=active_path_version.id)
        latest_job = max(jobs, key=lambda job: (job.updated_at or job.created_at, job.id), default=None)
        items.append(
            {
                "profile": serialize_profile(profile),
                "latestJob": None if latest_job is None else serialize_job(latest_job),
                "primaryAsset": None if not assets else serialize_asset(assets[0]),
                "stepCount": len(steps),
            }
        )
    return {"ok": True, "items": items}


@router.get("/profiles/{profile_id}")
def get_learning_profile(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    bundle_row = repository.get_source_bundle(db, bundle_id=profile.source_bundle_id)
    assets = repository.list_bundle_assets(db, bundle_id=profile.source_bundle_id)
    jobs = repository.list_profile_jobs(db, profile_id=profile.id)
    active_path_version = None if profile.active_path_version_id is None else repository.get_path_version(db, path_version_id=profile.active_path_version_id)
    steps = [] if active_path_version is None else repository.list_path_steps(db, path_version_id=active_path_version.id)
    return {
        "ok": True,
        "profile": serialize_profile(profile),
        "sourceBundle": None if bundle_row is None else serialize_source_bundle(bundle_row, asset_count=len(assets)),
        "assets": [serialize_asset(asset) for asset in assets],
        "jobs": [serialize_job(job) for job in jobs],
        "activePathVersion": None if active_path_version is None else serialize_path_version(active_path_version, step_count=len(steps)),
        "steps": [serialize_path_step(step) for step in steps],
    }


@router.patch("/profiles/{profile_id}")
def update_learning_profile(
    profile_id: int,
    payload: LearningProfileUpdateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    title = payload.normalized_title()
    if title is None or not title:
        raise ApiError(400, "learning_profile_title_required", "Learning profile title is required")

    updated = repository.update_profile_title(db, profile=profile, title=title)
    assets = repository.list_bundle_assets(db, bundle_id=updated.source_bundle_id)
    jobs = repository.list_profile_jobs(db, profile_id=updated.id)
    db.commit()
    return {
        "ok": True,
        "profile": serialize_profile(updated),
        "assets": [serialize_asset(asset) for asset in assets],
        "jobs": [serialize_job(job) for job in jobs],
    }


@router.delete("/profiles/{profile_id}")
def delete_learning_profile(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    repository.delete_profile(db, profile=profile)
    db.commit()
    return {"ok": True}


@router.get("/profiles/{profile_id}/document")
def get_learning_profile_document(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
):
    storage_path, file_name = _resolve_learning_profile_document(
        db,
        profile_id=profile_id,
        reader_id=identity.profile_id,
    )
    headers = _build_inline_pdf_headers(file_name)

    if storage_path.startswith("s3://"):
        blob_store = LearningBlobStore()
        try:
            raw_bytes = blob_store.read_bytes(storage_path)
        except FileNotFoundError as exc:
            raise ApiError(404, "learning_pdf_not_available", "PDF document is not available for this profile") from exc

        return Response(content=raw_bytes, media_type="application/pdf", headers=headers)

    local_path = Path(storage_path)
    if not local_path.exists():
        raise ApiError(404, "learning_pdf_not_available", "PDF document is not available for this profile")

    return FileResponse(
        path=local_path,
        media_type="application/pdf",
        filename=file_name,
        headers=headers,
    )


@router.get("/profiles/{profile_id}/reader-state")
def get_learning_reader_state(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    progress = repository.get_reader_progress(db, profile_id=profile.id, reader_id=identity.profile_id)
    annotations = repository.list_pdf_annotations(db, profile_id=profile.id, reader_id=identity.profile_id)
    return {
        "ok": True,
        "progress": serialize_reader_progress(progress),
        "annotations": [serialize_pdf_annotation(annotation) for annotation in annotations],
    }


@router.patch("/profiles/{profile_id}/reader-progress")
def update_learning_reader_progress(
    profile_id: int,
    payload: LearningReaderProgressRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    progress = repository.upsert_reader_progress(
        db,
        profile_id=profile.id,
        reader_id=identity.profile_id,
        page_number=payload.page_number,
        scale=payload.scale,
        layout_mode=payload.layout_mode,
        metadata_json=payload.metadata,
    )
    db.commit()
    return {"ok": True, "progress": serialize_reader_progress(progress)}


@router.post("/profiles/{profile_id}/annotations", status_code=201)
def create_learning_pdf_annotation(
    profile_id: int,
    payload: LearningPdfAnnotationCreateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    selected_text = payload.selected_text.strip()
    if not selected_text:
        raise ApiError(400, "learning_annotation_text_required", "Selected text is required")
    annotation = repository.create_pdf_annotation(
        db,
        profile_id=profile.id,
        reader_id=identity.profile_id,
        annotation_type=payload.annotation_type,
        selected_text=selected_text,
        note_text=payload.note_text,
        color=payload.color or "#F7D56E",
        page_number=payload.page_number,
        anchor_json=payload.anchor,
        metadata_json=payload.metadata,
    )
    db.commit()
    return {"ok": True, "annotation": serialize_pdf_annotation(annotation)}


@router.patch("/profiles/{profile_id}/annotations/{annotation_id}")
def update_learning_pdf_annotation(
    profile_id: int,
    annotation_id: int,
    payload: LearningPdfAnnotationUpdateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    annotation = repository.get_pdf_annotation(
        db,
        annotation_id=annotation_id,
        profile_id=profile.id,
        reader_id=identity.profile_id,
    )
    if annotation is None:
        raise ApiError(404, "learning_annotation_not_found", "Learning annotation not found")

    raw_updates = payload.model_dump(exclude_unset=True)
    updates: dict = {}
    for source_key, target_key in {
        "annotation_type": "annotation_type",
        "selected_text": "selected_text",
        "note_text": "note_text",
        "color": "color",
        "page_number": "page_number",
        "anchor": "anchor_json",
        "metadata": "metadata_json",
    }.items():
        if source_key in raw_updates:
            value = raw_updates[source_key]
            if source_key == "selected_text" and isinstance(value, str):
                value = value.strip()
                if not value:
                    raise ApiError(400, "learning_annotation_text_required", "Selected text is required")
            updates[target_key] = value

    updated = repository.update_pdf_annotation(db, annotation=annotation, updates=updates)
    db.commit()
    return {"ok": True, "annotation": serialize_pdf_annotation(updated)}


@router.delete("/profiles/{profile_id}/annotations/{annotation_id}")
def delete_learning_pdf_annotation(
    profile_id: int,
    annotation_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    annotation = repository.get_pdf_annotation(
        db,
        annotation_id=annotation_id,
        profile_id=profile.id,
        reader_id=identity.profile_id,
    )
    if annotation is None:
        raise ApiError(404, "learning_annotation_not_found", "Learning annotation not found")
    repository.delete_pdf_annotation(db, annotation=annotation)
    db.commit()
    return {"ok": True}


@router.post("/profiles/{profile_id}/quick-explain")
def explain_learning_pdf_selection(
    profile_id: int,
    payload: LearningQuickExplainRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    text = payload.extract_text()
    if not text:
        raise ApiError(400, "learning_quick_explain_text_required", "Selected or nearby text is required")

    provider = build_llm_provider()
    answer = (
        provider.chat(
            text=text,
            context={
                "systemPrompt": "你是学习资料阅读器里的快速解释助手，只解释用户选中的 PDF 片段。",
                "instruction": "用中文直接解释选中内容，控制在 3 句以内，不进入对话模式。",
                "profileId": profile.id,
                "profileTitle": profile.title,
                "pageNumber": payload.page_number,
                "anchor": payload.anchor or {},
                "selectedText": payload.selected_text,
                "nearbyText": payload.nearby_text,
                "surroundingText": payload.surrounding_text,
            },
        )
        or ""
    ).strip()
    model_name = getattr(provider, "model", None) or get_settings().llm_model
    return {"ok": True, "answer": answer, "modelName": model_name}


@router.get("/profiles/{profile_id}/graph")
def get_learning_profile_graph(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    service = LearningService()
    live_graph = service.graph_service.get_profile_subgraph(profile_id=profile.id)
    active_path_version = (
        None
        if profile.active_path_version_id is None
        else repository.get_path_version(db, path_version_id=profile.active_path_version_id)
    )
    snapshot_graph = {} if active_path_version is None else (active_path_version.graph_snapshot_json or {})
    if "provider" not in snapshot_graph:
        snapshot_graph["provider"] = active_path_version.graph_provider if active_path_version is not None else "fallback"
    has_snapshot_graph = bool(snapshot_graph.get("nodes") or snapshot_graph.get("edges"))
    has_live_graph = live_graph is not None and bool(live_graph.get("nodes") or live_graph.get("edges"))

    if has_live_graph:
        return {"ok": True, "graph": live_graph}
    if has_snapshot_graph:
        return {"ok": True, "graph": snapshot_graph}
    return {"ok": True, "graph": live_graph or snapshot_graph or {"provider": "fallback", "nodes": [], "edges": []}}


@router.post("/profiles/{profile_id}/generate", status_code=202)
def generate_learning_profile(
    profile_id: int,
    background_tasks: BackgroundTasks,
    background: bool = Query(False),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = LearningService()
    if background and service.settings.learning_tasks_eager:
        result = service.prepare_generation(db, reader_id=identity.profile_id, profile_id=profile_id)
        db.commit()
        if result["triggered"]:
            background_tasks.add_task(_dispatch_generation_task, profile_id, identity.profile_id)
    else:
        result = service.queue_generation(db, reader_id=identity.profile_id, profile_id=profile_id)
        db.commit()
    return {
        "ok": True,
        "triggered": result["triggered"],
        "jobs": [serialize_job(job) for job in result["jobs"]],
    }


@router.post("/sessions", status_code=201)
def create_learning_session(
    payload: LearningSessionCreateRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=payload.profile_id, reader_id=identity.profile_id)
    if profile.status != "ready" or profile.active_path_version_id is None:
        raise ApiError(409, "learning_profile_not_ready", "Learning profile is not ready yet")
    steps = repository.list_path_steps(db, path_version_id=profile.active_path_version_id)
    first_step = None if not steps else steps[0]
    learning_session = repository.create_session(
        db,
        profile_id=profile.id,
        learning_mode=payload.learning_mode,
        current_step_title=(
            payload.focus_context.get("stepTitle")
            if payload.session_kind == "explore" and payload.focus_context
            else None if first_step is None else first_step.title
        ),
        session_kind=payload.session_kind,
        focus_step_index=payload.focus_step_index,
        focus_context_json=payload.focus_context,
    )
    db.commit()
    return {
        "ok": True,
        "session": serialize_session(learning_session),
        "firstStep": None if first_step is None else serialize_path_step(first_step),
    }


@router.get("/sessions")
def list_learning_sessions(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    sessions = repository.list_owned_sessions(db, reader_id=identity.profile_id)
    return {"ok": True, "items": [serialize_session(item) for item in sessions]}


@router.get("/sessions/{session_id}")
def get_learning_session(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    learning_session = repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    return {"ok": True, "session": serialize_session(learning_session)}


async def _stream_explore_ai_sdk_reply(
    db: Session,
    *,
    agent_base_url: str,
    callback_base_url: str | None,
    orchestrator: LearningOrchestrator,
    reader_id: int,
    learning_session,
    profile,
    user_content: str,
    chat_id: str | None,
    user_message: dict | None,
    timeout_seconds: float,
):
    explore = orchestrator.explore_orchestrator
    run = explore.prepare_ai_sdk_run(
        db,
        reader_id=reader_id,
        learning_session=learning_session,
        profile=profile,
        user_content=user_content,
        chat_id=chat_id,
        user_message=user_message,
    )
    run.status = "running"
    run.active_stream_id = f"learning-ai-run-{run.id}"
    db.add(run)
    db.commit()

    metadata = run.metadata_json or {}
    citations = metadata.get("citations") or []
    related_concepts = metadata.get("relatedConcepts") or []
    followups = metadata.get("followups") or []
    bridge_actions = metadata.get("bridgeActions") or []
    callback_url = (
        f"{callback_base_url.rstrip('/')}/internal/learning/ai-runs/{run.id}/complete"
        if callback_base_url
        else None
    )

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            async with client.stream(
                "POST",
                f"{agent_base_url}/internal/ai-sdk/learning/explore/runs/{run.id}/stream",
                json={
                    "runId": run.id,
                    "sessionId": run.session_id,
                    "readerId": run.reader_id,
                    "streamId": run.active_stream_id,
                    "model": run.model_name,
                    "userContent": user_content,
                    "callbackUrl": callback_url,
                    "message": user_message
                    or {
                        "role": "user",
                        "parts": [{"type": "text", "text": user_content}],
                    },
                    "focusContext": metadata.get("focusContext") or {},
                    "citations": citations,
                    "relatedConcepts": related_concepts,
                    "followups": followups,
                    "bridgeActions": bridge_actions,
                },
            ) as response:
                response.raise_for_status()
                async for chunk in response.aiter_text():
                    if chunk:
                        yield chunk
    except Exception:
        active_run = repository.get_ai_run(db, run_id=run.id) or run
        explore.mark_ai_sdk_run_failed(db, run=active_run, error_code="learning_model_request_error")
        yield _encode_ai_sdk_sse({"type": "error", "errorText": "模型请求错误"})
        yield _encode_ai_sdk_sse("[DONE]")


@router.post("/sessions/{session_id}/stream")
async def stream_learning_session(
    session_id: int,
    payload: LearningStreamRequest,
    request: Request,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
):
    user_content = payload.extract_content()
    if not user_content:
        raise ApiError(400, "missing_content", "Content is required")
    learning_session = repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    settings = get_settings()
    if getattr(learning_session, "session_kind", "guide") == "explore" and settings.learning_ai_agent_url:
        profile = repository.require_owned_profile(
            db,
            profile_id=learning_session.profile_id,
            reader_id=identity.profile_id,
        )
        orchestrator = LearningOrchestrator()
        callback_base_url = settings.learning_ai_callback_base_url or str(request.base_url).rstrip("/")
        return StreamingResponse(
            _stream_explore_ai_sdk_reply(
                db,
                agent_base_url=settings.learning_ai_agent_url.rstrip("/"),
                callback_base_url=callback_base_url,
                orchestrator=orchestrator,
                reader_id=identity.profile_id,
                learning_session=learning_session,
                profile=profile,
                user_content=user_content,
                chat_id=payload.id,
                user_message=payload.message,
                timeout_seconds=settings.learning_ai_agent_timeout_seconds,
            ),
            media_type="text/event-stream",
        )

    if settings.learning_orchestrator_url:
        base_url = settings.learning_orchestrator_url.rstrip("/")

        async def proxy_stream():
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/internal/learning/sessions/{session_id}/stream",
                    params={"reader_id": identity.profile_id},
                    json={"content": user_content},
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk

        return StreamingResponse(proxy_stream(), media_type="text/event-stream")

    orchestrator = LearningOrchestrator()
    return sse_response(
        orchestrator.stream_session_reply(
            db,
            reader_id=identity.profile_id,
            session_id=session_id,
            user_content=user_content,
        )
    )


@router.get("/sessions/{session_id}/stream")
async def resume_learning_session_stream(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
):
    repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    settings = get_settings()
    active_run = repository.get_active_session_ai_run(
        db,
        session_id=session_id,
        reader_id=identity.profile_id,
    )
    if active_run is None or not active_run.active_stream_id or not settings.learning_ai_agent_url:
        return Response(status_code=204)

    async def proxy_stream():
        try:
            async with httpx.AsyncClient(timeout=settings.learning_ai_agent_timeout_seconds) as client:
                async with client.stream(
                    "GET",
                    f"{settings.learning_ai_agent_url.rstrip('/')}/internal/ai-sdk/streams/{active_run.active_stream_id}",
                ) as response:
                    response.raise_for_status()
                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk
        except Exception:
            refreshed_run = repository.get_ai_run(db, run_id=active_run.id) or active_run
            LearningOrchestrator().explore_orchestrator.mark_ai_sdk_run_failed(
                db,
                run=refreshed_run,
                error_code="learning_model_request_error",
            )
            yield _encode_ai_sdk_sse({"type": "error", "errorText": "模型请求错误"}).encode("utf-8")
            yield _encode_ai_sdk_sse("[DONE]").encode("utf-8")

    return StreamingResponse(proxy_stream(), media_type="text/event-stream")


@internal_router.post("/ai-runs/{run_id}/complete")
def complete_learning_ai_run(
    run_id: int,
    payload: LearningAiRunCallbackRequest,
    db: Session = Depends(get_db),
) -> dict:
    run = repository.get_ai_run(db, run_id=run_id)
    if run is None:
        raise ApiError(404, "learning_ai_run_not_found", "Learning AI run not found")
    if run.status == "completed":
        return {"ok": True}
    if payload.status == "failed":
        LearningOrchestrator().explore_orchestrator.mark_ai_sdk_run_failed(
            db,
            run=run,
            error_code=payload.error_code or "learning_model_request_error",
        )
        return {"ok": True}

    answer_text = payload.extract_answer_text()
    if not answer_text:
        raise ApiError(400, "learning_ai_run_answer_required", "Answer text is required")
    final_payload = LearningOrchestrator().explore_orchestrator.finalize_ai_sdk_run(
        db,
        run=run,
        user_content=LearningStreamRequest(message=run.user_message_json).extract_content(),
        answer_text=answer_text,
        reasoning_content=payload.extract_reasoning_content(),
    )
    return {"ok": True, **final_payload}


@router.get("/sessions/{session_id}/turns")
def get_learning_turns(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    turns = []
    for turn in repository.list_session_turns(db, session_id=session_id):
        agent_runs = [
            {
                "agentName": run.agent_name,
                "status": run.status,
                "outputSummary": run.output_summary,
            }
            for run in repository.list_turn_agent_runs(db, turn_id=turn.id)
        ]
        turns.append(serialize_turn(turn, agent_runs=agent_runs))
    return {"ok": True, "items": turns}


@router.get("/sessions/{session_id}/report")
def get_learning_report(
    session_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    report = repository.get_session_report(db, session_id=session_id)
    if report is None:
        checkpoints = repository.list_session_checkpoints(db, session_id=session_id)
        weak_points = checkpoints[-1].missing_concepts_json if checkpoints else []
        report = repository.upsert_report(
            db,
            session_id=session_id,
            report_type="session_summary",
            summary="当前会话还没有形成完整报告。",
            weak_points_json=weak_points,
            suggested_next_action="继续完成当前导学步骤。",
            metadata_json={},
        )
        db.commit()
    return {"ok": True, "report": serialize_report(report)}


@router.post("/sessions/{session_id}/bridge-actions")
def create_learning_bridge_action(
    session_id: int,
    payload: LearningBridgeActionRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    bridge_service = LearningBridgeService()
    if payload.action_type == "expand_step_to_explore":
        result = bridge_service.expand_step_to_explore(
            db,
            reader_id=identity.profile_id,
            guide_session_id=session_id,
        )
        db.commit()
        return {
            "ok": True,
            "action": serialize_bridge_action(result["action"]),
            "session": serialize_session(result["session"]),
            "recommendedPrompts": result["recommended_prompts"],
        }

    result = bridge_service.attach_explore_turn_to_guide_step(
        db,
        reader_id=identity.profile_id,
        explore_session_id=session_id,
        turn_id=payload.turn_id,
        target_guide_session_id=payload.target_guide_session_id,
        target_step_index=payload.target_step_index,
    )
    db.commit()
    return {
        "ok": True,
        "action": serialize_bridge_action(result["action"]),
        "contextItem": serialize_step_context_item(result["context_item"]),
    }


@router.get("/jobs/{job_id}")
def get_learning_job(
    job_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    job = repository.get_job(db, job_id=job_id)
    if job is None:
        raise ApiError(404, "learning_job_not_found", "Learning job not found")
    profile = repository.require_owned_profile(db, profile_id=job.profile_id, reader_id=identity.profile_id)
    del profile
    return {"ok": True, "job": serialize_job(job)}
