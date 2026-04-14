from __future__ import annotations

from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core import database as database_module
from app.admin.models import (
    AdminPermission,
    AdminRole,
    AdminRoleAssignment,
    AdminRolePermission,
    AlertRecord,
    RecommendationPlacement,
    TopicBooklist,
    TopicBooklistItem,
)
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book, BookCategory, BookTag, BookTagLink
from app.inventory.models import BookCopy, Cabinet, CabinetSlot, InventoryEvent
from app.orders.models import BorrowOrder
from app.readers.models import ReaderProfile
from app.robot_sim.models import RobotTask, RobotUnit
from app.system.models import SystemSetting
from scripts import init_postgres as init_postgres_script


class FakeConnection:
    def __init__(self) -> None:
        self.statements: list[tuple[str, object | None]] = []

    def exec_driver_sql(self, statement: str, params: object | None = None) -> None:
        self.statements.append((statement.strip(), params))

    def execute(self, statement, params: object | None = None) -> None:
        self.statements.append((str(statement).strip(), params))


class FakeBeginContext:
    def __init__(self, connection: FakeConnection) -> None:
        self.connection = connection

    def __enter__(self) -> FakeConnection:
        return self.connection

    def __exit__(self, exc_type, exc, tb) -> None:
        return None


class FakeEngine:
    def __init__(self, url: str) -> None:
        self.url = make_url(url)
        self.connection = FakeConnection()

    def begin(self) -> FakeBeginContext:
        return FakeBeginContext(self.connection)


def test_default_settings_target_postgres(monkeypatch):
    monkeypatch.delenv("LIBRARY_DATABASE_URL", raising=False)
    get_settings.cache_clear()

    settings = get_settings()
    assert settings.database_url.startswith("postgresql+psycopg://")
    assert settings.database_url.endswith("/service")


def test_init_schema_enables_pgvector_extension_on_postgres(monkeypatch):
    fake_engine = FakeEngine("postgresql+psycopg://library:library@localhost:5432/library_service")
    create_all_calls = []

    monkeypatch.setattr(database_module, "get_engine", lambda: fake_engine)
    monkeypatch.setattr(database_module, "import_model_modules", lambda: None)
    monkeypatch.setattr(database_module, "_ensure_metadata_columns_exist", lambda: None)
    monkeypatch.setattr(
        database_module.Base.metadata,
        "create_all",
        lambda bind: create_all_calls.append(bind),
    )

    database_module.init_schema()

    assert fake_engine.connection.statements[0][0] == "CREATE EXTENSION IF NOT EXISTS vector"
    assert "INSERT INTO cabinets" in fake_engine.connection.statements[1][0]
    assert create_all_calls == [fake_engine]


def test_init_schema_skips_pgvector_extension_on_sqlite(monkeypatch):
    fake_engine = FakeEngine("sqlite+pysqlite:///tmp/test.db")
    create_all_calls = []

    monkeypatch.setattr(database_module, "get_engine", lambda: fake_engine)
    monkeypatch.setattr(database_module, "import_model_modules", lambda: None)
    monkeypatch.setattr(database_module, "_ensure_metadata_columns_exist", lambda: None)
    monkeypatch.setattr(
        database_module.Base.metadata,
        "create_all",
        lambda bind: create_all_calls.append(bind),
    )

    database_module.init_schema()

    assert len(fake_engine.connection.statements) == 1
    assert "INSERT INTO cabinets" in fake_engine.connection.statements[0][0]
    assert create_all_calls == [fake_engine]


def test_book_model_has_pgvector_embedding_column():
    assert "embedding" in Book.__table__.c
    assert "VECTOR" in str(Book.__table__.c.embedding.type).upper()


def test_init_pair_codes_table_is_not_part_of_current_schema():
    assert "init_pair_codes" not in AdminAccount.metadata.tables


def test_database_2_models_are_part_of_current_schema():
    assert Cabinet.__table__.name == "cabinets"
    assert BookCopy.__table__.name == "book_copies"
    assert AdminActionLog.__table__.name == "admin_action_logs"


def test_admin_foundation_models_are_part_of_current_schema():
    assert AlertRecord.__table__.name == "alert_records"
    assert SystemSetting.__table__.name == "system_settings"
    assert RecommendationPlacement.__table__.name == "recommendation_placements"
    assert TopicBooklist.__table__.name == "topic_booklists"
    assert TopicBooklistItem.__table__.name == "topic_booklist_items"
    assert AdminRole.__table__.name == "admin_roles"
    assert AdminPermission.__table__.name == "admin_permissions"
    assert AdminRolePermission.__table__.name == "admin_role_permissions"
    assert AdminRoleAssignment.__table__.name == "admin_role_assignments"
    assert BookCategory.__table__.name == "book_categories"
    assert BookTag.__table__.name == "book_tags"
    assert BookTagLink.__table__.name == "book_tag_links"


def test_database_2_core_columns_exist():
    assert "created_at" in BorrowOrder.__table__.c
    assert "updated_at" in BorrowOrder.__table__.c
    assert "assigned_copy_id" in BorrowOrder.__table__.c
    assert "current_slot_id" in BookCopy.__table__.c
    assert "reserved_copies" in BookCopy.metadata.tables["book_stock"].c
    assert "current_copy_id" not in CabinetSlot.__table__.c
    assert "payload_json" in InventoryEvent.__table__.c
    assert "admin_id" in AdminActionLog.__table__.c


def test_extended_admin_columns_exist():
    assert "isbn" in Book.__table__.c
    assert "barcode" in Book.__table__.c
    assert "cover_url" in Book.__table__.c
    assert "shelf_status" in Book.__table__.c
    assert "category_id" in Book.__table__.c
    assert "classification_code" not in Book.__table__.c
    assert "restriction_status" in ReaderProfile.__table__.c
    assert "restriction_until" in ReaderProfile.__table__.c
    assert "risk_flags" in ReaderProfile.__table__.c
    assert "preference_profile_json" in ReaderProfile.__table__.c
    assert "segment_code" in ReaderProfile.__table__.c
    assert "priority" in BorrowOrder.__table__.c
    assert "due_at" in BorrowOrder.__table__.c
    assert "failure_reason" in BorrowOrder.__table__.c
    assert "intervention_status" in BorrowOrder.__table__.c
    assert "attempt_count" in BorrowOrder.__table__.c
    assert "path_json" in RobotTask.__table__.c
    assert "reassigned_from_task_id" in RobotTask.__table__.c
    assert "battery_level" in RobotUnit.__table__.c
    assert "heartbeat_at" in RobotUnit.__table__.c


def test_init_postgres_builds_psycopg_admin_url():
    admin_url = init_postgres_script._admin_url(
        "postgresql+psycopg://library:library@localhost:5432/service"
    )

    assert admin_url == "postgresql://library:library@localhost:5432/postgres"


def test_init_postgres_defaults_to_non_destructive_schema_init(monkeypatch):
    calls: list[str] = []

    monkeypatch.setattr(init_postgres_script, "ensure_database_exists", lambda _url: calls.append("ensure"))
    monkeypatch.setattr(init_postgres_script, "reset_engine", lambda: calls.append("reset"))
    monkeypatch.setattr(init_postgres_script, "init_engine", lambda _settings: calls.append("engine"))
    monkeypatch.setattr(init_postgres_script, "init_schema", lambda: calls.append("init"))
    monkeypatch.setattr(init_postgres_script, "rebuild_schema", lambda: calls.append("rebuild"))

    init_postgres_script.main()

    assert calls == ["ensure", "reset", "engine", "init"]
