from __future__ import annotations

from app.catalog.models import Book
from app.core.database import get_engine, get_session_factory
from app.core.security import AuthIdentity, create_token


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


def test_similar_books_endpoint_returns_embedding_neighbors(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-similar", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("机器学习入门", "张三", "TP181", "机器学习,人工智能,算法", "适合新手的机器学习教材"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("机器学习实战", "张三", "TP181", "机器学习,算法,案例", "偏实战的机器学习图书"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("人工智能导论", "李四", "TP181", "人工智能,机器学习,模型", "人工智能基础读物"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("中国古代建筑史", "王五", "TU-092", "建筑,历史,古代", "建筑史方向图书"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (1, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 2, 2, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (3, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (4, "cabinet-001", 1, 0, 0),
                ),
            ],
        )

    set_book_embedding(1, make_embedding((0, 1.0), (1, 0.0)))
    set_book_embedding(2, make_embedding((0, 0.95), (1, 0.05)))
    set_book_embedding(3, make_embedding((0, 0.70), (1, 0.70)))
    set_book_embedding(4, make_embedding((0, 0.0), (1, 1.0)))

    response = client.get(
        "/api/v1/recommendation/books/1/similar?limit=2",
        headers=reader_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["source_book"]["book_id"] == 1
    assert payload["source_book"]["title"] == "机器学习入门"
    assert [item["book_id"] for item in payload["results"]] == [2, 3]
    assert payload["results"][0]["deliverable"] is True
    assert payload["results"][0]["available_copies"] == 2
    assert payload["results"][0]["provider_note"] == "embedding"
    assert payload["results"][0]["evidence"]["retrieval_mode"] == "python_cosine_fallback"

    with engine.begin() as conn:
        rows = conn.exec_driver_sql(
            "SELECT query_text, result_title, rank_position FROM recommendation_logs ORDER BY rank_position ASC"
        ).fetchall()

    assert rows[0][0] == "similar_book:1"
    assert rows[0][1] == "机器学习实战"
    assert rows[1][1] == "人工智能导论"


def test_similar_books_endpoint_returns_controlled_error_when_embedding_missing(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-no-embed", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("还没做向量的书", "作者甲", "TP181", "测试", "测试摘要"),
                ),
            ],
        )

    response = client.get(
        "/api/v1/recommendation/books/1/similar",
        headers=reader_headers(),
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_embedding_missing"
