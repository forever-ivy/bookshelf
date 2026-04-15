from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.core.database import get_engine, get_session_factory, init_engine, init_schema, reset_engine
from app.seed_factory.factory import LargeDatasetConfig, validate_large_dataset_schema
from app.seed_factory.verification import build_large_dataset_report


def _count_snapshot_records(snapshot_path: Path) -> int:
    with snapshot_path.open("r", encoding="utf-8") as fin:
        return sum(1 for line in fin if line.strip())


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verify large noisy dataset counts, thresholds, and noise ratios.")
    parser.add_argument("--snapshot", required=True, type=Path, help="Snapshot path used to derive target thresholds.")
    parser.add_argument("--random-seed", type=int, default=20260415)
    parser.add_argument("--target-books", type=int, default=None)
    parser.add_argument("--target-readers", type=int, default=1_284)
    parser.add_argument("--target-book-source-documents", type=int, default=24_000)
    parser.add_argument("--target-book-copies", type=int, default=135_000)
    parser.add_argument("--target-borrow-orders", type=int, default=80_000)
    parser.add_argument("--target-search-logs", type=int, default=150_000)
    parser.add_argument("--target-recommendation-logs", type=int, default=250_000)
    parser.add_argument("--target-conversation-sessions", type=int, default=25_000)
    parser.add_argument("--target-conversation-messages", type=int, default=150_000)
    parser.add_argument("--target-learning-profiles", type=int, default=6_000)
    parser.add_argument("--target-learning-fragments", type=int, default=120_000)
    parser.add_argument("--target-learning-sessions", type=int, default=20_000)
    parser.add_argument("--target-learning-turns", type=int, default=90_000)
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args([] if argv is None else argv)

    reset_engine()
    init_engine()
    init_schema()
    validate_large_dataset_schema(get_engine())

    target_books = args.target_books or _count_snapshot_records(args.snapshot)

    config = LargeDatasetConfig(
        snapshot_path=args.snapshot,
        random_seed=args.random_seed,
        target_books=target_books,
        target_readers=args.target_readers,
        target_book_source_documents=args.target_book_source_documents,
        target_book_copies=args.target_book_copies,
        target_borrow_orders=args.target_borrow_orders,
        target_search_logs=args.target_search_logs,
        target_recommendation_logs=args.target_recommendation_logs,
        target_conversation_sessions=args.target_conversation_sessions,
        target_conversation_messages=args.target_conversation_messages,
        target_learning_profiles=args.target_learning_profiles,
        target_learning_fragments=args.target_learning_fragments,
        target_learning_sessions=args.target_learning_sessions,
        target_learning_turns=args.target_learning_turns,
    )

    with get_session_factory()() as session:
        report = build_large_dataset_report(session, config)

    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main(sys.argv[1:])
