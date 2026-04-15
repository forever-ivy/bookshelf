from __future__ import annotations

import json
import re
from pathlib import Path

import pytest
from sqlalchemy import func, inspect, select

from app.analytics.models import ReadingEvent, SearchLog
from app.admin.service import DEFAULT_ADMIN_PERMISSIONS
from app.auth.models import AdminAccount
from app.catalog.models import Book, BookSourceDocument
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.database import get_engine, get_session_factory
from app.core.security import verify_password
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


def test_seed_large_dataset_creates_loginable_admin_accounts(app, client, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=19,
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

        admin = session.scalar(select(AdminAccount).where(AdminAccount.username == "admin"))
        ops_admin = session.scalar(select(AdminAccount).where(AdminAccount.username == "admin_01"))

        assert admin is not None
        assert ops_admin is not None
        assert verify_password("admin123", admin.password_hash)
        assert verify_password("admin-password-1", ops_admin.password_hash)

    admin_login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123", "role": "admin"},
    )
    assert admin_login.status_code == 200
    expected_permission_codes = {item["code"] for item in DEFAULT_ADMIN_PERMISSIONS}
    assert expected_permission_codes.issubset(set(admin_login.json()["account"]["permission_codes"]))

    ops_login = client.post(
        "/api/v1/auth/login",
        json={"username": "admin_01", "password": "admin-password-1", "role": "admin"},
    )
    assert ops_login.status_code == 200


def test_seed_large_dataset_separates_reader_usernames_and_display_names(app, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=23,
        target_books=60,
        target_readers=18,
        target_book_source_documents=12,
        target_book_copies=90,
        target_borrow_orders=120,
        target_search_logs=180,
        target_recommendation_logs=240,
        target_conversation_sessions=30,
        target_conversation_messages=120,
        target_learning_profiles=20,
        target_learning_fragments=80,
        target_learning_sessions=40,
        target_learning_turns=160,
    )

    with get_session_factory()() as session:
        seed_large_dataset(session, config)
        rows = session.execute(
            select(ReaderAccount.username, ReaderProfile.display_name)
            .join(ReaderProfile, ReaderProfile.account_id == ReaderAccount.id)
            .order_by(ReaderAccount.id.asc())
        ).all()

    assert len(rows) == 18
    usernames = [row.username for row in rows]
    display_names = [row.display_name for row in rows]
    assert len(set(usernames)) == 18
    assert usernames == [f"reader_{index}" for index in range(1, 19)]
    assert all(re.fullmatch(r"[\u4e00-\u9fff]{2,4}", display_name) for display_name in display_names)
    assert all(row.username != row.display_name for row in rows)


def test_seed_large_dataset_creates_loginable_reader_accounts(app, client, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=29,
        target_books=60,
        target_readers=18,
        target_book_source_documents=12,
        target_book_copies=90,
        target_borrow_orders=120,
        target_search_logs=180,
        target_recommendation_logs=240,
        target_conversation_sessions=30,
        target_conversation_messages=120,
        target_learning_profiles=20,
        target_learning_fragments=80,
        target_learning_sessions=40,
        target_learning_turns=160,
    )

    with get_session_factory()() as session:
        seed_large_dataset(session, config)
        first_reader = session.scalar(select(ReaderAccount).order_by(ReaderAccount.id.asc()))

        assert first_reader is not None
        assert verify_password("reader123", first_reader.password_hash)

    reader_login = client.post(
        "/api/v1/auth/login",
        json={"username": first_reader.username, "password": "reader123", "role": "reader"},
    )

    assert reader_login.status_code == 200
    assert reader_login.json()["account"]["username"] == first_reader.username
    assert reader_login.json()["account"]["role"] == "reader"


def test_seed_large_dataset_supports_reader_home_feed(app, client, tmp_path: Path) -> None:
    snapshot_path = _write_snapshot(tmp_path / "snapshot.jsonl")
    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=31,
        target_books=90,
        target_readers=24,
        target_book_source_documents=18,
        target_book_copies=140,
        target_borrow_orders=180,
        target_search_logs=240,
        target_recommendation_logs=320,
        target_conversation_sessions=45,
        target_conversation_messages=180,
        target_learning_profiles=30,
        target_learning_fragments=120,
        target_learning_sessions=60,
        target_learning_turns=240,
    )

    with get_session_factory()() as session:
        seed_large_dataset(session, config)
        first_reader = session.scalar(select(ReaderAccount).order_by(ReaderAccount.id.asc()))

    assert first_reader is not None

    reader_login = client.post(
        "/api/v1/auth/login",
        json={"username": first_reader.username, "password": "reader123", "role": "reader"},
    )
    assert reader_login.status_code == 200

    home_feed = client.get(
        "/api/v1/recommendation/home-feed",
        headers={"Authorization": f"Bearer {reader_login.json()['access_token']}"},
    )

    assert home_feed.status_code == 200
    payload = home_feed.json()
    assert len(payload["today_recommendations"]) > 0
    assert len(payload["exam_zone"]) > 0


