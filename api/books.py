"""
api/books.py
图书 CRUD 路由。
"""

import sqlite3

from flask import Blueprint, jsonify, request

from config import BOOK_FIELDS
from extensions import (
    db_conn,
    json_body,
    rows_dict,
    normalize_int,
    pick_fields,
    update_fields,
    fetch_book_row,
)

books_bp = Blueprint("books", __name__)


@books_bp.route("/api/books", methods=["GET"])
def api_books():
    q = (request.args.get("q") or "").strip()
    category = (request.args.get("category") or "").strip()
    stored_only = (request.args.get("stored_only") or "").strip().lower() in ("1", "true", "yes", "on")
    limit = min(max(int(request.args.get("limit", 100)), 1), 500)

    where = []
    params = []
    if q:
        where.append("(b.title LIKE ? OR COALESCE(b.author, '') LIKE ? OR COALESCE(b.isbn, '') LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like, like])
    if category:
        where.append("COALESCE(b.category, '') = ?")
        params.append(category)
    if stored_only:
        where.append("EXISTS (SELECT 1 FROM stored_books sbx WHERE sbx.book_id = b.id)")

    sql = """
        SELECT
            b.*,
            COUNT(sb.compartment_id) AS on_shelf_count,
            CASE WHEN COUNT(sb.compartment_id) > 0 THEN 1 ELSE 0 END AS is_on_shelf,
            GROUP_CONCAT(sb.compartment_id) AS compartment_ids
        FROM books b
        LEFT JOIN stored_books sb ON sb.book_id = b.id
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " GROUP BY b.id ORDER BY b.id DESC LIMIT ?"
    params.append(limit)

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


@books_bp.route("/api/books", methods=["POST"])
def api_create_book():
    data = json_body()
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"ok": False, "msg": "title is required"}), 400

    fields = pick_fields(data, BOOK_FIELDS)
    fields["title"] = title
    for key in ("publish_year", "age_min", "age_max"):
        if key in fields:
            fields[key] = normalize_int(fields.get(key))

    conn = db_conn()
    cur = conn.cursor()
    columns = list(fields.keys())
    placeholders = ", ".join(["?"] * len(columns))
    cur.execute(
        f"INSERT INTO books ({', '.join(columns)}) VALUES ({placeholders})",
        [fields[col] for col in columns],
    )
    book_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": book_id, "book": fetch_book_row(book_id)})


@books_bp.route("/api/books/<int:book_id>", methods=["GET"])
def api_get_book(book_id):
    book = fetch_book_row(book_id)
    if not book:
        return jsonify({"ok": False, "msg": "book not found"}), 404
    return jsonify(book)


@books_bp.route("/api/books/<int:book_id>", methods=["PUT"])
def api_update_book(book_id):
    if not fetch_book_row(book_id):
        return jsonify({"ok": False, "msg": "book not found"}), 404

    data = json_body()
    fields = pick_fields(data, BOOK_FIELDS)
    if "title" in data:
        fields["title"] = (data.get("title") or "").strip()
    for key in ("publish_year", "age_min", "age_max"):
        if key in fields:
            fields[key] = normalize_int(fields.get(key))
    if not fields:
        return jsonify({"ok": False, "msg": "no fields to update"}), 400

    conn = db_conn()
    cur = conn.cursor()
    update_fields(cur, "books", book_id, fields)
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "book": fetch_book_row(book_id)})
