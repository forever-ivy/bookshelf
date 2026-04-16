from __future__ import annotations

from celery import Celery

from app.core.config import Settings, get_settings
from app.core.database import get_session_factory, init_engine, reset_engine
from app.learning.service import LearningService


def _build_celery_app(settings: Settings) -> Celery:
    celery_app = Celery(
        "library-learning",
        broker=settings.redis_url,
        backend=settings.redis_url,
    )
    celery_app.conf.task_default_queue = "learning"
    celery_app.conf.task_always_eager = bool(settings.learning_tasks_eager)
    celery_app.conf.task_eager_propagates = True
    return celery_app


celery_app = _build_celery_app(get_settings())


@celery_app.task(name="learning.generate_profile")
def generate_learning_profile_task(profile_id: int, reader_id: int) -> dict:
    settings = get_settings()
    reset_engine()
    init_engine(settings)
    session = get_session_factory()()
    try:
        service = LearningService(settings=settings)
        result = service.run_generation_pipeline(session, reader_id=reader_id, profile_id=profile_id)
        session.commit()
        return {
            "profileId": result["profile"].id,
            "activePathVersionId": result["active_path_version"].id,
            "status": result["profile"].status,
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
