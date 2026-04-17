from __future__ import annotations

from dataclasses import asdict, dataclass

from celery import Celery
import httpx
import redis

from app.core.config import Settings, get_settings
from app.core.errors import ApiError


_RUNTIME_TIMEOUT_SECONDS = 0.5


@dataclass
class LearningRuntimeStatus:
    mode: str
    queue: str
    worker: str
    orchestrator: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


class _RuntimeCeleryControl:
    def inspect(self, **kwargs):
        settings = get_settings()
        runtime_app = Celery(
            "library-learning-runtime",
            broker=settings.redis_url,
            backend=settings.redis_url,
        )
        return runtime_app.control.inspect(**kwargs)


class _RuntimeCeleryApp:
    control = _RuntimeCeleryControl()


celery_app = _RuntimeCeleryApp()


class LearningRuntimeProbe:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def snapshot(self) -> LearningRuntimeStatus:
        return LearningRuntimeStatus(
            mode="eager" if self.settings.learning_tasks_eager else "async",
            queue=self._probe_queue(),
            worker=self._probe_worker(),
            orchestrator=self._probe_orchestrator(),
        )

    def assert_generation_runtime_available(self) -> None:
        if self.settings.learning_tasks_eager:
            return

        snapshot = self.snapshot()
        unavailable_components: list[str] = []
        if snapshot.queue != "ok":
            unavailable_components.append("redis queue unavailable")
        if snapshot.worker != "ok":
            unavailable_components.append("celery worker unavailable")
        if snapshot.orchestrator == "unavailable":
            unavailable_components.append("learning orchestrator unavailable")
        if unavailable_components:
            raise ApiError(
                503,
                "learning_runtime_unavailable",
                f"Learning runtime is unavailable: {'; '.join(unavailable_components)}",
            )

    def _probe_queue(self) -> str:
        try:
            client = redis.Redis.from_url(
                self.settings.redis_url,
                socket_connect_timeout=_RUNTIME_TIMEOUT_SECONDS,
                socket_timeout=_RUNTIME_TIMEOUT_SECONDS,
            )
            return "ok" if client.ping() else "unavailable"
        except Exception:
            return "unavailable"

    def _probe_worker(self) -> str:
        try:
            inspector = celery_app.control.inspect(timeout=_RUNTIME_TIMEOUT_SECONDS)
            ping = None if inspector is None else inspector.ping()
            return "ok" if ping else "unavailable"
        except Exception:
            return "unavailable"

    def _probe_orchestrator(self) -> str:
        base_url = (self.settings.learning_orchestrator_url or "").strip()
        if not base_url:
            return "not_configured"

        try:
            with httpx.Client(timeout=_RUNTIME_TIMEOUT_SECONDS, follow_redirects=True) as client:
                response = client.get(f"{base_url.rstrip('/')}/openapi.json")
            return "ok" if response.status_code < 500 else "unavailable"
        except Exception:
            return "unavailable"
