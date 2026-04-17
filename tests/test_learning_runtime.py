from __future__ import annotations

import redis

from app.core.config import Settings
from app.learning.runtime import LearningRuntimeProbe


class _OkRedisClient:
    def ping(self) -> bool:
        return True


class _FailRedisClient:
    def ping(self) -> bool:
        raise redis.exceptions.ConnectionError("redis unavailable")


class _OkInspect:
    def ping(self):
        return {"learning@worker": {"ok": "pong"}}


class _FailInspect:
    def ping(self):
        return None


class _OkHttpResponse:
    status_code = 404


class _OkHttpClient:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url: str):
        return _OkHttpResponse()


class _FailHttpClient:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def get(self, url: str):
        raise RuntimeError(f"cannot reach {url}")


def test_learning_runtime_probe_reports_all_dependencies_ok(monkeypatch):
    settings = Settings(
        _env_file=None,
        learning_tasks_eager=False,
        learning_orchestrator_url="http://learning-orchestrator:8010",
        redis_url="redis://redis:6379/0",
    )
    monkeypatch.setattr("app.learning.runtime.redis.Redis.from_url", lambda *args, **kwargs: _OkRedisClient())
    monkeypatch.setattr("app.learning.runtime.celery_app.control.inspect", lambda *args, **kwargs: _OkInspect())
    monkeypatch.setattr("app.learning.runtime.httpx.Client", lambda *args, **kwargs: _OkHttpClient())

    snapshot = LearningRuntimeProbe(settings).snapshot()

    assert snapshot.mode == "async"
    assert snapshot.queue == "ok"
    assert snapshot.worker == "ok"
    assert snapshot.orchestrator == "ok"


def test_learning_runtime_probe_marks_unavailable_dependencies(monkeypatch):
    settings = Settings(
        _env_file=None,
        learning_tasks_eager=False,
        learning_orchestrator_url="http://learning-orchestrator:8010",
        redis_url="redis://redis:6379/0",
    )
    monkeypatch.setattr("app.learning.runtime.redis.Redis.from_url", lambda *args, **kwargs: _FailRedisClient())
    monkeypatch.setattr("app.learning.runtime.celery_app.control.inspect", lambda *args, **kwargs: _FailInspect())
    monkeypatch.setattr("app.learning.runtime.httpx.Client", lambda *args, **kwargs: _FailHttpClient())

    snapshot = LearningRuntimeProbe(settings).snapshot()

    assert snapshot.mode == "async"
    assert snapshot.queue == "unavailable"
    assert snapshot.worker == "unavailable"
    assert snapshot.orchestrator == "unavailable"
