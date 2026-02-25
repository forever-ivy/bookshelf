from flask import Flask, render_template, jsonify, request, Response
import os
import re
import subprocess
import threading
import time

import requests
from thefuzz import fuzz

from ai.voice_module import speak, listen, listen_wake_only
from ai.book_match_ai import (
    get_or_create_book_by_ai,
    chat_with_librarian,
    get_ai_reading_analysis,
    trigger_action_chat,
)
from db.book_match import match_book
from db.shelf_ops import (
    find_free_compartment,
    store_book,
    get_all_compartments,
    get_book_in_compartment,
    take_book_by_cid,
)
from ocr.video_ocr import recognize_book_from_camera


app = Flask(__name__)
VOICE_API_BASE = "http://127.0.0.1:8000/api/voice"

# UI color constants (kept for template/style compatibility)
ACCENT = "#8E735B"
FREE_COLOR = "#A3B18A"
OCCUPIED_COLOR = "#BC6C25"


_voice_events = []
_last_wake_ts = 0.0
_wake_thread_started = False
_wake_lock = threading.Lock()
_wake_lock_path = os.path.join(os.getcwd(), ".wake.lock")


_STORE_KEYWORDS = [
    "存书",
    "放回",
    "归还",
    "还书",
    "上架",
    "放入书柜",
    "存一下",
    "放回去",
]
_TAKE_KEYWORDS = [
    "取书",
    "拿书",
    "借书",
    "找书",
    "取出",
    "拿出",
    "帮我拿",
    "帮我取",
]

_STORE_SAMPLES = [
    "帮我存书",
    "我要存书",
    "请帮我存书",
    "把书放回去",
    "帮我归还这本书",
]
_TAKE_SAMPLES = [
    "帮我取书",
    "我要取书",
    "请帮我拿书",
    "帮我取乡土中国",
    "我要拿图灵传",
]


def make_log(msg):
    return {"time": time.strftime("%H:%M"), "msg": msg}


def _is_python_pid_alive(pid: int) -> bool:
    try:
        out = subprocess.check_output(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            encoding="utf-8",
            errors="ignore",
        ).strip()
        if not out or "No tasks are running" in out:
            return False
        return "python" in out.lower()
    except Exception:
        return False


def _push_voice_event(role: str, text: str):
    if not text:
        return
    _voice_events.append({"role": role, "text": text, "ts": time.time()})
    if len(_voice_events) > 50:
        _voice_events[:] = _voice_events[-50:]


def _normalize_voice_text(text: str) -> str:
    s = re.sub(r"\s+", "", (text or "").strip())
    if not s:
        return ""

    # Common ASR confusions and homophones.
    replacements = {
        "帮我成书": "帮我存书",
        "帮我层书": "帮我存书",
        "帮我乘书": "帮我存书",
        "帮我擦书": "帮我存书",
        "帮我叉书": "帮我存书",
        "我要成书": "我要存书",
        "我要层书": "我要存书",
        "我要乘书": "我要存书",
        "我要擦书": "我要存书",
        "请帮我存": "帮我存书",
        "帮我存": "帮我存书",
        "我要存": "我要存书",
        "我来存": "我要存书",
        "我要去": "我要取",
        "帮我去": "帮我取",
        "请帮我去": "帮我取",
        "我要娶": "我要取",
        "帮我娶": "帮我取",
        "我想去": "我想取",
        "拿一下书": "拿书",
        "取一下书": "取书",
        "借一下书": "借书",
        "晓燕": "小燕",
        "小艳": "小燕",
        "小雁": "小燕",
    }
    for src, dst in replacements.items():
        s = s.replace(src, dst)

    return s


def _intent_score(text: str, samples) -> int:
    t = (text or "").strip()
    if not t:
        return 0
    best = 0
    for sample in samples:
        best = max(best, fuzz.ratio(t, sample), fuzz.partial_ratio(t, sample))
    return best


