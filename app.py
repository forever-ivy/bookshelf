from flask import Flask, render_template, jsonify, request, Response, stream_with_context
import base64
import os
import re
import subprocess
import threading
import time

from thefuzz import fuzz

from ai.voice_module import (
    speak,
    listen,
    listen_wake_only,
    transcribe_wav_bytes,
    tts_to_mp3_bytes,
    tts_to_wav_bytes,
    _has_wake as _vosk_has_wake,
)
from ai.book_match_ai import (
    get_or_create_book_by_ai,
    chat_with_librarian,
    get_ai_reading_analysis,
    trigger_action_chat,
    ollama_call,
)
from db.book_match import match_book
from db.shelf_ops import (
    find_free_compartment,
    store_book,
    get_all_compartments,
    get_book_in_compartment,
    take_book_by_cid,
)
from db.user_ops import (
      get_all_users, get_user, add_user, update_user, delete_user,
      get_current_user, switch_user,
      get_user_stats, get_family_stats, set_reading_goal,
  )
from ocr.video_ocr import recognize_book_from_camera
from ocr.paddle_ocr import ocr_image, stabilize_ocr_texts
import tempfile


app = Flask(__name__)
VOICE_MODE = os.getenv("VOICE_MODE", "auto").strip().lower()
VOICE_MODEL_DISPATCH = os.getenv("VOICE_MODEL_DISPATCH", "0").strip().lower() in ("1", "true", "yes", "on")



_voice_events = []
_last_wake_ts = 0.0
_wake_thread_started = False
_wake_lock = threading.Lock()
_wake_lock_path = os.path.join(os.getcwd(), ".wake.lock")
_WAKE_DEBUG_LOG = os.getenv("WAKE_DEBUG_LOG", "0").strip() in ("1", "true", "yes", "on")


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

_WAKE_WORDS = [
    "\u5c0f\u71d5\u5c0f\u71d5",
    "\u5c0f\u71d5",
    "\u6653\u71d5",
    "\u6653\u71d5\u6653\u71d5",
    "\u5c0f\u96c1",
    "\u5c0f\u8273",
    "\u5c0f\u71d5\u513f",
    "\u5c0f\u71d5\u554a",
]


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
    if _voice_events:
        last = _voice_events[-1]
        if last.get("role") == role and last.get("text") == text:
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


def _has_wake_word(text: str) -> bool:
    try:
        return _vosk_has_wake(text, wake_words=_WAKE_WORDS)
    except Exception:
        pass

    t = _normalize_voice_text(text)
    if not t:
        return False

    if _WAKE_DEBUG_LOG:
        _push_voice_event("log", f"[wake-asr] {t}")

    # Homophone normalization for wake words.
    for src in ("\u6653", "\u5b5d", "\u6d88", "\u6821", "\u8096"):
        t = t.replace(src, "\u5c0f")
    for src in ("\u71d5", "\u96c1", "\u8273", "\u5ef6", "\u989c", "\u8a00", "\u6f14", "\u5ca9", "\u773c", "\u708e", "\u70df", "\u59cd"):
        t = t.replace(src, "\u71d5")

    if "\u5c0f\u71d5" in t:
        return True

    # Fuzzy fallback (short wake phrases).
    for w in _WAKE_WORDS:
        target = _normalize_voice_text(w)
        score = max(fuzz.ratio(t, target), fuzz.partial_ratio(t, target))
        if score >= 80:
            return True

    return False


def _strip_wake_words(text: str) -> str:
    s = _normalize_voice_text(text)
    if not s:
        return ""
    for w in _WAKE_WORDS:
        s = s.replace(_normalize_voice_text(w), "")
    s = re.sub(
        r"^(\u6211\u5728|\u5728\u5417|\u5728\u4e48|\u5728\u561b|\u4f60\u597d|hi|hello)+",
        "",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        r"(\u6211\u5728|\u5728\u5417|\u5728\u4e48|\u5728\u561b|\u4f60\u597d|hi|hello)+$",
        "",
        s,
        flags=re.IGNORECASE,
    )
    return s.strip()


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


