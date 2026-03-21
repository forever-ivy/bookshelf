from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Library Service V2"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://library:library@localhost:55432/service"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "library-service-dev-secret-2026-change-me"
    jwt_algorithm: str = "HS256"
    access_token_ttl_minutes: int = 30
    refresh_token_ttl_minutes: int = 60 * 24 * 14
    cabinet_id: str = "cabinet-001"
    auto_create_schema: bool = True
    llm_provider: str = "openai-compatible"
    llm_model: str = "gpt-4.1-mini"
    llm_api_key: str = ""
    llm_base_url: str | None = None

    model_config = SettingsConfigDict(
        env_prefix="LIBRARY_",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
