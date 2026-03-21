from __future__ import annotations

from app.core.config import get_settings
from app.core.database import get_engine


class FakeOCRConnector:
    def extract_texts_from_image_bytes(self, image_bytes: bytes) -> list[str]:
        assert image_bytes == b"fake-image"
        return ["深度学习", "Ian Goodfellow"]


class FakeLLMProvider:
    def rerank(self, query: str, candidates: list):
        return candidates

    def explain(self, query: str, candidate, context: dict) -> str:
        return "stub"

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {
            "title": "深度学习",
            "author": "Ian Goodfellow",
            "category": "AI",
            "keywords": "deep learning,ai",
            "description": "OCR parsed by cloud model",
        }


def seed_rows(conn, statements):
    for statement, params in statements:
        conn.exec_driver_sql(statement, params)
    conn.commit()


def test_paddle_ocr_connector_uses_service_owned_adapter(monkeypatch):
    from app.connectors import ocr as ocr_connector_module
    from app.connectors import paddle_ocr_adapter

    monkeypatch.setattr(
        paddle_ocr_adapter,
        "extract_texts_from_image_bytes",
        lambda image_bytes: ["adapter-owned", "ocr"],
    )

    connector = ocr_connector_module.PaddleOCRConnector()
    assert connector.extract_texts_from_image_bytes(b"bytes") == ["adapter-owned", "ocr"]


def test_inventory_ocr_ingest_and_take_by_text_flow(client, monkeypatch):
    from app.inventory import router as inventory_router

    monkeypatch.setattr(inventory_router, "build_ocr_connector", lambda: FakeOCRConnector())
    monkeypatch.setattr(inventory_router, "build_llm_provider", lambda: FakeLLMProvider())

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                (
                    "INSERT INTO cabinet_slots (cabinet_id, slot_code, status, current_copy_id) VALUES (?, ?, ?, ?)",
                    ("cabinet-001", "A01", "empty", None),
                ),
            ],
        )

    response = client.post(
        "/api/v1/inventory/ocr/ingest",
        content=b"fake-image",
        headers={"content-type": "application/octet-stream"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["book"]["title"] == "深度学习"
    assert payload["slot"]["slot_code"] == "A01"
    assert payload["ocr_texts"] == ["深度学习", "Ian Goodfellow"]

    with engine.begin() as conn:
        slot = conn.exec_driver_sql(
            "SELECT slot_code, status, current_copy_id FROM cabinet_slots WHERE slot_code = 'A01'"
        ).fetchone()
        stock = conn.exec_driver_sql(
            "SELECT total_copies, available_copies, reserved_copies FROM book_stock WHERE cabinet_id = 'cabinet-001'"
        ).fetchone()
        events = conn.exec_driver_sql(
            "SELECT event_type, book_id, copy_id FROM inventory_events ORDER BY id ASC"
        ).fetchall()
        copy = conn.exec_driver_sql(
            "SELECT inventory_status FROM book_copies ORDER BY id ASC"
        ).fetchone()

    assert slot[0] == "A01"
    assert slot[1] == "occupied"
    assert slot[2] is not None
    assert stock == (1, 1, 0)
    assert [row[0] for row in events] == ["book_scanned", "book_stored"]
    assert events[1][1] is not None
    assert events[1][2] is not None
    assert copy == ("stored",)

    take_response = client.post("/api/v1/inventory/take-by-text", json={"text": "帮我取深度学习"})
    assert take_response.status_code == 200
    take_payload = take_response.json()
    assert take_payload["ok"] is True
    assert take_payload["slot_code"] == "A01"
    assert take_payload["book"]["title"] == "深度学习"

    with engine.begin() as conn:
        slot = conn.exec_driver_sql(
            "SELECT slot_code, status, current_copy_id FROM cabinet_slots WHERE slot_code = 'A01'"
        ).fetchone()
        stock = conn.exec_driver_sql(
            "SELECT total_copies, available_copies, reserved_copies FROM book_stock WHERE cabinet_id = 'cabinet-001'"
        ).fetchone()
        events = conn.exec_driver_sql(
            "SELECT event_type, copy_id FROM inventory_events ORDER BY id ASC"
        ).fetchall()
        copy = conn.exec_driver_sql(
            "SELECT inventory_status FROM book_copies ORDER BY id ASC"
        ).fetchone()

    assert slot == ("A01", "empty", None)
    assert stock == (1, 0, 0)
    assert [row[0] for row in events] == ["book_scanned", "book_stored", "book_taken"]
    assert events[2][1] is not None
    assert copy == ("borrowed",)


def test_inventory_ocr_ingest_returns_controlled_error_when_llm_is_misconfigured(client, monkeypatch):
    from app.inventory import router as inventory_router

    monkeypatch.setattr(inventory_router, "build_ocr_connector", lambda: FakeOCRConnector())
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()

    engine = get_engine()
    with engine.begin() as conn:
        seed_rows(
            conn,
            [
                (
                    "INSERT INTO cabinet_slots (cabinet_id, slot_code, status, current_copy_id) VALUES (?, ?, ?, ?)",
                    ("cabinet-001", "A01", "empty", None),
                ),
            ],
        )

    response = client.post(
        "/api/v1/inventory/ocr/ingest",
        content=b"fake-image",
        headers={"content-type": "application/octet-stream"},
    )

    assert response.status_code == 503
    assert response.json()["error"]["code"] == "llm_provider_misconfigured"
