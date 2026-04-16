from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.catalog.models import Book, BookSourceDocument
from app.core.errors import ApiError
from app.learning.models import (
    LearningAgentRun,
    LearningBridgeAction,
    LearningCheckpoint,
    LearningFragment,
    LearningJob,
    LearningPathStep,
    LearningPathVersion,
    LearningProfile,
    LearningRemediationPlan,
    LearningReport,
    LearningSession,
    LearningStepContextItem,
    LearningUpload,
    LearningSourceAsset,
    LearningSourceBundle,
    LearningTurn,
)


def require_book(session: Session, *, book_id: int) -> Book:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return book


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


def create_source_bundle(
    session: Session,
    *,
    reader_id: int,
    title: str,
    metadata_json: dict | None = None,
) -> LearningSourceBundle:
    bundle = LearningSourceBundle(reader_id=reader_id, title=title, metadata_json=metadata_json)
    session.add(bundle)
    session.flush()
    return bundle


def create_profile(
    session: Session,
    *,
    reader_id: int,
    source_bundle_id: int,
    title: str,
    goal_mode: str,
    difficulty_mode: str,
    metadata_json: dict | None = None,
) -> LearningProfile:
    profile = LearningProfile(
        reader_id=reader_id,
        source_bundle_id=source_bundle_id,
        title=title,
        goal_mode=goal_mode,
        difficulty_mode=difficulty_mode,
        status="queued",
        metadata_json=metadata_json,
    )
    session.add(profile)
    session.flush()
    return profile


def get_source_bundle(session: Session, *, bundle_id: int) -> LearningSourceBundle | None:
    return session.get(LearningSourceBundle, bundle_id)


def get_profile(session: Session, *, profile_id: int) -> LearningProfile | None:
    return session.get(LearningProfile, profile_id)


def require_owned_profile(session: Session, *, profile_id: int, reader_id: int) -> LearningProfile:
    profile = get_profile(session, profile_id=profile_id)
    if profile is None:
        raise ApiError(404, "learning_profile_not_found", "Learning profile not found")
    if profile.reader_id != reader_id:
        raise ApiError(403, "learning_profile_forbidden", "Learning profile does not belong to the current reader")
    return profile


def create_source_asset(
    session: Session,
    *,
    bundle_id: int,
    asset_kind: str,
    book_id: int | None = None,
    book_source_document_id: int | None = None,
    mime_type: str | None = None,
    file_name: str | None = None,
    storage_path: str | None = None,
    content_hash: str | None = None,
    metadata_json: dict | None = None,
) -> LearningSourceAsset:
    asset = LearningSourceAsset(
        bundle_id=bundle_id,
        asset_kind=asset_kind,
        book_id=book_id,
        book_source_document_id=book_source_document_id,
        mime_type=mime_type,
        file_name=file_name,
        storage_path=storage_path,
        content_hash=content_hash,
        parse_status="pending",
        metadata_json=metadata_json,
    )
    session.add(asset)
    session.flush()
    return asset


def create_upload(
    session: Session,
    *,
    reader_id: int,
    file_name: str,
    mime_type: str | None,
    storage_path: str,
    content_hash: str | None,
    expires_at: datetime | None,
    metadata_json: dict | None = None,
) -> LearningUpload:
    upload = LearningUpload(
        reader_id=reader_id,
        file_name=file_name,
        mime_type=mime_type,
        storage_path=storage_path,
        content_hash=content_hash,
        expires_at=expires_at,
        consumed_at=None,
        metadata_json=metadata_json,
    )
    session.add(upload)
    session.flush()
    return upload


def get_upload(session: Session, *, upload_id: int) -> LearningUpload | None:
    return session.get(LearningUpload, upload_id)


