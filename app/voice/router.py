from __future__ import annotations

import base64
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.connectors.ocr import PaddleOCRConnector
from app.context.engine import ContextEngine
from app.core.auth_context import require_reader
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.events import EventBroker
from app.core.security import AuthIdentity
from app.core.sse import sse_response
from app.inventory.service import store_from_image_bytes, take_by_text
from app.llm.provider import NullLLMProvider, build_llm_provider as _build_llm_provider
from app.voice.intent import detect_voice_intent, looks_unclear_action, normalize_voice_text
from app.voice.speech import NullSpeechConnector, build_speech_connector as _build_speech_connector

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])
voice_broker = EventBroker()


def build_llm_provider():
    return _build_llm_provider()


def resolve_llm_provider():
    try:
        return build_llm_provider()
    except RuntimeError as exc:
        raise ApiError(503, "llm_provider_misconfigured", str(exc)) from exc


def build_speech_connector():
    return _build_speech_connector()


def build_ocr_connector():
    return PaddleOCRConnector()


def subscribe_voice_events() -> AsyncIterator[dict]:
    return voice_broker.subscribe()


def _publish(role: str, text: str, *, reader_id: int | None) -> None:
    clean_text = (text or "").strip()
    if not clean_text:
        return
    event = {"reader_id": reader_id, "role": role, "text": clean_text, "ts": time.time()}
    voice_broker.publish_nowait(event)


def _event_history(*, reader_id: int | None, limit: int = 20) -> list[dict]:
    filtered = [
        event for event in voice_broker.history() if event.get("reader_id") in {None, reader_id}
    ]
    return filtered[-limit:]


def _encode_audio(reply: str, speech_connector) -> tuple[str, str]:
    audio = speech_connector.tts_to_mp3_bytes(reply)
    if not audio:
        return "", ""
    return base64.b64encode(audio).decode("ascii"), "mp3"


async def _extract_request_payload(request: Request) -> tuple[str, bytes | None, bytes | None, bool]:
    content_type = (request.headers.get("content-type") or "").lower()
    wants_audio = request.query_params.get("audio") == "1"
    text = ""
    audio_bytes: bytes | None = None
    image_bytes: bytes | None = None

    if "application/json" in content_type:
        try:
            payload = await request.json()
        except Exception:
            payload = {}
        text = str(payload.get("text") or "").strip()
        wants_audio = wants_audio or bool(payload.get("audio"))
        return text, audio_bytes, image_bytes, wants_audio

    if "multipart/form-data" in content_type:
        form = await request.form()
        text = str(form.get("text") or "").strip()
        audio_upload = form.get("audio")
        image_upload = form.get("image")
        if audio_upload is not None and hasattr(audio_upload, "read"):
            audio_bytes = await audio_upload.read()
        if image_upload is not None and hasattr(image_upload, "read"):
            image_bytes = await image_upload.read()
        wants_audio = wants_audio or str(form.get("audio") or form.get("audio_reply") or "") == "1"
        return text, audio_bytes, image_bytes, wants_audio

    body = await request.body()
    if request.query_params.get("audio") == "1" or content_type in {
        "application/octet-stream",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
    }:
        return text, body, image_bytes, True

    try:
        text = body.decode("utf-8").strip()
    except UnicodeDecodeError:
        return text, body, image_bytes, True
    return text, audio_bytes, image_bytes, wants_audio


def _handle_store(db: Session, *, cabinet_id: str, image_bytes: bytes | None) -> dict:
    if not image_bytes:
        hint = "好的，请对准书脊上传图片，我来帮你存书。"
        return {"ok": True, "intent": "store", "need_image": True, "msg": hint, "reply": hint}

    try:
        llm_provider = resolve_llm_provider()
    except ApiError:
        llm_provider = NullLLMProvider()

    result = store_from_image_bytes(
        db,
        cabinet_id=cabinet_id,
        image_bytes=image_bytes,
        ocr_connector=build_ocr_connector(),
        llm_provider=llm_provider,
    )
    msg = f"已将《{result['book']['title']}》存入 {result['slot']['slot_code']}"
    return {
        "ok": True,
        "intent": "store",
        "msg": msg,
        "reply": msg,
        "book": result["book"],
        "slot": result["slot"],
        "source": result["source"],
    }


