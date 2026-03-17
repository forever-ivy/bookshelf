"""
api/shelf.py
书柜操作路由：隔间列表、存书、取书。
"""

from flask import Blueprint, jsonify, request

from db.shelf_ops import get_all_compartments, get_book_in_compartment, take_book_by_cid
from ai.book_match_ai import trigger_action_chat
from services.shelf_service import store_via_ocr, take_by_text

shelf_bp = Blueprint("shelf", __name__)


@shelf_bp.route("/api/compartments")
def api_compartments():
    data = get_all_compartments()
    results = []
    for cid, x, y, status in data:
        results.append(
            {
                "cid": cid,
                "x": x,
                "y": y,
                "status": status,
                "book": get_book_in_compartment(cid),
            }
        )
    return jsonify(results)


@shelf_bp.route("/api/store", methods=["POST"])
def api_store():
    try:
        ok, msg, ai_reply = store_via_ocr()
        if not ok:
            return jsonify({"ok": False, "msg": msg}), 400
        return jsonify({"ok": True, "msg": msg, "ai_reply": ai_reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"存书异常: {exc}"}), 500


@shelf_bp.route("/api/take", methods=["POST"])
def api_take():
    try:
        data = request.get_json(force=True) or {}
        cid = data.get("cid")
        title = data.get("title", "")
        if cid is None:
            return jsonify({"ok": False, "msg": "缺少 cid"}), 400

        ok = take_book_by_cid(cid)
        if not ok:
            return jsonify({"ok": False, "msg": "取出失败（可能已空）"}), 400

        ai_reply = trigger_action_chat("take", title)
        return jsonify({"ok": True, "msg": f"取出成功：《{title}》", "ai_reply": ai_reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"取书异常: {exc}"}), 500


@shelf_bp.route("/api/take_by_text", methods=["POST"])
def api_take_by_text():
    try:
        data = request.get_json(force=True) or {}
        text = (data.get("text") or "").strip()
        ok, msg, ai_reply = take_by_text(text)
        if not ok:
            return jsonify({"ok": False, "msg": msg}), 404
        return jsonify({"ok": True, "msg": msg, "ai_reply": ai_reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"取书异常: {exc}"}), 500
