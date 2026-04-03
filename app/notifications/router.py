from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity
from app.readers.app_service import dismiss_reader_notification, list_reader_notifications

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _require_profile_id(identity: AuthIdentity) -> int:
    if identity.profile_id is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    return int(identity.profile_id)


@router.get("")
def list_notifications_endpoint(
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {"items": list_reader_notifications(session, reader_id=_require_profile_id(identity))}


@router.post("/dismissals")
def dismiss_notification_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return dismiss_reader_notification(
        session,
        reader_id=_require_profile_id(identity),
        notification_id=str(payload.get("notification_id") or ""),
    )