def _store_from_ocr_texts(ocr_texts, speak_out=True):
    if not ocr_texts:
        return False, "no ocr text", None

    local = match_book(ocr_texts)
    if local and isinstance(local, (list, tuple)):
        book_id, title = local[0], local[1]
    else:
        book = get_or_create_book_by_ai(ocr_texts)
        if not book:
            return False, "ai book match failed", None
        book_id, title = book.get("id"), book.get("title")

    free = find_free_compartment()
    if not free:
        return False, "bookshelf full", None

    cid = free[0]
    store_book(book_id, cid)
    ai_reply = trigger_action_chat("store", title, speak_out=speak_out)
    return True, f"stored: {title} -> slot {cid}", ai_reply


def _store_from_image_bytes(image_bytes: bytes, speak_out=True):
    if not image_bytes:
        return False, "empty image", None
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        img_path = f.name
        f.write(image_bytes)
    try:
        texts = ocr_image(img_path)
        ocr_texts = stabilize_ocr_texts(texts, top_k=5)
    finally:
        try:
            os.remove(img_path)
        except Exception:
            pass
    if not ocr_texts:
        return False, "no text detected", None
    return _store_from_ocr_texts(ocr_texts, speak_out=speak_out)


def _store_via_ocr(speak_out=True):
    result = recognize_book_from_camera()
    if not result:
        return False, "未识别到书本", None

    if isinstance(result, dict) and (result.get("book_id") or result.get("id")):
        book_id = result.get("book_id") or result.get("id")
        title = result.get("title", "未知书名")
        ocr_texts = None
    else:
        ocr_texts = result.get("ocr_texts") if isinstance(result, dict) else result

    if ocr_texts is not None:
        return _store_from_ocr_texts(ocr_texts, speak_out=speak_out)

    free = find_free_compartment()
    if not free:
        return False, "书柜已满", None

    cid = free[0]
    store_book(book_id, cid)
    ai_reply = trigger_action_chat("store", title, speak_out=speak_out)
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


def _take_by_text(text: str, speak_out=True):
    title = _extract_title_from_take_text(text)
    if not title:
        return False, "请说出要取的书名，例如：帮我取《乡土中国》", None

    target = _pick_best_book_on_shelf(title)
    if not target:
        return False, f"书柜里没有匹配《{title}》的书", None

    ok = take_book_by_cid(target["cid"])
    if not ok:
        return False, "取书失败", None

    ai_reply = trigger_action_chat("take", target["title"], speak_out=speak_out)
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


def _process_text_remote(text: str, image_bytes=None, push_events=True):
    normalized = _normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}

    if push_events:
        _push_voice_event("user", normalized)
    intent = _detect_voice_intent(normalized)

    if intent == "store":
        if image_bytes:
            ok, msg, ai_reply = _store_from_image_bytes(image_bytes, speak_out=False)
        else:
            return {
                "ok": False,
                "intent": intent,
                "text": normalized,
                "need_image": True,
                "msg": "image required for store",
            }
        if push_events:
            if msg:
                _push_voice_event("log", msg)
            if ai_reply:
                _push_voice_event("assistant", ai_reply)
        return {
            "ok": ok,
            "intent": intent,
            "text": normalized,
            "msg": msg,
            "ai_reply": ai_reply,
            "reply": ai_reply or "",
        }

    if intent == "take":
        ok, msg, ai_reply = _take_by_text(normalized, speak_out=False)
        if push_events:
            if msg:
                _push_voice_event("log", msg)
            if ai_reply:
                _push_voice_event("assistant", ai_reply)
        return {
            "ok": ok,
            "intent": intent,
            "text": normalized,
            "msg": msg,
            "ai_reply": ai_reply,
            "reply": ai_reply or "",
        }

    if _looks_unclear_action(normalized):
        hint = "I heard you, but not clearly. Say: store a book, or take a book title."
        if push_events:
            _push_voice_event("assistant", hint)
        return {"ok": True, "intent": "clarify", "text": normalized, "reply": hint}

    try:
        reply = chat_with_librarian(normalized)
        if push_events:
            _push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply}
    except Exception as exc:
        print("[voice chat error]", exc)
        return {"ok": False, "intent": "chat", "text": normalized, "msg": str(exc)}


