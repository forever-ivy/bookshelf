from flask import Flask, render_template, jsonify, request, Response
import threading
import time
import requests
import re
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
from thefuzz import fuzz

app = Flask(__name__)
VOICE_API_BASE = "http://127.0.0.1:8000/api/voice"

# 配色/文本常量（前端 CSS 里也会用）
ACCENT = "#8E735B"
FREE_COLOR = "#A3B18A"
OCCUPIED_COLOR = "#BC6C25"

# ------- 辅助函数 -------
def make_log(msg):
    return {"time": time.strftime("%H:%M"), "msg": msg}

def _extract_title_from_take_text(text: str) -> str:
    s = (text or "").strip()
    if not s:
        return ""
    # Match 《书名》
    m = re.search(r"\u300a([^\u300b]{1,80})\u300b", s)
    if m:
        return m.group(1).strip()
    # Strip common leading command phrases for take action.
    s = re.sub(
        r"(\u5e2e\u6211|\u8bf7|\u6211\u8981|\u6211\u60f3|\u9ebb\u70e6\u4f60)?\s*(\u53d6\u4e66|\u62ff\u4e66|\u501f\u4e66)\s*",
        "",
        s,
    )
    # Remove ending punctuation.
    s = re.sub(r"[\uFF0C\u3002\uFF01\uFF1F,.!?]$", "", s).strip()
    return s


def _pick_best_book_on_shelf(query: str, min_score: int = 65):
    query = (query or "").strip()
    if not query:
        return None

    candidates = []
    for cid, _x, _y, status in get_all_compartments():
        if status != "occupied":
            continue
        title = get_book_in_compartment(cid)
        if not title:
            continue
        score = fuzz.partial_ratio(query, title)
        if query and query in title:
            score += 20
        candidates.append({"cid": cid, "title": title, "score": score})

    if not candidates:
        return None

    candidates.sort(key=lambda x: (-x["score"], x["cid"]))
    best = candidates[0]
    # Avoid false positive picks when the requested book is not actually in shelf.
    if best["score"] < min_score:
        return None
    return best

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

@app.route("/api/take_by_text", methods=["POST"])
def api_take_by_text():
    try:
        data = request.get_json(force=True) or {}
        text = (data.get("text") or "").strip()
        title = (data.get("title") or "").strip()
        query = title or _extract_title_from_take_text(text)
        if not query:
            return jsonify({"ok": False, "msg": "\u8bf7\u5728\u6307\u4ee4\u4e2d\u5305\u542b\u8981\u53d6\u7684\u4e66\u540d"}), 400

        target = _pick_best_book_on_shelf(query)
        if not target:
            return jsonify({"ok": False, "msg": "\u5f53\u524d\u4e66\u67dc\u6ca1\u6709\u53ef\u53d6\u51fa\u7684\u4e66"}), 404

        ok = take_book_by_cid(target["cid"])
        if not ok:
            return jsonify({"ok": False, "msg": "\u53d6\u4e66\u5931\u8d25"}), 400

        ai_reply = trigger_action_chat("take", target["title"])
        return jsonify({
            "ok": True,
            "msg": f"\u5df2\u4e3a\u4f60\u53d6\u51fa\u300a{target['title']}\u300b\uff08{target['cid']}\u53f7\u683c\uff09",
            "picked": target,
            "ai_reply": ai_reply,
        })
    except Exception as e:
        return jsonify({"ok": False, "msg": f"\u6309\u6587\u672c\u53d6\u4e66\u5f02\u5e38: {e}"}), 500

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

@app.route("/api/voice_assistant_proxy", methods=["POST"])
def api_voice_assistant_proxy():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    device_id = (data.get("device_id") or "device-001").strip()
    if not text:
        return jsonify({"ok": False, "msg": "text is required"}), 400

    try:
        r = requests.post(
            f"{VOICE_API_BASE}/assistant",
            json={"text": text, "device_id": device_id},
            timeout=30,
        )
    except requests.RequestException as e:
        return jsonify({"ok": False, "msg": f"voice api unavailable: {e}"}), 502

    if r.status_code >= 400:
        # FastAPI errors are JSON; pass through as message.
        try:
            detail = r.json().get("detail")
        except Exception:
            detail = r.text
        return jsonify({"ok": False, "msg": detail or "voice api error"}), r.status_code

    resp = Response(r.content, content_type=r.headers.get("content-type", "audio/mpeg"))
    cmd_id = r.headers.get("x-command-id")
    if cmd_id:
        resp.headers["X-Command-Id"] = cmd_id
    return resp

@app.route("/api/voice_command_status/<command_id>", methods=["GET"])
def api_voice_command_status(command_id):
    try:
        r = requests.get(f"{VOICE_API_BASE}/command/{command_id}", timeout=10)
    except requests.RequestException as e:
        return jsonify({"ok": False, "msg": f"voice api unavailable: {e}"}), 502

    if r.status_code >= 400:
        try:
            detail = r.json().get("detail")
        except Exception:
            detail = r.text
        return jsonify({"ok": False, "msg": detail or "voice api error"}), r.status_code
    return jsonify(r.json())

# 启动
if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
