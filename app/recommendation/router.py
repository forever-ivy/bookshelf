from __future__ import annotations

from sqlalchemy import func, select
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity, create_token
from app.llm.provider import build_llm_provider
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.embeddings import build_embedding_provider
from app.recommendation.service import RecommendationService

router = APIRouter(prefix="/api/v1/recommendation", tags=["recommendation"])
DEMO_READER_USERNAME_PREFIX = "demo_cf_reader_"


def resolve_llm_provider():
    try:
        return build_llm_provider()
    except RuntimeError as exc:
        raise ApiError(503, "llm_provider_misconfigured", str(exc)) from exc


def resolve_embedding_provider():
    try:
        return build_embedding_provider()
    except RuntimeError as exc:
        raise ApiError(503, "embedding_provider_misconfigured", str(exc)) from exc


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


class DemoSessionRequest(BaseModel):
    profile_id: int


def ensure_demo_mode() -> None:
    environment = (get_settings().environment or "development").strip().lower()
    if environment in {"production", "prod"}:
        raise ApiError(403, "demo_mode_disabled", "Demo helpers are disabled outside development")


@router.post("/search")
def search(
    payload: SearchRequest,
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = RecommendationService(
        db,
        provider=resolve_llm_provider(),
        embedding_provider=resolve_embedding_provider(),
    )
    return {
        "ok": True,
        **service.search(reader_id=identity.profile_id, query=payload.query, limit=payload.limit),
    }


@router.get("/books/{book_id}/similar")
def similar_books(
    book_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = RecommendationService(db)
    try:
        payload = service.similar_books(reader_id=identity.profile_id, book_id=book_id, limit=limit)
    except LookupError as exc:
        raise ApiError(404, "book_not_found", str(exc)) from exc
    except RuntimeError as exc:
        raise ApiError(409, "book_embedding_missing", str(exc)) from exc
    return {"ok": True, **payload}


@router.get("/books/{book_id}/collaborative")
def collaborative_books(
    book_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = RecommendationService(db)
    try:
        payload = service.collaborative_books(reader_id=identity.profile_id, book_id=book_id, limit=limit)
    except LookupError as exc:
        raise ApiError(404, "book_not_found", str(exc)) from exc
    except RuntimeError as exc:
        raise ApiError(409, "book_borrow_history_missing", str(exc)) from exc
    return {"ok": True, **payload}


@router.get("/demo/readers")
def demo_readers(
    limit: int = Query(default=12, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    ensure_demo_mode()
    rows = db.execute(
        select(
            ReaderProfile.id.label("profile_id"),
            ReaderProfile.display_name,
            ReaderAccount.username,
            func.count(BorrowOrder.id).label("borrow_count"),
        )
        .join(ReaderAccount, ReaderAccount.id == ReaderProfile.account_id)
        .outerjoin(BorrowOrder, BorrowOrder.reader_id == ReaderProfile.id)
        .where(ReaderAccount.username.like(f"{DEMO_READER_USERNAME_PREFIX}%"))
        .group_by(ReaderProfile.id, ReaderProfile.display_name, ReaderAccount.username)
        .order_by(func.count(BorrowOrder.id).desc(), ReaderProfile.id.asc())
        .limit(limit)
    ).all()
    return {
        "items": [
            {
                "profile_id": int(row.profile_id),
                "display_name": row.display_name,
                "username": row.username,
                "borrow_count": int(row.borrow_count or 0),
            }
            for row in rows
        ]
    }


@router.post("/demo/session")
def demo_session(
    payload: DemoSessionRequest,
    db: Session = Depends(get_db),
) -> dict:
    ensure_demo_mode()
    row = db.execute(
        select(
            ReaderProfile.id.label("profile_id"),
            ReaderProfile.display_name,
            ReaderAccount.id.label("account_id"),
            ReaderAccount.username,
        )
        .join(ReaderAccount, ReaderAccount.id == ReaderProfile.account_id)
        .where(ReaderProfile.id == payload.profile_id)
    ).one_or_none()
    if row is None:
        raise ApiError(404, "reader_not_found", f"Reader profile {payload.profile_id} was not found")

    identity = AuthIdentity(
        account_id=int(row.account_id),
        role="reader",
        profile_id=int(row.profile_id),
    )
    access_token = create_token(identity, ttl_minutes=60 * 12, token_type="access")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "reader": {
            "profile_id": int(row.profile_id),
            "account_id": int(row.account_id),
            "display_name": row.display_name,
            "username": row.username,
        },
    }


@router.get("/books/{book_id}/hybrid")
def hybrid_books(
    book_id: int,
    limit: int = Query(default=5, ge=1, le=20),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    service = RecommendationService(db)
    try:
        payload = service.hybrid_books(reader_id=identity.profile_id, book_id=book_id, limit=limit)
    except LookupError as exc:
        raise ApiError(404, "book_not_found", str(exc)) from exc
    except RuntimeError as exc:
        raise ApiError(409, "book_recommendation_signals_missing", str(exc)) from exc
    return {"ok": True, **payload}


@router.get("/me/personalized")
def personalized_books(
    limit: int = Query(default=5, ge=1, le=20),
    history_limit: int = Query(default=3, ge=1, le=10),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    service = RecommendationService(db)
    try:
        payload = service.personalized_books(
            reader_id=int(identity.profile_id),
            limit=limit,
            history_limit=history_limit,
        )
    except LookupError as exc:
        raise ApiError(404, "reader_not_found", str(exc)) from exc
    except RuntimeError as exc:
        raise ApiError(409, "reader_borrow_history_missing", str(exc)) from exc
    return {"ok": True, **payload}


@router.get("/me/dashboard")
def recommendation_dashboard(
    limit: int = Query(default=5, ge=1, le=20),
    history_limit: int = Query(default=3, ge=1, le=10),
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    service = RecommendationService(db)
    try:
        payload = service.recommendation_dashboard(
            reader_id=int(identity.profile_id),
            limit=limit,
            history_limit=history_limit,
        )
    except LookupError as exc:
        raise ApiError(404, "reader_not_found", str(exc)) from exc
    except RuntimeError as exc:
        raise ApiError(409, "reader_borrow_history_missing", str(exc)) from exc
    return {"ok": True, **payload}
