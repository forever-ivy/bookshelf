from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path

from fastapi.testclient import TestClient

from app.catalog.models import Book
from app.core.config import Settings, get_settings
from app.core.database import (
    get_engine,
    get_session_factory,
    init_engine,
    init_schema,
    reset_engine,
)
from app.core.security import AuthIdentity, create_token
from app.recommendation.ml import ImplicitMFTrainingConfig, train_implicit_mf_model


EMBEDDING_DIMENSIONS = 1536


def seed_rows(conn, statements):
    for statement, params in statements:
        conn.exec_driver_sql(statement, params)
    conn.commit()


def reader_headers(account_id: int = 1, profile_id: int = 1) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def make_embedding(*pairs: tuple[int, float]) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSIONS
    for index, value in pairs:
        vector[index] = value
    return vector


def set_book_embedding(book_id: int, embedding: list[float]) -> None:
    session_factory = get_session_factory()
    with session_factory() as db:
        book = db.get(Book, book_id)
        assert book is not None
        book.embedding = embedding
        db.commit()


@contextmanager
def build_ml_client(tmp_path: Path, monkeypatch, model_payload: dict):
    db_path = tmp_path / "ml_test.db"
    model_path = tmp_path / "recommendation_mf_model.json"
    model_path.write_text(json.dumps(model_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    monkeypatch.setenv("LIBRARY_DATABASE_URL", f"sqlite+pysqlite:///{db_path}")
    monkeypatch.setenv("LIBRARY_AUTO_CREATE_SCHEMA", "true")
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_ENABLED", "true")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_MODEL_PATH", str(model_path))
    get_settings.cache_clear()
    reset_engine()

    from app.main import create_app

    settings = Settings()
    init_engine(settings)
    init_schema()
    try:
        with TestClient(create_app()) as client:
            yield client
    finally:
        get_settings.cache_clear()
        reset_engine()


def test_train_implicit_mf_model_learns_reader_book_preference(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-mf-1", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-mf-2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Bob", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Book A", "Author A", "C1", "a", "a")),
                ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Book B", "Author B", "C1", "b", "b")),
                ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Book C", "Author C", "C2", "c", "c")),
                ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Book D", "Author D", "C2", "d", "d")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 2, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 3, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 4, None, "cabinet_pickup", "completed")),
            ],
        )

    session_factory = get_session_factory()
    with session_factory() as db:
        model = train_implicit_mf_model(
            db,
            config=ImplicitMFTrainingConfig(
                latent_dim=6,
                epochs=60,
                learning_rate=0.05,
                regularization=0.01,
                negatives_per_positive=2,
                min_reader_interactions=2,
                min_book_interactions=1,
                seed=7,
            ),
        )

    positive_score = model.score_reader_book(reader_id=1, book_id=1)
    negative_score = model.score_reader_book(reader_id=1, book_id=3)
    assert positive_score is not None
    assert negative_score is not None
    assert positive_score > negative_score
    assert model.training_summary["pairwise_accuracy"] >= 0.5


