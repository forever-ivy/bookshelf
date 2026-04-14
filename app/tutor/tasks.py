from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.core.database import get_session_factory
from app.tutor.generation import run_generation_pipeline

logger = logging.getLogger(__name__)

try:
    from celery import Celery  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    Celery = None  # type: ignore[assignment]


def _build_celery_app() -> Any | None:
    if Celery is None:
        return None
    settings = get_settings()
    app = Celery("library-service-v2", broker=settings.redis_url, backend=settings.redis_url)
    app.conf.task_serializer = "json"
    app.conf.result_serializer = "json"
    app.conf.accept_content = ["json"]
    app.conf.task_publish_retry = False
    app.conf.broker_connection_retry_on_startup = False
    app.conf.broker_transport_options = {
        "socket_connect_timeout": 0.2,
        "socket_timeout": 0.2,
        "retry_on_timeout": False,
    }
    return app


celery_app = _build_celery_app()


def run_profile_generation_job(profile_id: int) -> None:
    session = get_session_factory()()
    try:
        run_generation_pipeline(session, profile_id=profile_id)
        session.commit()
    except Exception:
        session.commit()
        raise
    finally:
        session.close()


if celery_app is not None:

    @celery_app.task(name="tutor.run_profile_generation_job")
    def run_profile_generation_job_task(profile_id: int) -> None:
        run_profile_generation_job(profile_id)


def enqueue_profile_generation_job(profile_id: int) -> None:
    settings = get_settings()
    if settings.tutor_tasks_eager:
        run_profile_generation_job(profile_id)
        return
    if celery_app is None:
        logger.warning("Celery is not installed; tutor profile %s remains queued until a worker runs it", profile_id)
        return
    try:
        celery_app.send_task("tutor.run_profile_generation_job", args=[profile_id])
    except Exception:
        logger.warning(
            "Could not enqueue tutor profile %s to Celery; it remains queued until a worker retries it",
            profile_id,
            exc_info=True,
        )