def require_owned_upload(session: Session, *, upload_id: int, reader_id: int) -> LearningUpload:
    upload = get_upload(session, upload_id=upload_id)
    if upload is None:
        raise ApiError(404, "learning_upload_not_found", "Learning upload not found")
    if upload.reader_id != reader_id:
        raise ApiError(403, "learning_upload_forbidden", "Learning upload does not belong to the current reader")
    return upload


def list_bundle_assets(session: Session, *, bundle_id: int) -> Sequence[LearningSourceAsset]:
    statement = (
        select(LearningSourceAsset)
        .where(LearningSourceAsset.bundle_id == bundle_id)
        .order_by(LearningSourceAsset.id.asc())
    )
    return session.execute(statement).scalars().all()


def create_job(
    session: Session,
    *,
    profile_id: int,
    job_type: str,
    payload_json: dict | None = None,
) -> LearningJob:
    job = LearningJob(
        profile_id=profile_id,
        job_type=job_type,
        status="queued",
        payload_json=payload_json,
        attempt_count=0,
    )
    session.add(job)
    session.flush()
    return job


def list_profile_jobs(session: Session, *, profile_id: int) -> Sequence[LearningJob]:
    statement = (
        select(LearningJob)
        .where(LearningJob.profile_id == profile_id)
        .order_by(LearningJob.created_at.asc(), LearningJob.id.asc())
    )
    return session.execute(statement).scalars().all()


def get_job(session: Session, *, job_id: int) -> LearningJob | None:
    return session.get(LearningJob, job_id)


