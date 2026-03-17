"""
api/auth.py
公开入口、二维码配对、注册登录与当前身份接口。
"""

import base64
import io
import sqlite3

from flask import Blueprint, jsonify, render_template, request
import qrcode
import qrcode.image.svg

from auth_utils import (
    AuthError,
    clear_auth_cookie,
    create_auth_token,
    current_account,
    current_identity,
    current_user,
    decode_pair_token,
    exchange_pair_code,
    get_cabinet_config,
    hash_password,
    issue_pair_code,
    password_matches,
    set_auth_cookie,
    should_clear_auth_cookie,
)
from extensions import db_conn, error_envelope, json_body, row_dict, success_envelope


auth_bp = Blueprint("auth", __name__)


def _build_qr_image_url(content: str) -> str:
    image = qrcode.make(
        content,
        image_factory=qrcode.image.svg.SvgPathImage,
        box_size=10,
        border=2,
    )
    stream = io.BytesIO()
    image.save(stream)
    svg_data = stream.getvalue()
    encoded = base64.b64encode(svg_data).decode("ascii")
    return f"data:image/svg+xml;base64,{encoded}"


def _fetch_account_with_hash(username: str):
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


def _fetch_identity(account_id: int):
    from auth_utils import fetch_account_identity

    return fetch_account_identity(account_id)


@auth_bp.route("/")
def public_home():
    cabinet = get_cabinet_config()
    return render_template("public_home.html", cabinet=cabinet)


@auth_bp.route("/bind")
def bind_home():
    cabinet = get_cabinet_config()
    return render_template("bind.html", cabinet=cabinet)


@auth_bp.route("/api/auth/pair/issue", methods=["POST"])
def api_issue_pair_code():
    data = issue_pair_code()
    data["qr_image_url"] = _build_qr_image_url(data["bind_url"])
    return jsonify(success_envelope(data=data))


@auth_bp.route("/api/auth/pair/exchange", methods=["POST"])
def api_exchange_pair_code():
    payload = json_body()
    try:
        data = exchange_pair_code((payload.get("pair_code") or "").strip())
    except AuthError as exc:
        return jsonify(error_envelope(exc.message, code=exc.code)), exc.status_code
    return jsonify(success_envelope(data=data))


