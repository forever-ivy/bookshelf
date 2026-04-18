from __future__ import annotations

import json
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.catalog.models import Book
from app.core.database import init_engine, init_schema, reset_engine
from app.core.errors import ApiError
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.readers.models import ReaderAccount, ReaderProfile


def reader_headers(account_id: int, profile_id: int) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_reader_with_book() -> dict[str, int]:
    session = get_session_factory()()
    try:
        owner_account = ReaderAccount(username="learning-owner", password_hash=hash_password("owner-pass"))
        session.add(owner_account)
        session.flush()

        owner_profile = ReaderProfile(account_id=owner_account.id, display_name="Learning Owner")
        session.add(owner_profile)
        session.flush()

        other_account = ReaderAccount(username="learning-other", password_hash=hash_password("other-pass"))
        session.add(other_account)
        session.flush()

        other_profile = ReaderProfile(account_id=other_account.id, display_name="Learning Other")
        session.add(other_profile)
        session.flush()

        book = Book(
            title="操作系统实验导学",
            author="林老师",
            category="计算机",
            keywords="进程,线程,调度,实验",
            summary="围绕进程管理、线程同步和调度策略的实验性课程资料。",
        )
        session.add(book)
        session.commit()
        return {
            "owner_account_id": owner_account.id,
            "owner_profile_id": owner_profile.id,
            "other_account_id": other_account.id,
            "other_profile_id": other_profile.id,
            "book_id": book.id,
        }
    finally:
        session.close()


def parse_sse_lines(lines: list[str]) -> list[dict]:
    events: list[dict] = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line or not line.startswith("data: "):
            continue
        events.append(json.loads(line[6:]))
    return events


def create_ready_learning_session(client: TestClient) -> tuple[dict[str, int], dict[str, str], int]:
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])
    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)
    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    assert session_response.status_code == 201
    return state, headers, session_response.json()["session"]["id"]


@pytest.mark.parametrize(
    ("content", "expected_kind"),
    [
        ("我理解这份资料主要讨论进程、线程和调度策略，它们决定了实验里如何组织并发执行。", "step_answer"),
        ("这一步最关键的区别到底是什么？我还缺哪块理解？", "step_clarify"),
        ("如果跳出去看，这和数据库事务或分布式一致性有什么关系？", "offtrack_explore"),
    ],
)
def test_learning_session_stream_classifies_guide_intent(client: TestClient, content: str, expected_kind: str):
    _, headers, learning_session_id = create_ready_learning_session(client)

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": content},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    intent_event = next(event for event in events if event["event"] == "guide.intent")
    assert intent_event["data"]["kind"] == expected_kind

    final_event = events[-1]
    assert final_event["data"]["turn"]["intentKind"] == expected_kind


def test_learning_session_stream_step_clarify_persists_without_checkpoint(client: TestClient):
    _, headers, learning_session_id = create_ready_learning_session(client)

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": "这一步最关键的区别到底是什么？我还缺哪块理解？"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert "guide.intent" in event_names
    assert "session.progress" not in event_names
    assert "session.remediation" not in event_names

    final_event = events[-1]
    assert final_event["data"]["turn"]["intentKind"] == "step_clarify"
    assert final_event["data"]["turn"]["evaluation"] is None

    session = get_session_factory()()
    try:
        checkpoint_count = session.execute(text("SELECT COUNT(*) FROM learning_checkpoints")).scalar_one()
        remediation_count = session.execute(text("SELECT COUNT(*) FROM learning_remediation_plans")).scalar_one()
        assert checkpoint_count == 0
        assert remediation_count == 0
    finally:
        session.close()


def test_learning_session_stream_offtrack_explore_skips_checkpoint_and_remediation(client: TestClient):
    _, headers, learning_session_id = create_ready_learning_session(client)

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": "如果跳出去看，这和数据库事务或分布式一致性有什么关系？"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert "guide.intent" in event_names
    assert "session.progress" not in event_names
    assert "session.remediation" not in event_names

    final_event = events[-1]
    assert final_event["data"]["turn"]["intentKind"] == "offtrack_explore"
    assert final_event["data"]["turn"]["evaluation"] is None

    session = get_session_factory()()
    try:
        checkpoint_count = session.execute(text("SELECT COUNT(*) FROM learning_checkpoints")).scalar_one()
        remediation_count = session.execute(text("SELECT COUNT(*) FROM learning_remediation_plans")).scalar_one()
        assert checkpoint_count == 0
        assert remediation_count == 0
    finally:
        session.close()