def _process_text_chat_only(text: str, push_events=True):
    normalized = _normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}
    if push_events:
        _push_voice_event("user", normalized)
    try:
        reply = chat_with_librarian(normalized)
        if push_events:
            _push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply}
    except Exception as exc:
        print("[voice chat error]", exc)
        return {"ok": False, "intent": "chat", "text": normalized, "msg": str(exc)}


def _build_bookshelf_status_for_prompt():
    items = []
    try:
        for cid, _x, _y, status in get_all_compartments():
            if status != "occupied":
                continue
            title = get_book_in_compartment(cid)
            if title:
                items.append(f"{cid}:{title}")
    except Exception:
        pass
    if not items:
        return "书柜为空"
    return "已存书籍（cid:标题）=" + ", ".join(items[:40])


def _parse_model_response(model_output):
    if isinstance(model_output, str):
        model_output = re.sub(r"```json\\s*([\\s\\S]*?)\\s*```", r"\\1", model_output).strip()
    try:
        data = json.loads(model_output)
    except Exception:
        return "", []
    response_text = data.get("response", "")
    commands = data.get("commands", [])
    if not isinstance(commands, list):
        commands = []
    return response_text, commands


def _dispatch_with_model(user_text: str):
    from ai.book_match_ai import _build_user_persona, _get_current_user_safe, _get_tone_guide
    user   = _get_current_user_safe()
    uname  = (user or {}).get("name", "主人")
    persona = _build_user_persona()
    tone   = _get_tone_guide(user)

    prompt = f"""
你是一个智能书柜语音助手，名字是"小燕"。请根据用户指令返回 JSON：
1) response: 给用户的自然语言回复（直接称呼对方为"{uname}"）
2) commands: 设备控制指令列表

commands 格式：
{{"device":"bookshelf","action":"take|store|status","book":"书名(可选)","cid":整数(可选)}}

规则：
- 取书/拿书/借书 → action=take，尽量填 book
- 存书/还书/放回 → action=store
- 纯聊天 → commands 为空数组
- 无法确定书名但明确要取书 → 只给 action=take，不编造书名

【当前用户信息】{persona}
【语气要求】{tone}
当前书柜状态：{_build_bookshelf_status_for_prompt()}

{uname}说："{user_text}"
"""
    reply = ollama_call(prompt)
    response_text, commands = _parse_model_response(reply)
    return response_text, commands, reply

def _execute_model_commands(commands, image_bytes=None, push_events=True):
    need_image = False
    msg = ""
    ai_reply = ""
    intent = "chat"

    for cmd in commands:
        device = (cmd.get("device") or "").lower()
        action = (cmd.get("action") or "").lower()
        if device and device != "bookshelf":
            continue

        if action == "store":
            intent = "store"
            if image_bytes:
                ok, msg, ai_reply = _store_from_image_bytes(image_bytes, speak_out=False)
            else:
                need_image = True
            break
        if action == "take":
            intent = "take"
            book = (cmd.get("book") or "").strip()
            cid = cmd.get("cid")
            if book:
                ok, msg, ai_reply = _take_by_text(book, speak_out=False)
            elif cid is not None:
                ok = take_book_by_cid(cid)
                msg = "取出成功" if ok else "取书失败"
            else:
                msg = "请说明要取的书名"
            break
        if action == "status":
            intent = "status"
            msg = _build_bookshelf_status_for_prompt()
            break

    if push_events:
        if msg:
            _push_voice_event("log", msg)
        if ai_reply:
            _push_voice_event("assistant", ai_reply)

    return {
        "intent": intent,
        "need_image": need_image,
        "msg": msg,
        "ai_reply": ai_reply,
    }