def test_seed_large_dataset_filters_weird_catalog_books(app, tmp_path: Path) -> None:
    snapshot_path = tmp_path / "dirty-snapshot.jsonl"
    records = [
        {
            "work_key": "/works/OL1W",
            "title": "'Aqā'id al-salaf",
            "author": "/authors/OL4557427A",
            "author_keys": [],
            "category": "Islam",
            "tags": ["nan", "Apologetic"],
            "summary": "nan",
            "isbn": None,
            "cover_url": None,
            "search_text": "'Aqā'id al-salaf /authors/OL4557427A Islam",
            "subjects": ["Islam", "Apologetic"],
            "first_publish_year": 1998,
            "language": "eng",
        },
        {
            "work_key": "/works/OL2W",
            "title": "活着",
            "author": "余华",
            "author_keys": [],
            "category": "I247.57",
            "tags": ["文学", "I247.57", "经典"],
            "summary": "nan",
            "isbn": "9787506365437",
            "cover_url": None,
            "search_text": "活着 余华 I247.57 文学 经典",
            "subjects": ["I247.57", "文学"],
            "first_publish_year": 2012,
            "language": "chi",
        },
        {
            "work_key": "/works/OL3W",
            "title": "Distributed Systems Patterns",
            "author": "Ada Lovelace",
            "author_keys": [],
            "category": "TP301",
            "tags": ["distributed systems", "TP301", "cloud"],
            "summary": "Reliable distributed systems at scale.",
            "isbn": "9787111544937",
            "cover_url": None,
            "search_text": "Distributed Systems Patterns Ada Lovelace TP301 distributed systems cloud",
            "subjects": ["TP301", "distributed systems"],
            "first_publish_year": 2018,
            "language": "eng",
        },
    ]
    for index in range(4, 40):
        records.append(
            {
                "work_key": f"/works/OL{index}W",
                "title": f"Clean Book {index:03d}",
                "author": f"Author {index:03d}",
                "author_keys": [],
                "category": "Computer Science" if index % 2 else "History",
                "tags": [f"tag-{index % 5}", f"topic-{index % 7}"],
                "summary": f"Summary {index}",
                "isbn": f"9780000{index:06d}"[:13],
                "cover_url": None,
                "search_text": f"Clean Book {index:03d} Author {index:03d}",
                "subjects": [f"topic-{index % 7}", f"tag-{index % 5}"],
                "first_publish_year": 2000 + (index % 20),
                "language": "eng",
            }
        )
    with snapshot_path.open("w", encoding="utf-8") as fout:
        for record in records:
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")

    config = LargeDatasetConfig(
        snapshot_path=snapshot_path,
        random_seed=37,
        target_books=20,
        target_readers=12,
        target_book_source_documents=8,
        target_book_copies=18,
        target_borrow_orders=24,
        target_search_logs=36,
        target_recommendation_logs=48,
        target_conversation_sessions=10,
        target_conversation_messages=36,
        target_learning_profiles=8,
        target_learning_fragments=24,
        target_learning_sessions=12,
        target_learning_turns=48,
        favorite_book_count=18,
        reader_booklist_count=3,
        topic_booklist_count=3,
    )

    with get_session_factory()() as session:
        seed_large_dataset(session, config)
        books = session.execute(select(Book).order_by(Book.id.asc())).scalars().all()

    assert len(books) == 20
    assert all(not book.title.startswith(("'", '"')) for book in books)
    assert all(not (book.author or "").startswith("/authors/") for book in books)
    assert "文学" in {book.category for book in books}
    assert "工业技术" in {book.category for book in books}
    assert all("nan" not in (book.summary or "").lower() for book in books)
    assert all(not re.search(r"\b[A-Z]{1,3}\d", book.keywords or "") for book in books)


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