def _detect_voice_intent(text: str) -> str:
    t = _normalize_voice_text(text)
    if not t:
        return "unknown"

    store_hit = any(k in t for k in _STORE_KEYWORDS)
    take_hit = any(k in t for k in _TAKE_KEYWORDS)

    if re.search(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我).{0,2}(存|放回|归还|还)", t):
        store_hit = True
    if re.search(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我).{0,2}(取|拿|借|找)", t):
        take_hit = True

    # Homophone case: "我要去乡土中国" means "我要取乡土中国".
    if ("我要去" in t or "帮我去" in t or "我想去" in t) and ("书" in t or len(t) <= 12):
        take_hit = True

    store_score = _intent_score(t, _STORE_SAMPLES)
    take_score = _intent_score(t, _TAKE_SAMPLES)

    if store_hit and not take_hit:
        return "store"
    if take_hit and not store_hit:
        return "take"
    if store_hit and take_hit:
        return "store" if store_score >= take_score else "take"

    if store_score >= 70 and store_score >= take_score + 5:
        return "store"
    if take_score >= 70 and take_score >= store_score + 5:
        return "take"
    return "unknown"


def _is_store_intent(text: str) -> bool:
    return _detect_voice_intent(text) == "store"


def _is_take_intent(text: str) -> bool:
    return _detect_voice_intent(text) == "take"


def _looks_unclear_action(text: str) -> bool:
    t = _normalize_voice_text(text)
    if not t:
        return False

    if len(t) <= 4 and any(k in t for k in ("帮我", "我要", "我想", "请")):
        return True
    if any(k in t for k in ("存", "取", "拿", "借", "找")) and "书" in t:
        return True
    if re.search(r"(帮我|我要|我想|请).{0,3}$", t):
        return True
    return False


def _store_via_ocr():
    result = recognize_book_from_camera()
    if not result:
        return False, "未识别到书本", None

    if isinstance(result, dict) and (result.get("book_id") or result.get("id")):
        book_id = result.get("book_id") or result.get("id")
        title = result.get("title", "未知书名")
    else:
        ocr_texts = result.get("ocr_texts") if isinstance(result, dict) else result
        local = match_book(ocr_texts)
        if local and isinstance(local, (list, tuple)):
            book_id, title = local[0], local[1]
        else:
            book = get_or_create_book_by_ai(ocr_texts)
            if not book:
                return False, "AI 未能确认书籍", None
            book_id, title = book.get("id"), book.get("title")

    free = find_free_compartment()
    if not free:
        return False, "书柜已满", None

    cid = free[0]
    store_book(book_id, cid)
    ai_reply = trigger_action_chat("store", title)
    return True, f"存入：《{title}》 -> 隔间 {cid}", ai_reply


def _extract_title_from_take_text(text: str) -> str:
    s = _normalize_voice_text(text)
    if not s:
        return ""

    # 《书名》 form.
    m = re.search(r"《([^》]{1,80})》", s)
    if m:
        return m.group(1).strip()

    # Remove wake words and command words.
    s = re.sub(r"(小燕){1,2}", "", s)
    s = re.sub(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我|想要)", "", s)
    s = re.sub(r"(取书|拿书|借书|找书|取出|拿出|取|拿|借|找)+", "", s)
    s = re.sub(r"(这本书|那本书|一本书|这本|那本|本书)", "", s)
    s = re.sub(r"[，。！？,.!?\s]+", "", s)

    return s.strip()


def _pick_best_book_on_shelf(query: str, min_score: int = 68):
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
        score = max(score, fuzz.ratio(query, title))
        if query in title:
            score += 20

        # Character overlap gives extra robustness for ASR fragments.
        overlap = len(set(query) & set(title))
        score += overlap * 4

        candidates.append({"cid": cid, "title": title, "score": score})

    if not candidates:
        return None

    candidates.sort(key=lambda x: (-x["score"], x["cid"]))
    best = candidates[0]
    if best["score"] < min_score:
        return None
    return best


def _take_by_text(text: str):
    title = _extract_title_from_take_text(text)
    if not title:
        return False, "请说出要取的书名，例如：帮我取《乡土中国》", None

    target = _pick_best_book_on_shelf(title)
    if not target:
        return False, f"书柜里没有匹配《{title}》的书", None

    ok = take_book_by_cid(target["cid"])
    if not ok:
        return False, "取书失败", None

    ai_reply = trigger_action_chat("take", target["title"])
    return True, f"已为你取出《{target['title']}》（{target['cid']}号格）", ai_reply


