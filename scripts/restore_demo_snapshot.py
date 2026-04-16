from __future__ import annotations

import argparse
from pathlib import Path
import sys

from app.core.config import get_settings
from app.core.postgres_snapshot import DEFAULT_DEMO_SNAPSHOT_PATH, restore_snapshot
from scripts.init_postgres import ensure_database_exists


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Restore the standard demo snapshot into the configured PostgreSQL database.")
    parser.add_argument(
        "--snapshot",
        type=Path,
        default=DEFAULT_DEMO_SNAPSHOT_PATH,
        help=f"Path to the custom-format snapshot. Defaults to {DEFAULT_DEMO_SNAPSHOT_PATH}.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop existing objects before restoring the snapshot.",
    )
    args = parser.parse_args([] if argv is None else argv)

    settings = get_settings()
    ensure_database_exists(settings.database_url)
    restore_snapshot(
        database_url=settings.database_url,
        snapshot_path=args.snapshot,
        clean=args.reset,
    )
    print(f"Restored demo snapshot from {args.snapshot} into {settings.database_url}")


if __name__ == "__main__":
    main(sys.argv[1:])