def test_search_endpoint_applies_ml_rerank_when_model_available(tmp_path, monkeypatch):
    model_payload = {
        "model_type": "implicit_matrix_factorization",
        "version": 1,
        "latent_dim": 2,
        "global_bias": 0.0,
        "reader_factors": {"1": [0.0, 1.0]},
        "book_factors": {
            "2": [1.0, 0.0],
            "3": [0.0, 1.0],
            "4": [0.7, 0.3],
        },
        "book_biases": {"2": 0.0, "3": 0.6, "4": 0.0},
        "book_popularity": {"2": 3, "3": 5, "4": 1},
        "trained_at": "2026-03-26T12:00:00+00:00",
        "training_summary": {"interaction_count": 24},
    }

    class FakeEmbeddingProvider:
        def embed_texts(self, texts: list[str]) -> list[list[float]]:
            assert len(texts) == 1
            return [make_embedding((0, 1.0), (1, 0.0))]

    with build_ml_client(tmp_path, monkeypatch, model_payload) as client:
        from app.recommendation import router as recommendation_router

        monkeypatch.setattr(
            recommendation_router,
            "resolve_embedding_provider",
            lambda: FakeEmbeddingProvider(),
        )

        engine = get_engine()
        with engine.begin() as conn:
            seed_rows(
                conn,
                [
                    ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-search-ml", "hash")),
                    (
                        "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                        (1, "Alice", "student", "CS", "AI", "2026"),
                    ),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("History Source", "Author H", "TP", "history", "source record")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Vector Alpha", "Author A", "TP", "alpha", "first candidate")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Latent Beta", "Author B", "TP", "beta", "second candidate")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Noise Tail", "Author C", "TP", "tail", "tail candidate")),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (2, "cabinet-001", 1, 1, 0)),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (3, "cabinet-001", 1, 1, 0)),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (4, "cabinet-001", 1, 1, 0)),
                    ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 1, None, "cabinet_pickup", "completed")),
                ],
            )

        set_book_embedding(2, make_embedding((0, 0.98), (1, 0.02)))
        set_book_embedding(3, make_embedding((0, 0.97), (1, 0.03)))
        set_book_embedding(4, make_embedding((0, 0.10), (1, 0.90)))

        response = client.post(
            "/api/v1/recommendation/search",
            headers=reader_headers(),
            json={"query": "find a machine learning book", "limit": 3},
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["ranking"]["enabled"] is True
        assert payload["ranking"]["ranking_mode"] == "reader_book"
        assert payload["results"][0]["book_id"] == 3
        assert payload["results"][0]["evidence"]["ranking_model"]["model_type"] == "implicit_matrix_factorization"


def test_similar_books_endpoint_applies_book_pair_ml_rerank(tmp_path, monkeypatch):
    model_payload = {
        "model_type": "implicit_matrix_factorization",
        "version": 1,
        "latent_dim": 2,
        "global_bias": 0.0,
        "reader_factors": {},
        "book_factors": {
            "1": [1.0, 0.0],
            "2": [0.0, 1.0],
            "3": [1.0, 0.0],
            "4": [0.5, 0.5],
        },
        "book_biases": {"1": 0.0, "2": 0.0, "3": 0.0, "4": 0.0},
        "book_popularity": {"2": 2, "3": 4, "4": 1},
        "trained_at": "2026-03-26T12:00:00+00:00",
        "training_summary": {"interaction_count": 18},
    }

    with build_ml_client(tmp_path, monkeypatch, model_payload) as client:
        engine = get_engine()
        with engine.begin() as conn:
            seed_rows(
                conn,
                [
                    ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-similar-ml", "hash")),
                    (
                        "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                        (1, "Alice", "student", "CS", "AI", "2026"),
                    ),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Source Book", "Author A", "TP", "source", "source")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Content First", "Author B", "TP", "content", "candidate")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Factor Winner", "Author C", "TP", "factor", "candidate")),
                    ("INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)", ("Tail Book", "Author D", "TP", "tail", "candidate")),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (2, "cabinet-001", 1, 1, 0)),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (3, "cabinet-001", 1, 1, 0)),
                    ("INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)", (4, "cabinet-001", 1, 1, 0)),
                ],
            )

        set_book_embedding(1, make_embedding((0, 1.0), (1, 0.0)))
        set_book_embedding(2, make_embedding((0, 0.98), (1, 0.02)))
        set_book_embedding(3, make_embedding((0, 0.97), (1, 0.03)))
        set_book_embedding(4, make_embedding((0, 0.10), (1, 0.90)))

        response = client.get(
            "/api/v1/recommendation/books/1/similar?limit=3",
            headers=reader_headers(),
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["ranking"]["enabled"] is True
        assert payload["ranking"]["ranking_mode"] == "book_pair"
        assert payload["results"][0]["book_id"] == 3
        assert payload["results"][0]["evidence"]["ranking_model"]["ranking_mode"] == "book_pair"