def _process_voice_text(text: str):
    normalized = _normalize_voice_text(text)
    if not normalized:
        return

    _push_voice_event("user", normalized)
    intent = _detect_voice_intent(normalized)

    if intent == "store":
        try:
            speak("好的，这就为你存书")
            ok, msg, ai_reply = _store_via_ocr()
            if msg:
                _push_voice_event("assistant", msg)
                speak(msg)
            if ai_reply:
                _push_voice_event("assistant", ai_reply)
        except Exception as exc:
            print("[voice store error]", exc)
            err_msg = "存书执行失败，请再试一次"
            _push_voice_event("assistant", err_msg)
            speak(err_msg)
        return

    if intent == "take":
        try:
            ok, msg, ai_reply = _take_by_text(normalized)
            if msg:
                _push_voice_event("assistant", msg)
                speak(msg)
            if ai_reply:
                _push_voice_event("assistant", ai_reply)
        except Exception as exc:
            print("[voice take error]", exc)
            err_msg = "取书执行失败，请再试一次"
            _push_voice_event("assistant", err_msg)
            speak(err_msg)
        return

    if _looks_unclear_action(normalized):
        hint = "我听到了，但没听清。你可以说：帮我存书，或者：帮我取《书名》。"
        _push_voice_event("assistant", hint)
        speak(hint)
        return

    try:
        reply = chat_with_librarian(normalized)
        _push_voice_event("assistant", reply)
        speak(reply)
    except Exception as exc:
        print("[voice chat error]", exc)


def _build_voice_hints():
    hints = set(_STORE_SAMPLES + _TAKE_SAMPLES + _STORE_KEYWORDS + _TAKE_KEYWORDS)
    hints.update(
        {
            "帮我存书",
            "我要存书",
            "帮我取书",
            "我要取书",
            "帮我拿书",
            "我要拿书",
            "小燕小燕",
            "小燕",
            "晓燕",
        }
    )

    try:
        for cid, _x, _y, status in get_all_compartments():
            if status != "occupied":
                continue
            title = get_book_in_compartment(cid)
            if not title:
                continue
            hints.add(title)
            hints.add(f"帮我取{title}")
            hints.add(f"我要取{title}")
            hints.add(f"帮我拿{title}")
            hints.add(f"我要拿{title}")
    except Exception:
        pass

    # Keep grammar list bounded.
    items = sorted(hints, key=len)
    return items[:300]


@app.route("/")
def index():
    compartments = get_all_compartments()
    ai_insight = ""
    try:
        ai_insight = get_ai_reading_analysis()
    except Exception:
        ai_insight = "馆长正在整理书架，稍后再聊"

    return render_template(
        "index.html",
        ai_insight=ai_insight,
        compartments=compartments,
    )


@app.route("/api/compartments")
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


@app.route("/api/store", methods=["POST"])
def api_store():
    try:
        ok, msg, ai_reply = _store_via_ocr()
        if not ok:
            return jsonify({"ok": False, "msg": msg}), 400
        return jsonify({"ok": True, "msg": msg, "ai_reply": ai_reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"存书异常: {exc}"}), 500


@app.route("/api/take", methods=["POST"])
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


@app.route("/api/take_by_text", methods=["POST"])
def api_take_by_text():
    try:
        data = request.get_json(force=True) or {}
        text = (data.get("text") or "").strip()
        ok, msg, ai_reply = _take_by_text(text)
        if not ok:
            return jsonify({"ok": False, "msg": msg}), 404
        return jsonify({"ok": True, "msg": msg, "ai_reply": ai_reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"取书异常: {exc}"}), 500


@app.route("/api/chat", methods=["POST"])
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


@app.route("/api/ai_insight")
def api_ai_insight():
    try:
        insight = get_ai_reading_analysis()
    except Exception:
        insight = "馆长正在整理书架，稍后再聊"
    return jsonify({"insight": insight})


