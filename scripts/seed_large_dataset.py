from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory, init_engine, init_schema, rebuild_schema, reset_engine
from app.seed_factory.factory import LargeDatasetConfig, seed_large_dataset, validate_large_dataset_schema
from scripts.init_postgres import ensure_database_exists


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Seed a large noisy business dataset against the latest learning schema.")
    parser.add_argument("--snapshot", required=True, type=Path, help="Path to the normalized JSONL snapshot.")
    parser.add_argument("--random-seed", type=int, default=20260415, help="Deterministic random seed.")
    parser.add_argument("--reset", action="store_true", help="Rebuild the database schema before seeding.")
    parser.add_argument("--no-purge", action="store_true", help="Skip table cleanup before inserting data.")
    parser.add_argument("--chunk-size", type=int, default=2_000, help="Chunk size for batched inserts.")
    parser.add_argument("--target-books", type=int, default=100_000)
    parser.add_argument("--target-readers", type=int, default=3_000)
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

    config = LargeDatasetConfig(
        snapshot_path=args.snapshot,
        random_seed=args.random_seed,
        chunk_size=args.chunk_size,
        purge_existing_data=not args.no_purge,
        target_books=args.target_books,
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
        summary = seed_large_dataset(session, config)

    print(
        json.dumps(
            {
                "database_url": settings.database_url,
                "random_seed": args.random_seed,
                "summary": summary,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main(sys.argv[1:])