def test_learning_session_stream_control_mutates_state_without_evaluation(client: TestClient):
    _, headers, learning_session_id = create_ready_learning_session(client)

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": "继续"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert "guide.intent" in event_names
    assert "session.progress" not in event_names
    assert "session.remediation" not in event_names

    final_event = events[-1]
    assert final_event["data"]["turn"]["intentKind"] == "control"
    assert final_event["data"]["turn"]["evaluation"] is None
    assert final_event["data"]["session"]["currentStepIndex"] == 1

    session = get_session_factory()()
    try:
        checkpoint_count = session.execute(text("SELECT COUNT(*) FROM learning_checkpoints")).scalar_one()
        remediation_count = session.execute(text("SELECT COUNT(*) FROM learning_remediation_plans")).scalar_one()
        assert checkpoint_count == 0
        assert remediation_count == 0
    finally:
        session.close()


def test_learning_session_stream_session_redirects_offtrack_question_to_explore(client: TestClient):
    _, headers, learning_session_id = create_ready_learning_session(client)

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": "如果跳出去看，这和数据库事务或分布式一致性有什么关系？"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    redirect_event = next(event for event in events if event["event"] == "session.redirect")
    assert redirect_event["data"]["targetMode"] == "explore"
    assert redirect_event["data"]["targetSession"]["sessionKind"] == "explore"
    assert redirect_event["data"]["targetSession"]["sourceSessionId"] == learning_session_id
    assert redirect_event["data"]["bridgeAction"]["payload"]["trigger"] == "auto"
    assert redirect_event["data"]["bridgeAction"]["payload"]["reason"] == "offtrack_explore"

    final_event = events[-1]
    assert final_event["data"]["turn"]["intentKind"] == "offtrack_explore"
    assert final_event["data"]["turn"]["responseMode"] == "redirected"
    assert final_event["data"]["turn"]["redirectedSessionId"] == redirect_event["data"]["targetSession"]["id"]
    assert final_event["data"]["turn"]["bridgeMetadata"]["trigger"] == "auto"
    assert final_event["data"]["turn"]["bridgeMetadata"]["reason"] == "offtrack_explore"
    assert final_event["data"]["turn"]["evaluation"] is None

    turns_response = client.get(f"/api/v2/learning/sessions/{learning_session_id}/turns", headers=headers)
    assert turns_response.status_code == 200
    turn = turns_response.json()["items"][0]
    assert turn["responseMode"] == "redirected"
    assert turn["redirectedSessionId"] == redirect_event["data"]["targetSession"]["id"]

    session = get_session_factory()()
    try:
        checkpoint_count = session.execute(text("SELECT COUNT(*) FROM learning_checkpoints")).scalar_one()
        remediation_count = session.execute(text("SELECT COUNT(*) FROM learning_remediation_plans")).scalar_one()
        assert checkpoint_count == 0
        assert remediation_count == 0
    finally:
        session.close()