def _process_text_model_dispatch(text: str, image_bytes=None, push_events=True):
    normalized = _normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}

    if push_events:
        _push_voice_event("user", normalized)

    response_text, commands, raw_reply = _dispatch_with_model(normalized)
    if not commands:
        # 模型没给出指令，退化成聊天模式
        reply = response_text or chat_with_librarian(normalized)
        if push_events:
            _push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply, "model_raw": raw_reply}

    exec_result = _execute_model_commands(commands, image_bytes=image_bytes, push_events=push_events)
    reply = exec_result.get("ai_reply") or response_text or ""
    result = {
        "ok": True,
        "intent": exec_result.get("intent"),
        "text": normalized,
        "reply": reply,
        "msg": exec_result.get("msg"),
        "need_image": exec_result.get("need_image"),
        "commands": commands,
        "model_raw": raw_reply,
    }
    return result


def _route_text(text: str, image_bytes=None, push_events=True):
    mode = VOICE_MODE
    if mode == "chat":
        return _process_text_chat_only(text, push_events=push_events)
    if mode == "standard":
        return _process_text_model_dispatch(text, image_bytes=image_bytes, push_events=push_events)
    if mode in ("auto_model", "model") or VOICE_MODEL_DISPATCH:
        try:
            result = _process_text_model_dispatch(text, image_bytes=image_bytes, push_events=push_events)
            if result.get("intent") != "chat":
                return result
        except Exception as exc:
            print("[voice model dispatch error]", exc)
    return _process_text_remote(text, image_bytes=image_bytes, push_events=push_events)


