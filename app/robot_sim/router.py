from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.auth_context import require_admin
from app.core.database import get_db
from app.core.security import AuthIdentity
from app.robot_sim.service import get_robot_state, tick_order_steps, tick_steps

router = APIRouter(prefix="/api/v1/robot-sim", tags=["robot_sim"])


class TickRequest(BaseModel):
    steps: int = Field(default=1, ge=1, le=20)


@router.get("/state")
def robot_state(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": get_robot_state(session)}


@router.post("/tick")
def robot_tick(
    payload: TickRequest | None = None,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    request = payload or TickRequest()
    return {
        "ok": True,
        **tick_steps(session, steps=request.steps),
    }


@router.post("/orders/{borrow_order_id}/tick")
def robot_tick_order(
    borrow_order_id: int,
    payload: TickRequest | None = None,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    request = payload or TickRequest()
    return {
        "ok": True,
        **tick_order_steps(session, borrow_order_id=borrow_order_id, steps=request.steps),
    }
