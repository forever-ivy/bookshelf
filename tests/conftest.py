from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.database import init_engine, init_schema, reset_engine


@pytest.fixture
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    get_settings.cache_clear()
    reset_engine()
    from app.main import create_app

    settings = Settings()
    init_engine(settings)
    init_schema()
    return create_app()


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
