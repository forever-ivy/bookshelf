"""
api/reports.py
统计报告路由：周报、月报、家庭统计、阅读事件。
"""

from flask import Blueprint, jsonify, request

from extensions import (
    db_conn, json_body, row_dict, rows_dict,
    normalize_int, fetch_user_row, fetch_book_row,
)
from db.user_ops import get_family_stats

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/api/users/<int:uid>/weekly_report")
def api_weekly_report(uid):
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT b.title FROM borrow_logs bl
            LEFT JOIN books b ON bl.book_id = b.id
            WHERE bl.user_id=? AND bl.action='take'
              AND bl.action_time >= datetime('now', '-7 days')
        """, (uid,))
        books = [row["title"] for row in cur.fetchall() if row["title"]]
        cur.execute("SELECT name FROM users WHERE id=?", (uid,))
        row = cur.fetchone()
        conn.close()
        uname = row["name"] if row else "孩子"
        if not books:
            return jsonify({"summary": f"{uname}本周还没有借阅记录，快去看看书架吧！", "books": []})
        from ai.book_match_ai import ollama_call
        book_list = "、".join([f"《{b}》" for b in books])
        prompt = f"请为家长生成一段关于孩子本周阅读的温馨总结（100字以内）。\n孩子名字：{uname}\n本周读了：{book_list}\n要求：语气温暖，给家长一些阅读指导建议。"
        summary = ollama_call(prompt)
        return jsonify({"summary": summary, "books": list(set(books))})
    except Exception as e:
        return jsonify({"summary": "报告生成失败", "books": [], "error": str(e)}), 500


@reports_bp.route("/api/family/monthly_report")
def api_monthly_report():
    try:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute("""
            SELECT u.name, COUNT(*) as cnt
            FROM borrow_logs bl JOIN users u ON bl.user_id=u.id
            WHERE bl.action='take' AND bl.action_time >= datetime('now','-30 days')
            GROUP BY bl.user_id ORDER BY cnt DESC
        """)
        user_stats = cur.fetchall()
        cur.execute("""
            SELECT b.category, COUNT(*) as cnt
            FROM borrow_logs bl JOIN books b ON bl.book_id=b.id
            WHERE bl.action='take' AND bl.action_time >= datetime('now','-30 days')
              AND b.category IS NOT NULL
            GROUP BY b.category ORDER BY cnt DESC LIMIT 1
        """)
        top_cat = cur.fetchone()
        total = sum(row["cnt"] for row in user_stats)
        conn.close()
        most_active = user_stats[0]["name"] if user_stats else "-"
        top_category = top_cat["category"] if top_cat else "-"
        from ai.book_match_ai import ollama_call
        stats_str = "、".join([f"{row['name']}借了{row['cnt']}本" for row in user_stats])
        prompt = f"请生成一段家庭本月阅读总结（120字以内），语气温馨积极。\n数据：{stats_str}，最爱分类：{top_category}"
        summary = ollama_call(prompt)
        return jsonify({"summary": summary, "total_books": total, "most_active": most_active, "top_category": top_category})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reports_bp.route("/api/family/stats", methods=["GET"])
def api_family_stats():
    return jsonify(get_family_stats())


@reports_bp.route("/api/reading_events", methods=["GET"])
def api_get_reading_events():
    limit = min(max(int(request.args.get("limit", 100)), 1), 500)
    user_id = normalize_int(request.args.get("user_id"))
    book_id = normalize_int(request.args.get("book_id"))
    event_type = (request.args.get("event_type") or "").strip()
    source = (request.args.get("source") or "").strip()
    where, params = [], []
    if user_id is not None:
        where.append("re.user_id = ?"); params.append(user_id)
    if book_id is not None:
        where.append("re.book_id = ?"); params.append(book_id)
    if event_type:
        where.append("re.event_type = ?"); params.append(event_type)
    if source:
        where.append("COALESCE(re.source, '') = ?"); params.append(source)
    sql = """
        SELECT re.id, re.user_id, re.event_type, re.book_id, re.event_time,
               re.source, re.metadata_json, u.name AS user_name, b.title AS book_title
        FROM reading_events re
        LEFT JOIN users u ON u.id = re.user_id
        LEFT JOIN books b ON b.id = re.book_id
    """
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY re.event_time DESC, re.id DESC LIMIT ?"
    params.append(limit)
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(sql, params)
    rows = rows_dict(cur.fetchall())
    conn.close()
    return jsonify(rows)


@reports_bp.route("/api/reading_events", methods=["POST"])
def api_create_reading_event():
    data = json_body()
    event_type = (data.get("event_type") or "").strip()
    user_id = normalize_int(data.get("user_id"))
    book_id = normalize_int(data.get("book_id"))
    if not event_type:
        return jsonify({"ok": False, "msg": "event_type is required"}), 400
    if user_id is not None and not fetch_user_row(user_id):
        return jsonify({"ok": False, "msg": "user not found"}), 404
    if book_id is not None and not fetch_book_row(book_id):
        return jsonify({"ok": False, "msg": "book not found"}), 404
    conn = db_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO reading_events (user_id, event_type, book_id, event_time, source, metadata_json) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)",
        (user_id, event_type, book_id, data.get("event_time"), data.get("source"), data.get("metadata_json")),
    )
    event_id = cur.lastrowid
    conn.commit()
    cur.execute(
        "SELECT re.id, re.user_id, re.event_type, re.book_id, re.event_time, re.source, re.metadata_json, u.name AS user_name, b.title AS book_title FROM reading_events re LEFT JOIN users u ON u.id = re.user_id LEFT JOIN books b ON b.id = re.book_id WHERE re.id = ?",
        (event_id,),
    )
    row = row_dict(cur.fetchone())
    conn.close()
    return jsonify({"ok": True, "id": event_id, "event": row})
