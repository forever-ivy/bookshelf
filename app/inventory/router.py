from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.connectors.ocr import PaddleOCRConnector
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.inventory.service import (
    count_events,
    inventory_status,
    list_events,
    list_slots,
    store_from_image_bytes,
    take_by_text,
)

router = APIRouter(prefix="/api/v1/inventory", tags=["inventory"])


def build_ocr_connector():
    return PaddleOCRConnector()


def build_llm_provider():
    from app.llm.provider import build_llm_provider as _build_llm_provider

    return _build_llm_provider()


def resolve_llm_provider():
    try:
        return build_llm_provider()
    except RuntimeError as exc:
        raise ApiError(503, "llm_provider_misconfigured", str(exc)) from exc


class TakeByTextRequest(BaseModel):
    text: str


@router.get("/slots")
def get_slots(db: Session = Depends(get_db)) -> dict:
    return {"items": list_slots(db), "total": len(list_slots(db))}


@router.get("/events")
def get_events(limit: int = Query(default=50, ge=1, le=200), db: Session = Depends(get_db)) -> dict:
    items = list_events(db, limit=limit)
    return {"items": items, "total": count_events(db)}


@router.get("/status")
def get_status(db: Session = Depends(get_db)) -> dict:
    return inventory_status(db)


@router.post("/ocr/ingest")
async def ingest_ocr(request: Request, db: Session = Depends(get_db)) -> dict:
    content_type = (request.headers.get("content-type") or "").lower()
    image_bytes = b""
    if "multipart/form-data" in content_type:
        form = await request.form()
        upload = form.get("image")
        if upload is not None:
            image_bytes = await upload.read()
    else:
        image_bytes = await request.body()

    settings = get_settings()
    return store_from_image_bytes(
        db,
        cabinet_id=settings.cabinet_id,
        image_bytes=image_bytes,
        ocr_connector=build_ocr_connector(),
        llm_provider=resolve_llm_provider(),
    )


@router.post("/take-by-text")
def take_book_by_text(payload: TakeByTextRequest, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    return take_by_text(db, cabinet_id=settings.cabinet_id, text=payload.text)
