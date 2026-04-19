from __future__ import annotations

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, File, Query, UploadFile
from fastapi.responses import StreamingResponse
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
    LearningBridgeActionRequest,
    LearningProfileCreateRequest,
    LearningSessionCreateRequest,
    LearningStreamRequest,
    serialize_asset,
    serialize_bridge_action,
    serialize_job,
    serialize_path_step,
    serialize_path_version,
    serialize_profile,
    serialize_report,
    serialize_session,
    serialize_step_context_item,
    serialize_source_bundle,
    serialize_turn,
    serialize_upload,
)
from app.learning.service import LearningBridgeService, LearningService


router = APIRouter(prefix="/api/v2/learning", tags=["learning"])


def _dispatch_generation_task(profile_id: int, reader_id: int) -> None:
    from app.learning.tasks import generate_learning_profile_task

    generate_learning_profile_task(profile_id, reader_id)


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


@router.get("/profiles/{profile_id}/graph")
def get_learning_profile_graph(
    profile_id: int,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    profile = repository.require_owned_profile(db, profile_id=profile_id, reader_id=identity.profile_id)
    service = LearningService()
    live_graph = service.graph_service.get_profile_subgraph(profile_id=profile.id)
    if live_graph is not None:
        return {"ok": True, "graph": live_graph}
    if profile.active_path_version_id is None:
        return {"ok": True, "graph": {"provider": "fallback", "nodes": [], "edges": []}}
    active_path_version = repository.get_path_version(db, path_version_id=profile.active_path_version_id)
    graph = {} if active_path_version is None else (active_path_version.graph_snapshot_json or {})
    if "provider" not in graph:
        graph["provider"] = active_path_version.graph_provider if active_path_version is not None else "fallback"
    return {"ok": True, "graph": graph}


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


@router.post("/sessions/{session_id}/stream")
async def stream_learning_session(
    session_id: int,
    payload: LearningStreamRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
):
    repository.require_owned_session(db, session_id=session_id, reader_id=identity.profile_id)
    settings = get_settings()
    if settings.learning_orchestrator_url:
        base_url = settings.learning_orchestrator_url.rstrip("/")

        async def proxy_stream():
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/internal/learning/sessions/{session_id}/stream",
                    params={"reader_id": identity.profile_id},
                    json={"content": payload.content},
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
            user_content=payload.content,
        )
    )


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
