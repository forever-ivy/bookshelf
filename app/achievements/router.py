from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.readers.app_service import get_reader_achievement_summary

router = APIRouter(prefix="/api/v1/achievements", tags=["achievements"])


@router.get("/me")
def get_achievements_endpoint(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return get_reader_achievement_summary(session, reader_id=int(identity.profile_id))