def test_create_learning_profile_from_book_returns_bundle_and_jobs(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [
                {
                    "kind": "book",
                    "bookId": state["book_id"],
                }
            ],
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ok"] is True
    assert payload["profile"]["status"] == "queued"
    assert payload["profile"]["goalMode"] == "preview"
    assert payload["sourceBundle"]["assetCount"] == 1
    assert {job["jobType"] for job in payload["jobs"]} == {
        "parse",
        "chunk",
        "graph_build",
        "plan_generate",
    }


def test_generate_learning_profile_keeps_profile_when_graph_provider_missing(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "分布式系统导学空间",
            "goalMode": "deep-dive",
            "difficultyMode": "adaptive",
            "sources": [
                {
                    "kind": "inline_text",
                    "fileName": "distributed-systems.md",
                    "mimeType": "text/markdown",
                    "content": (
                        "# 分布式系统\n\n"
                        "复制用于提高可用性，一致性协议用于协调副本状态，故障恢复强调冗余和切换。"
                    ),
                }
            ],
        },
    )
    profile_id = create_response.json()["profile"]["id"]

    generate_response = client.post(
        f"/api/v2/learning/profiles/{profile_id}/generate",
        headers=headers,
    )

    assert generate_response.status_code == 202
    payload = generate_response.json()
    assert payload["ok"] is True
    assert payload["jobs"]
    assert payload["triggered"] is True

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert detail_payload["activePathVersion"]["stepCount"] >= 3
    assert detail_payload["activePathVersion"]["graphProvider"] in {"fallback", "neo4j"}
    assert any(job["jobType"] == "graph_build" for job in detail_payload["jobs"])
    assert any(asset["parseStatus"] == "parsed" for asset in detail_payload["assets"])


def test_generate_learning_profile_retries_processing_jobs_that_never_started(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "重试导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [
                {
                    "kind": "inline_text",
                    "fileName": "retry.md",
                    "mimeType": "text/markdown",
                    "content": "# 重试\n\n这个导学空间应该允许重新触发生成。",
                }
            ],
        },
    )
    profile_id = create_response.json()["profile"]["id"]

    session = get_session_factory()()
    try:
        session.execute(
            text(
                """
                UPDATE learning_jobs
                SET status = 'processing', attempt_count = 0, error_message = NULL
                WHERE profile_id = :profile_id
                """
            ),
            {"profile_id": profile_id},
        )
        session.execute(
            text(
                """
                UPDATE learning_profiles
                SET status = 'queued'
                WHERE id = :profile_id
                """
            ),
            {"profile_id": profile_id},
        )
        session.commit()
    finally:
        session.close()

    generate_response = client.post(
        f"/api/v2/learning/profiles/{profile_id}/generate",
        headers=headers,
    )

    assert generate_response.status_code == 202
    payload = generate_response.json()
    assert payload["ok"] is True
    assert payload["triggered"] is True

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=headers)
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert any(job["attemptCount"] >= 1 for job in detail_payload["jobs"])


def test_learning_upload_source_can_generate_profile(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    upload_response = client.post(
        "/api/v2/learning/uploads",
        headers=headers,
        files={
            "file": (
                "operating-systems.md",
                BytesIO(
                    (
                        "# 操作系统实验\n\n"
                        "线程切换开销通常低于进程切换，原因在于地址空间切换和资源隔离成本不同。"
                    ).encode("utf-8")
                ),
                "text/markdown",
            )
        },
    )

    assert upload_response.status_code == 201
    upload_payload = upload_response.json()
    assert upload_payload["ok"] is True
    upload_id = upload_payload["upload"]["id"]

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "上传资料导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "upload", "uploadId": upload_id}],
        },
    )

    assert create_response.status_code == 201
    profile_id = create_response.json()["profile"]["id"]

    generate_response = client.post(
        f"/api/v2/learning/profiles/{profile_id}/generate",
        headers=headers,
    )
    assert generate_response.status_code == 202

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert detail_payload["assets"][0]["assetKind"] == "upload"
    assert detail_payload["assets"][0]["mimeType"] == "text/markdown"
    assert detail_payload["activePathVersion"]["stepCount"] >= 3


def test_learning_url_source_generates_profile_from_html_page(client, monkeypatch):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    from app.learning import service as learning_service

    monkeypatch.setattr(
        learning_service.UrlContentFetcher,
        "fetch",
        lambda self, url: {
            "url": url,
            "title": "操作系统实验网页",
            "mime_type": "text/html",
            "content": "线程切换与进程切换在地址空间和资源隔离成本上存在差异，实验里需要重点观察调度影响。",
            "raw_html": "<html><body><h1>操作系统实验网页</h1></body></html>",
        },
    )

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "网页资料导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [
                {
                    "kind": "url",
                    "url": "https://example.com/os-lab",
                    "title": "操作系统实验网页",
                }
            ],
        },
    )

    assert create_response.status_code == 201
    profile_id = create_response.json()["profile"]["id"]

    generate_response = client.post(
        f"/api/v2/learning/profiles/{profile_id}/generate",
        headers=headers,
    )
    assert generate_response.status_code == 202

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert detail_payload["assets"][0]["assetKind"] == "url"
    assert detail_payload["assets"][0]["metadata"]["sourceKind"] == "url"
    assert detail_payload["activePathVersion"]["stepCount"] >= 3