def _build_voice_hints():
    hints = set(_STORE_SAMPLES + _TAKE_SAMPLES + _STORE_KEYWORDS + _TAKE_KEYWORDS)
    hints.update(_WAKE_WORDS)
    hints.update(
        {
            "帮我存书", "我要存书", "存书", "放回去", "归还",
            "帮我取书", "我要取书", "取书", "拿书", "借书",
            "帮我拿书", "我要拿书",
            "小燕小燕", "小燕", "晓燕", "小雁",
            "推荐", "介绍", "背景", "故事", "内容",
            "你好", "再见", "谢谢",
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


@app.route("/api/ocr/ingest", methods=["POST"])
def api_ocr_ingest():
    image = None
    if "image" in request.files:
        image = request.files["image"].read()
    elif request.data:
        image = request.data

    if not image:
        return jsonify({"ok": False, "msg": "image is required"}), 400

    want_audio = request.args.get("audio") == "1" or request.form.get("audio") == "1"
    source = (request.args.get("source") or request.form.get("source") or "").strip().lower()
    push_events = source not in ("ui", "web")

    ok, msg, ai_reply = _store_from_image_bytes(image, speak_out=False)
    if push_events:
        if msg:
            _push_voice_event("log", msg)
        if ai_reply:
            _push_voice_event("assistant", ai_reply)

    reply = ai_reply or ""
    audio_b64 = ""
    audio_format = ""
    if want_audio and reply:
        mp3_bytes = tts_to_mp3_bytes(reply)
        if mp3_bytes:
            audio_b64 = base64.b64encode(mp3_bytes).decode("ascii")
            audio_format = "mp3"
        else:
            wav_bytes = tts_to_wav_bytes(reply)
            if wav_bytes:
                audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
                audio_format = "wav"

    return jsonify(
        {
            "ok": ok,
            "msg": msg,
            "ai_reply": ai_reply,
            "reply": reply,
            "audio_b64": audio_b64,
            "audio_format": audio_format,
        }
    )


@app.route("/api/voice/ingest", methods=["POST"])
def api_voice_ingest():
    audio = None
    if "audio" in request.files:
        audio = request.files["audio"].read()
    elif request.data:
        audio = request.data
    image = None
    if "image" in request.files:
        image = request.files["image"].read()

    if not audio:
        return jsonify({"ok": False, "msg": "audio is required"}), 400

    source = (request.args.get("source") or request.form.get("source") or "").strip().lower()
    mode = (request.args.get("mode") or request.form.get("mode") or "").strip().lower()
    push_events = source not in ("ui", "web")

    hints_extra = (request.form.get("hints_extra") or "").strip()
    extra_list = [h.strip() for h in hints_extra.split(",") if h.strip()] if hints_extra else []
    combined_hints = _build_voice_hints() + extra_list
    try:
        raw_text = transcribe_wav_bytes(audio, hints=combined_hints)
    except ValueError as exc:
        return jsonify({"ok": False, "msg": str(exc)}), 400
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"asr error: {exc}"}), 500

    if not raw_text:
        if mode != "command":
            return jsonify({"ok": True, "ignore": True}), 200
        return jsonify({"ok": False, "msg": "no speech detected"}), 200

    text = _normalize_voice_text(raw_text)
    if not text:
        return jsonify({"ok": True, "ignore": True}), 200

    wake_hit = _has_wake_word(text)

    def attach_audio(result):
        reply = (result.get("reply") or "").strip()
        audio_b64 = ""
        audio_format = ""
        if reply:
            mp3_bytes = tts_to_mp3_bytes(reply)
            if mp3_bytes:
                audio_b64 = base64.b64encode(mp3_bytes).decode("ascii")
                audio_format = "mp3"
            else:
                wav_bytes = tts_to_wav_bytes(reply)
                if wav_bytes:
                    audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
                    audio_format = "wav"
        result["audio_b64"] = audio_b64
        result["audio_format"] = audio_format
        return result

    if mode != "command":
        if not wake_hit:
            return jsonify({"ok": True, "ignore": True, "text": text, "wake": False}), 200

        stripped = _strip_wake_words(text)
        if not stripped:
            reply_text = "\u6211\u5728"
            if push_events:
                _push_voice_event("assistant", reply_text)
            result = {
                "ok": True,
                "wake": True,
                "intent": "wake",
                "text": text,
                "reply": reply_text,
            }
            return jsonify(attach_audio(result))

        result = _route_text(stripped, image_bytes=image, push_events=push_events)
        result["wake"] = True
        result["text"] = stripped
    else:
        stripped = _strip_wake_words(text)
        if not stripped and wake_hit:
            reply_text = "\u6211\u5728"
            if push_events:
                _push_voice_event("assistant", reply_text)
            result = {
                "ok": True,
                "wake": True,
                "intent": "wake",
                "text": text,
                "reply": reply_text,
            }
            return jsonify(attach_audio(result))
        if not stripped:
            stripped = text
        result = _route_text(stripped, image_bytes=image, push_events=push_events)
        result["wake"] = wake_hit
        result["text"] = stripped

    if result.get("need_image") and not result.get("reply"):
        result["reply"] = "\u597d\u7684\uff0c\u8bf7\u5bf9\u51c6\u4e66\u810a\uff0c\u6211\u6765\u626b\u63cf\u3002"

    return jsonify(attach_audio(result))


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


if os.environ.get("ENABLE_WAKE_LISTEN", "0") == "1":
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


@app.route("/api/voice_stream")
def api_voice_stream():
    """SSE 推送语音事件，替代轮询"""
    def generate():
        last_idx = 0
        # 先推一条心跳，让浏览器确认连接成功
        yield "data: {\"type\":\"connected\"}\n\n"
        while True:
            new_events = _voice_events[last_idx:]
            if new_events:
                last_idx = len(_voice_events)
                import json as _json
                for ev in new_events:
                    yield f"data: {_json.dumps(ev, ensure_ascii=False)}\n\n"
            time.sleep(0.2)   # 200ms 检查一次，比轮询快5倍且无重复请求

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # 防止 nginx 缓冲
        }
    )

