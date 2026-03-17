"""
api/voice.py
语音相关路由：语音聊天、OCR 图像、语音输入、TTS、事件流。
"""

import base64
import json as _json
import threading
import time

from flask import Blueprint, jsonify, request, Response, stream_with_context

from ai.voice_module import (
    listen,
    transcribe_wav_bytes,
    tts_to_mp3_bytes,
    tts_to_wav_bytes,
)
from ai.book_match_ai import chat_with_librarian
from services.voice_intent import normalize_voice_text, has_wake_word, strip_wake_words
from services.voice_service import (
    push_voice_event,
    get_voice_events,
    route_text,
    build_voice_hints,
)
from services.shelf_service import store_from_image_bytes

voice_bp = Blueprint("voice", __name__)


@voice_bp.route("/api/voice_chat", methods=["POST"])
def api_voice_chat():
    try:
        text = listen(timeout=8, phrase_time_limit=1.2, hints=build_voice_hints())
        if not text:
            return jsonify({"ok": False, "msg": "没听清，再说一次吧"}), 200

        from ai.voice_module import speak
        reply = chat_with_librarian(text)
        threading.Thread(target=speak, args=(reply,), daemon=True).start()
        return jsonify({"ok": True, "text": text, "reply": reply})
    except Exception as exc:
        return jsonify({"ok": False, "msg": str(exc)}), 500


@voice_bp.route("/api/ocr/ingest", methods=["POST"])
def api_ocr_ingest():
    try:
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

        ok, msg, ai_reply = store_from_image_bytes(image, speak_out=False)
        if push_events:
            if msg:
                push_voice_event("log", msg)
            if ai_reply:
                push_voice_event("assistant", ai_reply)

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
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"OCR ingest failed: {exc}"}), 500


@voice_bp.route("/api/voice/ingest", methods=["POST"])
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
    combined_hints = build_voice_hints() + extra_list
    try:
        raw_text = transcribe_wav_bytes(audio, hints=combined_hints, log_result=(mode == "command"))
    except ValueError as exc:
        return jsonify({"ok": False, "msg": str(exc)}), 400
    except Exception as exc:
        return jsonify({"ok": False, "msg": f"asr error: {exc}"}), 500

    if not raw_text:
        if mode != "command":
            return jsonify({"ok": True, "ignore": True}), 200
        return jsonify({"ok": False, "msg": "no speech detected"}), 200

    text = normalize_voice_text(raw_text)
    if not text:
        return jsonify({"ok": True, "ignore": True}), 200

    wake_hit = has_wake_word(text, push_event_fn=push_voice_event)
    if mode == "command" or wake_hit:
        print(f"[voice ingest] mode={mode or 'wake'} text={text} wake_hit={wake_hit}")

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
            return jsonify({"ok": True, "ignore": True, "wake": False}), 200

        # Wake mode only arms the assistant. Commands are handled by the
        # next utterance inside the active wake window.
        reply_text = "\u6211\u5728"
        if push_events:
            push_voice_event("assistant", reply_text)
        result = {
            "ok": True,
            "wake": True,
            "intent": "wake",
            "text": "",
            "reply": reply_text,
        }
        return jsonify(attach_audio(result))
    else:
        stripped = strip_wake_words(text)
        if not stripped and wake_hit:
            reply_text = "\u6211\u5728"
            if push_events:
                push_voice_event("assistant", reply_text)
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
        result = route_text(stripped, image_bytes=image, push_events=push_events)
        result["wake"] = wake_hit
        result["text"] = stripped

    if result.get("need_image") and not result.get("reply"):
        result["ok"] = True
        result["reply"] = "\u597d\u7684\uff0c\u8bf7\u5bf9\u51c6\u4e66\u810a\uff0c\u6211\u6765\u626b\u63cf\u3002"

    return jsonify(attach_audio(result))


@voice_bp.route("/api/voice_events", methods=["GET"])
def api_voice_events():
    return jsonify({"events": get_voice_events()[-20:]})


@voice_bp.route("/api/voice_stream")
def api_voice_stream():
    """SSE 推送语音事件，替代轮询"""
    events = get_voice_events()

    def generate():
        last_idx = 0
        # 先推一条心跳，让浏览器确认连接成功
        yield 'data: {"type":"connected"}\n\n'
        while True:
            new_events = events[last_idx:]
            if new_events:
                last_idx = len(events)
                for ev in new_events:
                    yield f"data: {_json.dumps(ev, ensure_ascii=False)}\n\n"
            time.sleep(0.2)   # 200ms 检查一次

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


@voice_bp.route("/api/tts_say", methods=["POST"])
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
