"""
api/families.py
家庭管理路由。
"""

import sqlite3

from flask import Blueprint, jsonify

from auth_utils import admin_required, current_family_id
from config import FAMILY_FIELDS
from extensions import (
    db_conn,
    json_body,
    row_dict,
    rows_dict,
    normalize_int,
    pick_fields,
    update_fields,
    fetch_family_row,
    fetch_account_row,
)

families_bp = Blueprint("families", __name__)


@families_bp.route("/api/families", methods=["GET"])
@admin_required
def api_get_families():
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
        ORDER BY f.id
        """,
        (current_family_id(),),
    )
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


@families_bp.route("/api/families", methods=["POST"])
@admin_required
def api_create_family():
    data = json_body()
    family_name = (data.get("family_name") or "").strip()
    owner_account_id = normalize_int(data.get("owner_account_id"))
    if not family_name:
        return jsonify({"ok": False, "msg": "family_name is required"}), 400

    if owner_account_id is not None and not fetch_account_row(owner_account_id):
        return jsonify({"ok": False, "msg": "owner account not found"}), 404

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO families (family_name, owner_account_id) VALUES (?, ?)",
        (family_name, owner_account_id),
    )
    family_id = cur.lastrowid
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "id": family_id, "family": fetch_family_row(family_id)})


@families_bp.route("/api/families/<int:family_id>", methods=["GET"])
@admin_required
def api_get_family(family_id):
    if family_id != current_family_id():
        return jsonify({"ok": False, "msg": "family not found"}), 404
    family = fetch_family_row(family_id)
    if not family:
        return jsonify({"ok": False, "msg": "family not found"}), 404

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT id, name, role, avatar, color
        FROM users
        WHERE family_id = ?
        ORDER BY id
        """,
        (family_id,),
    )
    family["members"] = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(family)


@families_bp.route("/api/families/<int:family_id>", methods=["PUT"])
@admin_required
def api_update_family(family_id):
    if family_id != current_family_id():
        return jsonify({"ok": False, "msg": "family not found"}), 404
    if not fetch_family_row(family_id):
        return jsonify({"ok": False, "msg": "family not found"}), 404

    data = json_body()
    fields = pick_fields(data, FAMILY_FIELDS)
    if "family_name" in fields:
        fields["family_name"] = (fields.get("family_name") or "").strip()
    if "owner_account_id" in fields:
        fields["owner_account_id"] = normalize_int(fields.get("owner_account_id"))
        if fields["owner_account_id"] is not None and not fetch_account_row(fields["owner_account_id"]):
            return jsonify({"ok": False, "msg": "owner account not found"}), 404
    if not fields:
        return jsonify({"ok": False, "msg": "no fields to update"}), 400

    conn = db_conn()
    cur = conn.cursor()
    update_fields(cur, "families", family_id, fields)
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "family": fetch_family_row(family_id)})


@families_bp.route("/api/families/<int:family_id>", methods=["DELETE"])
@admin_required
def api_delete_family(family_id):
    if family_id != current_family_id():
        return jsonify({"ok": False, "msg": "family not found"}), 404
    family = fetch_family_row(family_id)
    if not family:
        return jsonify({"ok": False, "msg": "family not found"}), 404
    if family.get("member_count"):
        return jsonify({"ok": False, "msg": "family still has linked users"}), 400

    conn = db_conn()
    conn.execute("DELETE FROM families WHERE id=?", (family_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})