@app.route("/api/tts_say", methods=["POST"])
def api_tts_say():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"ok": False, "msg": "empty text"}), 400
    audio_b64 = ""
    audio_format = ""
    mp3_bytes = tts_to_mp3_bytes(text)
    if mp3_bytes:
        audio_b64 = base64.b64encode(mp3_bytes).decode("ascii")
        audio_format = "mp3"
    else:
        wav_bytes = tts_to_wav_bytes(text)
        if wav_bytes:
            audio_b64 = base64.b64encode(wav_bytes).decode("ascii")
            audio_format = "wav"
    return jsonify({"ok": True, "audio_b64": audio_b64, "audio_format": audio_format})



@app.route("/api/users", methods=["GET"])
def api_get_users():
    """获取所有家庭成员"""
    return jsonify(get_all_users())


@app.route("/api/users", methods=["POST"])
def api_add_user():
    """新增家庭成员"""
    data = request.get_json(force=True) or {}
    name   = (data.get("name") or "").strip()
    role   = data.get("role", "child")
    avatar = data.get("avatar", "🧒")
    pin    = data.get("pin", "")
    if not name:
        return jsonify({"ok": False, "msg": "姓名不能为空"}), 400
    color  = data.get("color", "warm")
    uid = add_user(name, role, avatar, pin, color)
    return jsonify({"ok": True, "id": uid})


@app.route("/api/users/<int:uid>", methods=["PUT"])
def api_update_user(uid):
    """修改家庭成员信息"""
    data = request.get_json(force=True) or {}
    update_user(
        uid,
        name   = data.get("name"),
        role   = data.get("role"),
        avatar = data.get("avatar"),
        pin    = data.get("pin"),
        color  = data.get("color"),
    )
    return jsonify({"ok": True})


@app.route("/api/users/<int:uid>", methods=["DELETE"])
def api_delete_user(uid):
    """删除家庭成员"""
    delete_user(uid)
    return jsonify({"ok": True})


@app.route("/api/users/current", methods=["GET"])
def api_current_user():
    """获取当前活跃用户"""
    user = get_current_user()
    return jsonify(user or {})


@app.route("/api/users/switch", methods=["POST"])
def api_switch_user():
    """切换当前使用者（语音或点击切换）"""
    data = request.get_json(force=True) or {}
    uid = data.get("user_id")
    if not uid:
        return jsonify({"ok": False, "msg": "缺少 user_id"}), 400
    user = get_user(int(uid))
    if not user:
        return jsonify({"ok": False, "msg": "用户不存在"}), 404
    switch_user(int(uid))
    return jsonify({"ok": True, "user": user})


@app.route("/api/chat/history", methods=["GET"])
def api_chat_history():
    """小程序轮询：获取当前用户的聊天记录"""
    try:
        from ai.book_match_ai import get_chat_history, _get_current_user_safe
        user = _get_current_user_safe()
        uid = user["id"] if user else None
        history = get_chat_history(uid) if uid else []
        # 只返回最近20条，格式化为小程序可用格式
        result = []
        for role, content in history[-20:]:
            result.append({
                "role": role,
                "content": content,
                "is_bot": role == "小燕",
            })
        return jsonify({
            "ok": True,
            "history": result,
            "current_user": user,
        })
    except Exception as e:
        return jsonify({"ok": False, "history": [], "msg": str(e)})


@app.route("/api/booklist/notify", methods=["POST"])
def api_booklist_notify():
    """小程序添加必读书目后触发小燕播报"""
    data = request.get_json(force=True) or {}
    child_name = (data.get("child_name") or "").strip()
    book_title  = (data.get("book_title") or "").strip()
    note        = (data.get("note") or "").strip()
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


