from __future__ import annotations

import json
from io import BytesIO

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
        owner_account = ReaderAccount(username="tutor-owner", password_hash=hash_password("owner-pass"))
        owner_profile = ReaderProfile(account_id=1, display_name="Owner")
        peer_account = ReaderAccount(username="tutor-peer", password_hash=hash_password("peer-pass"))
        session.add_all([owner_account, peer_account])
        session.flush()

        owner_profile.account_id = owner_account.id
        peer_profile = ReaderProfile(account_id=peer_account.id, display_name="Peer")
        session.add_all([owner_profile, peer_profile])
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
            "peer_account_id": peer_account.id,
            "peer_profile_id": peer_profile.id,
            "book_id": book.id,
        }
    finally:
        session.close()


def run_profile_job(profile_id: int) -> None:
    from app.tutor.tasks import run_profile_generation_job

    run_profile_generation_job(profile_id)


def parse_sse_lines(lines: list[str]) -> list[dict]:
    events: list[dict] = []
    for raw_line in lines:
        line = raw_line.strip()
        if not line or not line.startswith("data: "):
            continue
        events.append(json.loads(line[6:]))
    return events


def test_create_book_profile_queues_generation_job(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    response = client.post(
        "/api/v1/tutor/profiles",
        headers=headers,
        json={
            "sourceType": "book",
            "bookId": state["book_id"],
            "title": "操作系统实验导学本",
            "teachingGoal": "帮助我完成操作系统实验预习与复盘。",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["ok"] is True
    assert payload["profile"]["status"] == "queued"
    assert payload["profile"]["sourceType"] == "book"
    assert payload["profile"]["bookId"] == state["book_id"]
    assert payload["job"]["status"] == "queued"


def test_upload_profile_can_be_ingested_into_ready_profile(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    response = client.post(
        "/api/v1/tutor/profiles/upload",
        headers=headers,
        data={
            "title": "分布式系统导学本",
            "teachingGoal": "帮助我理解复制、一致性和容错。",
        },
        files={
            "file": (
                "distributed-systems.md",
                BytesIO(
                    "# 分布式系统\n\n复制用于提高可用性，一致性协议用于协调副本状态，故障恢复强调冗余和切换。".encode(
                        "utf-8"
                    )
                ),
                "text/markdown",
            )
        },
    )

    assert response.status_code == 201
    payload = response.json()
    profile_id = payload["profile"]["id"]
    assert payload["profile"]["status"] == "queued"

    run_profile_job(profile_id)

    detail_response = client.get(f"/api/v1/tutor/profiles/{profile_id}", headers=headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert detail_payload["profile"]["sourceType"] == "upload"
    assert detail_payload["profile"]["persona"]["topicName"]
    assert detail_payload["profile"]["curriculum"]["steps"]
    assert detail_payload["profile"]["sourceSummary"]
    assert detail_payload["sources"][0]["parseStatus"] == "parsed"


def test_ready_profile_can_start_session_and_stream_messages(client):
    state = seed_reader_with_book()
    headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])

    create_response = client.post(
        "/api/v1/tutor/profiles",
        headers=headers,
        json={
            "sourceType": "book",
            "bookId": state["book_id"],
            "title": "操作系统实验导学本",
            "teachingGoal": "帮助我完成操作系统实验预习与复盘。",
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    run_profile_job(profile_id)

    start_response = client.post(f"/api/v1/tutor/profiles/{profile_id}/sessions", headers=headers)
    assert start_response.status_code == 201
    start_payload = start_response.json()
    session_id = start_payload["session"]["id"]
    assert start_payload["session"]["status"] == "active"
    assert start_payload["welcomeMessage"]["role"] == "assistant"
    assert start_payload["firstStep"]["title"]

    with client.stream(
        "POST",
        f"/api/v1/tutor/sessions/{session_id}/messages/stream",
        headers=headers,
        json={
            "content": "我理解这本资料主要围绕进程、线程和调度策略，目标是先说明它们各自的作用，再联系实验里的同步问题。"
        },
    ) as response:
        assert response.status_code == 200
        assert response.headers["content-type"].startswith("text/event-stream")
        events = parse_sse_lines(list(response.iter_lines()))

    event_names = [event["event"] for event in events]
    assert event_names[0] == "status"
    assert "assistant.delta" in event_names
    assert "evaluation" in event_names
    assert "session.updated" in event_names
    assert event_names[-1] == "assistant.done"

    evaluation_event = next(event for event in events if event["event"] == "evaluation")
    assert evaluation_event["data"]["confidence"] >= 0
    assert "meetsCriteria" in evaluation_event["data"]

    session_response = client.get(f"/api/v1/tutor/sessions/{session_id}", headers=headers)
    assert session_response.status_code == 200
    session_payload = session_response.json()
    assert session_payload["session"]["lastMessagePreview"]

    messages_response = client.get(f"/api/v1/tutor/sessions/{session_id}/messages", headers=headers)
    assert messages_response.status_code == 200
    assert len(messages_response.json()["items"]) >= 3


def test_tutor_resources_are_reader_scoped(client):
    state = seed_reader_with_book()
    owner_headers = reader_headers(state["owner_account_id"], state["owner_profile_id"])
    peer_headers = reader_headers(state["peer_account_id"], state["peer_profile_id"])

    create_response = client.post(
        "/api/v1/tutor/profiles",
        headers=owner_headers,
        json={
            "sourceType": "book",
            "bookId": state["book_id"],
            "title": "仅自己可见的导学本",
            "teachingGoal": "验证 owner 隔离。",
        },
    )
    profile_id = create_response.json()["profile"]["id"]
    run_profile_job(profile_id)

    owner_list = client.get("/api/v1/tutor/profiles", headers=owner_headers)
    assert owner_list.status_code == 200
    assert owner_list.json()["items"]

    peer_list = client.get("/api/v1/tutor/profiles", headers=peer_headers)
    assert peer_list.status_code == 200
    assert peer_list.json()["items"] == []

    forbidden_detail = client.get(f"/api/v1/tutor/profiles/{profile_id}", headers=peer_headers)
    assert forbidden_detail.status_code == 403

    forbidden_retry = client.post(f"/api/v1/tutor/profiles/{profile_id}/retry", headers=peer_headers)
    assert forbidden_retry.status_code == 403
