from __future__ import annotations

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_engine, get_session_factory
from app.core.security import AuthIdentity, create_token


EMBEDDING_DIMENSIONS = 1536


class FakeEmbeddingProvider:
    def __init__(self, vector: list[float]) -> None:
        self.vector = vector

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        assert len(texts) == 1
        return [self.vector]


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


def test_semantic_search_endpoint_uses_query_embedding(client, monkeypatch):
    from app.recommendation import router as recommendation_router

    monkeypatch.setattr(
        recommendation_router,
        "resolve_embedding_provider",
        lambda: FakeEmbeddingProvider(make_embedding((0, 1.0), (1, 0.0))),
    )

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-semantic", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("机器学习入门", "张三", "TP181", "机器学习,人工智能", "适合入门的机器学习书"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("人工智能基础", "李四", "TP181", "人工智能,模型", "人工智能概念导论"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("中国建筑史", "王五", "TU-092", "建筑,历史", "中国古代建筑发展史"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 2, 2, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (3, "cabinet-001", 1, 1, 0),
                ),
            ],
        )

    set_book_embedding(1, make_embedding((0, 0.98), (1, 0.02)))
    set_book_embedding(2, make_embedding((0, 0.80), (1, 0.20)))
    set_book_embedding(3, make_embedding((0, 0.00), (1, 1.00)))

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "我想找一本适合入门的机器学习书", "limit": 2},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert [item["title"] for item in payload["results"]] == ["机器学习入门", "人工智能基础"]
    assert payload["results"][0]["evidence"]["retrieval_mode"] == "python_query_embedding_fallback"
    assert payload["results"][0]["provider_note"] == "fallback"

    with engine.begin() as conn:
        rows = conn.exec_driver_sql(
            "SELECT query_text, query_mode FROM search_logs ORDER BY id ASC"
        ).fetchall()
    assert rows == [("我想找一本适合入门的机器学习书", "natural_language")]


def test_search_route_returns_controlled_error_when_embedding_provider_is_misconfigured(client, monkeypatch):
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_EMBEDDING_PROVIDER", "openai-compatible")
    monkeypatch.delenv("LIBRARY_EMBEDDING_API_KEY", raising=False)
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-embed-misconfig", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
            ],
        )

    response = client.post(
        "/api/v1/recommendation/search",
        headers=reader_headers(),
        json={"query": "机器学习", "limit": 2},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "embedding_provider_misconfigured"
