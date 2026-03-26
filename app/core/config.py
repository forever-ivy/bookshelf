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
    llm_provider: str = "null"
    llm_model: str = "gpt-4.1-mini"
    llm_api_key: str = ""
    llm_base_url: str | None = None
    embedding_provider: str = "hash"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""
    embedding_base_url: str | None = None
    embedding_dimensions: int = 1536
    embedding_batch_size: int = 20
    recommendation_ml_enabled: bool = True
    recommendation_ml_model_path: str = "artifacts/recommendation_mf_model.json"
    cors_allow_origins: str = (
        "http://127.0.0.1:5173,"
        "http://localhost:5173,"
        "http://127.0.0.1:4173,"
        "http://localhost:4173"
    )
    cors_allow_origin_regex: str = (
        r"^https?://(?:(?:localhost)|(?:127(?:\.\d{1,3}){3})|(?:0\.0\.0\.0)|(?:\[::1\])|"
        r"(?:10(?:\.\d{1,3}){3})|(?:192\.168(?:\.\d{1,3}){2})|"
        r"(?:172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})|(?:[A-Za-z0-9-]+\.local))(?::\d+)?$"
    )

    model_config = SettingsConfigDict(
        env_prefix="LIBRARY_",
        extra="ignore",
    )

    def get_cors_allow_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    def get_cors_allow_origin_regex(self) -> str | None:
        regex = self.cors_allow_origin_regex.strip()
        return regex or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
