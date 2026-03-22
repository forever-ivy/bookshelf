from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_admin, require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.readers import repository
from app.readers.schemas import (
    ReaderDetailResponse,
    ReaderListResponse,
    ReaderOverviewResponse,
    ReaderProfileResponse,
    ReaderProfileUpdate,
)

router = APIRouter(prefix="/api/v1/readers", tags=["readers"])


def _require_profile_id(identity: AuthIdentity) -> int:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return int(identity.profile_id)


@router.get("/me/profile", response_model=ReaderProfileResponse)
def get_my_profile(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {"profile": repository.get_reader_profile_by_profile_id(session, _require_profile_id(identity))}


@router.patch("/me/profile", response_model=ReaderProfileResponse)
def update_my_profile(
    payload: ReaderProfileUpdate,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    changes = payload.model_dump(exclude_unset=True)
    return {"profile": repository.update_reader_profile(session, _require_profile_id(identity), changes)}


@router.get("/me/overview", response_model=ReaderOverviewResponse)
def get_my_overview(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {"overview": repository.get_reader_overview(session, _require_profile_id(identity))}


@router.get("/me/orders")
def get_my_orders(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {"items": repository.get_reader_orders(session, _require_profile_id(identity))}


@router.get("", response_model=ReaderListResponse)
def list_readers_endpoint(
    q: str | None = None,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": repository.list_readers(session, q=q)}


@router.get("/{reader_id}", response_model=ReaderDetailResponse)
def get_reader_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"reader": repository.get_reader_detail(session, reader_id)}


@router.get("/{reader_id}/overview", response_model=ReaderOverviewResponse)
def get_reader_overview_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"overview": repository.get_reader_overview(session, reader_id)}


@router.get("/{reader_id}/orders")
def get_reader_orders_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": repository.get_reader_orders(session, reader_id)}


@router.get("/{reader_id}/conversations")
def get_reader_conversations_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": repository.get_reader_conversations(session, reader_id)}


@router.get("/{reader_id}/recommendations")
def get_reader_recommendations_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": repository.get_reader_recommendations(session, reader_id)}