def test_generate_learning_profile_returns_503_when_runtime_unavailable(monkeypatch, tmp_path):
    db_path = tmp_path / "learning-runtime.db"
    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_ENABLED", "false")
    monkeypatch.setenv("LIBRARY_LEARNING_TASKS_EAGER", "false")
    monkeypatch.setenv("LIBRARY_LEARNING_STORAGE_DIR", str(tmp_path / "learning-storage"))
    get_settings.cache_clear()
    reset_engine()

    from app.main import create_app

    settings = get_settings()
    init_engine(settings)
    init_schema()
    test_client = TestClient(create_app())

    monkeypatch.setattr(
        "app.learning.runtime.LearningRuntimeProbe.assert_generation_runtime_available",
        lambda self: (_ for _ in ()).throw(
            ApiError(
                503,
                "learning_runtime_unavailable",
                "Learning runtime is unavailable: redis queue unavailable; celery worker unavailable",
            )
        ),
    )

    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = test_client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "运行时异常导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]

    generate_response = test_client.post(
        f"/api/v2/learning/profiles/{profile_id}/generate",
        headers=headers,
    )

    assert generate_response.status_code == 503
    assert generate_response.json()["error"]["code"] == "learning_runtime_unavailable"

    detail_response = test_client.get(f"/api/v2/learning/profiles/{profile_id}", headers=headers)
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "queued"
    assert all(job["attemptCount"] == 0 for job in detail_payload["jobs"])
    assert all(job["status"] == "queued" for job in detail_payload["jobs"])


