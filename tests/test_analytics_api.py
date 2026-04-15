from __future__ import annotations

from app.core.database import get_engine
from app.core.security import AuthIdentity, create_token, hash_password


def auth_headers(role: str, account_id: int, profile_id: int | None = None) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role=role, profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_analytics_state() -> dict[str, int]:
    engine = get_engine()
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "INSERT INTO admin_accounts (username, password_hash) VALUES (?, ?)",
            ("analytics-admin", hash_password("admin-pass")),
        )
        conn.exec_driver_sql(
            "INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)",
            ("analytics-reader-1", hash_password("reader-pass")),
        )
        conn.exec_driver_sql(
            "INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)",
            ("analytics-reader-2", hash_password("reader-pass")),
        )
        conn.exec_driver_sql(
            "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
            (1, "Alice", "student", "CS", "AI", "2026"),
        )
        conn.exec_driver_sql(
            "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
            (2, "Bob", "student", "Math", "Stats", "2026"),
        )
        conn.exec_driver_sql(
            "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
            ("Statistics", "Author A", "C8", "stats", "summary"),
        )
        conn.exec_driver_sql(
            "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
            ("Nature", "Author B", "N49", "nature", "summary"),
        )
        conn.exec_driver_sql(
            "INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)",
            (1, 1, None, "cabinet_pickup", "completed"),
        )
        conn.exec_driver_sql(
            "INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)",
            (1, 2, None, "cabinet_pickup", "completed"),
        )
        conn.exec_driver_sql(
            "INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)",
            (2, 2, None, "cabinet_pickup", "completed"),
        )
        conn.exec_driver_sql(
            "INSERT INTO search_logs (reader_id, query_text, query_mode) VALUES (?, ?, ?)",
            (1, "统计学 入门", "keyword"),
        )
        conn.exec_driver_sql(
            "INSERT INTO search_logs (reader_id, query_text, query_mode) VALUES (?, ?, ?)",
            (1, "统计学 入门", "keyword"),
        )
        conn.exec_driver_sql(
            "INSERT INTO search_logs (reader_id, query_text, query_mode) VALUES (?, ?, ?)",
            (2, "自然 科普", "natural_language"),
        )
        conn.exec_driver_sql(
            "INSERT INTO reading_events (reader_id, event_type, metadata_json) VALUES (?, ?, ?)",
            (1, "conversation_message", '{"session_id": 1}'),
        )
        conn.exec_driver_sql(
            "INSERT INTO recommendation_logs (reader_id, book_id, query_text, result_title, rank_position, score, provider_note, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (1, 1, "统计学 入门", "应用统计", 1, 0.9, "hybrid", "推荐原因"),
        )
        conn.exec_driver_sql(
            "INSERT INTO recommendation_logs (reader_id, book_id, query_text, result_title, rank_position, score, provider_note, explanation) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (2, 2, "自然 科普", "大自然的故事", 1, 0.8, "personalized", "推荐原因"),
        )
        conn.exec_driver_sql(
            "INSERT INTO conversation_sessions (reader_id, status) VALUES (?, ?)",
            (1, "active"),
        )

    return {
        "admin_id": 1,
        "reader_account_id": 1,
        "reader_profile_id": 1,
    }


def test_admin_can_get_analytics_overview_and_trends(client):
    state = seed_analytics_state()
    headers = auth_headers("admin", state["admin_id"])

    overview_response = client.get("/api/v1/analytics/overview", headers=headers)
    assert overview_response.status_code == 200
    overview = overview_response.json()["overview"]
    assert overview["totals"]["search_count"] == 3
    assert overview["totals"]["recommendation_count"] == 2
    assert overview["totals"]["conversation_session_count"] == 1
    assert overview["active_reader_count"] == 2

    trends_response = client.get("/api/v1/analytics/trends?limit=5", headers=headers)
    assert trends_response.status_code == 200
    trends = trends_response.json()["trends"]
    assert trends["top_queries"][0]["query_text"] == "统计学 入门"
    assert trends["top_queries"][0]["count"] == 2
    assert trends["query_modes"][0]["query_mode"] == "keyword"
    assert trends["recommendation_providers"][0]["provider_note"] in {"hybrid", "personalized"}
    assert trends["most_active_readers"][0]["reader_id"] == 1


def test_reader_cannot_access_analytics_endpoints(client):
    state = seed_analytics_state()
    headers = auth_headers("reader", state["reader_account_id"], state["reader_profile_id"])

    response = client.get("/api/v1/analytics/overview", headers=headers)

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "admin_required"
