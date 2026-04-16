from __future__ import annotations

import argparse
from pathlib import Path
import sys

from app.core.config import get_settings
from app.core.postgres_snapshot import DEFAULT_DEMO_SNAPSHOT_PATH, export_snapshot


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Export the current PostgreSQL database as the standard demo snapshot.")
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_DEMO_SNAPSHOT_PATH,
        help=f"Output path for the custom-format snapshot. Defaults to {DEFAULT_DEMO_SNAPSHOT_PATH}.",
    )
    args = parser.parse_args([] if argv is None else argv)

    settings = get_settings()
    snapshot_path = export_snapshot(database_url=settings.database_url, output_path=args.output)
    print(f"Exported demo snapshot to {snapshot_path}")


if __name__ == "__main__":
    main(sys.argv[1:])
