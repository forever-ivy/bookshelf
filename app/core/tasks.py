from __future__ import annotations

from dataclasses import dataclass

from app.core.config import get_settings


@dataclass
class TaskQueueConfig:
    redis_url: str
    namespace: str = "library-service-v2"


def get_task_queue_config() -> TaskQueueConfig:
    settings = get_settings()
    return TaskQueueConfig(redis_url=settings.redis_url)
