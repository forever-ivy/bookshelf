from __future__ import annotations

import json

from app.context.engine import ContextEngine
from app.core.config import get_settings
from app.core.database import get_engine
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token


def seed_rows(conn, statements):
    for statement, params in statements:
        conn.exec_driver_sql(statement, params)
    conn.commit()


def reader_headers(account_id: int = 1, profile_id: int = 1) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


class FakeRecommendationProvider:
    def rerank(self, query: str, candidates: list):
        return list(reversed(candidates))

    def explain(self, query: str, candidate, context: dict) -> str:
        return "cloud explanation"

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {"title": ocr_texts[0] if ocr_texts else "未知书籍"}


class TimeoutRecommendationProvider:
    def rerank(self, query: str, candidates: list):
        raise TimeoutError("provider rerank timed out")

    def explain(self, query: str, candidate, context: dict) -> str:
        raise TimeoutError("provider explain timed out")

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {"title": ocr_texts[0] if ocr_texts else "未知书籍"}

class FakeConversationProvider:
    def chat(self, *, text: str, context: dict) -> str:
        messages = context.get("conversation_session", {}).get("messages", [])
        return f"Auto reply for '{text}' with {len(messages)} message(s)."


def test_recommendation_search_logs_and_falls_back_without_provider(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader1", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Deep Learning", "Ian", "AI", "neural networks,vision", "book one"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Poetry 101", "Poet", "Literature", "verse,reading", "book two"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("AI Systems", "Engineer", "AI", "agent,planning", "book three"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 1, 0, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (3, "cabinet-001", 1, 1, 0),
                ),
            ],
        )

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "AI 课本"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["results"][0]["title"] in {"AI Systems", "Deep Learning"}
    assert payload["results"][0]["provider_note"] == "fallback"
    assert payload["results"][0]["available_copies"] == 1
    assert payload["results"][0]["deliverable"] is True
    assert payload["results"][0]["eta_minutes"] == 15
    assert payload["results"][0]["evidence"]["retrieval_mode"] in {
        "metadata_query_match",
        "python_query_embedding_fallback",
        "pgvector_query_embedding",
        "vector_fallback",
    }

    with engine.begin() as conn:
        rows = conn.exec_driver_sql("SELECT query_text, query_mode FROM search_logs ORDER BY id").fetchall()
        rec_rows = conn.exec_driver_sql(
            "SELECT result_title, rank_position, provider_note FROM recommendation_logs ORDER BY rank_position ASC"
        ).fetchall()
    assert [(row[0], row[1]) for row in rows] == [("AI 课本", "natural_language")]
    assert len(rec_rows) == 2
    assert rec_rows[0][0] == payload["results"][0]["title"]
    assert rec_rows[0][1] == 1
    assert rec_rows[0][2] == "fallback"


def test_recommendation_route_uses_configured_llm_provider(client, monkeypatch):
    from app.recommendation import router as recommendation_router

    monkeypatch.setattr(recommendation_router, "build_llm_provider", lambda: FakeRecommendationProvider())

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("readerx", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("第一本书", "Author A", "AI", "agent", "book one"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("第二本书", "Author B", "AI", "reasoning", "book two"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 1, 1, 0),
                ),
            ],
        )

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "AI 推荐"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["results"][0]["provider_note"] == "provider"
    assert payload["results"][0]["explanation"] == "cloud explanation"


def test_recommendation_route_falls_back_when_llm_provider_times_out(client, monkeypatch):
    from app.recommendation import router as recommendation_router

    monkeypatch.setattr(recommendation_router, "build_llm_provider", lambda: TimeoutRecommendationProvider())

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-timeout", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("第一本书", "Author A", "AI", "agent", "book one"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("第二本书", "Author B", "AI", "reasoning", "book two"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 1, 1, 0),
                ),
            ],
        )

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "AI 推荐"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["results"][0]["provider_note"] == "fallback"
    assert payload["results"][0]["explanation"]


