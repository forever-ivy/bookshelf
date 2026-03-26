from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.orders.service import (
    cancel_borrow_order,
    create_borrow_order,
    create_return_request,
    get_reader_return_request_detail,
    get_reader_order_bundle,
    list_reader_order_bundles,
    list_reader_return_requests,
    serialize_order,
)
from app.core.security import AuthIdentity

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


@router.get("/borrow-orders")
async def list_borrow_orders_endpoint(
    status: str | None = Query(default=None),
    active_only: bool = Query(default=False),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    bundles = list_reader_order_bundles(
        session,
        reader_profile_id=int(identity.profile_id or 0),
        status=status,
        active_only=active_only,
    )
    return {"items": [serialize_order(bundle) for bundle in bundles]}


@router.post("/borrow-orders", status_code=201)
async def create_borrow_order_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    bundle = create_borrow_order(
        session,
        reader_profile_id=int(identity.profile_id or 0),
        book_id=int(payload["book_id"]),
        order_mode=str(payload.get("order_mode") or "robot_delivery"),
        delivery_target=str(payload.get("delivery_target") or "Library Pickup"),
    )
    return serialize_order(bundle)


@router.get("/borrow-orders/{borrow_order_id}")
async def get_borrow_order_endpoint(
    borrow_order_id: int,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    bundle = get_reader_order_bundle(
        session,
        reader_profile_id=int(identity.profile_id or 0),
        borrow_order_id=borrow_order_id,
    )
    return serialize_order(bundle)


@router.get("/return-requests")
async def list_return_requests_endpoint(
    status: str | None = Query(default=None),
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return {
        "items": list_reader_return_requests(
            session,
            reader_profile_id=int(identity.profile_id or 0),
            status=status,
        )
    }


@router.get("/return-requests/{return_request_id}")
async def get_return_request_endpoint(
    return_request_id: int,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    return get_reader_return_request_detail(
        session,
        reader_profile_id=int(identity.profile_id or 0),
        return_request_id=return_request_id,
    )


@router.post("/borrow-orders/{borrow_order_id}/cancel")
async def cancel_borrow_order_endpoint(
    borrow_order_id: int,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    bundle = cancel_borrow_order(
        session,
        borrow_order_id=borrow_order_id,
        reader_profile_id=int(identity.profile_id or 0),
    )
    return serialize_order(bundle)


@router.post("/borrow-orders/{borrow_order_id}/return-requests", status_code=201)
async def create_return_request_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_reader),
    session: Session = Depends(get_db),
):
    request_row = create_return_request(
        session,
        borrow_order_id=borrow_order_id,
        reader_profile_id=int(identity.profile_id or 0),
        note=payload.get("note"),
    )
    return {
        "return_request": {
            "id": request_row.id,
            "borrow_order_id": request_row.borrow_order_id,
            "status": request_row.status,
        }
    }
