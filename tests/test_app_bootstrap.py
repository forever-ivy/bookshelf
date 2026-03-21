from __future__ import annotations

from pathlib import Path


def test_healthcheck_reports_database_and_modules(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database"] == "ok"
    assert "auth" in response.json()["modules"]
    assert "robot_sim" in response.json()["modules"]


def test_openapi_contains_expected_module_tags(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    tags = {tag["name"] for tag in response.json()["tags"]}
    assert {"auth", "catalog", "orders", "robot_sim", "recommendation", "conversation", "admin"} <= tags


def test_inventory_routes_do_not_require_legacy_sqlite_artifact(client):
    legacy_db = Path(__file__).resolve().parents[2] / "data" / "bookshelf.db"

    assert legacy_db.exists() is False

    response = client.get("/api/v1/inventory/status")

    assert response.status_code == 200
