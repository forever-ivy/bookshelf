from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_admin
from app.core.database import get_db
from app.core.security import AuthIdentity
from app.robot_sim.service import get_robot_state

router = APIRouter(prefix="/api/v1/robot-sim", tags=["robot_sim"])


@router.get("/state")
def robot_state(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": get_robot_state(session)}
