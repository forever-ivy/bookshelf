from __future__ import annotations

from sqlalchemy import case, func, or_, select
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.catalog.models import Book
from app.catalog.service import build_book_payload, get_book_by_id
from app.core.auth_context import require_reader
from app.core.config import get_settings
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity, create_token
from app.llm.provider import build_llm_provider
from app.orders.models import BorrowOrder
from app.readers.app_service import list_system_booklists
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.embeddings import build_embedding_provider
from app.recommendation.service import RecommendationService

router = APIRouter(prefix="/api/v1/recommendation", tags=["recommendation"])
DEMO_READER_USERNAME_PREFIXES = ("demo_cf_reader_", "demo_ml_reader_")
ML_DEMO_READER_USERNAME_PREFIX = "demo_ml_reader_"


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


def _feed_item_from_book_payload(payload: dict, *, explanation: str | None = None) -> dict:
    return {
        "book_id": payload["id"],
        "title": payload["title"],
        "author": payload.get("author"),
        "summary": payload.get("summary"),
        "tags": payload.get("tag_names") or payload.get("tags") or [],
        "cabinet_label": payload.get("cabinet_label"),
        "shelf_label": payload.get("shelf_label"),
        "deliverable": payload.get("delivery_available", False),
        "eta_minutes": payload.get("eta_minutes"),
        "available_copies": payload.get("available_copies", 0),
        "explanation": explanation,
        "cover_tone": payload.get("cover_tone"),
    }


def _popular_books(db: Session, *, limit: int) -> list[Book]:
    rows = db.execute(
        select(Book, func.count(BorrowOrder.id).label("borrow_count"))
        .join(BorrowOrder, BorrowOrder.book_id == Book.id, isouter=True)
        .group_by(Book.id)
        .order_by(func.count(BorrowOrder.id).desc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [row[0] for row in rows]


@router.get("/home-feed")
def home_feed(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    profile = db.get(ReaderProfile, int(identity.profile_id))
    if profile is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")

    service = RecommendationService(db)
    personalized_results: list[dict] = []
    try:
        personalized_results = service.personalized_books(reader_id=profile.id, limit=3, history_limit=3)["results"]
    except RuntimeError:
        personalized_results = []

    today_recommendations: list[dict] = []
    for result in personalized_results:
        book = get_book_by_id(db, int(result["book_id"]))
        if book is None:
            continue
        payload = build_book_payload(db, book)
        today_recommendations.append(
            _feed_item_from_book_payload(payload, explanation=result.get("explanation"))
        )

    if not today_recommendations:
        for book in _popular_books(db, limit=3):
            payload = build_book_payload(db, book)
            today_recommendations.append(
                _feed_item_from_book_payload(payload, explanation="近期在馆内较受欢迎")
            )

    system_booklists = list_system_booklists(db, limit=3)
    exam_zone: list[dict] = []
    for booklist in system_booklists[:2]:
        for book in booklist.get("books", [])[:2]:
            exam_zone.append(
                _feed_item_from_book_payload(
                    book,
                    explanation=f"来自系统书单《{booklist['title']}》",
                )
            )
    if not exam_zone:
        for book in _popular_books(db, limit=2):
            payload = build_book_payload(db, book)
            exam_zone.append(_feed_item_from_book_payload(payload, explanation="馆内高频借阅图书"))

    tag_label = "、".join((profile.interest_tags or [])[:3]) or "你的借阅历史"
    active_orders = int(
        db.scalar(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == profile.id, BorrowOrder.status.not_in(["completed", "cancelled", "returned"]))
        )
        or 0
    )
    return {
        "today_recommendations": today_recommendations[:3],
        "exam_zone": exam_zone[:3],
        "explanation_card": {
            "title": "为什么推荐给你",
            "body": f"系统会结合 {tag_label}、最近借阅和馆内热度，优先展示当前可借的图书。",
        },
        "quick_actions": [
            {
                "code": "borrow_now",
                "title": "一键借书",
                "description": "优先查看当前可借并支持配送的图书。",
                "meta": f"{len(today_recommendations[:3])} 本推荐已准备好",
            },
            {
                "code": "delivery_status",
                "title": "配送状态",
                "description": "查看借阅和归还履约的最新状态。",
                "meta": f"{active_orders} 单进行中",
            },
            {
                "code": "recommendation_reason",
                "title": "推荐解释",
                "description": "了解这些推荐和你的课程、兴趣是如何关联的。",
                "meta": "解释型推荐",
            },
        ],
        "hot_lists": [
            {"id": "popular-now", "title": "本周热门", "description": "近期馆内借阅最活跃的图书集合。"},
            {"id": "exam-focus", "title": "考试专区", "description": "适合在考试周快速补强的主题内容。"},
            {"id": "reader-focus", "title": "与你相关", "description": "根据你的兴趣和借阅行为生成。"},
        ],
        "system_booklists": [
            {
                "id": item["id"],
                "title": item["title"],
                "description": item.get("description") or "系统精选主题阅读清单。",
            }
            for item in system_booklists[:3]
        ],
    }


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
        .where(
            or_(
                *[
                    ReaderAccount.username.like(f"{prefix}%")
                    for prefix in DEMO_READER_USERNAME_PREFIXES
                ]
            )
        )
        .group_by(ReaderProfile.id, ReaderProfile.display_name, ReaderAccount.username)
        .order_by(
            case(
                (ReaderAccount.username.like(f"{ML_DEMO_READER_USERNAME_PREFIX}%"), 0),
                else_=1,
            ).asc(),
            func.count(BorrowOrder.id).desc(),
            ReaderProfile.id.asc(),
        )
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
