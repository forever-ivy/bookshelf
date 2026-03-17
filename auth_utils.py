"""
auth_utils.py
二维码配对、JWT 认证、当前身份解析与鉴权辅助。
"""

from __future__ import annotations

import functools
import secrets
import socket
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import jwt
from flask import g, jsonify, redirect, request
from werkzeug.security import check_password_hash, generate_password_hash

from config import (
    AUTH_COOKIE_NAME,
    AUTH_COOKIE_SECURE,
    CABINET_NAME_DEFAULT,
    JWT_ALGORITHM,
    JWT_EXPIRES_DAYS,
    JWT_SECRET,
    PAIR_CODE_EXPIRES_MINUTES,
    PAIR_TOKEN_EXPIRES_MINUTES,
    PUBLIC_BASE_URL,
)
from extensions import db_conn, error_envelope, fetch_user_row, row_dict


class AuthError(Exception):
    def __init__(self, message: str, status_code: int, code: str):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


AUTH_COOKIE_RESET_CODES = {
    "auth_invalid",
    "token_expired",
    "token_invalid",
    "token_revoked",
}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _sqlite_timestamp(value: datetime | None = None) -> str:
    current = (value or _utc_now()).astimezone(timezone.utc).replace(tzinfo=None)
    return current.strftime("%Y-%m-%d %H:%M:%S")


def _parse_sqlite_timestamp(raw_value: str | None) -> datetime | None:
    if not raw_value:
        return None
    return datetime.strptime(raw_value, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc)


def _db_columns(cur: sqlite3.Cursor, table_name: str) -> set[str]:
    cur.execute(f"PRAGMA table_info({table_name})")
    return {row[1] for row in cur.fetchall()}


def ensure_auth_schema() -> None:
    conn = db_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS cabinet_config (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            cabinet_name TEXT NOT NULL DEFAULT '智慧书架',
            family_id INTEGER,
            initialized INTEGER NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (family_id) REFERENCES families(id)
        )
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS pair_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL UNIQUE,
            issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            used_at DATETIME
        )
        """
    )

    account_columns = _db_columns(cur, "accounts")
    if "system_role" not in account_columns:
        cur.execute("ALTER TABLE accounts ADD COLUMN system_role TEXT NOT NULL DEFAULT 'user'")
    if "token_version" not in account_columns:
        cur.execute("ALTER TABLE accounts ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0")

    cur.execute("SELECT COUNT(*) AS count FROM cabinet_config WHERE id = 1")
    has_config = cur.fetchone()["count"] > 0
    if not has_config:
        cur.execute(
            """
            SELECT id, family_name
            FROM families
            ORDER BY id
            LIMIT 1
            """
        )
        family_row = cur.fetchone()
        family_id = family_row["id"] if family_row else None
        initialized = 1 if family_row else 0
        cur.execute(
            """
            INSERT INTO cabinet_config (id, cabinet_name, family_id, initialized)
            VALUES (1, ?, ?, ?)
            """,
            (CABINET_NAME_DEFAULT, family_id, initialized),
        )

    cur.execute(
        """
        UPDATE accounts
        SET system_role = 'admin'
        WHERE id IN (
            SELECT owner_account_id
            FROM families
            WHERE owner_account_id IS NOT NULL
        )
        """
    )
    cur.execute(
        """
        UPDATE accounts
        SET system_role = COALESCE(system_role, 'user')
        WHERE system_role NOT IN ('admin', 'user')
           OR system_role IS NULL
        """
    )

    conn.commit()
    conn.close()


def _sanitize_account(account: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": account["id"],
        "username": account.get("username"),
        "phone": account.get("phone"),
        "status": account.get("status"),
        "last_login_at": account.get("last_login_at"),
        "created_at": account.get("created_at"),
        "updated_at": account.get("updated_at"),
        "system_role": account.get("system_role", "user"),
    }


def get_cabinet_config() -> dict[str, Any]:
    ensure_auth_schema()
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            c.id,
            c.cabinet_name,
            c.family_id,
            c.initialized,
            c.created_at,
            c.updated_at,
            f.family_name
        FROM cabinet_config c
        LEFT JOIN families f ON f.id = c.family_id
        WHERE c.id = 1
        """
    )
    row = row_dict(cur.fetchone()) or {}
    conn.close()
    row["initialized"] = bool(row.get("initialized"))
    return row


def _encode_token(payload: dict[str, Any]) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_token(token: str, *, expected_type: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise AuthError("凭证已过期", 401, "token_expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthError("凭证无效", 401, "token_invalid") from exc

    if payload.get("type") != expected_type:
        raise AuthError("凭证类型不正确", 401, "token_invalid")
    return payload


def create_auth_token(account_id: int, user_id: int, token_version: int) -> str:
    now = _utc_now()
    payload = {
        "type": "auth",
        "sub": str(account_id),
        "user_id": user_id,
        "token_version": token_version,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=JWT_EXPIRES_DAYS)).timestamp()),
    }
    return _encode_token(payload)


