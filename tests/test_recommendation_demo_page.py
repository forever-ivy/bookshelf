from __future__ import annotations


def test_recommendation_demo_page_is_removed(client):
    response = client.get("/demo/recommendation")

    assert response.status_code == 404


def test_recommendation_demo_reader_and_session_routes_are_removed(client):
    readers_response = client.get("/api/v1/recommendation/demo/readers")
    assert readers_response.status_code == 404

    session_response = client.post("/api/v1/recommendation/demo/session", json={"profile_id": 1})
    assert session_response.status_code == 404