def get_job_by_type(session: Session, *, profile_id: int, job_type: str) -> LearningJob | None:
    statement = (
        select(LearningJob)
        .where(LearningJob.profile_id == profile_id, LearningJob.job_type == job_type)
        .order_by(LearningJob.id.desc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def replace_asset_fragments(
    session: Session,
    *,
    profile_id: int,
    asset_id: int,
    fragments: list[dict],
) -> list[LearningFragment]:
    session.execute(delete(LearningFragment).where(LearningFragment.asset_id == asset_id))
    rows: list[LearningFragment] = []
    for fragment in fragments:
        row = LearningFragment(
            profile_id=profile_id,
            asset_id=asset_id,
            chunk_index=int(fragment["chunk_index"]),
            fragment_type=str(fragment.get("fragment_type") or "text"),
            chapter_label=fragment.get("chapter_label"),
            semantic_summary=fragment.get("semantic_summary"),
            content=str(fragment["content"]),
            content_tsv=fragment.get("content_tsv"),
            search_vector=fragment.get("search_vector") or fragment.get("content_tsv"),
            citation_anchor_json=fragment.get("citation_anchor_json"),
            embedding=fragment.get("embedding"),
            metadata_json=fragment.get("metadata_json"),
        )
        session.add(row)
        rows.append(row)
    session.flush()
    return rows


def list_profile_fragments(session: Session, *, profile_id: int) -> Sequence[LearningFragment]:
    statement = (
        select(LearningFragment)
        .where(LearningFragment.profile_id == profile_id)
        .order_by(LearningFragment.asset_id.asc(), LearningFragment.chunk_index.asc())
    )
    return session.execute(statement).scalars().all()


def list_profile_fragments_by_ids(
    session: Session,
    *,
    profile_id: int,
    fragment_ids: Sequence[int],
) -> Sequence[LearningFragment]:
    if not fragment_ids:
        return []
    statement = select(LearningFragment).where(
        LearningFragment.profile_id == profile_id,
        LearningFragment.id.in_(list(fragment_ids)),
    )
    rows = session.execute(statement).scalars().all()
    row_by_id = {row.id: row for row in rows}
    return [row_by_id[fragment_id] for fragment_id in fragment_ids if fragment_id in row_by_id]


def create_path_version(
    session: Session,
    *,
    profile_id: int,
    version_number: int,
    title: str,
    overview: str | None,
    graph_snapshot_json: dict | None,
    graph_provider: str | None,
    metadata_json: dict | None = None,
) -> LearningPathVersion:
    path_version = LearningPathVersion(
        profile_id=profile_id,
        version_number=version_number,
        status="ready",
        title=title,
        overview=overview,
        graph_snapshot_json=graph_snapshot_json,
        graph_provider=graph_provider,
        metadata_json=metadata_json,
    )
    session.add(path_version)
    session.flush()
    return path_version


def list_profile_path_versions(session: Session, *, profile_id: int) -> Sequence[LearningPathVersion]:
    statement = (
        select(LearningPathVersion)
        .where(LearningPathVersion.profile_id == profile_id)
        .order_by(LearningPathVersion.version_number.desc(), LearningPathVersion.id.desc())
    )
    return session.execute(statement).scalars().all()


def get_path_version(session: Session, *, path_version_id: int) -> LearningPathVersion | None:
    return session.get(LearningPathVersion, path_version_id)


def replace_path_steps(
    session: Session,
    *,
    path_version_id: int,
    steps: list[dict],
) -> list[LearningPathStep]:
    session.execute(delete(LearningPathStep).where(LearningPathStep.path_version_id == path_version_id))
    rows: list[LearningPathStep] = []
    for step in steps:
        row = LearningPathStep(
            path_version_id=path_version_id,
            step_index=int(step["step_index"]),
            step_type=str(step.get("step_type") or "lesson"),
            title=str(step["title"]),
            objective=step.get("objective"),
            guiding_question=step.get("guiding_question"),
            success_criteria=step.get("success_criteria"),
            prerequisite_step_ids=step.get("prerequisite_step_ids"),
            keywords_json=step.get("keywords_json"),
            metadata_json=step.get("metadata_json"),
        )
        session.add(row)
        rows.append(row)
    session.flush()
    return rows


def list_path_steps(session: Session, *, path_version_id: int) -> Sequence[LearningPathStep]:
    statement = (
        select(LearningPathStep)
        .where(LearningPathStep.path_version_id == path_version_id)
        .order_by(LearningPathStep.step_index.asc(), LearningPathStep.id.asc())
    )
    return session.execute(statement).scalars().all()


def create_session(
    session: Session,
    *,
    profile_id: int,
    learning_mode: str,
    current_step_title: str | None,
    session_kind: str = "guide",
    source_session_id: int | None = None,
    source_turn_id: int | None = None,
    focus_step_index: int | None = None,
    focus_context_json: dict | None = None,
) -> LearningSession:
    learning_session = LearningSession(
        profile_id=profile_id,
        learning_mode=learning_mode,
        session_kind=session_kind,
        source_session_id=source_session_id,
        source_turn_id=source_turn_id,
        focus_step_index=focus_step_index,
        focus_context_json=focus_context_json,
        status="active",
        current_step_index=0 if focus_step_index is None else focus_step_index,
        current_step_title=current_step_title,
        completed_steps_count=0,
        remediation_status=None,
        mastery_score=0.0,
    )
    session.add(learning_session)
    session.flush()
    return learning_session


def get_session(session: Session, *, session_id: int) -> LearningSession | None:
    return session.get(LearningSession, session_id)


def require_owned_session(session: Session, *, session_id: int, reader_id: int) -> LearningSession:
    learning_session = get_session(session, session_id=session_id)
    if learning_session is None:
        raise ApiError(404, "learning_session_not_found", "Learning session not found")
    profile = session.get(LearningProfile, learning_session.profile_id)
    if profile is None or profile.reader_id != reader_id:
        raise ApiError(403, "learning_session_forbidden", "Learning session does not belong to the current reader")
    return learning_session


def create_turn(
    session: Session,
    *,
    session_id: int,
    user_content: str | None,
    teacher_content: str | None,
    peer_content: str | None,
    assistant_content: str | None,
    turn_kind: str = "guide",
    citations_json: list[dict] | None = None,
    evaluation_json: dict | None = None,
    related_concepts_json: list[str] | None = None,
    bridge_metadata_json: dict | None = None,
    token_usage_json: dict | None = None,
    latency_ms: int | None = None,
    metadata_json: dict | None = None,
) -> LearningTurn:
    turn = LearningTurn(
        session_id=session_id,
        turn_kind=turn_kind,
        user_content=user_content,
        teacher_content=teacher_content,
        peer_content=peer_content,
        assistant_content=assistant_content,
        citations_json=citations_json,
        evaluation_json=evaluation_json,
        related_concepts_json=related_concepts_json,
        bridge_metadata_json=bridge_metadata_json,
        token_usage_json=token_usage_json,
        latency_ms=latency_ms,
        metadata_json=metadata_json,
    )
    session.add(turn)
    session.flush()
    return turn


def get_turn(session: Session, *, turn_id: int) -> LearningTurn | None:
    return session.get(LearningTurn, turn_id)


def get_session_turn(session: Session, *, session_id: int, turn_id: int) -> LearningTurn | None:
    statement = (
        select(LearningTurn)
        .where(LearningTurn.id == turn_id, LearningTurn.session_id == session_id)
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def list_session_turns(session: Session, *, session_id: int) -> Sequence[LearningTurn]:
    statement = (
        select(LearningTurn)
        .where(LearningTurn.session_id == session_id)
        .order_by(LearningTurn.created_at.asc(), LearningTurn.id.asc())
    )
    return session.execute(statement).scalars().all()


def create_agent_run(
    session: Session,
    *,
    turn_id: int,
    agent_name: str,
    model_name: str | None,
    status: str,
    input_summary: str | None,
    output_summary: str | None,
    latency_ms: int | None = None,
    metadata_json: dict | None = None,
) -> LearningAgentRun:
    run = LearningAgentRun(
        turn_id=turn_id,
        agent_name=agent_name,
        model_name=model_name,
        status=status,
        input_summary=input_summary,
        output_summary=output_summary,
        latency_ms=latency_ms,
        metadata_json=metadata_json,
    )
    session.add(run)
    session.flush()
    return run


def list_turn_agent_runs(session: Session, *, turn_id: int) -> Sequence[LearningAgentRun]:
    statement = (
        select(LearningAgentRun)
        .where(LearningAgentRun.turn_id == turn_id)
        .order_by(LearningAgentRun.id.asc())
    )
    return session.execute(statement).scalars().all()


def get_linked_explore_session(
    session: Session,
    *,
    source_session_id: int,
    focus_step_index: int,
) -> LearningSession | None:
    statement = (
        select(LearningSession)
        .where(
            LearningSession.session_kind == "explore",
            LearningSession.source_session_id == source_session_id,
            LearningSession.focus_step_index == focus_step_index,
        )
        .order_by(LearningSession.id.desc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()


def create_step_context_item(
    session: Session,
    *,
    guide_session_id: int,
    step_index: int,
    source_session_id: int | None,
    source_turn_id: int | None,
    title: str,
    summary: str | None,
    content: str,
    citations_json: list[dict] | None,
    related_concepts_json: list[str] | None,
    embedding: list[float] | None = None,
    metadata_json: dict | None = None,
) -> LearningStepContextItem:
    item = LearningStepContextItem(
        guide_session_id=guide_session_id,
        step_index=step_index,
        source_session_id=source_session_id,
        source_turn_id=source_turn_id,
        title=title,
        summary=summary,
        content=content,
        citations_json=citations_json,
        related_concepts_json=related_concepts_json,
        embedding=embedding,
        metadata_json=metadata_json,
    )
    session.add(item)
    session.flush()
    return item


def list_step_context_items(
    session: Session,
    *,
    guide_session_id: int,
    step_index: int | None = None,
) -> Sequence[LearningStepContextItem]:
    statement = select(LearningStepContextItem).where(LearningStepContextItem.guide_session_id == guide_session_id)
    if step_index is not None:
        statement = statement.where(LearningStepContextItem.step_index == step_index)
    statement = statement.order_by(LearningStepContextItem.id.desc())
    return session.execute(statement).scalars().all()


def create_bridge_action(
    session: Session,
    *,
    action_type: str,
    from_session_id: int,
    from_turn_id: int | None,
    to_session_id: int | None,
    status: str,
    payload_json: dict | None,
    result_json: dict | None,
) -> LearningBridgeAction:
    action = LearningBridgeAction(
        action_type=action_type,
        from_session_id=from_session_id,
        from_turn_id=from_turn_id,
        to_session_id=to_session_id,
        status=status,
        payload_json=payload_json,
        result_json=result_json,
    )
    session.add(action)
    session.flush()
    return action


def create_checkpoint(
    session: Session,
    *,
    session_id: int,
    turn_id: int | None,
    step_index: int,
    mastery_score: float,
    passed: bool,
    missing_concepts_json: list[str] | None,
    evidence_json: dict | None,
) -> LearningCheckpoint:
    checkpoint = LearningCheckpoint(
        session_id=session_id,
        turn_id=turn_id,
        step_index=step_index,
        mastery_score=mastery_score,
        passed=passed,
        missing_concepts_json=missing_concepts_json,
        evidence_json=evidence_json,
    )
    session.add(checkpoint)
    session.flush()
    return checkpoint


def list_session_checkpoints(session: Session, *, session_id: int) -> Sequence[LearningCheckpoint]:
    statement = (
        select(LearningCheckpoint)
        .where(LearningCheckpoint.session_id == session_id)
        .order_by(LearningCheckpoint.created_at.asc(), LearningCheckpoint.id.asc())
    )
    return session.execute(statement).scalars().all()


def create_remediation_plan(
    session: Session,
    *,
    session_id: int,
    step_index: int,
    status: str,
    missing_concepts_json: list[str] | None,
    suggested_questions_json: list[str] | None,
    plan_json: dict | None,
) -> LearningRemediationPlan:
    plan = LearningRemediationPlan(
        session_id=session_id,
        step_index=step_index,
        status=status,
        missing_concepts_json=missing_concepts_json,
        suggested_questions_json=suggested_questions_json,
        plan_json=plan_json,
    )
    session.add(plan)
    session.flush()
    return plan


def list_session_remediation_plans(session: Session, *, session_id: int) -> Sequence[LearningRemediationPlan]:
    statement = (
        select(LearningRemediationPlan)
        .where(LearningRemediationPlan.session_id == session_id)
        .order_by(LearningRemediationPlan.created_at.desc(), LearningRemediationPlan.id.desc())
    )
    return session.execute(statement).scalars().all()


def upsert_report(
    session: Session,
    *,
    session_id: int,
    report_type: str,
    summary: str | None,
    weak_points_json: list[str] | None,
    suggested_next_action: str | None,
    metadata_json: dict | None = None,
) -> LearningReport:
    statement = (
        select(LearningReport)
        .where(LearningReport.session_id == session_id, LearningReport.report_type == report_type)
        .limit(1)
    )
    report = session.execute(statement).scalars().first()
    if report is None:
        report = LearningReport(
            session_id=session_id,
            report_type=report_type,
            summary=summary,
            weak_points_json=weak_points_json,
            suggested_next_action=suggested_next_action,
            metadata_json=metadata_json,
        )
        session.add(report)
    else:
        report.summary = summary
        report.weak_points_json = weak_points_json
        report.suggested_next_action = suggested_next_action
        report.metadata_json = metadata_json
    session.flush()
    return report


def get_session_report(session: Session, *, session_id: int, report_type: str = "session_summary") -> LearningReport | None:
    statement = (
        select(LearningReport)
        .where(LearningReport.session_id == session_id, LearningReport.report_type == report_type)
        .order_by(LearningReport.updated_at.desc(), LearningReport.id.desc())
        .limit(1)
    )
    return session.execute(statement).scalars().first()
