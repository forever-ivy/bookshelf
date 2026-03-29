from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.schema import CreateColumn, CreateIndex

from app.core.config import Settings, get_settings
from app.db.base import Base, import_model_modules

DEFAULT_CABINET_NAME = "主书柜"
LEGACY_INDEX_DROPS: dict[str, set[str]] = {
    "books": {"ix_books_classification_code"},
}
LEGACY_COLUMN_DROPS: dict[str, set[str]] = {
    "books": {"classification_code"},
}

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
    get_settings.cache_clear()


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


def _ensure_metadata_columns_exist() -> None:
    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    preparer = engine.dialect.identifier_preparer

    with engine.begin() as connection:
        connection_inspector = inspect(connection)
        for table in Base.metadata.sorted_tables:
            if table.name not in existing_tables:
                continue

            existing_columns = {column["name"] for column in connection_inspector.get_columns(table.name)}
            existing_indexes = {index["name"] for index in connection_inspector.get_indexes(table.name)}
            table_name = preparer.quote(table.name)

            for index_name in LEGACY_INDEX_DROPS.get(table.name, set()):
                if index_name not in existing_indexes:
                    continue
                connection.exec_driver_sql(f"DROP INDEX IF EXISTS {preparer.quote(index_name)}")
                existing_indexes.remove(index_name)

            for column_name in LEGACY_COLUMN_DROPS.get(table.name, set()):
                if column_name not in existing_columns:
                    continue
                connection.exec_driver_sql(
                    f"ALTER TABLE {table_name} DROP COLUMN {preparer.quote(column_name)}"
                )
                existing_columns.remove(column_name)

            for column in table.columns:
                if column.name in existing_columns:
                    continue
                if column.primary_key:
                    continue
                if not column.nullable and column.server_default is None:
                    continue

                compiled = str(CreateColumn(column).compile(dialect=engine.dialect)).strip().rstrip(",")
                connection.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {compiled}")

            for index in table.indexes:
                if not index.name or index.name in existing_indexes:
                    continue
                statement = str(CreateIndex(index).compile(dialect=engine.dialect))
                statement = statement.replace("CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ", 1)
                connection.exec_driver_sql(statement)


def init_schema() -> None:
    import_model_modules()
    engine = get_engine()
    with engine.begin() as connection:
        if engine.url.get_backend_name() == "postgresql":
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.create_all(bind=engine)
    _ensure_metadata_columns_exist()
    _seed_default_cabinet()
    from app.catalog.taxonomy import backfill_book_taxonomy, books_need_taxonomy_backfill

    session = get_session_factory()()
    try:
        if books_need_taxonomy_backfill(session):
            backfill_book_taxonomy(session)
            session.commit()
    finally:
        session.close()


def rebuild_schema() -> None:
    import_model_modules()
    engine = get_engine()
    with engine.begin() as connection:
        if engine.url.get_backend_name() == "postgresql":
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    _seed_default_cabinet()