def test_recommendation_route_returns_controlled_error_when_llm_is_misconfigured(client, monkeypatch):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-misconfig", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Deep Learning", "Ian", "AI", "neural networks", "book"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
            ],
        )

    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "AI 推荐"},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_provider_misconfigured"


def test_conversation_messages_persist_metadata_and_snapshot(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Bob", "student", "EE", "Robotics", "2025"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Robot Tales", "R. Author", "Engineering", "robotics,systems", "book"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 2, 2, 0),
                ),
            ],
        )

    session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    assert session_resp.status_code == 200
    session_id = session_resp.json()["session"]["id"]

    msg_resp = client.post(
        f"/api/v1/conversation/sessions/{session_id}/messages",
        headers=reader_headers(),
        json={
            "role": "user",
            "content": "帮我找机器人相关的书",
            "metadata": {
                "evidence": {"source": "search", "query": "机器人"},
                "order_context": {"borrow_order_id": 9},
                "recommendation_context": {"result_titles": ["Robot Tales"]},
            },
        },
    )
    assert msg_resp.status_code == 200
    msg_payload = msg_resp.json()
    assert msg_payload["message"]["role"] == "user"
    assert json.loads(msg_payload["message"]["metadata_json"])["evidence"]["query"] == "机器人"
    assert json.loads(msg_payload["message"]["metadata_json"])["order_context"]["borrow_order_id"] == 9
    assert msg_payload["snapshot"]["inventory"]["available_titles"] == ["Robot Tales"]

    history_resp = client.get(
        f"/api/v1/conversation/sessions/{session_id}/messages",
        headers=reader_headers(),
    )
    assert history_resp.status_code == 200
    history = history_resp.json()["messages"]
    assert len(history) == 1
    assert history[0]["content"] == "帮我找机器人相关的书"


def test_conversation_reply_creates_assistant_message_and_persists_history(client, monkeypatch):
    from app.conversation import router as conversation_router

    monkeypatch.setattr(conversation_router, "build_llm_provider", lambda: FakeConversationProvider())

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-auto", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Fiona", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Robot Tales", "R. Author", "Engineering", "robotics,systems", "book"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 2, 2, 0),
                ),
            ],
        )

    session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    assert session_resp.status_code == 200
    session_id = session_resp.json()["session"]["id"]

    reply_resp = client.post(
        f"/api/v1/conversation/sessions/{session_id}/reply",
        headers=reader_headers(),
        json={
            "content": "帮我推荐机器人相关的书",
            "metadata": {"source": "demo_page"},
        },
    )
    assert reply_resp.status_code == 200
    payload = reply_resp.json()
    assert payload["reply"] == "Auto reply for '帮我推荐机器人相关的书' with 1 message(s)."
    assert payload["user_message"]["role"] == "user"
    assert payload["assistant_message"]["role"] == "assistant"
    assert json.loads(payload["assistant_message"]["metadata_json"])["source"] == "conversation_auto_reply"
    assert payload["snapshot"]["inventory"]["available_titles"] == ["Robot Tales"]

    history_resp = client.get(
        f"/api/v1/conversation/sessions/{session_id}/messages",
        headers=reader_headers(),
    )
    assert history_resp.status_code == 200
    history = history_resp.json()["messages"]
    assert [item["role"] for item in history] == ["user", "assistant"]
    assert history[0]["content"] == "帮我推荐机器人相关的书"
    assert history[1]["content"] == "Auto reply for '帮我推荐机器人相关的书' with 1 message(s)."


