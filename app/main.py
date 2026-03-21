from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import init_engine, init_schema
from app.core.errors import register_exception_handlers
from app.core.module_catalog import MODULE_TAGS


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
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        openapi_tags=MODULE_TAGS,
    )
    register_exception_handlers(app)
    app.include_router(api_router)

    return app


app = create_app()
