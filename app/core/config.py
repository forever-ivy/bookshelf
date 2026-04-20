from __future__ import annotations

from functools import lru_cache
import os

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
    llm_timeout_seconds: float = 30.0
    embedding_provider: str = "hash"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: str = ""
    embedding_base_url: str | None = None
    embedding_dimensions: int = 1536
    embedding_batch_size: int = 20
    book_source_storage_dir: str = "artifacts/book-sources"
    learning_storage_dir: str = "artifacts/learning"
    learning_tasks_eager: bool = False
    learning_upload_ttl_seconds: int = 60 * 60 * 24
    learning_chunk_size: int = 700
    learning_chunk_overlap: int = 120
    learning_retrieval_top_k: int = 6
    learning_orchestrator_url: str | None = None
    learning_ai_agent_url: str | None = None
    learning_ai_callback_base_url: str | None = None
    learning_ai_agent_timeout_seconds: float = 180.0
    graph_provider: str = "disabled"
    graph_uri: str | None = None
    graph_username: str | None = None
    graph_password: str | None = None
    graph_database: str | None = None
    mineru_base_url: str | None = None
    mineru_local_base_url: str | None = None
    mineru_cloud_base_url: str | None = None
    mineru_api_token: str = ""
    mineru_model_version: str = "vlm"
    mineru_language: str | None = None
    mineru_enable_formula: bool = True
    mineru_enable_table: bool = True
    mineru_ocr: bool = False
    mineru_poll_interval_seconds: float = 1.0
    mineru_max_wait_seconds: float = 120.0
    mineru_timeout_seconds: float = 60.0
    object_store_provider: str = "filesystem"
    object_store_bucket: str = "library-learning"
    object_store_endpoint: str | None = None
    object_store_access_key: str | None = None
    object_store_secret_key: str | None = None
    object_store_region: str | None = None
    object_store_secure: bool = False
    web_fetch_timeout_seconds: float = 10.0
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
        env_file=(".env.local", ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    def get_cors_allow_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]

    def get_cors_allow_origin_regex(self) -> str | None:
        regex = self.cors_allow_origin_regex.strip()
        return regex or None


@lru_cache
def get_settings() -> Settings:
    if os.getenv("LIBRARY_IGNORE_ENV_FILE", "").strip().lower() in {"1", "true", "yes", "on"}:
        return Settings(_env_file=None)
    return Settings()
