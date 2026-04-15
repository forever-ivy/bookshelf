from __future__ import annotations

import json

from sqlalchemy import text

from app.catalog.models import Book
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


def install_legacy_tutor_schema(session) -> None:
    session.execute(
        text(
            """
            CREATE TABLE tutor_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reader_id INTEGER NOT NULL,
                source_type TEXT NOT NULL,
                book_id INTEGER,
                book_source_document_id INTEGER,
                title TEXT NOT NULL,
                teaching_goal TEXT,
                status TEXT NOT NULL,
                persona_json TEXT,
                curriculum_json TEXT,
                source_summary TEXT,
                failure_code TEXT,
                failure_message TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_source_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                kind TEXT NOT NULL,
                origin_book_source_document_id INTEGER,
                mime_type TEXT,
                file_name TEXT,
                storage_path TEXT,
                extracted_text_path TEXT,
                parse_status TEXT NOT NULL,
                content_hash TEXT,
                metadata_json TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_document_chunks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                document_id INTEGER NOT NULL,
                chunk_index INTEGER NOT NULL,
                content TEXT NOT NULL,
                content_tsv TEXT,
                search_vector TEXT,
                embedding TEXT,
                metadata_json TEXT,
                created_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                status TEXT NOT NULL,
                current_step_index INTEGER NOT NULL,
                current_step_title TEXT,
                completed_steps_count INTEGER NOT NULL,
                last_message_preview TEXT,
                started_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_session_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations_json TEXT,
                metadata_json TEXT,
                created_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_step_completions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                step_index INTEGER NOT NULL,
                confidence REAL NOT NULL,
                reasoning TEXT,
                message_id INTEGER,
                completed_at TEXT
            )
            """
        )
    )
    session.execute(
        text(
            """
            CREATE TABLE tutor_generation_jobs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile_id INTEGER NOT NULL,
                job_type TEXT NOT NULL,
                status TEXT NOT NULL,
                attempt_count INTEGER NOT NULL,
                payload_json TEXT,
                error_message TEXT,
                created_at TEXT,
                updated_at TEXT
            )
            """
        )
    )
    session.commit()


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

    assert generate_response.status_code == 200
    payload = generate_response.json()
    assert payload["profile"]["status"] == "ready"
    assert payload["activePathVersion"]["stepCount"] >= 3
    assert payload["graph"]["provider"] == "fallback"
    assert any(job["jobType"] == "graph_build" and job["status"] == "failed" for job in payload["jobs"])
    assert any(asset["parseStatus"] == "parsed" for asset in payload["assets"])


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
    assert "retrieval.evidence" in event_names
    assert "agent.teacher.delta" in event_names
    assert "agent.peer.delta" in event_names
    assert "agent.examiner.result" in event_names
    assert "session.progress" in event_names
    assert event_names[-1] == "assistant.final"

    turns_response = client.get(f"/api/v2/learning/sessions/{learning_session_id}/turns", headers=headers)
    assert turns_response.status_code == 200
    assert len(turns_response.json()["items"]) == 1


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
    assert "retrieval.evidence" in event_names
    assert "explore.answer.delta" in event_names
    assert "explore.related_concepts" in event_names
    assert "session.progress" not in event_names
    assert "session.remediation" not in event_names
    assert event_names[-1] == "assistant.final"

    final_event = events[-1]
    assert final_event["data"]["session"]["sessionKind"] == "explore"
    assert final_event["data"]["turn"]["turnKind"] == "explore"
    assert final_event["data"]["turn"]["evaluation"] is None
    assert final_event["data"]["turn"]["relatedConcepts"]

    turns_response = client.get(f"/api/v2/learning/sessions/{explore_session_id}/turns", headers=headers)
    assert turns_response.status_code == 200
    turn = turns_response.json()["items"][0]
    assert turn["turnKind"] == "explore"
    assert turn["evaluation"] is None
    assert turn["relatedConcepts"]

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


