from __future__ import annotations

import asyncio
import base64

from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.core.sse import encode_sse
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot
from app.readers.models import ReaderAccount, ReaderProfile


class FakeSpeechConnector:
    def transcribe_wav_bytes(self, wav_bytes: bytes, hints=None):
        assert wav_bytes == b"fake-audio"
        return "帮我拿《深度学习》"

    def tts_to_mp3_bytes(self, text: str):
        return b"fake-mp3"


class FakeVoiceLLMProvider:
    def rerank(self, query: str, candidates: list):
        return candidates

    def explain(self, query: str, candidate, context: dict) -> str:
        return "cloud explanation"

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {"title": ocr_texts[0] if ocr_texts else "未识别图书"}

    def chat(self, *, text: str, context: dict) -> str:
        return f"语音助手回复：{text}"


class FakeOCRConnector:
    def extract_texts_from_image_bytes(self, image_bytes: bytes) -> list[str]:
        assert image_bytes == b"fake-image"
        return ["深度学习", "Ian Goodfellow"]


def clear_voice_history():
    from app.voice.router import voice_broker

    voice_broker._history.clear()
    voice_broker._subscribers.clear()


def seed_voice_state():
    clear_voice_history()
    session = get_session_factory()()
    try:
        session.add(
            ReaderAccount(
                username="reader",
                password_hash=hash_password("reader-password"),
            )
        )
        session.flush()
        reader = session.query(ReaderAccount).filter_by(username="reader").one()
        profile = ReaderProfile(
            account_id=reader.id,
            display_name="Alice",
            affiliation_type="student",
            college="Computer Science",
            major="AI",
            grade_year="2026",
        )
        book = Book(
            title="深度学习",
            author="Ian Goodfellow",
            category="AI",
            keywords="deep learning,ai",
            summary="经典深度学习教材",
        )
        cabinet = session.get(Cabinet, "cabinet-001")
        assert cabinet is not None
        session.add_all([profile, book])
        session.flush()
        copy = BookCopy(book_id=book.id, cabinet_id=cabinet.id, inventory_status="stored")
        session.add(copy)
        session.flush()
        occupied_slot = CabinetSlot(cabinet_id="cabinet-001", slot_code="A01", status="occupied")
        empty_slot = CabinetSlot(cabinet_id="cabinet-001", slot_code="A02", status="empty")
        session.add_all([occupied_slot, empty_slot])
        session.flush()
        copy.current_slot_id = occupied_slot.id
        session.add(BookStock(book_id=book.id, cabinet_id="cabinet-001", total_copies=1, available_copies=1, reserved_copies=0))
        session.commit()
        return {"reader": reader, "profile": profile, "book": book}
    finally:
        session.close()


def reader_headers(account_id: int, profile_id: int):
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def create_take_order(client, state: dict) -> int:
    response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        json={
            "book_id": state["book"].id,
            "order_mode": "cabinet_pickup",
        },
    )
    assert response.status_code == 201
    return response.json()["order"]["id"]


def test_voice_ingest_accepts_text_and_routes_take_flow(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(voice_router, "build_llm_provider", lambda: FakeVoiceLLMProvider())
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())

    state = seed_voice_state()
    order_id = create_take_order(client, state)
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        json={"text": "帮我拿《深度学习》", "orderId": order_id},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["intent"] == "take"
    assert "深度学习" in payload["msg"]

    events_response = client.get(
        "/api/v1/voice/events",
        headers=reader_headers(state["reader"].id, state["profile"].id),
    )
    assert events_response.status_code == 200
    events = events_response.json()["events"]
    assert events[-2]["role"] == "user"
    assert events[-1]["role"] == "assistant"


def test_voice_ingest_accepts_audio_and_returns_tts_payload(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(voice_router, "build_llm_provider", lambda: FakeVoiceLLMProvider())
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())

    state = seed_voice_state()
    order_id = create_take_order(client, state)
    response = client.post(
        "/api/v1/voice/ingest",
        headers={
            **reader_headers(state["reader"].id, state["profile"].id),
            "content-type": "application/octet-stream",
        },
        params={"audio": "1", "orderId": str(order_id)},
        content=b"fake-audio",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["text"] == "帮我拿《深度学习》"
    assert payload["audio_format"] == "mp3"
    assert base64.b64decode(payload["audio_b64"]) == b"fake-mp3"


def test_voice_ingest_routes_store_flow_with_uploaded_image(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(voice_router, "build_llm_provider", lambda: FakeVoiceLLMProvider())
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())
    monkeypatch.setattr(voice_router, "build_ocr_connector", lambda: FakeOCRConnector())

    state = seed_voice_state()
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        data={"text": "把这本书上架"},
        files={"image": ("book.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["intent"] == "store"
    assert payload["book"]["title"] == "深度学习"


def test_voice_take_flow_does_not_require_llm_provider(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(
        voice_router,
        "build_llm_provider",
        lambda: (_ for _ in ()).throw(RuntimeError("llm should not be required for take")),
    )
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())

    state = seed_voice_state()
    order_id = create_take_order(client, state)
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        json={"text": "帮我拿《深度学习》", "orderId": order_id},
    )

    assert response.status_code == 200
    assert response.json()["intent"] == "take"


def test_voice_store_flow_can_fallback_when_llm_provider_is_unavailable(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(
        voice_router,
        "build_llm_provider",
        lambda: (_ for _ in ()).throw(RuntimeError("llm should not be required for catalog match")),
    )
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())
    monkeypatch.setattr(voice_router, "build_ocr_connector", lambda: FakeOCRConnector())

    state = seed_voice_state()
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        data={"text": "把这本书上架"},
        files={"image": ("book.jpg", b"fake-image", "image/jpeg")},
    )

    assert response.status_code == 200
    assert response.json()["intent"] == "store"


def test_voice_ingest_routes_chat_through_cloud_provider_and_streams_events(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(voice_router, "build_llm_provider", lambda: FakeVoiceLLMProvider())
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())

    state = seed_voice_state()
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        json={"text": "推荐一些 AI 入门书"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "chat"
    assert payload["reply"] == "语音助手回复：推荐一些 AI 入门书"

    async def read_first_event():
        stream = encode_sse(voice_router.subscribe_voice_events())
        return await stream.__anext__()

    event_text = asyncio.run(read_first_event())
    assert "assistant" in event_text or "user" in event_text


def test_voice_ingest_returns_clarify_reply_for_ambiguous_action(client, monkeypatch):
    from app.voice import router as voice_router

    monkeypatch.setattr(voice_router, "build_llm_provider", lambda: FakeVoiceLLMProvider())
    monkeypatch.setattr(voice_router, "build_speech_connector", lambda: FakeSpeechConnector())

    state = seed_voice_state()
    response = client.post(
        "/api/v1/voice/ingest",
        headers=reader_headers(state["reader"].id, state["profile"].id),
        json={"text": "拿书"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["intent"] == "clarify"
    assert "帮我拿《深度学习》" in payload["reply"]


def test_voice_endpoints_require_reader_identity(client):
    ingest_response = client.post("/api/v1/voice/ingest", json={"text": "帮我拿《深度学习》"})
    assert ingest_response.status_code == 401

    events_response = client.get("/api/v1/voice/events")
    assert events_response.status_code == 401
