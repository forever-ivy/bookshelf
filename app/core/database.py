from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.base import Base, import_model_modules

DEFAULT_CABINET_NAME = "主书柜"

_engine: Engine | None = None
_session_factory: sessionmaker[Session] | None = None


def init_engine(settings: Settings | None = None) -> None:
    global _engine, _session_factory
    if _engine is not None and _session_factory is not None:
        return

    active_settings = settings or get_settings()
    connect_args = {"check_same_thread": False} if active_settings.database_url.startswith("sqlite") else {}
    _engine = create_engine(active_settings.database_url, future=True, connect_args=connect_args)
    _session_factory = sessionmaker(bind=_engine, autoflush=False, autocommit=False, expire_on_commit=False)


def reset_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _session_factory = None


def get_engine() -> Engine:
    if _engine is None:
        init_engine()
    assert _engine is not None
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    if _session_factory is None:
        init_engine()
    assert _session_factory is not None
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def _seed_default_cabinet() -> None:
    with get_engine().begin() as connection:
        settings = get_settings()
        connection.execute(
            text(
                """
                INSERT INTO cabinets (id, name, status)
                VALUES (:cabinet_id, :name, :status)
                ON CONFLICT (id) DO NOTHING
                """
            ),
            {
                "cabinet_id": settings.cabinet_id,
                "name": DEFAULT_CABINET_NAME,
                "status": "active",
            },
        )


def init_schema() -> None:
    import_model_modules()
    engine = get_engine()
    with engine.begin() as connection:
        if engine.url.get_backend_name() == "postgresql":
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=engine)
    _seed_default_cabinet()


def rebuild_schema() -> None:
    import_model_modules()
    engine = get_engine()
    with engine.begin() as connection:
        if engine.url.get_backend_name() == "postgresql":
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _seed_default_cabinet()
