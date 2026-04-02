from __future__ import annotations

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.readers.app_service import add_favorite_book, list_favorite_books, remove_favorite_book

router = APIRouter(prefix="/api/v1/favorites", tags=["favorites"])


def _require_profile_id(identity: AuthIdentity) -> int:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return int(identity.profile_id)


@router.get("/books")
def list_favorites_endpoint(
    query: str | None = Query(default=None, description="Search title, author, category, keywords, or summary"),
    category: str | None = Query(default=None, description="Filter favorites by exact category name"),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {
        "items": list_favorite_books(
            session,
            reader_id=_require_profile_id(identity),
            query=query,
            category=category,
        )
    }


@router.post("/books", status_code=status.HTTP_201_CREATED)
def add_favorite_endpoint(
    payload: dict = Body(...),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return add_favorite_book(
        session,
        reader_id=_require_profile_id(identity),
        book_id=int(payload["book_id"]),
    )


@router.delete("/books")
def remove_favorite_endpoint(
    payload: dict = Body(...),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    remove_favorite_book(
        session,
        reader_id=_require_profile_id(identity),
        book_id=int(payload["book_id"]),
    )
    return {"ok": True}
