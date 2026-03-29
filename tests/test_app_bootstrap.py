from __future__ import annotations

from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from app.core.database import init_engine, init_schema, reset_engine


def test_healthcheck_reports_database_and_modules(client):
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["database"] == "ok"
    assert "auth" in response.json()["modules"]
    assert "robot_sim" in response.json()["modules"]


def test_root_page_provides_entry_links(client):
    response = client.get("/")

    assert response.status_code == 200
    assert "/docs" in response.text
    assert "/api/v1/health" in response.text


def test_favicon_endpoint_does_not_404(client):
    response = client.get("/favicon.ico")

    assert response.status_code == 204


def test_openapi_contains_expected_module_tags(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    tags = {tag["name"] for tag in response.json()["tags"]}
    assert {"auth", "catalog", "orders", "robot_sim", "recommendation", "conversation", "admin", "readers"} <= tags


def test_openapi_contains_readers_routes(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert "/api/v1/readers/me/profile" in paths
    assert "/api/v1/readers/me/overview" in paths
    assert "/api/v1/readers/{reader_id}/overview" in paths


def test_openapi_contains_explicit_recommendation_studio_schemas(client):
    response = client.get("/openapi.json")

    assert response.status_code == 200
    paths = response.json()["paths"]
    assert paths["/api/v1/admin/recommendation/studio"]["get"]["responses"]["200"]["content"]["application/json"][
        "schema"
    ] == {"$ref": "#/components/schemas/AdminRecommendationStudioResponse"}
    assert paths["/api/v1/admin/recommendation/studio/draft"]["put"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"] == {"$ref": "#/components/schemas/AdminRecommendationStudioDraftSaveResponse"}
    assert paths["/api/v1/admin/recommendation/studio/publish"]["post"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"] == {"$ref": "#/components/schemas/AdminRecommendationStudioPublishResponse"}
    assert paths["/api/v1/admin/recommendation/studio/publications"]["get"]["responses"]["200"]["content"][
        "application/json"
    ]["schema"] == {"$ref": "#/components/schemas/AdminRecommendationStudioPublicationListResponse"}


def test_inventory_routes_do_not_require_legacy_sqlite_artifact(client):
    legacy_db = Path(__file__).resolve().parents[2] / "data" / "bookshelf.db"

    assert legacy_db.exists() is False

    response = client.get("/api/v1/inventory/status")

    assert response.status_code == 200


def test_cors_preflight_allows_local_admin_login(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://127.0.0.1:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://127.0.0.1:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_cors_preflight_allows_private_network_admin_origin(client):
    response = client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://192.168.31.15:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://192.168.31.15:5173"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_init_schema_adds_missing_reader_profile_columns(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy-reader-profile.db"
    engine = create_engine(f"sqlite+pysqlite:///{db_path}", future=True)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE reader_accounts (id INTEGER PRIMARY KEY, username VARCHAR(64), password_hash VARCHAR(128))"))
        connection.execute(
            text(
                """
                CREATE TABLE reader_profiles (
                    id INTEGER PRIMARY KEY,
                    account_id INTEGER UNIQUE,
                    display_name VARCHAR(128) NOT NULL,
                    affiliation_type VARCHAR(32),
                    college VARCHAR(128),
                    major VARCHAR(128),
                    grade_year VARCHAR(32),
                    created_at DATETIME,
                    updated_at DATETIME
                )
                """
            )
        )
        connection.execute(text("CREATE TABLE cabinets (id VARCHAR(64) PRIMARY KEY, name VARCHAR(128), status VARCHAR(32))"))
    engine.dispose()

    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    reset_engine()

    try:
        init_engine()
        init_schema()
    finally:
        reset_engine()

    inspector = inspect(create_engine(f"sqlite+pysqlite:///{db_path}", future=True))
    columns = {column["name"] for column in inspector.get_columns("reader_profiles")}
    assert {"restriction_status", "restriction_until", "risk_flags", "preference_profile_json", "segment_code"} <= columns


def test_init_schema_drops_legacy_book_classification_column(monkeypatch, tmp_path):
    db_path = tmp_path / "legacy-book-schema.db"
    engine = create_engine(f"sqlite+pysqlite:///{db_path}", future=True)
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE books (
                    id INTEGER PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    classification_code VARCHAR(128),
                    created_at DATETIME,
                    updated_at DATETIME
                )
                """
            )
        )
        connection.execute(text("CREATE INDEX ix_books_classification_code ON books (classification_code)"))
        connection.execute(text("CREATE TABLE cabinets (id VARCHAR(64) PRIMARY KEY, name VARCHAR(128), status VARCHAR(32))"))
    engine.dispose()

    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    reset_engine()

    try:
        init_engine()
        init_schema()
    finally:
        reset_engine()

    inspector = inspect(create_engine(f"sqlite+pysqlite:///{db_path}", future=True))
    columns = {column["name"] for column in inspector.get_columns("books")}
    indexes = {index["name"] for index in inspector.get_indexes("books")}
    assert "classification_code" not in columns
    assert "ix_books_classification_code" not in indexes