def create_pair_token(pair_code: str) -> str:
    now = _utc_now()
    payload = {
        "type": "pair",
        "pair_code": pair_code,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=PAIR_TOKEN_EXPIRES_MINUTES)).timestamp()),
    }
    return _encode_token(payload)


def decode_pair_token(pair_token: str) -> dict[str, Any]:
    return _decode_token(pair_token, expected_type="pair")


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def password_matches(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    return check_password_hash(password_hash, password)


def _guess_public_ipv4() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            candidate = sock.getsockname()[0]
    except OSError:
        return None

    if not candidate or candidate.startswith("127."):
        return None
    return candidate


def _request_origin() -> str:
    if PUBLIC_BASE_URL:
        return PUBLIC_BASE_URL

    host_url = request.host_url.rstrip("/")
    parsed = urlsplit(host_url)
    hostname = parsed.hostname or ""
    if hostname not in {"127.0.0.1", "localhost", "::1"}:
        return host_url

    lan_ip = _guess_public_ipv4()
    if not lan_ip:
        return host_url

    netloc = lan_ip
    if parsed.port:
        netloc = f"{lan_ip}:{parsed.port}"

    return urlunsplit((parsed.scheme, netloc, "", "", ""))


def issue_pair_code() -> dict[str, Any]:
    ensure_auth_schema()
    conn = db_conn()
    cur = conn.cursor()

    pair_code = secrets.token_urlsafe(9)
    expires_at = _sqlite_timestamp(_utc_now() + timedelta(minutes=PAIR_CODE_EXPIRES_MINUTES))
    cur.execute(
        """
        INSERT INTO pair_codes (code, expires_at)
        VALUES (?, ?)
        """,
        (pair_code, expires_at),
    )
    conn.commit()
    conn.close()

    cabinet = get_cabinet_config()
    origin = _request_origin()
    return {
        "pair_code": pair_code,
        "bind_url": f"{origin}/bind?pair_code={pair_code}",
        "expires_at": expires_at,
        "cabinet": cabinet,
    }


def exchange_pair_code(pair_code: str) -> dict[str, Any]:
    if not pair_code:
        raise AuthError("pair_code is required", 400, "pair_code_required")

    ensure_auth_schema()
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, code, issued_at, expires_at, used_at
        FROM pair_codes
        WHERE code = ?
        """,
        (pair_code,),
    )
    row = row_dict(cur.fetchone())
    if not row:
        conn.close()
        raise AuthError("配对码不存在", 400, "pair_code_invalid")

    expires_at = _parse_sqlite_timestamp(row.get("expires_at"))
    if row.get("used_at"):
        conn.close()
        raise AuthError("配对码已使用", 400, "pair_code_invalid")
    if expires_at and expires_at <= _utc_now():
        conn.close()
        raise AuthError("配对码已过期", 400, "pair_code_expired")

    cur.execute(
        """
        UPDATE pair_codes
        SET used_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND used_at IS NULL
        """,
        (row["id"],),
    )
    if cur.rowcount != 1:
        conn.close()
        raise AuthError("配对码已使用", 400, "pair_code_invalid")
    conn.commit()
    conn.close()

    cabinet = get_cabinet_config()
    return {
        "pair_code": pair_code,
        "pair_token": create_pair_token(pair_code),
        "requires_setup": not cabinet.get("initialized"),
        "cabinet": cabinet,
    }


def _fetch_account_with_hash(username: str) -> dict[str, Any] | None:
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            id,
            username,
            phone,
            password_hash,
            status,
            last_login_at,
            created_at,
            updated_at,
            system_role,
            token_version
        FROM accounts
        WHERE username = ?
        LIMIT 1
        """,
        (username,),
    )
    row = row_dict(cur.fetchone())
    conn.close()
    return row


