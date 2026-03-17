"""
services/voice_service.py
语音交互流程编排：事件管理、模式路由、唤醒循环。
不依赖 Flask。
"""

import time

from ai.voice_module import speak, listen, listen_wake_only
from ai.book_match_ai import chat_with_librarian
from config import VOICE_MODE, VOICE_MODEL_DISPATCH
from db.shelf_ops import get_all_compartments, get_book_in_compartment
from config import STORE_SAMPLES, TAKE_SAMPLES, STORE_KEYWORDS, TAKE_KEYWORDS, WAKE_WORDS
from services.voice_intent import (
    normalize_voice_text,
    has_wake_word,
    detect_voice_intent,
    looks_unclear_action,
)
from services.shelf_service import store_via_ocr, store_from_image_bytes, take_by_text
from services.ai_dispatch import dispatch_with_model, execute_model_commands


# ── 全局事件状态 ───────────────────────────────────────────

_voice_events = []


def push_voice_event(role: str, text: str):
    if not text:
        return
    if _voice_events:
        last = _voice_events[-1]
        if last.get("role") == role and last.get("text") == text:
            return
    _voice_events.append({"role": role, "text": text, "ts": time.time()})
    if len(_voice_events) > 50:
        _voice_events[:] = _voice_events[-50:]


def get_voice_events():
    return _voice_events


# ── 语音处理流程（本地麦克风模式） ────────────────────────

def process_voice_text(text: str):
    normalized = normalize_voice_text(text)
    if not normalized:
        return

    push_voice_event("user", normalized)
    intent = detect_voice_intent(normalized)

    if intent == "store":
        try:
            speak("好的，这就为你存书")
            ok, msg, ai_reply = store_via_ocr()
            if msg:
                push_voice_event("assistant", msg)
                speak(msg)
            if ai_reply:
                push_voice_event("assistant", ai_reply)
        except Exception as exc:
            print("[voice store error]", exc)
            err_msg = "存书执行失败，请再试一次"
            push_voice_event("assistant", err_msg)
            speak(err_msg)
        return

    if intent == "take":
        try:
            ok, msg, ai_reply = take_by_text(normalized)
            if msg:
                push_voice_event("assistant", msg)
                speak(msg)
            if ai_reply:
                push_voice_event("assistant", ai_reply)
        except Exception as exc:
            print("[voice take error]", exc)
            err_msg = "取书执行失败，请再试一次"
            push_voice_event("assistant", err_msg)
            speak(err_msg)
        return

    if looks_unclear_action(normalized):
        hint = "我听到了，但没听清。你可以说：帮我存书，或者：帮我取《书名》。"
        push_voice_event("assistant", hint)
        speak(hint)
        return

    try:
        reply = chat_with_librarian(normalized)
        push_voice_event("assistant", reply)
        speak(reply)
    except Exception as exc:
        print("[voice chat error]", exc)


# ── 远程文本处理 ──────────────────────────────────────────

def process_text_remote(text: str, image_bytes=None, push_events=True):
    normalized = normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}

    if push_events:
        push_voice_event("user", normalized)
    intent = detect_voice_intent(normalized)

    if intent == "store":
        if image_bytes:
            ok, msg, ai_reply = store_from_image_bytes(image_bytes, speak_out=False)
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
                push_voice_event("log", msg)
            if ai_reply:
                push_voice_event("assistant", ai_reply)
        return {
            "ok": ok,
            "intent": intent,
            "text": normalized,
            "msg": msg,
            "ai_reply": ai_reply,
            "reply": ai_reply or "",
        }

    if intent == "take":
        ok, msg, ai_reply = take_by_text(normalized, speak_out=False)
        if push_events:
            if msg:
                push_voice_event("log", msg)
            if ai_reply:
                push_voice_event("assistant", ai_reply)
        return {
            "ok": ok,
            "intent": intent,
            "text": normalized,
            "msg": msg,
            "ai_reply": ai_reply,
            "reply": ai_reply or "",
        }

    if looks_unclear_action(normalized):
        hint = "I heard you, but not clearly. Say: store a book, or take a book title."
        if push_events:
            push_voice_event("assistant", hint)
        return {"ok": True, "intent": "clarify", "text": normalized, "reply": hint}

    try:
        reply = chat_with_librarian(normalized)
        if push_events:
            push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply}
    except Exception as exc:
        print("[voice chat error]", exc)
        return {"ok": False, "intent": "chat", "text": normalized, "msg": str(exc)}