@app.route("/api/users/<int:uid>/stats", methods=["GET"])
def api_user_stats(uid):
    """获取某用户阅读统计"""
    stats = get_user_stats(uid)
    user  = get_user(uid)
    return jsonify({**user, **stats})


@app.route("/api/family/stats", methods=["GET"])
def api_family_stats():
    """获取全家统计"""
    return jsonify(get_family_stats())


@app.route("/api/users/<int:uid>/goal", methods=["POST"])
def api_set_goal(uid):
    """设置用户阅读目标"""
    data = request.get_json(force=True) or {}
    target = int(data.get("weekly_target", 1))
    set_reading_goal(uid, target)
    return jsonify({"ok": True})


@app.route("/api/chat/clear", methods=["POST"])
def api_clear_chat():
    """切换用户时清空该用户的对话历史"""
    data = request.get_json(force=True) or {}
    user_id = data.get("user_id")
    try:
        from ai.book_match_ai import clear_chat_history
        clear_chat_history(user_id)
    except Exception:
        pass
    return jsonify({"ok": True})

# ── 借阅记录（小程序用） ──────────────────────────────────
@app.route("/api/users/<int:uid>/borrow_logs")
def api_user_borrow_logs(uid):
    days = int(request.args.get("days", 30))
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            SELECT bl.action, bl.action_time, b.title
            FROM borrow_logs bl
            LEFT JOIN books b ON bl.book_id = b.id
            WHERE bl.user_id = ?
              AND bl.action_time >= datetime('now', ? || ' days')
            ORDER BY bl.action_time DESC
        """, (uid, f"-{days}"))
        rows = cur.fetchall()
        conn.close()
        return jsonify([{"action": r[0], "action_time": r[1], "book_title": r[2] or "未知"} for r in rows])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 成就徽章 ──────────────────────────────────────────────
@app.route("/api/users/<int:uid>/badges")
def api_user_badges(uid):
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT badge_key, unlocked_at FROM user_badges WHERE user_id=? ORDER BY unlocked_at", (uid,))
        badges = [{"badge_key": r[0], "unlocked_at": r[1]} for r in cur.fetchall()]
        conn.close()
        return jsonify({"badges": badges})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 必读书目 ──────────────────────────────────────────────
@app.route("/api/users/<int:uid>/booklist", methods=["GET"])
def api_get_booklist(uid):
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT id, title, note, done, created_at FROM required_books WHERE user_id=? ORDER BY done, created_at DESC", (uid,))
        rows = [{"id": r[0], "title": r[1], "note": r[2], "done": bool(r[3]), "created_at": r[4]} for r in cur.fetchall()]
        conn.close()
        return jsonify(rows)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/<int:uid>/booklist", methods=["POST"])
def api_add_booklist(uid):
    data = request.get_json(force=True) or {}
    title = (data.get("title") or "").strip()
    note  = (data.get("note") or "").strip()
    if not title:
        return jsonify({"ok": False, "msg": "书名不能为空"}), 400
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("INSERT INTO required_books (user_id, title, note) VALUES (?,?,?)", (uid, title, note))
        conn.commit()
        new_id = cur.lastrowid
        conn.close()
        return jsonify({"ok": True, "id": new_id})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500

@app.route("/api/users/<int:uid>/booklist/<int:bid>", methods=["DELETE"])
def api_del_booklist(uid, bid):
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        conn.execute("DELETE FROM required_books WHERE id=? AND user_id=?", (bid, uid))
        conn.commit(); conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500

@app.route("/api/users/<int:uid>/booklist/<int:bid>/done", methods=["POST"])
def api_mark_done(uid, bid):
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        conn.execute("UPDATE required_books SET done=1 WHERE id=? AND user_id=?", (bid, uid))
        conn.commit(); conn.close()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)}), 500


# ── 周报 ──────────────────────────────────────────────────
@app.route("/api/users/<int:uid>/weekly_report")
def api_weekly_report(uid):
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("""
            SELECT b.title FROM borrow_logs bl
            LEFT JOIN books b ON bl.book_id = b.id
            WHERE bl.user_id=? AND bl.action='take'
              AND bl.action_time >= datetime('now', '-7 days')
        """, (uid,))
        books = [r[0] for r in cur.fetchall() if r[0]]
        cur.execute("SELECT name FROM users WHERE id=?", (uid,))
        row = cur.fetchone()
        conn.close()
        uname = row[0] if row else "孩子"

        if not books:
            return jsonify({"summary": f"{uname}本周还没有借阅记录，快去看看书架吧！", "books": []})

        from ai.book_match_ai import ollama_call
        book_list = "、".join([f"《{b}》" for b in books])
        prompt = f"""
