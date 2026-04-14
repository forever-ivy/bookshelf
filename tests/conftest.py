from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.database import init_engine, init_schema, reset_engine


@pytest.fixture(autouse=True)
def isolate_tests_from_repo_env(monkeypatch):
    monkeypatch.setenv("LIBRARY_IGNORE_ENV_FILE", "true")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def app(tmp_path, monkeypatch):
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_ENABLED", "false")
    monkeypatch.setenv("LIBRARY_TUTOR_STORAGE_DIR", str(tmp_path / "tutor-storage"))
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
