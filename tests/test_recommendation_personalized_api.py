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


def test_personalized_books_endpoint_uses_reader_history(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-personalized", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-personalized-2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Bob", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-personalized-3", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (3, "Cara", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Statistics", "Author A", "C8", "stats,data", "history source 1"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Applied Statistics", "Author B", "C8", "stats,applied", "history source 2"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Statistical Thinking", "Author C", "C8", "stats,thinking", "recommended item"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Research Methods", "Author D", "G30", "research,methods", "recommended item"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Ancient Poetry", "Author E", "I207", "poetry,ancient", "distant item"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (3, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (4, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (5, "cabinet-001", 1, 0, 0),
                ),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 2, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 3, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (3, 2, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (3, 4, None, "cabinet_pickup", "completed")),
            ],
        )

    set_book_embedding(1, make_embedding((0, 1.0), (1, 0.0)))
    set_book_embedding(2, make_embedding((0, 0.95), (1, 0.05)))
    set_book_embedding(3, make_embedding((0, 0.90), (1, 0.10)))
    set_book_embedding(4, make_embedding((0, 0.10), (1, 0.90)))
    set_book_embedding(5, make_embedding((0, 0.0), (1, 1.0)))

    response = client.get(
        "/api/v1/recommendation/me/personalized?limit=3&history_limit=2",
        headers=reader_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["reader_id"] == 1
    assert [item["book_id"] for item in payload["history_books"]] == [2, 1]
    assert [item["book_id"] for item in payload["results"]] == [3, 4]
    assert payload["results"][0]["provider_note"] == "personalized"
    assert payload["results"][0]["evidence"]["retrieval_mode"] == "personalized_hybrid_history"
    assert payload["results"][0]["evidence"]["signal_sources"] == ["collaborative", "similar"]
    assert payload["results"][0]["deliverable"] is True

    with engine.begin() as conn:
        rows = conn.exec_driver_sql(
            "SELECT query_text, result_title, rank_position FROM recommendation_logs ORDER BY rank_position ASC"
        ).fetchall()

    assert rows[0][0] == "personalized_reader:1"
    assert rows[0][1] == "Statistical Thinking"


def test_personalized_books_endpoint_returns_controlled_error_when_history_missing(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-empty-history", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
            ],
        )

    response = client.get(
        "/api/v1/recommendation/me/personalized",
        headers=reader_headers(),
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "reader_borrow_history_missing"
