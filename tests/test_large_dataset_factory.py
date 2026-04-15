from __future__ import annotations

import json
from pathlib import Path

import pytest
from sqlalchemy import func, inspect, select

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book, BookSourceDocument
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.database import get_engine, get_session_factory
from app.learning.models import (
    LearningAgentRun,
    LearningBridgeAction,
    LearningCheckpoint,
    LearningFragment,
    LearningJob,
    LearningPathStep,
    LearningPathVersion,
    LearningProfile,
    LearningRemediationPlan,
    LearningReport,
    LearningSession,
    LearningSourceAsset,
    LearningSourceBundle,
    LearningStepContextItem,
    LearningTurn,
)
from app.orders.models import BorrowOrder, OrderFulfillment, ReturnRequest
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotStatusEvent, RobotTask
from app.seed_factory.factory import LargeDatasetConfig, seed_large_dataset, validate_large_dataset_schema
from app.seed_factory.verification import build_large_dataset_report


def _write_snapshot(path: Path, count: int = 160) -> Path:
    with path.open("w", encoding="utf-8") as fout:
        for index in range(1, count + 1):
            record = {
                "work_key": f"/works/OL{index}W",
                "title": f"Book {index:04d}",
                "author": f"Author {index % 17}",
                "author_keys": [f"/authors/OL{index % 23}A"],
                "category": f"Category {index % 8}",
                "tags": [f"tag-{index % 11}", f"topic-{index % 7}"],
                "summary": f"Summary {index}",
                "isbn": f"9780000{index:06d}"[:13],
                "cover_url": f"https://covers.openlibrary.org/b/id/{index}-L.jpg",
                "search_text": f"Book {index:04d} Author {index % 17} Category {index % 8}",
                "subjects": [f"Category {index % 8}", f"tag-{index % 11}"],
                "first_publish_year": 2000 + (index % 20),
                "language": "eng",
            }
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")
    return path


def test_validate_large_dataset_schema_requires_latest_learning_tables(app) -> None:
    engine = get_engine()
    validate_large_dataset_schema(engine)

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    tables.remove("learning_sessions")

    with pytest.raises(RuntimeError):
        validate_large_dataset_schema(engine, available_tables=tables)


def test_seed_large_dataset_populates_full_flow_on_small_profile(app, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=7,
        target_books=120,
        target_readers=30,
        target_book_source_documents=24,
        target_book_copies=180,
        target_borrow_orders=240,
        target_search_logs=320,
        target_recommendation_logs=480,
        target_conversation_sessions=70,
        target_conversation_messages=320,
        target_learning_profiles=60,
        target_learning_fragments=240,
        target_learning_sessions=120,
        target_learning_turns=480,
    )

    with get_session_factory()() as session:
        summary = seed_large_dataset(session, config)

        assert summary["books"] == 120
        assert summary["readers"] == 30
        assert summary["borrow_orders"] >= 240
        assert summary["search_logs"] >= 320
        assert summary["recommendation_logs"] >= 480
        assert summary["conversation_sessions"] >= 70
        assert summary["conversation_messages"] >= 320
        assert summary["learning_profiles"] >= 60
        assert summary["learning_fragments"] >= 240
        assert summary["learning_sessions"] >= 120

        assert session.scalar(select(func.count()).select_from(Book)) == 120
        assert session.scalar(select(func.count()).select_from(BookSourceDocument)) >= 24
        assert session.scalar(select(func.count()).select_from(ReaderAccount)) == 30
        assert session.scalar(select(func.count()).select_from(ReaderProfile)) == 30
        assert session.scalar(select(func.count()).select_from(BorrowOrder)) >= 240
        assert session.scalar(select(func.count()).select_from(OrderFulfillment)) > 0
        assert session.scalar(select(func.count()).select_from(ReturnRequest)) > 0
        assert session.scalar(select(func.count()).select_from(SearchLog)) >= 320
        assert session.scalar(select(func.count()).select_from(RecommendationLog)) >= 480
        assert session.scalar(select(func.count()).select_from(ConversationSession)) >= 70
        assert session.scalar(select(func.count()).select_from(ConversationMessage)) >= 320
        assert session.scalar(select(func.count()).select_from(ReadingEvent)) > 0
        assert session.scalar(select(func.count()).select_from(RobotTask)) > 0
        assert session.scalar(select(func.count()).select_from(RobotStatusEvent)) > 0
        assert session.scalar(select(func.count()).select_from(LearningSourceBundle)) >= 60
        assert session.scalar(select(func.count()).select_from(LearningProfile)) >= 60
        assert session.scalar(select(func.count()).select_from(LearningSourceAsset)) > 0
        assert session.scalar(select(func.count()).select_from(LearningFragment)) >= 240
        assert session.scalar(select(func.count()).select_from(LearningPathVersion)) > 0
        assert session.scalar(select(func.count()).select_from(LearningPathStep)) > 0
        assert session.scalar(select(func.count()).select_from(LearningSession)) >= 120
        assert session.scalar(select(func.count()).select_from(LearningTurn)) >= 480
        assert session.scalar(select(func.count()).select_from(LearningStepContextItem)) > 0
        assert session.scalar(select(func.count()).select_from(LearningBridgeAction)) > 0
        assert session.scalar(select(func.count()).select_from(LearningAgentRun)) > 0
        assert session.scalar(select(func.count()).select_from(LearningCheckpoint)) > 0
        assert session.scalar(select(func.count()).select_from(LearningRemediationPlan)) > 0
        assert session.scalar(select(func.count()).select_from(LearningReport)) > 0
        assert session.scalar(select(func.count()).select_from(LearningJob)) > 0


def test_build_large_dataset_report_summarizes_noise_and_thresholds(app, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=11,
        target_books=80,
        target_readers=20,
        target_book_source_documents=16,
        target_book_copies=120,
        target_borrow_orders=180,
        target_search_logs=260,
        target_recommendation_logs=320,
        target_conversation_sessions=40,
        target_conversation_messages=180,
        target_learning_profiles=30,
        target_learning_fragments=120,
        target_learning_sessions=60,
        target_learning_turns=240,
    )

    with get_session_factory()() as session:
        seed_large_dataset(session, config)
        report = build_large_dataset_report(session, config)

    assert report["counts"]["books"] == 80
    assert report["counts"]["reader_accounts"] == 20
    assert report["thresholds"]["borrow_orders"]["ok"] is True
    assert report["thresholds"]["search_logs"]["ok"] is True
    assert report["noise"]["search_logs"]["empty_query_ratio"] > 0
    assert report["noise"]["recommendation_logs"]["low_score_ratio"] > 0
    assert report["noise"]["borrow_orders"]["cancelled_ratio"] > 0