@app.route("/api/voice_chat", methods=["POST"])
def api_voice_chat():
    try:
        text = listen(timeout=8, phrase_time_limit=1.2, hints=_build_voice_hints())
        if not text:
            return jsonify({"ok": False, "msg": "没听清，再说一次吧"}), 200

        reply = chat_with_librarian(text)
        threading.Thread(target=speak, args=(reply,), daemon=True).start()
        return jsonify({"ok": True, "text": text, "reply": reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": str(exc)}), 500


def _wake_loop():
    global _last_wake_ts
    # Avoid duplicate threads under Flask reloader.
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        while True:
            try:
                woke = listen_wake_only()
                print(f"[wake loop] woke={woke}")
                if not woke:
                    continue

                now = time.time()
                if now - _last_wake_ts < 4.0:
                    continue
                _last_wake_ts = now

                speak("我在")
                _push_voice_event("assistant", "我在")

                # Active for 15s after each recognized command.
                window_deadline = time.time() + 15
                while time.time() < window_deadline:
                    cmd_text = listen(timeout=8, phrase_time_limit=1.2, hints=_build_voice_hints())
                    if not cmd_text:
                        continue
                    cmd_text = _normalize_voice_text(cmd_text)
                    if not cmd_text or len(cmd_text) <= 1:
                        continue
                    _process_voice_text(cmd_text)
                    window_deadline = time.time() + 15

            except Exception as exc:
                print("[wake loop error]", exc)
                time.sleep(0.5)


if os.environ.get("ENABLE_WAKE_LISTEN", "1") == "1":
    with _wake_lock:
        if not _wake_thread_started:
            lock_held = False
            if os.path.exists(_wake_lock_path):
                try:
                    with open(_wake_lock_path, "r", encoding="utf-8") as fp:
                        old_pid = int(fp.read().strip())
                    if _is_python_pid_alive(old_pid):
                        print(f"[wake] lock held by pid {old_pid}, skip starting wake thread")
                        lock_held = True
                    else:
                        os.remove(_wake_lock_path)
                except Exception:
                    try:
                        os.remove(_wake_lock_path)
                    except Exception:
                        pass

            if not lock_held:
                try:
                    fd = os.open(_wake_lock_path, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                    os.write(fd, str(os.getpid()).encode("utf-8"))
                    os.close(fd)
                    threading.Thread(target=_wake_loop, daemon=True).start()
                    _wake_thread_started = True
                except FileExistsError:
                    print("[wake] lock exists, skip starting wake thread")


@app.route("/api/voice_events", methods=["GET"])
def api_voice_events():
    return jsonify({"events": _voice_events[-20:]})


@app.route("/api/voice_assistant_proxy", methods=["POST"])
def api_voice_assistant_proxy():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    device_id = (data.get("device_id") or "device-001").strip()
    if not text:
        return jsonify({"ok": False, "msg": "text is required"}), 400

    try:
        resp = requests.post(
            f"{VOICE_API_BASE}/assistant",
            json={"text": text, "device_id": device_id},
            timeout=30,
        )
    except requests.RequestException as exc:
        return jsonify({"ok": False, "msg": f"voice api unavailable: {exc}"}), 502

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("detail")
        except Exception:
            detail = resp.text
        return jsonify({"ok": False, "msg": detail or "voice api error"}), resp.status_code

    out = Response(resp.content, content_type=resp.headers.get("content-type", "audio/mpeg"))
    cmd_id = resp.headers.get("x-command-id")
    if cmd_id:
        out.headers["X-Command-Id"] = cmd_id
    return out


@app.route("/api/voice_command_status/<command_id>", methods=["GET"])
def api_voice_command_status(command_id):
    try:
        resp = requests.get(f"{VOICE_API_BASE}/command/{command_id}", timeout=10)
    except requests.RequestException as exc:
        return jsonify({"ok": False, "msg": f"voice api unavailable: {exc}"}), 502

    if resp.status_code >= 400:
        try:
            detail = resp.json().get("detail")
        except Exception:
            detail = resp.text
        return jsonify({"ok": False, "msg": detail or "voice api error"}), resp.status_code

    return jsonify(resp.json())


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
