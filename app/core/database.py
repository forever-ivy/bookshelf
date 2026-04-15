from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings, get_settings
from app.db.base import Base, import_model_modules

DEFAULT_CABINET_NAME = "主书柜"
BASELINE_REVISION = "20260402_01"

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


def _alembic_config() -> Config:
    project_root = Path(__file__).resolve().parents[2]
    config = Config(str(project_root / "alembic.ini"))
    config.set_main_option("script_location", str(project_root / "alembic"))
    config.set_main_option("sqlalchemy.url", get_settings().database_url)
    return config


def _run_alembic_upgrade() -> None:
    command.upgrade(_alembic_config(), "head")


def _run_alembic_stamp(revision: str) -> None:
    command.stamp(_alembic_config(), revision)


def _has_alembic_version_table(engine: Engine) -> bool:
    with engine.begin() as connection:
        result = connection.exec_driver_sql(
            "SELECT 1 FROM information_schema.tables WHERE table_name = 'alembic_version' LIMIT 1"
        )
        return result.scalar() is not None


def _repair_sqlite_legacy_schema(engine: Engine) -> None:
    with engine.begin() as connection:
        try:
            inspector = inspect(connection)
        except NoInspectionAvailable:
            return

        table_names = set(inspector.get_table_names())

        if "reader_profiles" in table_names:
            reader_columns = {column["name"] for column in inspector.get_columns("reader_profiles")}
            if "restriction_status" not in reader_columns:
                connection.exec_driver_sql("ALTER TABLE reader_profiles ADD COLUMN restriction_status VARCHAR(32)")
            if "restriction_until" not in reader_columns:
                connection.exec_driver_sql("ALTER TABLE reader_profiles ADD COLUMN restriction_until DATETIME")
            if "risk_flags" not in reader_columns:
                connection.exec_driver_sql("ALTER TABLE reader_profiles ADD COLUMN risk_flags JSON")
            if "preference_profile_json" not in reader_columns:
                connection.exec_driver_sql("ALTER TABLE reader_profiles ADD COLUMN preference_profile_json JSON")
            if "segment_code" not in reader_columns:
                connection.exec_driver_sql("ALTER TABLE reader_profiles ADD COLUMN segment_code VARCHAR(64)")

            reader_indexes = {index["name"] for index in inspector.get_indexes("reader_profiles")}
            if "ix_reader_profiles_restriction_status" not in reader_indexes:
                connection.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS ix_reader_profiles_restriction_status ON reader_profiles (restriction_status)"
                )
            if "ix_reader_profiles_segment_code" not in reader_indexes:
                connection.exec_driver_sql(
                    "CREATE INDEX IF NOT EXISTS ix_reader_profiles_segment_code ON reader_profiles (segment_code)"
                )

        if "books" in table_names:
            book_columns = {column["name"] for column in inspector.get_columns("books")}
            if "author" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN author VARCHAR(255)")
            if "category_id" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN category_id INTEGER")
            if "category" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN category VARCHAR(128)")
            if "isbn" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN isbn VARCHAR(32)")
            if "barcode" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN barcode VARCHAR(64)")
            if "cover_url" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN cover_url VARCHAR(512)")
            if "keywords" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN keywords TEXT")
            if "summary" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN summary TEXT")
            if "shelf_status" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN shelf_status VARCHAR(32)")
            if "search_document" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN search_document TEXT")
            if "search_vector" not in book_columns:
                connection.exec_driver_sql("ALTER TABLE books ADD COLUMN search_vector TEXT")
            book_indexes = {index["name"] for index in inspector.get_indexes("books")}
            if "ix_books_classification_code" in book_indexes:
                connection.exec_driver_sql("DROP INDEX IF EXISTS ix_books_classification_code")
            if "classification_code" in book_columns:
                connection.exec_driver_sql("ALTER TABLE books DROP COLUMN classification_code")

        if "borrow_orders" in table_names:
            borrow_columns = {column["name"] for column in inspector.get_columns("borrow_orders")}
            if "book_id" in borrow_columns and "requested_book_id" not in borrow_columns:
                connection.exec_driver_sql("ALTER TABLE borrow_orders RENAME COLUMN book_id TO requested_book_id")
            if "assigned_copy_id" in borrow_columns and "fulfilled_copy_id" not in borrow_columns:
                connection.exec_driver_sql("ALTER TABLE borrow_orders RENAME COLUMN assigned_copy_id TO fulfilled_copy_id")
            if "order_mode" in borrow_columns and "fulfillment_mode" not in borrow_columns:
                connection.exec_driver_sql("ALTER TABLE borrow_orders RENAME COLUMN order_mode TO fulfillment_mode")


def init_schema() -> None:
    import_model_modules()
    engine = get_engine()
    with engine.begin() as connection:
        if engine.url.get_backend_name() == "postgresql":
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    if engine.url.get_backend_name() == "postgresql":
        if not _has_alembic_version_table(engine):
            Base.metadata.create_all(bind=engine)
            _run_alembic_stamp(BASELINE_REVISION)
        _run_alembic_upgrade()
    else:
        Base.metadata.create_all(bind=engine)
        _repair_sqlite_legacy_schema(engine)
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
    backend_name = engine.url.get_backend_name()
    with engine.begin() as connection:
        if backend_name == "postgresql":
            # Drop and recreate the public schema directly to avoid FK cycles
            # between learning_profiles and learning_path_versions during reset.
            connection.exec_driver_sql("DROP SCHEMA IF EXISTS public CASCADE")
            connection.exec_driver_sql("CREATE SCHEMA public")
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector")
            connection.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        else:
            Base.metadata.drop_all(bind=connection)
    if backend_name == "postgresql":
        Base.metadata.create_all(bind=engine)
        _run_alembic_stamp(BASELINE_REVISION)
        _run_alembic_upgrade()
    else:
        Base.metadata.create_all(bind=engine)
    _seed_default_cabinet()
