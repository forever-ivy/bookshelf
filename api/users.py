"""
api/users.py
用户管理路由：用户 CRUD、当前用户、切换、统计、阅读目标、借阅日志、徽章、必读书目。
"""

import sqlite3

from flask import Blueprint, jsonify, request

from auth_utils import current_user, ensure_user_in_current_family, is_admin
from config import USER_PROFILE_FIELDS
from extensions import (
    db_conn,
    error_envelope,
    json_body,
    row_dict,
    rows_dict,
    normalize_int,
    pick_fields,
    update_fields,
    fetch_user_row,
    fetch_active_session_user_row,
    fetch_family_row,
    fetch_book_row,
)
from db.user_ops import (
    add_user,
    update_user,
    delete_user,
    switch_user,
    get_user_stats,
    get_family_stats,
    set_reading_goal,
)

users_bp = Blueprint("users", __name__)


def _assert_user_access(uid: int):
    user = ensure_user_in_current_family(uid)
    if not is_admin() and uid != current_user()["id"]:
        return None, (jsonify(error_envelope("没有权限访问该成员", code="user_forbidden")), 403)
    return user, None


def _load_family_users():
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
        LEFT JOIN families f ON f.id = u.family_id
        WHERE u.family_id = ?
        ORDER BY u.id
        """,
        (current_user().get("family_id"),),
    )
    rows = rows_dict(cur.fetchall())
    conn.close()
    return rows


@users_bp.route("/api/users", methods=["GET"])
def api_get_users():
    if is_admin():
        return jsonify(_load_family_users())
    return jsonify([current_user()])


@users_bp.route("/api/users", methods=["POST"])
def api_add_user():
    return jsonify(error_envelope("请在 App 中注册新账号", code="registration_app_only")), 403


@users_bp.route("/api/users/<int:uid>", methods=["GET"])
def api_get_user_detail(uid):
    user, denied = _assert_user_access(uid)
    if denied:
        return denied
    return jsonify(user)


@users_bp.route("/api/users/<int:uid>", methods=["PUT"])
def api_update_user(uid):
    user, denied = _assert_user_access(uid)
    if denied:
        return denied

    data = json_body()
    if not is_admin():
        if "role" in data or "family_id" in data:
            return jsonify(error_envelope("普通用户不能修改家庭角色", code="role_change_forbidden")), 403
    elif "family_id" in data:
        family_id = normalize_int(data.get("family_id"))
        if family_id != current_user().get("family_id"):
            return jsonify(error_envelope("只能管理当前家庭成员", code="family_forbidden")), 403

    update_user(
        uid,
        name=data.get("name"),
        role=data.get("role") if is_admin() else None,
        avatar=data.get("avatar"),
        pin=data.get("pin"),
        color=data.get("color"),
    )
    extra_fields = pick_fields(data, USER_PROFILE_FIELDS)
    if "age" in extra_fields:
        extra_fields["age"] = normalize_int(extra_fields.get("age"))
    if "family_id" in data:
        family_id = normalize_int(data.get("family_id"))
        if family_id is not None and not fetch_family_row(family_id):
            return jsonify({"ok": False, "msg": "family not found"}), 404
        extra_fields["family_id"] = family_id
    if extra_fields:
        conn = db_conn()
        cur = conn.cursor()
        update_fields(cur, "users", uid, extra_fields)
        conn.commit()
        conn.close()
    return jsonify({"ok": True, "user": fetch_user_row(uid)})


@users_bp.route("/api/users/<int:uid>", methods=["DELETE"])
def api_delete_user(uid):
    if not is_admin():
        return jsonify(error_envelope("需要管理员权限", code="admin_required")), 403
    try:
        ensure_user_in_current_family(uid)
    except Exception:
        return jsonify(error_envelope("user not found", code="user_not_found")), 404
    delete_user(uid)
    return jsonify({"ok": True})


@users_bp.route("/api/users/current", methods=["GET"])
def api_current_user():
    return jsonify(current_user())


@users_bp.route("/api/users/switch", methods=["POST"])
def api_switch_user():
    return jsonify(error_envelope("登录后身份固定为本人，不支持切换成员", code="user_switch_disabled")), 403


@users_bp.route("/api/users/<int:uid>/stats", methods=["GET"])
def api_user_stats(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    stats = get_user_stats(uid)
    user = fetch_user_row(uid)
    if not user:
        return jsonify({"ok": False, "msg": "user not found"}), 404
    return jsonify({**user, **stats})


@users_bp.route("/api/users/<int:uid>/goal", methods=["POST"])
def api_set_goal(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    if not fetch_user_row(uid):
        return jsonify({"ok": False, "msg": "user not found"}), 404
    data = json_body()
    target = int(data.get("weekly_target", 1))
    set_reading_goal(uid, target)
    return jsonify({"ok": True, "user_id": uid, "weekly_target": target})


@users_bp.route("/api/users/<int:uid>/goal", methods=["GET"])
def api_get_goal(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    if not fetch_user_row(uid):
        return jsonify({"ok": False, "msg": "user not found"}), 404
    conn = db_conn()
    cur = conn.cursor()
    cur.execute("SELECT weekly_target FROM reading_goals WHERE user_id=?", (uid,))
    row = cur.fetchone()
    conn.close()
    target = row["weekly_target"] if row else 1
    return jsonify({"user_id": uid, "weekly_target": target})


@users_bp.route("/api/users/<int:uid>/accounts", methods=["GET"])
def api_get_user_accounts(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied

    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            aur.account_id, aur.user_id, aur.relation_type, aur.created_at,
            a.username, a.phone, a.status
        FROM account_user_rel aur
        JOIN accounts a ON a.id = aur.account_id
        WHERE aur.user_id = ?
        ORDER BY aur.id
        """,
        (uid,),
    )
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


