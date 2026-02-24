import json
import os
import re
import uuid
import wave
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

import edge_tts
import numpy as np
import soundfile as sf
from fastapi import APIRouter, File, HTTPException, Response, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from vosk import KaldiRecognizer, Model

from db.book_match import find_book_by_title
from db.shelf_ops import (
    find_books_by_keyword,
    find_free_compartment,
    store_book,
    take_book_by_cid,
)


MODEL_PATH = Path(os.getenv("VOSK_MODEL_PATH", "models/vosk-cn"))
VOICE_NAME = os.getenv("EDGE_TTS_VOICE", "zh-CN-XiaoxiaoNeural")
DEFAULT_DEVICE_ID = os.getenv("DEFAULT_DEVICE_ID", "device-001")
VOSK_SAMPLE_RATE = 16000

TAKE_KEYWORDS = ("取书", "拿书", "借书", "取一下", "帮我取", "我要看")
STORE_KEYWORDS = ("存书", "放回", "还书", "归还", "放进去", "帮我存")

router = APIRouter(prefix="/voice", tags=["voice"])

_vosk_model: Optional[Model] = None
_device_sockets: dict[str, WebSocket] = {}
_command_states: dict[str, dict[str, Any]] = {}


class TextReq(BaseModel):
    text: str


class NLUResult(BaseModel):
    intent: str
    book: Optional[str] = None
    raw_text: str


class CommandReq(BaseModel):
    text: str
    device_id: Optional[str] = None


class CommandStatusReq(BaseModel):
    command_id: str
    status: str
    detail: Optional[str] = None


def _load_vosk_model() -> Model:
    global _vosk_model
    if _vosk_model is not None:
        return _vosk_model
    if not MODEL_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"VOSK model not found: {MODEL_PATH}",
        )
    _vosk_model = Model(str(MODEL_PATH))
    return _vosk_model


def _convert_to_pcm16_16k(upload_path: Path) -> bytes:
    """
    Accept common audio formats readable by soundfile and convert to:
    mono + 16kHz + PCM16 bytes.
    """
    try:
        audio, sample_rate = sf.read(str(upload_path), dtype="float32", always_2d=True)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Unsupported audio format: {exc}")

    if audio.size == 0:
        raise HTTPException(status_code=400, detail="Empty audio")

    mono = audio.mean(axis=1)
    if sample_rate != VOSK_SAMPLE_RATE:
        src_idx = np.arange(len(mono), dtype=np.float32)
        target_len = max(1, int(len(mono) * VOSK_SAMPLE_RATE / sample_rate))
        dst_idx = np.linspace(0, len(mono) - 1, target_len, dtype=np.float32)
        mono = np.interp(dst_idx, src_idx, mono).astype(np.float32)

    mono = np.clip(mono, -1.0, 1.0)
    pcm16 = (mono * 32767.0).astype(np.int16)
    return pcm16.tobytes()


def _transcribe_pcm(pcm_bytes: bytes) -> str:
    model = _load_vosk_model()
    recognizer = KaldiRecognizer(model, VOSK_SAMPLE_RATE)
    recognizer.SetWords(False)
    chunk_size = 4000
    for idx in range(0, len(pcm_bytes), chunk_size):
        recognizer.AcceptWaveform(pcm_bytes[idx : idx + chunk_size])
    result = json.loads(recognizer.FinalResult())
    return (result.get("text") or "").strip()


def _extract_book_name(text: str) -> Optional[str]:
    m = re.search(r"《([^》]{1,80})》", text)
    if m:
        return m.group(1).strip()

    m = re.search(r"(?:取书|拿书|借书|存书|放回|还书|归还)\s*([^\s，。！？,.!?]{1,80})", text)
    if m:
        return m.group(1).strip()
    return None


