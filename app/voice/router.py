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

DEFAULT_CHAT_REPLY = "我可以帮你找书、推荐图书，或者处理上架和取书请求。"
DEFAULT_CLARIFY_REPLY = "我可以帮你上架或取书，请再说完整一点，比如“帮我拿《深度学习》”或“把这本书上架”。"
STORE_IMAGE_HINT = "如果要上架，请上传书封面或书脊图片，我来识别。"


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
    voice_broker.publish_nowait(
        {
            "reader_id": reader_id,
            "role": role,
            "text": clean_text,
            "ts": time.time(),
        }
    )


def _event_history(*, reader_id: int | None, limit: int = 20) -> list[dict]:
    filtered = [event for event in voice_broker.history() if event.get("reader_id") in {None, reader_id}]
    return filtered[-limit:]


def _encode_audio(reply: str, speech_connector) -> tuple[str, str]:
    audio = speech_connector.tts_to_mp3_bytes(reply)
    if not audio:
        return "", ""
    return base64.b64encode(audio).decode("ascii"), "mp3"


def _parse_optional_int(value) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ApiError(400, "invalid_binding", "Order or fulfillment binding must be an integer")


async def _extract_request_payload(request: Request) -> tuple[str, bytes | None, bytes | None, bool, int | None, int | None]:
    content_type = (request.headers.get("content-type") or "").lower()
    wants_audio = request.query_params.get("audio") == "1"
    order_id = _parse_optional_int(request.query_params.get("orderId") or request.query_params.get("order_id"))
    fulfillment_id = _parse_optional_int(
        request.query_params.get("fulfillmentId") or request.query_params.get("fulfillment_id")
    )
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
        order_id = _parse_optional_int(payload.get("orderId") or payload.get("order_id") or order_id)
        fulfillment_id = _parse_optional_int(
            payload.get("fulfillmentId") or payload.get("fulfillment_id") or fulfillment_id
        )
        return text, audio_bytes, image_bytes, wants_audio, order_id, fulfillment_id

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
        order_id = _parse_optional_int(form.get("orderId") or form.get("order_id") or order_id)
        fulfillment_id = _parse_optional_int(form.get("fulfillmentId") or form.get("fulfillment_id") or fulfillment_id)
        return text, audio_bytes, image_bytes, wants_audio, order_id, fulfillment_id

    body = await request.body()
    if request.query_params.get("audio") == "1" or content_type in {
        "application/octet-stream",
        "audio/wav",
        "audio/x-wav",
        "audio/mpeg",
    }:
        return text, body, image_bytes, True, order_id, fulfillment_id

    try:
        text = body.decode("utf-8").strip()
    except UnicodeDecodeError:
        return text, body, image_bytes, True, order_id, fulfillment_id
    return text, audio_bytes, image_bytes, wants_audio, order_id, fulfillment_id


def _handle_store(db: Session, *, cabinet_id: str, image_bytes: bytes | None) -> dict:
    if not image_bytes:
        return {
            "ok": True,
            "intent": "store",
            "need_image": True,
            "msg": STORE_IMAGE_HINT,
            "reply": STORE_IMAGE_HINT,
        }

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
    msg = f"已识别并上架《{result['book']['title']}》，放入槽位 {result['slot']['slot_code']}。"
    return {
        "ok": True,
        "intent": "store",
        "msg": msg,
        "reply": msg,
        "book": result["book"],
        "slot": result["slot"],
        "source": result["source"],
    }


def _handle_take(
    db: Session,
    *,
    cabinet_id: str,
    text: str,
    fulfillment_id: int | None,
) -> dict:
    take_result = take_by_text(
        db,
        cabinet_id=cabinet_id,
        text=text,
        fulfillment_id=fulfillment_id,
    )
    reply = f"已为你找到《{take_result['book']['title']}》，位置在槽位 {take_result['slotCode']}。"
    return {
        "ok": True,
        "intent": "take",
        "text": text,
        "msg": reply,
        "reply": reply,
        "book": take_result["book"],
        "slot_code": take_result["slotCode"],
        "order_id": take_result["orderId"],
        "fulfillment_id": take_result["fulfillmentId"],
    }


def _handle_chat(db: Session, *, reader_id: int | None, raw_text: str, normalized_text: str) -> dict:
    llm_provider = resolve_llm_provider()
    snapshot = ContextEngine(db).build_snapshot(reader_id=reader_id, query=normalized_text)
    reply = (llm_provider.chat(text=raw_text, context=snapshot.__dict__) or "").strip()
    if not reply:
        reply = DEFAULT_CHAT_REPLY
    return {"ok": True, "intent": "chat", "text": normalized_text, "reply": reply}


def _route_text(
    db: Session,
    identity: AuthIdentity,
    text: str,
    *,
    raw_text: str,
    image_bytes: bytes | None,
    fulfillment_id: int | None,
) -> dict:
    normalized = normalize_voice_text(text)
    original = (raw_text or text).strip() or normalized
    _publish("user", normalized or original, reader_id=identity.profile_id)
    intent = detect_voice_intent(normalized)

    if looks_unclear_action(normalized):
        _publish("assistant", DEFAULT_CLARIFY_REPLY, reader_id=identity.profile_id)
        return {"ok": True, "intent": "clarify", "text": normalized, "reply": DEFAULT_CLARIFY_REPLY}

    settings = get_settings()
    if intent == "take":
        result = _handle_take(
            db,
            cabinet_id=settings.cabinet_id,
            text=normalized,
            fulfillment_id=fulfillment_id,
        )
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
    text, audio_bytes, image_bytes, wants_audio, order_id, fulfillment_id = await _extract_request_payload(request)
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
        fulfillment_id=fulfillment_id,
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
