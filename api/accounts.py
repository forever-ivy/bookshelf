"""
api/accounts.py
账户管理路由。
"""

import sqlite3

from flask import Blueprint, jsonify

from auth_utils import admin_required, current_family_id
from config import ACCOUNT_FIELDS
from extensions import (
    db_conn,
    json_body,
    row_dict,
    rows_dict,
    normalize_int,
    pick_fields,
    update_fields,
    fetch_account_row,
    fetch_user_row,
)

accounts_bp = Blueprint("accounts", __name__)


def _fetch_scoped_account(account_id):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            a.id, a.username, a.phone, a.status,
            a.last_login_at, a.created_at, a.updated_at, a.system_role,
            COUNT(DISTINCT aur.user_id) AS linked_user_count,
            COUNT(DISTINCT f.id) AS owned_family_count
        FROM accounts a
        JOIN account_user_rel aur_scope ON aur_scope.account_id = a.id
        JOIN users u_scope ON u_scope.id = aur_scope.user_id
        LEFT JOIN account_user_rel aur ON aur.account_id = a.id
        LEFT JOIN families f ON f.owner_account_id = a.id
        WHERE a.id = ? AND u_scope.family_id = ?
        GROUP BY a.id
        """,
        (account_id, current_family_id()),
    )
    row = row_dict(cur.fetchone())
    conn.close()
    return row


@accounts_bp.route("/api/accounts", methods=["GET"])
@admin_required
def api_get_accounts():
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            a.id, a.username, a.phone, a.status,
            a.last_login_at, a.created_at, a.updated_at, a.system_role,
            COUNT(DISTINCT aur.user_id) AS linked_user_count,
            COUNT(DISTINCT f.id) AS owned_family_count
        FROM accounts a
        JOIN account_user_rel aur_scope ON aur_scope.account_id = a.id
        JOIN users u_scope ON u_scope.id = aur_scope.user_id
        LEFT JOIN account_user_rel aur ON aur.account_id = a.id
        LEFT JOIN families f ON f.owner_account_id = a.id
        WHERE u_scope.family_id = ?
        GROUP BY a.id
        ORDER BY a.id
        """,
        (current_family_id(),),
    )
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


@accounts_bp.route("/api/accounts", methods=["POST"])
@admin_required
def api_create_account():
    data = json_body()
    username = (data.get("username") or "").strip() or None
    phone = (data.get("phone") or "").strip() or None
    if not username and not phone:
        return jsonify({"ok": False, "msg": "username or phone is required"}), 400

    fields = pick_fields(data, ACCOUNT_FIELDS)
    fields["username"] = username
    fields["phone"] = phone
    fields.setdefault("status", "active")

    conn = db_conn()
    cur = conn.cursor()
    columns = list(fields.keys())
    placeholders = ", ".join(["?"] * len(columns))
    try:
        cur.execute(
            f"INSERT INTO accounts ({', '.join(columns)}) VALUES ({placeholders})",
            [fields[col] for col in columns],
        )
    except sqlite3.IntegrityError as exc:
        conn.close()
        return jsonify({"ok": False, "msg": str(exc)}), 400
    account_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": account_id, "account": _fetch_scoped_account(account_id)})


@accounts_bp.route("/api/accounts/<int:account_id>", methods=["GET"])
@admin_required
def api_get_account(account_id):
    account = _fetch_scoped_account(account_id)
    if not account:
        return jsonify({"ok": False, "msg": "account not found"}), 404
    return jsonify(account)


@accounts_bp.route("/api/accounts/<int:account_id>", methods=["PUT"])
@admin_required
def api_update_account(account_id):
    if not _fetch_scoped_account(account_id):
        return jsonify({"ok": False, "msg": "account not found"}), 404

    data = json_body()
    fields = pick_fields(data, ACCOUNT_FIELDS)
    if "username" in fields:
        fields["username"] = (fields.get("username") or "").strip() or None
    if "phone" in fields:
        fields["phone"] = (fields.get("phone") or "").strip() or None
    if not fields:
        return jsonify({"ok": False, "msg": "no fields to update"}), 400

    conn = db_conn()
    cur = conn.cursor()
    try:
        update_fields(cur, "accounts", account_id, fields)
        conn.commit()
    except sqlite3.IntegrityError as exc:
        conn.close()
        return jsonify({"ok": False, "msg": str(exc)}), 400
    conn.close()
    return jsonify({"ok": True, "account": _fetch_scoped_account(account_id)})


@accounts_bp.route("/api/accounts/<int:account_id>", methods=["DELETE"])
@admin_required
def api_delete_account(account_id):
    account = _fetch_scoped_account(account_id)
    if not account:
        return jsonify({"ok": False, "msg": "account not found"}), 404
    if account.get("linked_user_count"):
        return jsonify({"ok": False, "msg": "account still has linked users"}), 400
    if account.get("owned_family_count"):
        return jsonify({"ok": False, "msg": "account still owns families"}), 400

    conn = db_conn()
    conn.execute("DELETE FROM accounts WHERE id=?", (account_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@accounts_bp.route("/api/accounts/<int:account_id>/users", methods=["GET"])
@admin_required
def api_get_account_users(account_id):
    if not _fetch_scoped_account(account_id):
        return jsonify({"ok": False, "msg": "account not found"}), 404

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            aur.account_id, aur.user_id, aur.relation_type, aur.created_at,
            u.name, u.role, u.avatar, u.color
        FROM account_user_rel aur
        JOIN users u ON u.id = aur.user_id
        WHERE aur.account_id = ?
          AND u.family_id = ?
        ORDER BY aur.id
        """,
        (account_id, current_family_id()),
    )
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


@accounts_bp.route("/api/accounts/<int:account_id>/users", methods=["POST"])
@admin_required
def api_link_account_user(account_id):
    if not _fetch_scoped_account(account_id):
        return jsonify({"ok": False, "msg": "account not found"}), 404

    data = json_body()
    user_id = normalize_int(data.get("user_id"))
    relation_type = (data.get("relation_type") or "member").strip() or "member"
    if user_id is None:
        return jsonify({"ok": False, "msg": "user_id is required"}), 400
    if not fetch_user_row(user_id):
        return jsonify({"ok": False, "msg": "user not found"}), 404

    conn = db_conn()
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO account_user_rel (account_id, user_id, relation_type) VALUES (?, ?, ?)",
            (account_id, user_id, relation_type),
        )
    except sqlite3.IntegrityError as exc:
        conn.close()
        return jsonify({"ok": False, "msg": str(exc)}), 400
    relation_id = cur.lastrowid
    conn.commit()
    cur.execute(
        """
        SELECT id, account_id, user_id, relation_type, created_at
        FROM account_user_rel
        WHERE id = ?
        """,
        (relation_id,),
    )
    relation = row_dict(cur.fetchone())
    conn.close()
    return jsonify({"ok": True, "relation": relation})


@accounts_bp.route("/api/accounts/<int:account_id>/users/<int:user_id>", methods=["DELETE"])
@admin_required
def api_unlink_account_user(account_id, user_id):
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM account_user_rel WHERE account_id=? AND user_id=?", (account_id, user_id))
    deleted = cur.rowcount
    conn.commit()
    conn.close()
    if not deleted:
        return jsonify({"ok": False, "msg": "relation not found"}), 404
    return jsonify({"ok": True})