def _parse_intent(text: str) -> NLUResult:
    cleaned = text.strip()
    if not cleaned:
        return NLUResult(intent="unknown", raw_text=text)

    if any(k in cleaned for k in TAKE_KEYWORDS):
        return NLUResult(intent="take_book", book=_extract_book_name(cleaned), raw_text=text)
    if any(k in cleaned for k in STORE_KEYWORDS):
        return NLUResult(intent="store_book", book=_extract_book_name(cleaned), raw_text=text)
    return NLUResult(intent="chat", book=_extract_book_name(cleaned), raw_text=text)


def _build_take_command(book_name: Optional[str]) -> dict[str, Any]:
    if not book_name:
        raise HTTPException(status_code=400, detail="Book name is required for take_book")

    rows = find_books_by_keyword(book_name)
    if not rows:
        book_info = find_book_by_title(book_name)
        if not book_info:
            raise HTTPException(status_code=404, detail=f"Book not found: {book_name}")
        rows = find_books_by_keyword(book_info["title"])
        if not rows:
            raise HTTPException(status_code=404, detail=f"Book is not in shelf now: {book_info['title']}")

    title, cid, x, y = rows[0]
    return {
        "action": "take",
        "book": title,
        "cid": cid,
        "x": x,
        "y": y,
    }


def _build_store_command(book_name: Optional[str]) -> dict[str, Any]:
    if not book_name:
        raise HTTPException(status_code=400, detail="Book name is required for store_book")

    book_info = find_book_by_title(book_name)
    if not book_info:
        raise HTTPException(status_code=404, detail=f"Book not found in DB: {book_name}")

    free = find_free_compartment()
    if not free:
        raise HTTPException(status_code=400, detail="No free compartment")

    cid, x, y = free
    return {
        "action": "store",
        "book": book_info["title"],
        "book_id": book_info["id"],
        "cid": cid,
        "x": x,
        "y": y,
    }


def _build_reply(intent: str, book: Optional[str]) -> str:
    if intent == "take_book":
        return f"好的，正在为你取《{book or '目标书籍'}》。"
    if intent == "store_book":
        return f"好的，正在为你存放《{book or '目标书籍'}》。"
    return "我收到了你的指令。"


def _apply_done_to_db(state: dict[str, Any]) -> None:
    if state.get("db_applied"):
        return

    intent = state.get("intent")
    command = state.get("last_command") or {}
    payload = command.get("payload", {})

    if intent == "take_book":
        cid = payload.get("cid")
        if cid is not None:
            take_book_by_cid(cid)
            state["db_applied"] = True
    elif intent == "store_book":
        book_id = payload.get("book_id")
        cid = payload.get("cid")
        if book_id is not None and cid is not None:
            store_book(book_id, cid)
            state["db_applied"] = True


async def _synthesize_mp3(text: str) -> bytes:
    communicate = edge_tts.Communicate(text=text, voice=VOICE_NAME)
    audio_bytes = b""
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_bytes += chunk["data"]
    return audio_bytes


async def _push_command(device_id: str, command: dict[str, Any]) -> None:
    ws = _device_sockets.get(device_id)
    if ws is None:
        raise HTTPException(status_code=404, detail=f"Device not connected: {device_id}")
    await ws.send_json(command)


@router.post("/asr")
async def asr_upload(audio: UploadFile = File(...)):
    suffix = Path(audio.filename or "").suffix.lower()
    temp_path = Path("data") / f"_upload_{uuid.uuid4().hex}{suffix or '.dat'}"
    temp_path.parent.mkdir(parents=True, exist_ok=True)
    content = await audio.read()
    temp_path.write_bytes(content)

    try:
        if suffix == ".pcm":
            pcm = content
        else:
            pcm = _convert_to_pcm16_16k(temp_path)
        text = _transcribe_pcm(pcm)
    finally:
        if temp_path.exists():
            temp_path.unlink()

    return {"ok": True, "text": text}


@router.post("/nlu")
async def nlu_parse(req: TextReq):
    result = _parse_intent(req.text)
    nlu_data = result.model_dump() if hasattr(result, "model_dump") else result.dict()
    return {"ok": True, "nlu": nlu_data}


