from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth_context import require_reader
from app.core.database import get_db
from app.orders.service import create_borrow_order, create_return_request, serialize_order
from app.core.security import AuthIdentity

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


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
