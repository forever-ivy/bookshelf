from __future__ import annotations

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.readers.app_service import create_reader_booklist, list_reader_booklists

router = APIRouter(prefix="/api/v1/booklists", tags=["booklists"])


def _require_profile_id(identity: AuthIdentity) -> int:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return int(identity.profile_id)


@router.get("")
def list_booklists_endpoint(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return list_reader_booklists(session, reader_id=_require_profile_id(identity))


@router.post("", status_code=status.HTTP_201_CREATED)
def create_booklist_endpoint(
    payload: dict = Body(...),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return create_reader_booklist(
        session,
        reader_id=_require_profile_id(identity),
        title=str(payload.get("title") or ""),
        description=payload.get("description"),
        book_ids=[int(book_id) for book_id in payload.get("book_ids") or []],
    )
