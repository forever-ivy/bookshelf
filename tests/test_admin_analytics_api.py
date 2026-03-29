from __future__ import annotations

from datetime import timedelta

from sqlalchemy import func, select

from app.core.database import get_session_factory
from app.demo_seed import seed_demo_data
from app.orders.models import BorrowOrder


def seed_and_login_admin(client) -> dict[str, str]:
    with get_session_factory()() as session:
        seed_demo_data(session)

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123", "role": "admin"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_admin_analytics_endpoints_return_aggregated_metrics(client):
    headers = seed_and_login_admin(client)

    borrow_trends = client.get("/api/v1/admin/analytics/borrow-trends", headers=headers, params={"days": 7})
    college_preferences = client.get("/api/v1/admin/analytics/college-preferences", headers=headers)
    time_peaks = client.get("/api/v1/admin/analytics/time-peaks", headers=headers)
    popular_books = client.get("/api/v1/admin/analytics/popular-books", headers=headers)
    cabinet_turnover = client.get("/api/v1/admin/analytics/cabinet-turnover", headers=headers)
    robot_efficiency = client.get("/api/v1/admin/analytics/robot-efficiency", headers=headers)
    retention = client.get("/api/v1/admin/analytics/retention", headers=headers)

    assert borrow_trends.status_code == 200
    assert college_preferences.status_code == 200
    assert time_peaks.status_code == 200
    assert popular_books.status_code == 200
    assert cabinet_turnover.status_code == 200
    assert robot_efficiency.status_code == 200
    assert retention.status_code == 200

    trends_payload = borrow_trends.json()
    assert trends_payload["summary"]["days"] == 7
    assert trends_payload["summary"]["total_orders"] == sum(item["count"] for item in trends_payload["items"])
    assert len(trends_payload["items"]) >= 1

    college_payload = college_preferences.json()
    assert any(item["college"] == "信息学院" for item in college_payload["items"])

    peak_payload = time_peaks.json()
    assert len(peak_payload["items"]) >= 1
    assert "peak_hour" in peak_payload["summary"]

    popular_payload = popular_books.json()
    assert len(popular_payload["items"]) >= 1
    assert "prediction_score" in popular_payload["items"][0]

    cabinet_payload = cabinet_turnover.json()
    assert any(item["cabinet_id"] == "cabinet-001" for item in cabinet_payload["items"])

    robot_payload = robot_efficiency.json()
    assert len(robot_payload["items"]) == 3
    assert "completion_rate" in robot_payload["items"][0]

    retention_payload = retention.json()
    assert retention_payload["summary"]["active_readers_7d"] == 12
    assert retention_payload["summary"]["retained_readers_7d"] >= 1


def test_admin_analytics_endpoints_support_anchor_date(client):
    headers = seed_and_login_admin(client)

    with get_session_factory()() as session:
        latest_created_at = session.scalar(select(func.max(BorrowOrder.created_at)))

    assert latest_created_at is not None
    anchor_date = (latest_created_at.date() - timedelta(days=2)).isoformat()

    borrow_trends = client.get(
        "/api/v1/admin/analytics/borrow-trends",
        headers=headers,
        params={"days": 7, "anchor_date": anchor_date},
    )
    college_preferences = client.get(
        "/api/v1/admin/analytics/college-preferences",
        headers=headers,
        params={"days": 7, "anchor_date": anchor_date},
    )
    time_peaks = client.get(
        "/api/v1/admin/analytics/time-peaks",
        headers=headers,
        params={"days": 7, "anchor_date": anchor_date},
    )
    popular_books = client.get(
        "/api/v1/admin/analytics/popular-books",
        headers=headers,
        params={"limit": 5, "days": 7, "anchor_date": anchor_date},
    )
    cabinet_turnover = client.get(
        "/api/v1/admin/analytics/cabinet-turnover",
        headers=headers,
        params={"days": 7, "anchor_date": anchor_date},
    )
    robot_efficiency = client.get(
        "/api/v1/admin/analytics/robot-efficiency",
        headers=headers,
        params={"anchor_date": anchor_date},
    )
    retention = client.get(
        "/api/v1/admin/analytics/retention",
        headers=headers,
        params={"anchor_date": anchor_date},
    )

    assert borrow_trends.status_code == 200
    assert college_preferences.status_code == 200
    assert time_peaks.status_code == 200
    assert popular_books.status_code == 200
    assert cabinet_turnover.status_code == 200
    assert robot_efficiency.status_code == 200
    assert retention.status_code == 200

    assert borrow_trends.json()["summary"]["anchor_date"] == anchor_date
    assert college_preferences.json()["summary"]["anchor_date"] == anchor_date
    assert time_peaks.json()["summary"]["anchor_date"] == anchor_date
    assert popular_books.json()["summary"]["anchor_date"] == anchor_date
    assert cabinet_turnover.json()["summary"]["anchor_date"] == anchor_date
    assert robot_efficiency.json()["summary"]["anchor_date"] == anchor_date
    assert retention.json()["summary"]["anchor_date"] == anchor_date


def test_admin_analytics_endpoints_require_admin_role(client):
    with get_session_factory()() as session:
        seed_demo_data(session)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "reader.ai", "password": "reader123", "role": "reader"},
    )
    assert login_response.status_code == 200
    headers = {"Authorization": f"Bearer {login_response.json()['access_token']}"}

    response = client.get("/api/v1/admin/analytics/borrow-trends", headers=headers)
    assert response.status_code == 403