def test_tutor_learning_migration_script_maps_legacy_records(app):
    session = get_session_factory()()
    try:
        install_legacy_tutor_schema(session)
        account = ReaderAccount(username="legacy-owner", password_hash=hash_password("legacy-pass"))
        session.add(account)
        session.flush()
        profile = ReaderProfile(account_id=account.id, display_name="Legacy Owner")
        session.add(profile)
        session.flush()

        session.execute(
            text(
                """
                INSERT INTO tutor_profiles (
                    id, reader_id, source_type, title, teaching_goal, status, source_summary, persona_json, curriculum_json
                ) VALUES (
                    1, :reader_id, 'upload', '旧版导学本', '迁移测试', 'ready', '旧版资料摘要', :persona_json, :curriculum_json
                )
                """
            ),
            {
                "reader_id": profile.id,
                "persona_json": json.dumps({"topicName": "旧版主题"}, ensure_ascii=False),
                "curriculum_json": json.dumps(
                    {
                        "title": "旧版路径",
                        "steps": [
                            {
                                "index": 0,
                                "title": "建立整体认知",
                                "learningObjective": "说明主题",
                                "successCriteria": "能概括主题",
                                "guidingQuestion": "资料主要在讲什么？",
                                "keywords": ["主题", "概括"],
                            }
                        ],
                    },
                    ensure_ascii=False,
                ),
            },
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_source_documents (
                    id, profile_id, kind, mime_type, file_name, storage_path, extracted_text_path, parse_status, content_hash
                ) VALUES (
                    1, 1, 'upload_file', 'text/markdown', 'legacy.md', '/tmp/legacy.md', '/tmp/legacy_extracted.md', 'parsed', 'legacy-hash'
                )
                """
            )
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_document_chunks (
                    id, profile_id, document_id, chunk_index, content, content_tsv, search_vector, metadata_json
                ) VALUES (
                    1, 1, 1, 0, '这是旧版切片内容', '旧版 切片 内容', '旧版 切片 内容', :metadata_json
                )
                """
            ),
            {"metadata_json": json.dumps({"section": "intro"}, ensure_ascii=False)},
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_sessions (
                    id, profile_id, status, current_step_index, current_step_title, completed_steps_count
                ) VALUES (
                    1, 1, 'active', 0, '建立整体认知', 0
                )
                """
            )
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_session_messages (
                    id, session_id, role, content, metadata_json
                ) VALUES
                    (1, 1, 'user', '这是一个旧版问题', :user_metadata),
                    (2, 1, 'assistant', '这是一个旧版回答', :assistant_metadata)
                """
            ),
            {
                "user_metadata": json.dumps({"stepIndex": 0}, ensure_ascii=False),
                "assistant_metadata": json.dumps({"stepIndex": 0}, ensure_ascii=False),
            },
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_step_completions (
                    id, session_id, step_index, confidence, reasoning, message_id
                ) VALUES (
                    1, 1, 0, 0.8, '已基本掌握', 2
                )
                """
            )
        )
        session.execute(
            text(
                """
                INSERT INTO tutor_generation_jobs (
                    id, profile_id, job_type, status, attempt_count, payload_json
                ) VALUES (
                    1, 1, 'plan_generate', 'completed', 1, :payload_json
                )
                """
            ),
            {"payload_json": json.dumps({"legacy": True}, ensure_ascii=False)},
        )
        session.commit()

        from scripts.migrate_tutor_to_learning_v2 import migrate_legacy_tutor_records

        result = migrate_legacy_tutor_records(session)
        session.commit()
        assert result["profiles"] == 1
        assert result["sessions"] == 1
        assert result["fragments"] == 1
        assert result["checkpoints"] == 1

        rows = session.execute(text("SELECT COUNT(*) FROM learning_profiles")).scalar_one()
        assert rows == 1
        turn_rows = session.execute(text("SELECT COUNT(*) FROM learning_turns")).scalar_one()
        assert turn_rows == 1
        fragment_rows = session.execute(text("SELECT COUNT(*) FROM learning_fragments")).scalar_one()
        assert fragment_rows == 1
    finally:
        session.close()
