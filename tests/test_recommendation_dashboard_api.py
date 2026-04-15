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


def test_recommendation_dashboard_aggregates_modules(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-dashboard", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-dashboard-2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Bob", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Statistics", "Author A", "C8", "stats,data", "history source"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Applied Statistics", "Author B", "C8", "stats,applied", "candidate one"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Statistical Thinking", "Author C", "C8", "stats,thinking", "candidate two"),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (2, "cabinet-001", 1, 1, 0),
                ),
                (
                    "INSERT INTO book_stock (book_id, cabinet_id, total_copies, available_copies, reserved_copies) VALUES (?, ?, ?, ?, ?)",
                    (3, "cabinet-001", 1, 1, 0),
                ),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, requested_book_id, fulfilled_copy_id, fulfillment_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 2, None, "cabinet_pickup", "completed")),
            ],
        )

    set_book_embedding(1, make_embedding((0, 1.0), (1, 0.0)))
    set_book_embedding(2, make_embedding((0, 0.95), (1, 0.05)))
    set_book_embedding(3, make_embedding((0, 0.90), (1, 0.10)))

    response = client.get(
        "/api/v1/recommendation/me/dashboard?limit=3&history_limit=1",
        headers=reader_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["reader_id"] == 1
    assert payload["focus_book"]["book_id"] == 1
    assert payload["modules"]["similar"]["ok"] is True
    assert payload["modules"]["hybrid"]["ok"] is True
    assert payload["suggested_queries"]


def test_recommendation_dashboard_returns_controlled_error_when_no_history(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-dashboard-empty", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
            ],
        )

    response = client.get(
        "/api/v1/recommendation/me/dashboard",
        headers=reader_headers(),
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "reader_borrow_history_missing"
