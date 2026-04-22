from __future__ import annotations

import argparse
import json
import sys
import tempfile
from datetime import datetime, time, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, init_engine, init_schema, rebuild_schema, reset_engine
from app.seed_factory.factory import LargeDatasetConfig, seed_large_dataset, validate_large_dataset_schema
from app.seed_factory.openlibrary_snapshot import build_snapshot_file
from app.seed_factory.verification import build_large_dataset_report
from scripts.init_postgres import ensure_database_exists


LOCAL_TZ = ZoneInfo("Asia/Shanghai")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Rebuild the full demo business dataset from explicit book source files.")
    parser.add_argument(
        "--source-file",
        action="append",
        required=True,
        type=Path,
        help="Book source file to normalize into the rebuild snapshot. Repeat to merge multiple files.",
    )
    parser.add_argument(
        "--anchor-date",
        default="2026-04-22",
        help="Local Asia/Shanghai date used as the end-of-day cutoff for borrow timelines. Defaults to 2026-04-22.",
    )
    parser.add_argument(
        "--scale-profile",
        default="full",
        choices=["full"],
        help="Scaling profile for deriving full business counts from snapshot size.",
    )
    parser.add_argument("--reset", action="store_true", help="Rebuild the database schema before reseeding.")
    parser.add_argument("--verify", dest="verify", action="store_true", default=True, help="Run post-seed verification.")
    parser.add_argument("--no-verify", dest="verify", action="store_false", help="Skip post-seed verification.")
    return parser


def _cutoff_from_anchor_date(anchor_date: str) -> datetime:
    parsed_date = datetime.fromisoformat(anchor_date).date()
    local_cutoff = datetime.combine(parsed_date, time(23, 59, 59), tzinfo=LOCAL_TZ)
    return local_cutoff.astimezone(timezone.utc)


def _threshold_failures(report: dict) -> list[str]:
    failures: list[str] = []
    for name, payload in report.get("thresholds", {}).items():
        if not payload.get("ok", False):
            failures.append(name)
    return failures


def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args([] if argv is None else argv)

    cutoff_at = _cutoff_from_anchor_date(args.anchor_date)
    resolved_source_files = [path.expanduser().resolve() for path in args.source_file]

    with tempfile.TemporaryDirectory(prefix="bookshelf-reseed-") as tmpdir:
        snapshot_path = Path(tmpdir) / "normalized-snapshot.jsonl"
        snapshot_stats = build_snapshot_file(
            works_dump_path=None,
            authors_dump_path=None,
            editions_dump_path=None,
            source_dir=None,
            source_files=resolved_source_files,
            output_path=snapshot_path,
            limit=None,
        )

        config = LargeDatasetConfig.for_scale_profile(
            snapshot_path=snapshot_path,
            snapshot_book_count=snapshot_stats.total_records,
            scale_profile=args.scale_profile,
            anchor_time=cutoff_at,
            cutoff_at=cutoff_at,
        )

        settings = get_settings()
        reset_engine()
        if settings.database_url.startswith("postgresql+psycopg://"):
            ensure_database_exists(settings.database_url)
        init_engine(settings)
        if args.reset:
            rebuild_schema()
        else:
            init_schema()
            validate_large_dataset_schema(get_engine())

        with get_session_factory()() as session:
            summary = seed_large_dataset(session, config)

        report = None
        if args.verify:
            with get_session_factory()() as session:
                report = build_large_dataset_report(session, config)
            failures = _threshold_failures(report)
            if failures:
                raise RuntimeError(f"Verification failed: {', '.join(failures)}")

        print(
            json.dumps(
                {
                    "database_url": settings.database_url,
                    "anchor_date": args.anchor_date,
                    "cutoff_at": cutoff_at.isoformat(),
                    "scale_profile": args.scale_profile,
                    "source_files": [str(path) for path in resolved_source_files],
                    "snapshot": {
                        "path": str(snapshot_path),
                        "total_records": snapshot_stats.total_records,
                        "unique_categories": snapshot_stats.unique_categories,
                        "unique_tags": snapshot_stats.unique_tags,
                    },
                    "config": {
                        "target_books": config.target_books,
                        "target_readers": config.target_readers,
                        "target_borrow_orders": config.target_borrow_orders,
                        "target_book_copies": config.target_book_copies,
                        "target_learning_profiles": config.target_learning_profiles,
                    },
                    "summary": summary,
                    "report": report,
                },
                ensure_ascii=False,
                indent=2,
            )
        )


if __name__ == "__main__":
    main(sys.argv[1:])