# ── 借阅记录 ──────────────────────────────────────────────

@users_bp.route("/api/users/<int:uid>/borrow_logs")
def api_user_borrow_logs(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    days = int(request.args.get("days", 30))
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT
                bl.action AS action,
                bl.action_time AS action_time,
                b.title AS title
            FROM borrow_logs bl
            LEFT JOIN books b ON bl.book_id = b.id
            WHERE bl.user_id = ?
              AND bl.action_time >= datetime('now', ? || ' days')
            ORDER BY bl.action_time DESC
        """, (uid, f"-{days}"))
        rows = cur.fetchall()
        conn.close()
        return jsonify(
            [
                {
                    "action": row["action"],
                    "action_time": row["action_time"],
                    "title": row["title"] or "未知",
                }
                for row in rows
            ]
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 徽章 ──────────────────────────────────────────────────

@users_bp.route("/api/users/<int:uid>/badges")
def api_user_badges(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute("SELECT badge_key, unlocked_at FROM user_badges WHERE user_id=? ORDER BY unlocked_at", (uid,))
        badges = [{"badge_key": row["badge_key"], "unlocked_at": row["unlocked_at"]} for row in cur.fetchall()]
        conn.close()
        return jsonify({"badges": badges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 必读书目 ──────────────────────────────────────────────

@users_bp.route("/api/users/<int:uid>/booklist", methods=["GET"])
def api_get_booklist(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT
                rb.id,
                rb.user_id,
                rb.title,
                rb.note,
                rb.done,
                rb.created_at,
                rb.book_id,
                rb.assigned_by_user_id,
                rb.done_at,
                b.cover_url,
                b.author,
                b.category,
                b.description
            FROM required_books rb
            LEFT JOIN books b ON b.id = rb.book_id
            WHERE rb.user_id=?
            ORDER BY rb.done, rb.created_at DESC
            """,
            (uid,),
        )
        rows = []
        for row in cur.fetchall():
            item = dict(row)
            item["done"] = bool(item["done"])
            rows.append(item)
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<int:uid>/booklist", methods=["POST"])
def api_add_booklist(uid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    data = json_body()
    title = (data.get("title") or "").strip()
    note = (data.get("note") or "").strip()
    if not title:
        return jsonify({"ok": False, "msg": "title is required"}), 400
    try:
        book_id = normalize_int(data.get("book_id"))
        assigned_by_user_id = normalize_int(data.get("assigned_by_user_id"))
        conn = db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO required_books (user_id, title, note, book_id, assigned_by_user_id)
            VALUES (?,?,?,?,?)
            """,
            (uid, title, note, book_id, assigned_by_user_id),
        )
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"ok": True, "id": new_id})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500


@users_bp.route("/api/users/<int:uid>/booklist/<int:bid>", methods=["DELETE"])
def api_del_booklist(uid, bid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    try:
        conn = db_conn()
        conn.execute("DELETE FROM required_books WHERE id=? AND user_id=?", (bid, uid))
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500


@users_bp.route("/api/users/<int:uid>/booklist/<int:bid>/done", methods=["POST"])
def api_mark_done(uid, bid):
    _, denied = _assert_user_access(uid)
    if denied:
        return denied
    try:
        conn = db_conn()
        conn.execute(
            "UPDATE required_books SET done=1, done_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?",
            (bid, uid),
        )
        conn.commit()
        conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500
