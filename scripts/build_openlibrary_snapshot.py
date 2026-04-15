from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.seed_factory.openlibrary_snapshot import build_snapshot_file


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build a normalized OpenLibrary snapshot for large dataset seeding.")
    parser.add_argument("--works-dump", required=True, type=Path, help="Path to the OpenLibrary works dump.")
    parser.add_argument("--authors-dump", type=Path, default=None, help="Optional authors dump for author enrichment.")
    parser.add_argument("--editions-dump", type=Path, default=None, help="Optional editions dump for ISBN and cover enrichment.")
    parser.add_argument("--output", required=True, type=Path, help="Output JSONL snapshot path.")
    parser.add_argument("--limit", type=int, default=100_000, help="Target snapshot size.")
    args = parser.parse_args([] if argv is None else argv)

    stats = build_snapshot_file(
        output_path=args.output,
        works_dump_path=args.works_dump,
        authors_dump_path=args.authors_dump,
        editions_dump_path=args.editions_dump,
        limit=args.limit,
    )
    print(
        json.dumps(
            {
                "output": str(args.output),
                "total_records": stats.total_records,
                "unique_categories": stats.unique_categories,
                "unique_tags": stats.unique_tags,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main(sys.argv[1:])
