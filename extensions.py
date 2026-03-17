"""
extensions.py
通用工具函数：DB 连接、字段处理、响应封装、通用查询。
"""

import sqlite3

from config import DB_PATH


# ── DB 连接 ────────────────────────────────────────────────

def db_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# ── 请求 / 行 转换 ────────────────────────────────────────

def json_body():
    from flask import request
    return request.get_json(silent=True) or {}


def row_dict(row):
    return dict(row) if row else None


def rows_dict(rows):
    return [dict(row) for row in rows]


# ── 字段处理 ───────────────────────────────────────────────

def normalize_int(value):
    if value in (None, ""):
        return None
    return int(value)


def pick_fields(data, allowed_fields):
    picked = {}
    for field in allowed_fields:
        if field in data:
            picked[field] = data.get(field)
    return picked


def update_fields(cur, table, row_id, fields, key_col="id"):
    if not fields:
        return False
    assignments = ", ".join(f"{key}=?" for key in fields.keys())
    values = list(fields.values()) + [row_id]
    cur.execute(f"UPDATE {table} SET {assignments} WHERE {key_col}=?", values)
    return cur.rowcount > 0


# ── 响应封装 ───────────────────────────────────────────────

def success_envelope(data=None, message=None):
    payload = {"ok": True, "data": data}
    if message:
        payload["message"] = message
    return payload


def error_envelope(message, *, code=None, details=None):
    payload = {"ok": False, "data": None, "message": message}
    error = {}
    if code:
        error["code"] = code
    if details is not None:
        error["details"] = details
    if error:
        payload["error"] = error
    return payload


def is_envelope_payload(payload):
    return (
        isinstance(payload, dict)
        and "ok" in payload
        and "data" in payload
        and set(payload.keys()).issubset({"ok", "data", "message", "error"})
    )


# ── 通用查询 ──────────────────────────────────────────────

def fetch_user_row(uid):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            u.id, u.name, u.role, u.avatar, u.pin, u.color, u.created_at,
            u.gender, u.birth_date, u.age, u.grade_level, u.reading_level,
            u.interests, u.family_id, u.updated_at,
            f.family_name
        FROM users u
        LEFT JOIN families f ON u.family_id = f.id
        WHERE u.id = ?
        """,
        (uid,),
    )
    row = cur.fetchone()
    conn.close()
    return row_dict(row)


def fetch_active_session_user_row():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            u.id, u.name, u.role, u.avatar, u.pin, u.color, u.created_at,
            u.gender, u.birth_date, u.age, u.grade_level, u.reading_level,
            u.interests, u.family_id, u.updated_at,
            f.family_name
        FROM user_sessions s
        JOIN users u ON u.id = s.user_id
        LEFT JOIN families f ON f.id = u.family_id
        WHERE s.id = 1
        """
    )
    row = cur.fetchone()
    conn.close()
    return row_dict(row)


def fetch_book_row(book_id):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            b.*,
            COUNT(sb.compartment_id) AS on_shelf_count,
            CASE WHEN COUNT(sb.compartment_id) > 0 THEN 1 ELSE 0 END AS is_on_shelf
        FROM books b
        LEFT JOIN stored_books sb ON sb.book_id = b.id
        WHERE b.id = ?
        GROUP BY b.id
        """,
        (book_id,),
    )
    row = cur.fetchone()
    conn.close()
    return row_dict(row)


def fetch_family_row(family_id):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            f.id, f.family_name, f.owner_account_id, f.created_at,
            a.username AS owner_username,
            COUNT(u.id) AS member_count
        FROM families f
        LEFT JOIN accounts a ON a.id = f.owner_account_id
        LEFT JOIN users u ON u.family_id = f.id
        WHERE f.id = ?
        GROUP BY f.id
        """,
        (family_id,),
    )
    row = cur.fetchone()
    conn.close()
    return row_dict(row)


def fetch_account_row(account_id):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            a.id, a.username, a.phone, a.password_hash, a.status,
            a.last_login_at, a.created_at, a.updated_at,
            COUNT(DISTINCT aur.user_id) AS linked_user_count,
            COUNT(DISTINCT f.id) AS owned_family_count
        FROM accounts a
        LEFT JOIN account_user_rel aur ON aur.account_id = a.id
        LEFT JOIN families f ON f.owner_account_id = a.id
        WHERE a.id = ?
        GROUP BY a.id
        """,
        (account_id,),
    )
    row = cur.fetchone()
    conn.close()
    return row_dict(row)
