from __future__ import annotations

from app.core.database import get_engine
from app.core.security import AuthIdentity, create_token


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


def test_collaborative_books_endpoint_returns_co_borrowed_titles(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-cf", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-cf-2", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (2, "Bob", "student", "CS", "AI", "2026"),
                ),
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-cf-3", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (3, "Cara", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Statistics", "Author A", "C8", "stats,data", "source book"),
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
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("Linear Algebra", "Author D", "O151", "math,algebra", "candidate three"),
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
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (3, 1, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 2, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (2, 2, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 3, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (3, 3, None, "cabinet_pickup", "completed")),
                ("INSERT INTO borrow_orders (reader_id, book_id, assigned_copy_id, order_mode, status) VALUES (?, ?, ?, ?, ?)", (1, 4, None, "cabinet_pickup", "completed")),
            ],
        )

    response = client.get(
        "/api/v1/recommendation/books/1/collaborative?limit=3",
        headers=reader_headers(),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["source_book"]["book_id"] == 1
    assert [item["book_id"] for item in payload["results"]] == [2, 3, 4]
    assert payload["results"][0]["provider_note"] == "collaborative"
    assert payload["results"][0]["evidence"]["overlap_reader_count"] == 2
    assert payload["results"][0]["evidence"]["source_reader_count"] == 3
    assert payload["results"][0]["evidence"]["candidate_reader_count"] == 2
    assert payload["results"][0]["deliverable"] is True
    assert payload["results"][2]["deliverable"] is False

    with engine.begin() as conn:
        rows = conn.exec_driver_sql(
            "SELECT query_text, result_title, rank_position FROM recommendation_logs ORDER BY rank_position ASC"
        ).fetchall()

    assert rows[0][0] == "collaborative_book:1"
    assert rows[0][1] == "Applied Statistics"
    assert rows[1][1] == "Statistical Thinking"


def test_collaborative_books_endpoint_returns_controlled_error_when_history_missing(client):
    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                ("INSERT INTO reader_accounts (username, password_hash) VALUES (?, ?)", ("reader-no-cf", "hash")),
                (
                    "INSERT INTO reader_profiles (account_id, display_name, affiliation_type, college, major, grade_year) VALUES (?, ?, ?, ?, ?, ?)",
                    (1, "Alice", "student", "CS", "AI", "2026"),
                ),
                (
                    "INSERT INTO books (title, author, category, keywords, summary) VALUES (?, ?, ?, ?, ?)",
                    ("No History Book", "Author", "C8", "stats", "no history"),
                ),
            ],
        )

    response = client.get(
        "/api/v1/recommendation/books/1/collaborative",
        headers=reader_headers(),
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "book_borrow_history_missing"