def _handle_take(db: Session, *, cabinet_id: str, text: str) -> dict:
    take_result = take_by_text(db, cabinet_id=cabinet_id, text=text)
    reply = f"已帮你取出《{take_result['book']['title']}》。"
    return {
        "ok": True,
        "intent": "take",
        "text": text,
        "msg": reply,
        "reply": reply,
        "book": take_result["book"],
        "slot_code": take_result["slot_code"],
    }


def _handle_chat(db: Session, *, reader_id: int | None, raw_text: str, normalized_text: str) -> dict:
    llm_provider = resolve_llm_provider()
    snapshot = ContextEngine(db).build_snapshot(reader_id=reader_id, query=normalized_text)
    reply = llm_provider.chat(text=raw_text, context=snapshot.__dict__)
    reply = (reply or "").strip() or "我可以帮你找书或推荐相关内容。"
    return {"ok": True, "intent": "chat", "text": normalized_text, "reply": reply}


def _route_text(db: Session, identity: AuthIdentity, text: str, *, raw_text: str, image_bytes: bytes | None) -> dict:
    normalized = normalize_voice_text(text)
    original = (raw_text or text).strip()
    _publish("user", normalized, reader_id=identity.profile_id)
    intent = detect_voice_intent(normalized)

    if intent == "chat" and looks_unclear_action(normalized):
        reply = "我听到了，但还不够明确。你可以说：帮我取《书名》。"
        _publish("assistant", reply, reader_id=identity.profile_id)
        return {"ok": True, "intent": "clarify", "text": normalized, "reply": reply}

    settings = get_settings()
    if intent == "take":
        result = _handle_take(db, cabinet_id=settings.cabinet_id, text=normalized)
    elif intent == "store":
        result = _handle_store(db, cabinet_id=settings.cabinet_id, image_bytes=image_bytes)
    else:
        result = _handle_chat(db, reader_id=identity.profile_id, raw_text=original, normalized_text=normalized)

    _publish("assistant", result.get("reply") or result.get("msg") or "", reader_id=identity.profile_id)
    return result


@router.post("/ingest")
async def ingest_voice(
    request: Request,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    text, audio_bytes, image_bytes, wants_audio = await _extract_request_payload(request)
    speech_connector = NullSpeechConnector()

    if audio_bytes:
        speech_connector = build_speech_connector()
        text = speech_connector.transcribe_wav_bytes(audio_bytes, hints=None)

    normalized = normalize_voice_text(text)
    if not normalized:
        raise ApiError(400, "missing_text", "Text or audio is required")

    result = _route_text(
        db,
        identity,
        normalized,
        raw_text=text,
        image_bytes=image_bytes,
    )

    if wants_audio:
        if isinstance(speech_connector, NullSpeechConnector):
            speech_connector = build_speech_connector()
        reply = (result.get("reply") or result.get("msg") or "").strip()
        if reply:
            result["audio_b64"], result["audio_format"] = _encode_audio(reply, speech_connector)
        else:
            result["audio_b64"], result["audio_format"] = "", ""
    else:
        result["audio_b64"], result["audio_format"] = "", ""

    return result


@router.get("/events")
def get_events(identity: AuthIdentity = Depends(require_reader)) -> dict:
    return {"ok": True, "events": _event_history(reader_id=identity.profile_id)}


@router.get("/stream")
def stream_events(identity: AuthIdentity = Depends(require_reader)):
    async def filtered_events() -> AsyncIterator[dict]:
        async for event in subscribe_voice_events():
            if event.get("reader_id") in {None, identity.profile_id}:
                yield event

    return sse_response(filtered_events())
