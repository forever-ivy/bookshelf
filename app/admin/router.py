from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_admin
from app.core.database import get_db
from app.core.events import broker
from app.core.security import AuthIdentity
from app.core.sse import sse_response
from app.orders.service import (
    correct_order_bundle,
    get_order_bundle,
    list_order_bundles,
    list_recent_robot_events,
    list_robot_tasks,
    list_robots,
    serialize_order,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/orders")
def list_orders_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": [serialize_order(bundle) for bundle in list_order_bundles(session)]}


@router.get("/tasks")
def list_tasks_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": list_robot_tasks(session)}


@router.get("/robots")
def list_robots_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": list_robots(session)}


@router.get("/events")
def list_events_endpoint(
    limit: int = 20,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return {"items": list_recent_robot_events(session, limit=limit)}


@router.get("/orders/{borrow_order_id}")
def get_order_endpoint(
    borrow_order_id: int,
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return serialize_order(get_order_bundle(session, borrow_order_id))


@router.patch("/orders/{borrow_order_id}/state")
def correct_order_state_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    bundle = correct_order_bundle(
        session,
        borrow_order_id=borrow_order_id,
        admin_id=identity.account_id,
        borrow_status=payload.get("borrow_status"),
        delivery_status=payload.get("delivery_status"),
        robot_status=payload.get("robot_status"),
        task_status=payload.get("task_status"),
    )
    return serialize_order(bundle)


@router.get("/events/stream")
async def events_stream_endpoint(_identity: AuthIdentity = Depends(require_admin)):
    async def event_iter():
        async for event in broker.subscribe():
            yield event

    return sse_response(event_iter())
