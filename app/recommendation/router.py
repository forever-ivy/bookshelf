from __future__ import annotations

from sqlalchemy import func, select
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.admin.service import get_recommendation_studio_live_feed
from app.catalog.models import Book
from app.catalog.service import build_book_payload, build_book_payloads, get_book_by_id
from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.llm.provider import build_llm_provider
from app.orders.models import BorrowOrder
from app.readers.app_service import list_system_booklists
from app.readers.models import ReaderProfile
from app.recommendation.embeddings import build_embedding_provider
from app.recommendation.feed_contract import (
    RecommendationFeedPayload,
    build_recommendation_feed_payload,
    build_system_quick_actions,
    copy_default_hot_lists,
    serialize_recommendation_feed_book,
    serialize_recommendation_feed_card,
)
from app.recommendation.service import RecommendationService

router = APIRouter(prefix="/api/v1/recommendation", tags=["recommendation"])


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


def _enrich_search_results(db: Session, results: list[dict]) -> list[dict]:
    book_ids = [int(item["book_id"]) for item in results if item.get("book_id") is not None]
    if not book_ids:
        return results

    books = list(db.scalars(select(Book).where(Book.id.in_(book_ids))).all())
    payload_by_id = {
        int(payload["id"]): payload
        for payload in build_book_payloads(db, books)
    }

    enriched_results: list[dict] = []
    for item in results:
        payload = payload_by_id.get(int(item["book_id"]))
        if payload is None:
            enriched_results.append(item)
            continue

        enriched_results.append(
            {
                **item,
                "author": payload.get("author"),
                "category": payload.get("category"),
                "summary": payload.get("summary"),
                "cabinet_label": payload.get("cabinet_label"),
                "shelf_label": payload.get("shelf_label"),
                "cover_tone": payload.get("cover_tone"),
                "cover_url": payload.get("cover_url"),
                "tags": list(payload.get("tag_names") or payload.get("tags") or []),
            }
        )

    return enriched_results


def _popular_books(db: Session, *, limit: int) -> list[Book]:
    rows = db.execute(
        select(Book, func.count(BorrowOrder.id).label("borrow_count"))
        .join(BorrowOrder, BorrowOrder.book_id == Book.id, isouter=True)
        .group_by(Book.id)
        .order_by(func.count(BorrowOrder.id).desc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [row[0] for row in rows]


@router.get("/home-feed", response_model=RecommendationFeedPayload)
def home_feed(
    identity: AuthIdentity = Depends(require_reader),
    db: Session = Depends(get_db),
) -> dict:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    profile = db.get(ReaderProfile, int(identity.profile_id))
    if profile is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")

    published_feed = get_recommendation_studio_live_feed(db)
    if published_feed is not None:
        return published_feed

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
            serialize_recommendation_feed_book(payload, explanation=result.get("explanation"))
        )

    if not today_recommendations:
        for book in _popular_books(db, limit=3):
            payload = build_book_payload(db, book)
            today_recommendations.append(
                serialize_recommendation_feed_book(payload, explanation="近期在馆内较受欢迎")
            )

    system_booklists = list_system_booklists(db, limit=3)
    exam_zone: list[dict] = []
    for booklist in system_booklists[:2]:
        for book in booklist.get("books", [])[:2]:
            exam_zone.append(
                serialize_recommendation_feed_book(
                    book,
                    explanation=f"来自系统书单《{booklist['title']}》",
                )
            )
    if not exam_zone:
        for book in _popular_books(db, limit=2):
            payload = build_book_payload(db, book)
            exam_zone.append(serialize_recommendation_feed_book(payload, explanation="馆内高频借阅图书"))

    tag_label = "、".join((profile.interest_tags or [])[:3]) or "你的借阅历史"
    active_orders = int(
        db.scalar(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == profile.id, BorrowOrder.status.not_in(["completed", "cancelled", "returned"]))
        )
        or 0
    )
    return build_recommendation_feed_payload(
        today_recommendations=today_recommendations[:3],
        exam_zone=exam_zone[:3],
        explanation_card={
            "title": "为什么推荐给你",
            "body": f"系统会结合 {tag_label}、最近借阅和馆内热度，优先展示当前可借的图书。",
        },
        quick_actions=build_system_quick_actions(
            len(today_recommendations[:3]),
            delivery_meta=f"{active_orders} 单进行中",
        ),
        hot_lists=copy_default_hot_lists(),
        system_booklists=[
            serialize_recommendation_feed_card(
                card_id=str(item["id"]),
                title=str(item["title"]),
                description=str(item.get("description") or "系统精选主题阅读清单。"),
            )
            for item in system_booklists[:3]
        ],
    )


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
    search_payload = service.search(reader_id=identity.profile_id, query=payload.query, limit=payload.limit)
    search_payload["results"] = _enrich_search_results(db, list(search_payload.get("results") or []))
    return {
        "ok": True,
        **search_payload,
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
