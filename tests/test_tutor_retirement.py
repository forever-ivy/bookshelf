from __future__ import annotations

from sqlalchemy import text

from app.core.database import get_session_factory


def test_legacy_tutor_routes_are_unavailable(client):
    response = client.get("/api/v1/tutor/profiles")
    assert response.status_code == 404


def test_schema_no_longer_creates_tutor_tables(app):
    session = get_session_factory()()
    try:
        table_names = session.execute(
            text("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'tutor_%' ORDER BY name")
        ).scalars().all()
    finally:
        session.close()

    assert table_names == []
