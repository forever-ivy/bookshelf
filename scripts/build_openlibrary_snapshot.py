from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.seed_factory.openlibrary_snapshot import build_snapshot_file


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build a normalized snapshot for large dataset seeding.")
    parser.add_argument("--source-dir", type=Path, default=None, help="Optional local books source directory (CSV/XLSX).")
    parser.add_argument(
        "--source-file",
        action="append",
        default=[],
        type=Path,
        help="Optional explicit local books source file. Repeat to merge multiple CSV/XLSX files.",
    )
    parser.add_argument("--works-dump", type=Path, default=None, help="Path to the OpenLibrary works dump.")
    parser.add_argument("--authors-dump", type=Path, default=None, help="Optional authors dump for author enrichment.")
    parser.add_argument("--editions-dump", type=Path, default=None, help="Optional editions dump for ISBN and cover enrichment.")
    parser.add_argument("--output", required=True, type=Path, help="Output JSONL snapshot path.")
    parser.add_argument("--limit", type=int, default=None, help="Optional target snapshot size. source-dir defaults to full import.")
    args = parser.parse_args([] if argv is None else argv)

    if args.source_dir is None and not args.source_file and args.works_dump is None:
        parser.error("either --source-dir, --source-file, or --works-dump is required")

    effective_limit = args.limit if args.limit is not None else (None if args.source_dir is not None or args.source_file else 100_000)

    stats = build_snapshot_file(
        output_path=args.output,
        source_dir=args.source_dir,
        source_files=args.source_file,
        works_dump_path=args.works_dump,
        authors_dump_path=args.authors_dump,
        editions_dump_path=args.editions_dump,
        limit=effective_limit,
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
