from __future__ import annotations

from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine, rebuild_schema, reset_engine
from app.demo_seed import seed_demo_data
from scripts.init_postgres import ensure_database_exists


def main() -> None:
    settings = get_settings()
    if settings.database_url.startswith("postgresql+psycopg://"):
        ensure_database_exists(settings.database_url)

    reset_engine()
    init_engine(settings)
    rebuild_schema()

    with get_session_factory()() as session:
        summary = seed_demo_data(session)

    print("Seeded demo data into the current database:")
    for key, value in summary.items():
        print(f"  - {key}: {value}")
    print("Admin credentials: admin / admin123")


if __name__ == "__main__":
    main()
