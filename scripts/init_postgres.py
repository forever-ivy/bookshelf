from __future__ import annotations

import argparse
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import psycopg
from psycopg import sql

from app.core.config import get_settings
from app.core.database import init_engine, init_schema, rebuild_schema, reset_engine


def _admin_url(database_url: str) -> str:
    parts = urlsplit(database_url)
    scheme = parts.scheme.replace("+psycopg", "")
    return urlunsplit((scheme, parts.netloc, "/postgres", parts.query, parts.fragment))


def _database_name(database_url: str) -> str:
    parts = urlsplit(database_url)
    return Path(parts.path).name


def ensure_database_exists(database_url: str) -> None:
    database_name = _database_name(database_url)
    admin_url = _admin_url(database_url)
    with psycopg.connect(admin_url, autocommit=True) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database_name,))
            if cursor.fetchone() is None:
                cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Initialize the PostgreSQL schema for the library service.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop and rebuild the schema instead of performing a non-destructive init.",
    )
    args = parser.parse_args([] if argv is None else argv)

    settings = get_settings()
    if not settings.database_url.startswith("postgresql+psycopg://"):
        raise SystemExit("LIBRARY_DATABASE_URL must point to PostgreSQL")

    ensure_database_exists(settings.database_url)
    reset_engine()
    init_engine(settings)
    if args.reset:
        rebuild_schema()
        print(f"Rebuilt PostgreSQL schema for {settings.database_url}")
        return
    init_schema()
    print(f"Initialized PostgreSQL schema for {settings.database_url}")


if __name__ == "__main__":
    main(sys.argv[1:])