请为家长生成一段关于孩子本周阅读的温馨总结（100字以内）。
孩子名字：{uname}
本周读了：{book_list}
要求：语气温暖，给家长一些阅读指导建议。
"""
        summary = ollama_call(prompt)
        return jsonify({"summary": summary, "books": list(set(books))})
    except Exception as e:
        return jsonify({"summary": "报告生成失败", "books": [], "error": str(e)}), 500


# ── 月度家庭报告 ───────────────────────────────────────────
@app.route("/api/family/monthly_report")
def api_monthly_report():
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
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
        total = sum(r[1] for r in user_stats)
        conn.close()

        most_active = user_stats[0][0] if user_stats else "-"
        top_category = top_cat[0] if top_cat else "-"

        from ai.book_match_ai import ollama_call
        stats_str = "、".join([f"{r[0]}借了{r[1]}本" for r in user_stats])
        prompt = f"""
请生成一段家庭本月阅读总结（120字以内），语气温馨积极。
数据：{stats_str}，最爱分类：{top_category}
"""
        summary = ollama_call(prompt)
        return jsonify({
            "summary": summary,
            "total_books": total,
            "most_active": most_active,
            "top_category": top_category,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── 徽章检查（取书后自动调用） ────────────────────────────
def check_and_award_badges(user_id: int):
    """在 take_book 成功后调用，检查并颁发徽章"""
    try:
        import sqlite3, os
        DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()

        # 已有徽章
        cur.execute("SELECT badge_key FROM user_badges WHERE user_id=?", (user_id,))
        owned = {r[0] for r in cur.fetchall()}

        # 总借阅次数
        cur.execute("SELECT COUNT(*) FROM borrow_logs WHERE user_id=? AND action='take'", (user_id,))
        total = cur.fetchone()[0]

        # 取书时间
        cur.execute("SELECT action_time FROM borrow_logs WHERE user_id=? AND action='take' ORDER BY action_time DESC LIMIT 1", (user_id,))
        last_row = cur.fetchone()

        new_badges = []
        def award(key):
            if key not in owned:
                cur.execute("INSERT INTO user_badges (user_id, badge_key) VALUES (?,?)", (user_id, key))
                new_badges.append(key)

        if total >= 1:  award("first_book")
        if total >= 5:  award("book_5")
        if total >= 10: award("book_10")
        if total >= 30: award("book_30")

        if last_row:
            from datetime import datetime
            t = datetime.fromisoformat(last_row[0])
            if t.hour < 8:  award("early_bird")
            if t.hour >= 21: award("night_owl")

        # 分类多样性
        cur.execute("""
            SELECT COUNT(DISTINCT b.category) FROM borrow_logs bl
            JOIN books b ON bl.book_id=b.id
            WHERE bl.user_id=? AND b.category IS NOT NULL
        """, (user_id,))
        cats = cur.fetchone()[0]
        if cats >= 5: award("variety_5")

        conn.commit()
        conn.close()
        return new_badges
    except Exception as e:
        print(f"[badge] 检查失败: {e}")
        return []

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)