def test_list_learning_profiles_returns_latest_job_primary_asset_and_step_count(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "资料列表导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    response = client.get("/api/v2/learning/profiles", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    item = next(entry for entry in payload["items"] if entry["profile"]["id"] == profile_id)
    assert item["profile"]["title"] == "资料列表导学空间"
    assert item["latestJob"]["jobType"] in {"parse", "chunk", "graph_build", "plan_generate"}
    assert item["primaryAsset"]["assetKind"] == "book"
    assert item["stepCount"] >= 3


def test_list_learning_sessions_returns_owned_sessions(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "会话列表导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)
    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    created_session = session_response.json()["session"]

    response = client.get("/api/v2/learning/sessions", headers=headers)

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    item = next(entry for entry in payload["items"] if entry["id"] == created_session["id"])
    assert item["profileId"] == profile_id
    assert item["sessionKind"] == "guide"


def test_learning_session_stream_emits_multi_agent_events_and_progress(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    assert session_response.status_code == 201
    learning_session_id = session_response.json()["session"]["id"]

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={
            "content": "我理解这份资料主要讨论进程、线程和调度策略，它们决定了实验里如何组织并发执行。"
        },
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert event_names[0] == "status"
    assert "evidence.items" in event_names
    assert "teacher.delta" in event_names
    assert "peer.delta" in event_names
    assert "examiner.result" in event_names
    assert "followups.items" in event_names
    assert "bridge.actions" in event_names
    assert "session.progress" in event_names
    assert event_names[-1] == "assistant.final"

    final_event = events[-1]
    presentation = final_event["data"]["turn"]["presentation"]
    assert final_event["data"]["turn"]["intentKind"] == "step_answer"
    assert final_event["data"]["turn"]["responseMode"] == "evaluation"
    assert final_event["data"]["turn"]["redirectedSessionId"] is None
    assert presentation["kind"] == "guide"
    assert presentation["teacher"]["content"]
    assert presentation["peer"]["content"]
    assert presentation["examiner"]["passed"] is True
    assert presentation["evidence"]
    assert presentation["followups"]
    assert any(action["actionType"] == "expand_step_to_explore" for action in presentation["bridgeActions"])

    turns_response = client.get(f"/api/v2/learning/sessions/{learning_session_id}/turns", headers=headers)
    assert turns_response.status_code == 200
    turns = turns_response.json()["items"]
    assert len(turns) == 1
    assert turns[0]["intentKind"] == "step_answer"
    assert turns[0]["responseMode"] == "evaluation"
    assert turns[0]["redirectedSessionId"] is None
    assert turns[0]["presentation"]["kind"] == "guide"
    assert turns[0]["presentation"]["examiner"]["passed"] is True


def test_learning_session_stream_forbidden_reader_returns_403_before_stream_starts(client):
    state = seed_reader_with_book()
    owner_headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])
    other_headers = reader_headers(state["other_account_id"], state["other_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=owner_headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=owner_headers)

    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=owner_headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    learning_session_id = session_response.json()["session"]["id"]

    response = client.post(
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=other_headers,
        json={"content": "我想问一个问题。"},
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "learning_session_forbidden"


def test_learning_session_creates_remediation_plan_for_weak_answer(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "lab",
            "difficultyMode": "adaptive",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "lab"},
    )
    learning_session_id = session_response.json()["session"]["id"]

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{learning_session_id}/stream",
        headers=headers,
        json={"content": "我不太清楚。"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    remediation_event = next(event for event in events if event["event"] == "session.remediation")
    assert remediation_event["data"]["plan"]["missingConcepts"]
    assert remediation_event["data"]["plan"]["status"] == "active"

    report_response = client.get(f"/api/v2/learning/sessions/{learning_session_id}/report", headers=headers)
    assert report_response.status_code == 200
    report_payload = report_response.json()["report"]
    assert report_payload["weakPoints"]
    assert report_payload["suggestedNextAction"]


def test_explore_session_stream_returns_free_qa_without_progress_or_checkpoint(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={
            "profileId": profile_id,
            "learningMode": "preview",
            "sessionKind": "explore",
        },
    )

    assert session_response.status_code == 201
    explore_session_id = session_response.json()["session"]["id"]
    assert session_response.json()["session"]["sessionKind"] == "explore"

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{explore_session_id}/stream",
        headers=headers,
        json={"content": "进程和线程有什么区别？"},
    ) as response:
        assert response.status_code == 200
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert event_names[0] == "status"
    assert "evidence.items" in event_names
    assert "explore.answer.delta" in event_names
    assert "explore.related_concepts" in event_names
    assert "followups.items" in event_names
    assert "bridge.actions" in event_names
    assert "session.progress" not in event_names
    assert "session.remediation" not in event_names
    assert event_names[-1] == "assistant.final"

    final_event = events[-1]
    assert final_event["data"]["session"]["sessionKind"] == "explore"
    assert final_event["data"]["turn"]["turnKind"] == "explore"
    assert final_event["data"]["turn"]["intentKind"] is None
    assert final_event["data"]["turn"]["responseMode"] is None
    assert final_event["data"]["turn"]["redirectedSessionId"] is None
    assert final_event["data"]["turn"]["evaluation"] is None
    assert final_event["data"]["turn"]["relatedConcepts"]
    assert final_event["data"]["turn"]["presentation"]["kind"] == "explore"
    assert final_event["data"]["turn"]["presentation"]["answer"]["content"]
    assert final_event["data"]["turn"]["presentation"]["evidence"]
    assert final_event["data"]["turn"]["presentation"]["relatedConcepts"]
    assert any(
        action["actionType"] == "attach_explore_turn_to_guide_step"
        for action in final_event["data"]["turn"]["presentation"]["bridgeActions"]
    )

    turns_response = client.get(f"/api/v2/learning/sessions/{explore_session_id}/turns", headers=headers)
    assert turns_response.status_code == 200
    turn = turns_response.json()["items"][0]
    assert turn["turnKind"] == "explore"
    assert turn["intentKind"] is None
    assert turn["responseMode"] is None
    assert turn["redirectedSessionId"] is None
    assert turn["evaluation"] is None
    assert turn["relatedConcepts"]
    assert turn["presentation"]["kind"] == "explore"

    session = get_session_factory()()
    try:
        checkpoint_count = session.execute(text("SELECT COUNT(*) FROM learning_checkpoints")).scalar_one()
        remediation_count = session.execute(text("SELECT COUNT(*) FROM learning_remediation_plans")).scalar_one()
        assert checkpoint_count == 0
        assert remediation_count == 0
    finally:
        session.close()


def test_bridge_expand_step_to_explore_reuses_focus_context(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    guide_session_id = session_response.json()["session"]["id"]

    bridge_response = client.post(
        f"/api/v2/learning/sessions/{guide_session_id}/bridge-actions",
        headers=headers,
        json={"actionType": "expand_step_to_explore"},
    )

    assert bridge_response.status_code == 200
    payload = bridge_response.json()
    assert payload["ok"] is True
    assert payload["action"]["actionType"] == "expand_step_to_explore"
    assert payload["session"]["sessionKind"] == "explore"
    assert payload["session"]["sourceSessionId"] == guide_session_id
    assert payload["session"]["focusStepIndex"] == 0
    assert payload["session"]["focusContext"]["stepTitle"]
    assert payload["recommendedPrompts"]

    second_bridge_response = client.post(
        f"/api/v2/learning/sessions/{guide_session_id}/bridge-actions",
        headers=headers,
        json={"actionType": "expand_step_to_explore"},
    )
    assert second_bridge_response.status_code == 200
    assert second_bridge_response.json()["session"]["id"] == payload["session"]["id"]


def test_bridge_attach_explore_turn_to_guide_step_becomes_context_evidence(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v2/learning/profiles",
        headers=headers,
        json={
            "title": "操作系统导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=headers)

    guide_session_response = client.post(
        "/api/v2/learning/sessions",
        headers=headers,
        json={"profileId": profile_id, "learningMode": "preview"},
    )
    guide_session_id = guide_session_response.json()["session"]["id"]

    expand_response = client.post(
        f"/api/v2/learning/sessions/{guide_session_id}/bridge-actions",
        headers=headers,
        json={"actionType": "expand_step_to_explore"},
    )
    explore_session_id = expand_response.json()["session"]["id"]

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{explore_session_id}/stream",
        headers=headers,
        json={"content": "请用实验角度解释线程切换和进程切换的差别。"},
    ) as response:
        assert response.status_code == 200
        explore_events = parse_sse_lines(list(response.iter_lines()))

    explore_turn_id = explore_events[-1]["data"]["turn"]["id"]

    attach_response = client.post(
        f"/api/v2/learning/sessions/{explore_session_id}/bridge-actions",
        headers=headers,
        json={
            "actionType": "attach_explore_turn_to_guide_step",
            "turnId": explore_turn_id,
            "targetGuideSessionId": guide_session_id,
        },
    )

    assert attach_response.status_code == 200
    attach_payload = attach_response.json()
    assert attach_payload["ok"] is True
    assert attach_payload["action"]["actionType"] == "attach_explore_turn_to_guide_step"
    assert attach_payload["contextItem"]["guideSessionId"] == guide_session_id
    assert attach_payload["contextItem"]["sourceSessionId"] == explore_session_id
    assert attach_payload["contextItem"]["relatedConcepts"]

    with client.stream(
        "POST",
        f"/api/v2/learning/sessions/{guide_session_id}/stream",
        headers=headers,
        json={"content": "我想把刚才自由问答里提到的实验差异整理一下。"},
    ) as response:
        assert response.status_code == 200
        guide_events = parse_sse_lines(list(response.iter_lines()))

    retrieval_event = next(event for event in guide_events if event["event"] == "retrieval.evidence")
    snippets = [item.get("snippet", "") for item in retrieval_event["data"]["items"]]
    assert any("实验角度" in snippet or "线程切换" in snippet for snippet in snippets)