@router.websocket("/ws/device/{device_id}")
async def device_ws(websocket: WebSocket, device_id: str):
    await websocket.accept()
    _device_sockets[device_id] = websocket
    try:
        while True:
            payload = await websocket.receive_json()
            msg_type = payload.get("type")
            if msg_type == "status":
                command_id = payload.get("command_id")
                if command_id and command_id in _command_states:
                    _command_states[command_id]["status"] = payload.get("status", "unknown")
                    _command_states[command_id]["updated_at"] = datetime.now().isoformat()
                    _command_states[command_id]["detail"] = payload.get("detail")
                    if payload.get("status") == "done":
                        try:
                            _apply_done_to_db(_command_states[command_id])
                        except Exception as exc:
                            _command_states[command_id]["status"] = "failed"
                            _command_states[command_id]["detail"] = f"DB apply failed: {exc}"
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong", "ts": datetime.now().isoformat()})
    except WebSocketDisconnect:
        pass
    finally:
        if _device_sockets.get(device_id) is websocket:
            del _device_sockets[device_id]


@router.post("/command")
async def create_command(req: CommandReq):
    nlu = _parse_intent(req.text)
    device_id = req.device_id or DEFAULT_DEVICE_ID

    if nlu.intent == "take_book":
        action_payload = _build_take_command(nlu.book)
    elif nlu.intent == "store_book":
        action_payload = _build_store_command(nlu.book)
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported intent for device command: {nlu.intent}")

    command_id = uuid.uuid4().hex
    command = {
        "type": "command",
        "command_id": command_id,
        "payload": action_payload,
    }
    _command_states[command_id] = {
        "status": "accepted",
        "intent": nlu.intent,
        "book": nlu.book,
        "device_id": device_id,
        "created_at": datetime.now().isoformat(),
        "last_command": command,
    }
    await _push_command(device_id, command)
    return {"ok": True, "command_id": command_id, "command": command}


@router.post("/command/status")
async def update_command_status(req: CommandStatusReq):
    state = _command_states.get(req.command_id)
    if not state:
        raise HTTPException(status_code=404, detail="command_id not found")
    state["status"] = req.status
    state["updated_at"] = datetime.now().isoformat()
    state["detail"] = req.detail

    if req.status == "done":
        try:
            _apply_done_to_db(state)
        except Exception as exc:
            state["status"] = "failed"
            state["detail"] = f"DB apply failed: {exc}"

    return {"ok": True, "state": state}


@router.get("/command/{command_id}")
async def get_command_status(command_id: str):
    state = _command_states.get(command_id)
    if not state:
        raise HTTPException(status_code=404, detail="command_id not found")
    return {"ok": True, "state": state}


@router.post("/tts")
async def tts(req: TextReq):
    audio_bytes = await _synthesize_mp3(req.text)
    return Response(content=audio_bytes, media_type="audio/mpeg")


@router.post("/assistant")
async def assistant(req: CommandReq):
    nlu = _parse_intent(req.text)
    if nlu.intent not in ("take_book", "store_book"):
        reply = _build_reply(nlu.intent, nlu.book)
        audio_bytes = await _synthesize_mp3(reply)
        return Response(content=audio_bytes, media_type="audio/mpeg")

    device_id = req.device_id or DEFAULT_DEVICE_ID
    if nlu.intent == "take_book":
        action_payload = _build_take_command(nlu.book)
    else:
        action_payload = _build_store_command(nlu.book)

    command_id = uuid.uuid4().hex
    command = {
        "type": "command",
        "command_id": command_id,
        "payload": action_payload,
    }
    _command_states[command_id] = {
        "status": "accepted",
        "intent": nlu.intent,
        "book": nlu.book,
        "device_id": device_id,
        "created_at": datetime.now().isoformat(),
        "last_command": command,
    }

    await _push_command(device_id, command)
    reply = _build_reply(nlu.intent, action_payload.get("book"))
    audio_bytes = await _synthesize_mp3(reply)
    return Response(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"X-Command-Id": command_id},
    )