def fetch_account_identity(account_id: int) -> dict[str, Any] | None:
    cabinet = get_cabinet_config()
    cabinet_family_id = cabinet.get("family_id")

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            a.id,
            a.username,
            a.phone,
            a.status,
            a.last_login_at,
            a.created_at,
            a.updated_at,
            a.system_role,
            a.token_version,
            u.id AS user_id,
            u.family_id AS user_family_id
        FROM accounts a
        LEFT JOIN account_user_rel aur ON aur.account_id = a.id
        LEFT JOIN users u ON u.id = aur.user_id
        WHERE a.id = ?
        ORDER BY CASE
            WHEN ? IS NOT NULL AND u.family_id = ? THEN 0
            ELSE 1
        END, aur.id
        LIMIT 1
        """,
        (account_id, cabinet_family_id, cabinet_family_id),
    )
    row = row_dict(cur.fetchone())
    conn.close()
    if not row or not row.get("user_id"):
        return None

    user = fetch_user_row(row["user_id"])
    if not user:
        return None
    return {
        "account": _sanitize_account(row),
        "user": user,
        "cabinet": cabinet,
        "token_version": row.get("token_version", 0),
    }


def _sync_legacy_user_session(user_id: int) -> None:
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("SELECT user_id FROM user_sessions WHERE id = 1")
    row = cur.fetchone()
    if row is None:
        cur.execute("INSERT INTO user_sessions (id, user_id) VALUES (1, ?)", (user_id,))
    elif row["user_id"] != user_id:
        cur.execute(
            "UPDATE user_sessions SET user_id = ?, switched_at = CURRENT_TIMESTAMP WHERE id = 1",
            (user_id,),
        )
    conn.commit()
    conn.close()


def get_request_token() -> str | None:
    auth_header = (request.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip() or None
    return request.cookies.get(AUTH_COOKIE_NAME)


def should_clear_auth_cookie(code: str | None) -> bool:
    return code in AUTH_COOKIE_RESET_CODES


def load_current_identity(*, silent: bool = False) -> dict[str, Any] | None:
    if getattr(g, "auth_identity", None) is not None:
        return g.auth_identity

    token = get_request_token()
    if not token:
        if silent:
            return None
        raise AuthError("请先登录", 401, "auth_required")

    try:
        claims = _decode_token(token, expected_type="auth")
        account_id = int(claims["sub"])
        identity = fetch_account_identity(account_id)
        if not identity:
            raise AuthError("账号未绑定家庭成员", 401, "auth_invalid")
        if identity["account"].get("status") != "active":
            raise AuthError("账号不可用", 403, "account_inactive")
        if claims.get("token_version") != identity.get("token_version"):
            raise AuthError("登录已失效，请重新登录", 401, "token_revoked")
    except AuthError:
        if silent:
            return None
        raise

    g.auth_identity = {
        "account": identity["account"],
        "user": identity["user"],
        "cabinet": identity["cabinet"],
        "token": token,
    }
    g.current_account = identity["account"]
    g.current_user = identity["user"]
    g.current_cabinet = identity["cabinet"]
    _sync_legacy_user_session(identity["user"]["id"])
    return g.auth_identity


def current_identity() -> dict[str, Any]:
    identity = load_current_identity()
    assert identity is not None
    return identity


def current_account() -> dict[str, Any]:
    return current_identity()["account"]


def current_user() -> dict[str, Any]:
    return current_identity()["user"]


def current_family_id() -> int | None:
    return current_user().get("family_id")


def is_admin() -> bool:
    return current_account().get("system_role") == "admin"


def ensure_user_in_current_family(user_id: int) -> dict[str, Any]:
    user = fetch_user_row(user_id)
    if not user:
        raise AuthError("user not found", 404, "user_not_found")
    if user.get("family_id") != current_family_id():
        raise AuthError("没有权限访问该成员", 403, "family_forbidden")
    return user


def set_auth_cookie(response, token: str) -> None:
    response.set_cookie(
        AUTH_COOKIE_NAME,
        token,
        max_age=JWT_EXPIRES_DAYS * 24 * 60 * 60,
        httponly=True,
        samesite="Lax",
        secure=AUTH_COOKIE_SECURE,
        path="/",
    )


def clear_auth_cookie(response) -> None:
    response.delete_cookie(AUTH_COOKIE_NAME, path="/")


def login_required(view=None, *, page: bool = False):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapped(*args, **kwargs):
            try:
                load_current_identity()
            except AuthError as exc:
                if page:
                    response = redirect("/")
                    if should_clear_auth_cookie(exc.code):
                        clear_auth_cookie(response)
                    return response
                response = jsonify(error_envelope(exc.message, code=exc.code))
                if should_clear_auth_cookie(exc.code):
                    clear_auth_cookie(response)
                return response, exc.status_code
            return fn(*args, **kwargs)

        return wrapped

    if view is not None:
        return decorator(view)
    return decorator


def admin_required(fn):
    @functools.wraps(fn)
    def wrapped(*args, **kwargs):
        try:
            load_current_identity()
        except AuthError as exc:
            return jsonify(error_envelope(exc.message, code=exc.code)), exc.status_code
        if not is_admin():
            return jsonify(error_envelope("需要管理员权限", code="admin_required")), 403
        return fn(*args, **kwargs)

    return wrapped


def guard_request():
    path = request.path or "/"
    if path.startswith("/static/"):
        return None
    if path in {"/", "/bind"}:
        if load_current_identity(silent=True):
            return redirect("/app")
        return None
    if path.startswith("/api/auth/"):
        return None
    if path == "/app":
        try:
            load_current_identity()
        except AuthError as exc:
            response = redirect("/")
            if should_clear_auth_cookie(exc.code):
                clear_auth_cookie(response)
            return response
        return None
    if path.startswith("/api/"):
        try:
            load_current_identity()
        except AuthError as exc:
            response = jsonify(error_envelope(exc.message, code=exc.code))
            if should_clear_auth_cookie(exc.code):
                clear_auth_cookie(response)
            return response, exc.status_code
        return None
    return None
