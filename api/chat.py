"""
api/chat.py
聊天相关路由：对话、历史、清空、书目通知、AI 洞察。
"""

import threading

from flask import Blueprint, jsonify, request

from auth_utils import current_user, login_required

from ai.book_match_ai import chat_with_librarian, get_ai_reading_analysis
from ai.voice_module import speak

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/app")
@login_required(page=True)
def index():
    from flask import render_template
    from db.shelf_ops import get_all_compartments
    compartments = get_all_compartments()
    ai_insight = ""
    try:
        ai_insight = get_ai_reading_analysis()
    except Exception:
        ai_insight = "馆长正在整理书架，稍后再聊"
    return render_template("index.html", ai_insight=ai_insight, compartments=compartments)


@chat_bp.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "msg": "空消息"}), 400
    try:
        reply = chat_with_librarian(text)
        try:
            threading.Thread(target=speak, args=(reply,), daemon=True).start()
        except Exception:
            pass
        return jsonify({"ok": True, "reply": reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": str(exc)}), 500


@chat_bp.route("/api/ai_insight")
def api_ai_insight():
    try:
        insight = get_ai_reading_analysis()
    except Exception:
        insight = "馆长正在整理书架，稍后再聊"
    return jsonify({"insight": insight})


@chat_bp.route("/api/chat/history", methods=["GET"])
def api_chat_history():
    try:
        from ai.book_match_ai import get_chat_history
        user = current_user()
        uid = user["id"] if user else None
        history = get_chat_history(uid) if uid else []
        result = []
        for role, content in history[-20:]:
            result.append({"role": role, "content": content, "is_bot": role == "小燕"})
        return jsonify({"ok": True, "history": result, "current_user": user})
    except Exception as e:
        return jsonify({"ok": False, "history": [], "msg": str(e)})


@chat_bp.route("/api/chat/clear", methods=["POST"])
def api_clear_chat():
    data = request.get_json(force=True) or {}
    user_id = data.get("user_id") or current_user().get("id")
    try:
        from ai.book_match_ai import clear_chat_history
        clear_chat_history(user_id)
    except Exception:
        pass
    return jsonify({"ok": True})


@chat_bp.route("/api/booklist/notify", methods=["POST"])
def api_booklist_notify():
    data = request.get_json(force=True) or {}
    child_name = (data.get("child_name") or "").strip()
    book_title = (data.get("book_title") or "").strip()
    note = (data.get("note") or "").strip()
    if not child_name or not book_title:
        return jsonify({"ok": False, "msg": "缺少参数"}), 400
    try:
        if note:
            tts_text = f"{child_name}，家长给你添加了一本必读书目：《{book_title}》。留言说：{note}"
        else:
            tts_text = f"{child_name}，家长给你添加了一本必读书目：《{book_title}》，记得找时间读哦！"
        threading.Thread(target=speak, args=(tts_text,), daemon=True).start()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500
