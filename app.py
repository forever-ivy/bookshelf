from flask import Flask, render_template, jsonify, request
import threading
import time
from ai.voice_module import speak, listen
# 引用你原有的业务/AI模块（和桌面版同名）
from ai.book_match_ai import (
    get_or_create_book_by_ai,
    chat_with_librarian,
    get_ai_reading_analysis,
    trigger_action_chat
)
from db.book_match import match_book
from db.shelf_ops import (
    find_free_compartment,
    store_book,
    get_all_compartments,
    get_book_in_compartment,
    find_books_by_keyword,
    take_book_by_cid
)
from ocr.video_ocr import recognize_book_from_camera

app = Flask(__name__)

# 配色/文本常量（前端 CSS 里也会用）
ACCENT = "#8E735B"
FREE_COLOR = "#A3B18A"
OCCUPIED_COLOR = "#BC6C25"

# ------- 辅助函数 -------
def make_log(msg):
    return {"time": time.strftime("%H:%M"), "msg": msg}

# ------- 页面 -------
@app.route("/")
def index():
    # 获取初始数据：格子与 AI 寄语
    compartments = get_all_compartments()
    ai_insight = ""
    try:
        ai_insight = get_ai_reading_analysis()
    except Exception:
        ai_insight = "馆长正在整理书架，稍后再聊~"
    return render_template("index.html",
                           ai_insight=ai_insight,
                           compartments=compartments)

# ------- API: compartments / store / take / chat / ai_insight -------
@app.route("/api/compartments")
def api_compartments():
    data = get_all_compartments()
    # 将书名（如果有）合并
    results = []
    for cid,x,y,status in data:
        book = get_book_in_compartment(cid)
        results.append({
            "cid": cid, "x": x, "y": y, "status": status,
            "book": book
        })
    return jsonify(results)

@app.route("/api/store", methods=["POST"])
def api_store():
    try:
        # 1) 识别书（同步调用，保持行为一致）
        result = recognize_book_from_camera()
        if not result:
            return jsonify({"ok": False, "msg": "未识别到书本"}), 400

        # 2) 得到书 id / title（按你现有逻辑）
        if isinstance(result, dict) and (result.get("book_id") or result.get("id")):
            book_id = result.get("book_id") or result.get("id")
            title = result.get("title", "未知书名")
        else:
            ocr_texts = result.get("ocr_texts") if isinstance(result, dict) else result
            # 这里假定你有个同步的 match/create 流；如果是异步流程，请改成同步
            local = match_book(ocr_texts)
            if local and isinstance(local, (list, tuple)):
                book_id, title = local[0], local[1]
            else:
                book = get_or_create_book_by_ai(ocr_texts)
                if not book:
                    return jsonify({"ok": False, "msg": "AI 未能确认书籍"}), 400
                book_id, title = book.get("id"), book.get("title")

        free = find_free_compartment()
        if not free:
            return jsonify({"ok": False, "msg": "书柜已满"}), 400

        cid = free[0]
        store_book(book_id, cid)

        # —— 关键：同步拿回 AI 回复并返回给前端 —— 
        ai_reply = trigger_action_chat("store", title)

        return jsonify({
            "ok": True,
            "msg": f"存入：《{title}》 → 隔间 {cid}",
            "ai_reply": ai_reply
        })
    except Exception as e:
        return jsonify({"ok": False, "msg": f"存书失败: {e}"}), 500


@app.route("/api/take", methods=["POST"])
def api_take():
    try:
        data = request.get_json(force=True)
        cid = data.get("cid")
        title = data.get("title", "")
        if cid is None:
            return jsonify({"ok": False, "msg": "缺少 cid"}), 400

        ok = take_book_by_cid(cid)
        if not ok:
            return jsonify({"ok": False, "msg": "取出失败（可能已空）"}), 400

        ai_reply = trigger_action_chat("take", title)

        return jsonify({"ok": True, "msg": f"取出成功：《{title}》", "ai_reply": ai_reply})
    except Exception as e:
        return jsonify({"ok": False, "msg": f"取书异常: {e}"}), 500

@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.json or {}
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"ok": False, "msg": "空消息"}), 400
    try:
        reply = chat_with_librarian(text)
        # 可选：后端 TTS
        try:
            threading.Thread(target=speak, args=(reply,), daemon=True).start()
        except Exception:
            pass
        return jsonify({"ok": True, "reply": reply})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500

@app.route("/api/ai_insight")
def api_ai_insight():
    try:
        insight = get_ai_reading_analysis()
    except Exception:
        insight = "馆长正在整理书架，稍后再聊~"
    return jsonify({"insight": insight})

@app.route("/api/voice_chat", methods=["POST"])
def api_voice_chat():
    try:
        # 1. 物理录音（对应 ui.py 的 listen）
        text = listen()
        if not text:
            return jsonify({"ok": False, "msg": "没听清，再说一次吧"}), 200
        
        # 2. 获取 AI 回复
        reply = chat_with_librarian(text)
        
        # 3. 物理语音播报（对应 ui.py 的 speak）
        # 使用线程避免阻塞 HTTP 响应
        threading.Thread(target=speak, args=(reply,), daemon=True).start()
        
        return jsonify({
            "ok": True, 
            "text": text, 
            "reply": reply
        })
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500

# 启动
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