@auth_bp.route("/api/auth/register", methods=["POST"])
def api_register():
    payload = json_body()
    pair_token = (payload.get("pair_token") or "").strip()
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    display_name = (payload.get("name") or "").strip()
    phone = (payload.get("phone") or "").strip() or None
    family_name = (payload.get("family_name") or "").strip()
    avatar = (payload.get("avatar") or "").strip()
    color = (payload.get("color") or "").strip() or "warm"

    if not pair_token:
        return jsonify(error_envelope("pair_token is required", code="pair_token_required")), 400
    if not username:
        return jsonify(error_envelope("username is required", code="username_required")), 400
    if len(password) < 6:
        return jsonify(error_envelope("password must be at least 6 characters", code="password_too_short")), 400
    if not display_name:
        return jsonify(error_envelope("name is required", code="name_required")), 400

    try:
        decode_pair_token(pair_token)
    except AuthError as exc:
        return jsonify(error_envelope(exc.message, code=exc.code)), exc.status_code

    cabinet = get_cabinet_config()
    is_first_account = not cabinet.get("initialized")
    if is_first_account and not family_name:
        return jsonify(error_envelope("family_name is required for first setup", code="family_name_required")), 400
    if not avatar:
        avatar = "👨" if is_first_account else "🧒"

    conn = db_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO accounts (username, phone, password_hash, status, system_role, token_version)
            VALUES (?, ?, ?, 'active', ?, 0)
            """,
            (username, phone, hash_password(password), "admin" if is_first_account else "user"),
        )
    except sqlite3.IntegrityError as exc:
        conn.close()
        return jsonify(error_envelope(str(exc), code="account_conflict")), 400

    account_id = cur.lastrowid

    if is_first_account:
        cur.execute(
            """
            INSERT INTO families (family_name, owner_account_id)
            VALUES (?, ?)
            """,
            (family_name, account_id),
        )
        family_id = cur.lastrowid
        cur.execute(
            """
            UPDATE cabinet_config
            SET family_id = ?, initialized = 1, updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            """,
            (family_id,),
        )
        user_role = "parent"
        relation_type = "owner"
    else:
        family_id = cabinet.get("family_id")
        if family_id is None:
            conn.rollback()
            conn.close()
            return jsonify(error_envelope("cabinet family is not configured", code="cabinet_uninitialized")), 400
        user_role = "child"
        relation_type = "member"

    cur.execute(
        """
        INSERT INTO users (name, role, avatar, color, family_id, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        """,
        (display_name, user_role, avatar, color, family_id),
    )
    user_id = cur.lastrowid
    cur.execute(
        """
        INSERT INTO account_user_rel (account_id, user_id, relation_type)
        VALUES (?, ?, ?)
        """,
        (account_id, user_id, relation_type),
    )
    cur.execute(
        "UPDATE accounts SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (account_id,),
    )
    conn.commit()
    conn.close()

    identity = _fetch_identity(account_id)
    if not identity:
        return jsonify(error_envelope("failed to bind account identity", code="identity_missing")), 500

    token = create_auth_token(
        account_id=identity["account"]["id"],
        user_id=identity["user"]["id"],
        token_version=0,
    )
    response = jsonify(
        success_envelope(
            data={
                "token": token,
                "account": identity["account"],
                "user": identity["user"],
                "cabinet": identity["cabinet"],
            }
        )
    )
    set_auth_cookie(response, token)
    return response


@auth_bp.route("/api/auth/login", methods=["POST"])
def api_login():
    payload = json_body()
    username = (payload.get("username") or "").strip()
    password = (payload.get("password") or "").strip()
    if not username or not password:
        return jsonify(error_envelope("username and password are required", code="credentials_required")), 400

    account = _fetch_account_with_hash(username)
    if not account or not password_matches(password, account.get("password_hash")):
        return jsonify(error_envelope("用户名或密码错误", code="invalid_credentials")), 401
    if account.get("status") != "active":
        return jsonify(error_envelope("账号不可用", code="account_inactive")), 403

    identity = _fetch_identity(account["id"])
    if not identity:
        return jsonify(error_envelope("账号未绑定家庭成员", code="identity_missing")), 403

    conn = db_conn()
    conn.execute(
        "UPDATE accounts SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (account["id"],),
    )
    conn.commit()
    conn.close()

    identity = _fetch_identity(account["id"])
    token = create_auth_token(
        account_id=identity["account"]["id"],
        user_id=identity["user"]["id"],
        token_version=account.get("token_version", 0),
    )
    response = jsonify(
        success_envelope(
            data={
                "token": token,
                "account": identity["account"],
                "user": identity["user"],
                "cabinet": identity["cabinet"],
            }
        )
    )
    set_auth_cookie(response, token)
    return response


@auth_bp.route("/api/auth/me", methods=["GET"])
def api_me():
    try:
        identity = current_identity()
    except AuthError as exc:
        response = jsonify(error_envelope(exc.message, code=exc.code))
        if should_clear_auth_cookie(exc.code):
            clear_auth_cookie(response)
        return response, exc.status_code
    return jsonify(
        success_envelope(
            data={
                "account": identity["account"],
                "user": identity["user"],
                "cabinet": identity["cabinet"],
            }
        )
    )


@auth_bp.route("/api/auth/logout", methods=["POST"])
def api_logout():
    try:
        account = current_account()
        current_user()
    except AuthError as exc:
        response = jsonify(error_envelope(exc.message, code=exc.code))
        if should_clear_auth_cookie(exc.code):
            clear_auth_cookie(response)
        return response, exc.status_code

    conn = db_conn()
    conn.execute(
        """
        UPDATE accounts
        SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (account["id"],),
    )
    conn.commit()
    conn.close()

    response = jsonify(success_envelope(data={"logged_out": True}))
    clear_auth_cookie(response)
    return response