def test_conversation_sessions_list_returns_only_current_reader_sessions(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-sessions", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Helen", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-sessions-2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Irene", "student", "History", "Archive", "2027"),
                ),
            ],
        )

    first_session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    second_session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    assert first_session_resp.status_code == 200
    assert second_session_resp.status_code == 200
    first_session_id = first_session_resp.json()["session"]["id"]
    second_session_id = second_session_resp.json()["session"]["id"]

    message_resp = client.post(
        f"/api/v1/conversation/sessions/{first_session_id}/messages",
        headers=reader_headers(),
        json={
            "role": "user",
            "content": "Need one robotics book",
            "metadata": {"source": "session_list_test"},
        },
    )
    assert message_resp.status_code == 200

    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO conversation_sessions (reader_id, status) VALUES (?, ?)", (2, "active")),
                (
                    "INSERT INTO conversation_messages (session_id, role, content, metadata_json) VALUES (?, ?, ?, ?)",
                    (3, "user", "Other reader session", json.dumps({"source": "other"})),
                ),
            ],
        )

    sessions_resp = client.get("/api/v1/conversation/sessions", headers=reader_headers())
    assert sessions_resp.status_code == 200
    payload = sessions_resp.json()
    assert payload["ok"] is True
    items = payload["items"]
    assert [item["id"] for item in items] == [first_session_id, second_session_id]
    assert [item["reader_id"] for item in items] == [1, 1]
    assert items[0]["message_count"] == 1
    assert items[0]["last_message_preview"] == "Need one robotics book"
    assert items[0]["last_message_at"] is not None
    assert items[1]["message_count"] == 0
    assert items[1]["last_message_preview"] is None


def test_conversation_reply_returns_controlled_error_when_llm_is_misconfigured(client, monkeypatch):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-auto-misconfig", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Grace", "student", "CS", "AI", "2026"),
                ),
            ],
        )

    session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    assert session_resp.status_code == 200
    session_id = session_resp.json()["session"]["id"]

    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()

    reply_resp = client.post(
        f"/api/v1/conversation/sessions/{session_id}/reply",
        headers=reader_headers(),
        json={"content": "推荐一本 AI 书"},
    )
    assert reply_resp.status_code == 503
    assert reply_resp.json()["error"]["code"] == "llm_provider_misconfigured"


def test_recommendation_and_conversation_require_reader_identity(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader4", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Dora", "student", "History", "Archive", "2028"),
                ),
            ],
        )

    unauthenticated_search = client.post("/api/v1/recommendation/search", json={"query": "history"})
    assert unauthenticated_search.status_code == 401

    session_resp = client.post("/api/v1/conversation/sessions", headers=reader_headers())
    assert session_resp.status_code == 200
    session_id = session_resp.json()["session"]["id"]

    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader5", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Eve", "student", "Law", "Policy", "2027"),
                ),
            ],
        )

    forbidden_history = client.get(
        f"/api/v1/conversation/sessions/{session_id}/messages",
        headers=reader_headers(account_id=2, profile_id=2),
    )
    assert forbidden_history.status_code == 403


def test_context_snapshot_includes_reader_search_inventory_order_and_conversation(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader3", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Cara", "student", "Math", "Applied Math", "2024"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Linear Algebra", "A. Author", "Math", "matrix,vector", "book"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)",
                    (1, 1, None, "cabinet_pickup", "delivering"),
                ),
                ("INSERT INTO search_logs (reader_id, query_text, query_mode) VALUES (?, ?, ?)", (1, "matrix", "keyword")),
                ("INSERT INTO conversation_sessions (reader_id, status) VALUES (?, ?)", (1, "active")),
                (
                    "INSERT INTO conversation_messages (session_id, role, content, metadata_json) VALUES (?, ?, ?, ?)",
                    (1, "user", "I need math books", json.dumps({"source": "chat"})),
                ),
            ],
        )

    session_factory = get_session_factory()
    with session_factory() as db:
        snapshot = ContextEngine(db).build_snapshot(reader_id=1, query="matrix")

    assert snapshot.profile["display_name"] == "Cara"
    assert snapshot.search["recent_queries"] == ["matrix"]
    assert snapshot.inventory["available_titles"] == ["Linear Algebra"]
    assert snapshot.orders["active_orders"][0]["status"] == "delivering"
    assert snapshot.orders["borrow_history"][0]["status"] == "delivering"
    assert snapshot.conversation["message_count"] == 1
