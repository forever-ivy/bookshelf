from __future__ import annotations

from app.core.database import get_engine


def test_recommendation_demo_page_returns_html(client):
    response = client.get("/demo/recommendation")

    assert response.status_code == 200
    assert "智能书柜推荐系统演示" in response.text
    assert "/api/v1/recommendation/me/dashboard" in response.text

def test_demo_session_returns_access_token_for_reader(client):
    engine = get_engine()
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)",
            ("demo_cf_reader_test", "hash"),
        )
        conn.exec_driver_sql(
            "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
            (1, "演示读者测试", "student", "Demo", "Reco", "2026"),
        )

    readers_response = client.get("/api/v1/recommendation/demo/readers")
    assert readers_response.status_code == 200
    assert readers_response.json()["items"][0]["profile_id"] == 1

    session_response = client.post("/api/v1/recommendation/demo/session", json={"profile_id": 1})
    assert session_response.status_code == 200
    payload = session_response.json()
    assert payload["token_type"] == "bearer"
    assert payload["reader"]["profile_id"] == 1
    assert payload["access_token"]