def process_text_chat_only(text: str, push_events=True):
    normalized = normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}
    if push_events:
        push_voice_event("user", normalized)
    try:
        reply = chat_with_librarian(normalized)
        if push_events:
            push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply}
    except Exception as exc:
        print("[voice chat error]", exc)
        return {"ok": False, "intent": "chat", "text": normalized, "msg": str(exc)}


def process_text_model_dispatch(text: str, image_bytes=None, push_events=True):
    normalized = normalize_voice_text(text)
    if not normalized:
        return {"ok": False, "msg": "empty text"}

    if push_events:
        push_voice_event("user", normalized)

    _push_fn = push_voice_event if push_events else None

    response_text, commands, raw_reply = dispatch_with_model(normalized)
    if not commands:
        # 模型没给出指令，退化成聊天模式
        reply = response_text or chat_with_librarian(normalized)
        if push_events:
            push_voice_event("assistant", reply)
        return {"ok": True, "intent": "chat", "text": normalized, "reply": reply, "model_raw": raw_reply}

    exec_result = execute_model_commands(commands, image_bytes=image_bytes, push_event_fn=_push_fn)
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


def route_text(text: str, image_bytes=None, push_events=True):
    mode = VOICE_MODE
    normalized = normalize_voice_text(text)
    direct_intent = detect_voice_intent(normalized)
    if direct_intent in ("store", "take"):
        return process_text_remote(normalized, image_bytes=image_bytes, push_events=push_events)
    if mode == "chat":
        return process_text_chat_only(text, push_events=push_events)
    if mode == "standard":
        return process_text_model_dispatch(text, image_bytes=image_bytes, push_events=push_events)
    if mode in ("auto_model", "model") or VOICE_MODEL_DISPATCH:
        try:
            result = process_text_model_dispatch(text, image_bytes=image_bytes, push_events=push_events)
            if result.get("intent") != "chat":
                return result
        except Exception as exc:
            print("[voice model dispatch error]", exc)
    return process_text_remote(text, image_bytes=image_bytes, push_events=push_events)


# ── 语音提示词构建 ────────────────────────────────────────

def build_voice_hints():
    hints = set(STORE_SAMPLES + TAKE_SAMPLES + STORE_KEYWORDS + TAKE_KEYWORDS)
    hints.update(WAKE_WORDS)
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


# ── 唤醒线程 ─────────────────────────────────────────────

_last_wake_ts = 0.0


def wake_loop():
    global _last_wake_ts
    print(f"[wake loop] starting with wake words: {WAKE_WORDS}")
    last_woke = None
    while True:
        try:
            woke = listen_wake_only(wake_words=WAKE_WORDS)
            if woke != last_woke:
                print(f"[wake loop] woke={woke}")
                last_woke = woke
            if not woke:
                continue

            now = time.time()
            if now - _last_wake_ts < 4.0:
                continue
            _last_wake_ts = now

            speak("我在")
            push_voice_event("assistant", "我在")

            # Active for 15s after each recognized command.
            window_deadline = time.time() + 15
            while time.time() < window_deadline:
                cmd_text = listen(timeout=8, phrase_time_limit=1.2, hints=build_voice_hints())
                if not cmd_text:
                    continue
                print(f"[wake loop] heard command raw={cmd_text}")
                cmd_text = normalize_voice_text(cmd_text)
                print(f"[wake loop] heard command normalized={cmd_text}")
                if not cmd_text or len(cmd_text) <= 1:
                    continue
                process_voice_text(cmd_text)
                window_deadline = time.time() + 15

        except Exception as exc:
            print("[wake loop error]", exc)
            time.sleep(0.5)
