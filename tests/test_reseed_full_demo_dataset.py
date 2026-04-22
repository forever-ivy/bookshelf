from __future__ import annotations

from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, reset_engine
from app.inventory.models import BookCopy
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount
from scripts import reseed_full_demo_dataset as reseed_script


def _write_books_csv(path: Path, count: int = 40) -> Path:
    rows = ["书名,作者,出版社,豆瓣成员常用的标签,内容简介,评分,ISBN号,定价,5条热门短评,出版时间,标签"]
    for index in range(1, count + 1):
        rows.append(
            ",".join(
                [
                    f"测试图书{index:03d}",
                    f"作者{index:03d}",
                    "测试出版社",
                    f"标签{index % 5} 主题{index % 7} 读物{index % 3}",
                    f"这是第 {index} 本测试图书的简介",
                    "8.8",
                    f"9787506{index:07d}"[:13],
                    "39.00",
                    "[]",
                    f"202{index % 5}/4/22",
                    f"分类{index % 4}",
                ]
            )
        )
    path.write_text("\n".join(rows), encoding="utf-8")
    return path


def test_reseed_full_demo_dataset_seeds_from_source_file_and_preserves_login(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "reseed.db"
    source_file = _write_books_csv(tmp_path / "books.csv")

    monkeypatch.setenv("LIBRARY_IGNORE_ENV_FILE", "true")
    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_ENABLED", "false")
    monkeypatch.setenv("LIBRARY_LEARNING_TASKS_EAGER", "true")
    monkeypatch.setenv("LIBRARY_LEARNING_STORAGE_DIR", str(tmp_path / "learning-storage"))
    get_settings.cache_clear()
    reset_engine()

    reseed_script.main(
        [
            "--source-file",
            str(source_file),
            "--anchor-date",
            "2026-04-22",
            "--scale-profile",
            "full",
            "--reset",
            "--verify",
        ]
    )

    from app.main import create_app

    with get_session_factory()() as session:
        assert session.scalar(select(func.count()).select_from(Book)) == 40
        assert session.scalar(select(Book).limit(1)) is not None
        assert session.scalar(select(BookCopy).limit(1)) is not None
        assert session.scalar(select(BorrowOrder).limit(1)) is not None
        first_reader = session.scalar(select(ReaderAccount).order_by(ReaderAccount.id.asc()))

    assert first_reader is not None

    with TestClient(create_app()) as client:
        admin_login = client.post(
            "/api/v1/auth/login",
            json={"username": "admin", "password": "admin123", "role": "admin"},
        )
        assert admin_login.status_code == 200

        reader_login = client.post(
            "/api/v1/auth/login",
            json={"username": "reader_1", "password": "reader123", "role": "reader"},
        )
        assert reader_login.status_code == 200

        home_feed = client.get(
            "/api/v1/recommendation/home-feed",
            headers={"Authorization": f"Bearer {reader_login.json()['access_token']}"},
        )
        assert home_feed.status_code == 200
