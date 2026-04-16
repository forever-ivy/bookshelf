from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.core.config import get_settings
from app.core.database import init_engine, init_schema
from app.core.errors import register_exception_handlers
from app.learning.orchestrator_router import router as orchestrator_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    init_engine(settings)
    if settings.auto_create_schema:
        init_schema()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=f"{settings.app_name} Orchestrator",
        version=settings.app_version,
        lifespan=lifespan,
    )
    register_exception_handlers(app)
    app.include_router(orchestrator_router)
    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8010)


if __name__ == "__main__":
    main()
