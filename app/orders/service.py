from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent
from app.auth.models import AdminActionLog
from app.catalog.models import Book
from app.core.errors import ApiError
from app.core.events import broker
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, CabinetSlot
from app.orders.models import BorrowOrder, DeliveryOrder, ReturnRequest
from app.readers.models import ReaderProfile
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit


BORROW_FLOW = {
    "created": "awaiting_pick",
    "awaiting_pick": "picked_from_cabinet",
    "picked_from_cabinet": "delivering",
    "delivering": "delivered",
    "delivered": "completed",
}

DELIVERY_FLOW = {
    "awaiting_pick": "picked_from_cabinet",
    "picked_from_cabinet": "delivering",
    "delivering": "delivered",
    "delivered": "completed",
}

TASK_FLOW = {
    "assigned": "carrying",
    "carrying": "arriving",
    "arriving": "returning",
    "returning": "completed",
}

ROBOT_FLOW = {
    "assigned": "carrying",
    "carrying": "arriving",
    "arriving": "returning",
    "returning": "idle",
}

ORDER_MODES = {"cabinet_pickup", "robot_delivery"}
BORROW_STATUSES = set(BORROW_FLOW) | set(BORROW_FLOW.values())
DELIVERY_STATUSES = set(DELIVERY_FLOW) | set(DELIVERY_FLOW.values())
TASK_STATUSES = set(TASK_FLOW) | set(TASK_FLOW.values())
ROBOT_STATUSES = {"idle", "assigned", "carrying", "arriving", "returning", "offline"}


@dataclass
class OrderBundle:
    borrow_order: BorrowOrder
    delivery_order: DeliveryOrder | None
    robot_task: RobotTask | None
    robot_unit: RobotUnit | None


def _next_status(current: str, flow: dict[str, str]) -> str:
    return flow.get(current, current)


async def publish_event(event: dict) -> None:
    await broker.publish(event)


def _publish_event_sync(event: dict) -> None:
    broker.publish_nowait(event)


def _validate_status(value: str | None, *, allowed: set[str], field_name: str) -> None:
    if value is None:
        return
    if value not in allowed:
        raise ApiError(400, "invalid_status_transition", f"Unsupported {field_name}: {value}")


def _event_payload(
    *,
    event_type: str,
    borrow_order: BorrowOrder,
    delivery_order: DeliveryOrder | None = None,
    robot_task: RobotTask | None = None,
    robot_unit: RobotUnit | None = None,
    note: str | None = None,
) -> dict:
    payload = {
        "event_type": event_type,
        "borrow_order_id": borrow_order.id,
        "reader_id": borrow_order.reader_id,
        "book_id": borrow_order.book_id,
        "assigned_copy_id": borrow_order.assigned_copy_id,
        "order_mode": borrow_order.order_mode,
        "borrow_status": borrow_order.status,
        "delivery_status": delivery_order.status if delivery_order is not None else None,
        "task_status": robot_task.status if robot_task is not None else None,
        "robot_status": robot_unit.status if robot_unit is not None else None,
        "delivery_target": delivery_order.delivery_target if delivery_order is not None else None,
    }
    if note is not None:
        payload["note"] = note
    return payload


def _record_robot_event(
    session: Session,
    *,
    robot_id: int | None,
    task_id: int | None,
    event_type: str,
    payload: dict,
) -> None:
    if robot_id is None:
        return
    session.add(
        RobotStatusEvent(
            robot_id=robot_id,
            task_id=task_id,
            event_type=event_type,
            metadata_json=payload,
        )
    )


def _stock_for_copy(session: Session, copy: BookCopy) -> BookStock | None:
    return session.scalars(
        select(BookStock).where(BookStock.book_id == copy.book_id, BookStock.cabinet_id == copy.cabinet_id)
    ).first()


def _allocate_copy_for_order(session: Session, *, book_id: int, order_mode: str) -> BookCopy:
    row = session.execute(
        select(CabinetSlot, BookCopy)
        .join(BookCopy, CabinetSlot.current_copy_id == BookCopy.id)
        .where(
            CabinetSlot.status == "occupied",
            BookCopy.book_id == book_id,
            BookCopy.inventory_status == "stored",
        )
        .order_by(CabinetSlot.slot_code.asc(), BookCopy.id.asc())
    ).first()
    if row is None:
        raise ApiError(409, "book_unavailable", "No available copy for the selected book")

    slot, copy = row
    stock = _stock_for_copy(session, copy)
    if stock is None or stock.available_copies <= 0:
        raise ApiError(409, "book_unavailable", "The selected book is currently unavailable")

    slot.status = "empty"
    slot.current_copy_id = None
    stock.available_copies -= 1
    stock.reserved_copies += 1
    copy.inventory_status = "reserved" if order_mode == "cabinet_pickup" else "in_delivery"
    return copy


def _sync_copy_status_with_order(session: Session, order: BorrowOrder) -> None:
    if order.assigned_copy_id is None:
        return
    copy = session.get(BookCopy, order.assigned_copy_id)
    if copy is None:
        return
    stock = _stock_for_copy(session, copy)

    if order.status in {"delivered", "completed"}:
        if copy.inventory_status != "borrowed":
            if stock is not None and stock.reserved_copies > 0:
                stock.reserved_copies -= 1
            copy.inventory_status = "borrowed"
        if order.delivered_at is None and order.status == "delivered":
            order.delivered_at = utc_now()
        if order.status == "completed" and order.completed_at is None:
            order.completed_at = utc_now()
        return

    desired_status = "reserved" if order.order_mode == "cabinet_pickup" else "in_delivery"
    if copy.inventory_status == "borrowed" and stock is not None:
        stock.reserved_copies += 1
    copy.inventory_status = desired_status
    if order.status == "picked_from_cabinet" and order.picked_at is None:
        order.picked_at = utc_now()


def get_order_bundle(session: Session, borrow_order_id: int) -> OrderBundle:
    borrow_order = session.get(BorrowOrder, borrow_order_id)
    if borrow_order is None:
        raise ApiError(404, "borrow_order_not_found", "Borrow order not found")

    delivery_order = session.query(DeliveryOrder).filter_by(borrow_order_id=borrow_order.id).one_or_none()
    robot_task = None
    robot_unit = None
    if delivery_order is not None:
        robot_task = session.query(RobotTask).filter_by(delivery_order_id=delivery_order.id).one_or_none()
        if robot_task is not None:
            robot_unit = session.get(RobotUnit, robot_task.robot_id)

    return OrderBundle(
        borrow_order=borrow_order,
        delivery_order=delivery_order,
        robot_task=robot_task,
        robot_unit=robot_unit,
    )


def _iso(value: Any) -> str | None:
    return value.isoformat() if value is not None else None


def serialize_order(bundle: OrderBundle) -> dict:
    return {
        "borrow_order": {
            "id": bundle.borrow_order.id,
            "reader_id": bundle.borrow_order.reader_id,
            "book_id": bundle.borrow_order.book_id,
            "assigned_copy_id": bundle.borrow_order.assigned_copy_id,
            "order_mode": bundle.borrow_order.order_mode,
            "status": bundle.borrow_order.status,
            "created_at": _iso(bundle.borrow_order.created_at),
            "updated_at": _iso(bundle.borrow_order.updated_at),
            "completed_at": _iso(bundle.borrow_order.completed_at),
        },
        "delivery_order": None
        if bundle.delivery_order is None
        else {
            "id": bundle.delivery_order.id,
            "borrow_order_id": bundle.delivery_order.borrow_order_id,
            "delivery_target": bundle.delivery_order.delivery_target,
            "eta_minutes": bundle.delivery_order.eta_minutes,
            "status": bundle.delivery_order.status,
            "created_at": _iso(bundle.delivery_order.created_at),
            "updated_at": _iso(bundle.delivery_order.updated_at),
            "completed_at": _iso(bundle.delivery_order.completed_at),
        },
        "robot_task": None
        if bundle.robot_task is None
        else {
            "id": bundle.robot_task.id,
            "robot_id": bundle.robot_task.robot_id,
            "delivery_order_id": bundle.robot_task.delivery_order_id,
            "status": bundle.robot_task.status,
            "created_at": _iso(bundle.robot_task.created_at),
            "updated_at": _iso(bundle.robot_task.updated_at),
            "completed_at": _iso(bundle.robot_task.completed_at),
        },
        "robot_unit": None
        if bundle.robot_unit is None
        else {
            "id": bundle.robot_unit.id,
            "code": bundle.robot_unit.code,
            "status": bundle.robot_unit.status,
        },
        "robot": None
        if bundle.robot_unit is None
        else {
            "id": bundle.robot_unit.id,
            "code": bundle.robot_unit.code,
            "status": bundle.robot_unit.status,
        },
    }


def list_order_bundles(session: Session) -> list[OrderBundle]:
    borrow_orders = session.query(BorrowOrder).order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc()).all()
    return [get_order_bundle(session, borrow_order.id) for borrow_order in borrow_orders]


def serialize_task(task: RobotTask, robot: RobotUnit | None = None, delivery: DeliveryOrder | None = None) -> dict:
    return {
        "id": task.id,
        "robot_id": task.robot_id,
        "delivery_order_id": task.delivery_order_id,
        "status": task.status,
        "borrow_order_id": delivery.borrow_order_id if delivery is not None else None,
        "created_at": _iso(task.created_at),
        "updated_at": _iso(task.updated_at),
        "robot": None
        if robot is None
        else {
            "id": robot.id,
            "code": robot.code,
            "status": robot.status,
        },
    }


def serialize_robot(robot: RobotUnit, task: RobotTask | None = None, delivery: DeliveryOrder | None = None) -> dict:
    return {
        "id": robot.id,
        "code": robot.code,
        "status": robot.status,
        "current_task": None if task is None else serialize_task(task, robot, delivery),
    }


def list_robot_tasks(session: Session) -> list[dict]:
    tasks = session.query(RobotTask).order_by(RobotTask.created_at.desc(), RobotTask.id.desc()).all()
    items: list[dict] = []
    for task in tasks:
        robot = session.get(RobotUnit, task.robot_id)
        delivery = session.get(DeliveryOrder, task.delivery_order_id)
        items.append(serialize_task(task, robot, delivery))
    return items


def list_robots(session: Session) -> list[dict]:
    robots = session.query(RobotUnit).order_by(RobotUnit.id.asc()).all()
    items: list[dict] = []
    for robot in robots:
        task = (
            session.query(RobotTask)
            .filter_by(robot_id=robot.id)
            .order_by(RobotTask.created_at.desc(), RobotTask.id.desc())
            .first()
        )
        delivery = session.get(DeliveryOrder, task.delivery_order_id) if task is not None else None
        items.append(serialize_robot(robot, task, delivery))
    return items


def list_recent_robot_events(session: Session, *, limit: int = 20) -> list[dict]:
    events = (
        session.query(RobotStatusEvent)
        .order_by(RobotStatusEvent.created_at.desc(), RobotStatusEvent.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": event.id,
            "robot_id": event.robot_id,
            "task_id": event.task_id,
            "event_type": event.event_type,
            "metadata": event.metadata_json or {},
            "created_at": _iso(event.created_at),
        }
        for event in events
    ]


def _resolve_robot(session: Session) -> RobotUnit:
    robot = session.query(RobotUnit).order_by(RobotUnit.id.asc()).filter(RobotUnit.status != "offline").first()
    if robot is None:
        robot = RobotUnit(code="robot-1", status="idle")
        session.add(robot)
        session.flush()
    return robot


def create_borrow_order(
    session: Session,
    *,
    reader_profile_id: int,
    book_id: int,
    order_mode: str,
    delivery_target: str,
) -> OrderBundle:
    profile = session.get(ReaderProfile, reader_profile_id)
    if profile is None:
        raise ApiError(404, "reader_profile_not_found", "Reader profile not found")
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")

    normalized_order_mode = order_mode or "robot_delivery"
    if normalized_order_mode not in ORDER_MODES:
        raise ApiError(400, "invalid_order_mode", f"Unsupported order mode: {normalized_order_mode}")

    allocated_copy = _allocate_copy_for_order(session, book_id=book.id, order_mode=normalized_order_mode)

    borrow_order = BorrowOrder(
        reader_id=profile.id,
        book_id=book.id,
        assigned_copy_id=allocated_copy.id,
        order_mode=normalized_order_mode,
        status="created" if normalized_order_mode == "robot_delivery" else "awaiting_pick",
    )
    session.add(borrow_order)
    session.flush()

    delivery_order: DeliveryOrder | None = None
    robot_task: RobotTask | None = None
    robot: RobotUnit | None = None

    if normalized_order_mode == "robot_delivery":
        delivery_order = DeliveryOrder(
            borrow_order_id=borrow_order.id,
            delivery_target=delivery_target,
            eta_minutes=15,
            status="awaiting_pick",
        )
        session.add(delivery_order)
        session.flush()

        robot = _resolve_robot(session)
        robot.status = "assigned"

        robot_task = RobotTask(
            robot_id=robot.id,
            delivery_order_id=delivery_order.id,
            status="assigned",
        )
        session.add(robot_task)
        session.flush()

        _record_robot_event(
            session,
            robot_id=robot.id,
            task_id=robot_task.id,
            event_type="order_created",
            payload=_event_payload(
                event_type="order_created",
                borrow_order=borrow_order,
                delivery_order=delivery_order,
                robot_task=robot_task,
                robot_unit=robot,
            ),
        )
    session.add(
        ReadingEvent(
            reader_id=profile.id,
            event_type="borrow_order_created",
            metadata_json={"borrow_order_id": borrow_order.id, "assigned_copy_id": allocated_copy.id},
        )
    )
    session.commit()
    _publish_event_sync(
        _event_payload(
            event_type="order_created",
            borrow_order=borrow_order,
            delivery_order=delivery_order,
            robot_task=robot_task,
            robot_unit=robot,
        )
    )
    return get_order_bundle(session, borrow_order.id)


def create_return_request(
    session: Session,
    *,
    borrow_order_id: int,
    reader_profile_id: int,
    note: str | None = None,
) -> ReturnRequest:
    bundle = get_order_bundle(session, borrow_order_id)
    if bundle.borrow_order.reader_id != reader_profile_id:
        raise ApiError(403, "borrow_order_forbidden", "Borrow order does not belong to the current reader")
    return_request = ReturnRequest(borrow_order_id=bundle.borrow_order.id, note=note, status="created")
    session.add(return_request)
    session.add(
        ReadingEvent(
            reader_id=bundle.borrow_order.reader_id,
            event_type="return_request_created",
            metadata_json={
                "borrow_order_id": bundle.borrow_order.id,
                "note": note,
            },
        )
    )
    session.commit()
    _publish_event_sync(
        _event_payload(
            event_type="return_request_created",
            borrow_order=bundle.borrow_order,
            delivery_order=bundle.delivery_order,
            robot_task=bundle.robot_task,
            robot_unit=bundle.robot_unit,
            note=note,
        )
    )
    return return_request


def advance_order_bundle(session: Session, bundle: OrderBundle) -> OrderBundle:
    if bundle.delivery_order is None and bundle.robot_task is None and bundle.robot_unit is None:
        return bundle

    changed = False
    order = bundle.borrow_order
    delivery = bundle.delivery_order
    task = bundle.robot_task
    robot = bundle.robot_unit

    next_order_status = _next_status(order.status, BORROW_FLOW)
    if next_order_status != order.status:
        order.status = next_order_status
        changed = True

    if delivery is not None:
        next_delivery_status = _next_status(delivery.status, DELIVERY_FLOW)
        if next_delivery_status != delivery.status:
            delivery.status = next_delivery_status
            changed = True
            if delivery.status == "completed" and delivery.completed_at is None:
                delivery.completed_at = utc_now()

    if task is not None:
        next_task_status = _next_status(task.status, TASK_FLOW)
        if next_task_status != task.status:
            task.status = next_task_status
            changed = True
            if task.status == "completed" and task.completed_at is None:
                task.completed_at = utc_now()

    if robot is not None:
        next_robot_status = _next_status(robot.status, ROBOT_FLOW)
        if next_robot_status != robot.status:
            robot.status = next_robot_status
            changed = True

    if changed:
        _sync_copy_status_with_order(session, order)
        payload = _event_payload(
            event_type="order_progressed",
            borrow_order=order,
            delivery_order=delivery,
            robot_task=task,
            robot_unit=robot,
        )
        _record_robot_event(
            session,
            robot_id=robot.id if robot is not None else None,
            task_id=task.id if task is not None else None,
            event_type="order_progressed",
            payload=payload,
        )
        session.commit()
        _publish_event_sync(payload)
    return get_order_bundle(session, order.id)


def correct_order_bundle(
    session: Session,
    *,
    borrow_order_id: int,
    admin_id: int,
    borrow_status: str | None = None,
    delivery_status: str | None = None,
    robot_status: str | None = None,
    task_status: str | None = None,
) -> OrderBundle:
    bundle = get_order_bundle(session, borrow_order_id)
    before_state = _event_payload(
        event_type="admin_correction_before",
        borrow_order=bundle.borrow_order,
        delivery_order=bundle.delivery_order,
        robot_task=bundle.robot_task,
        robot_unit=bundle.robot_unit,
    )
    _validate_status(borrow_status, allowed=BORROW_STATUSES, field_name="borrow_status")
    _validate_status(delivery_status, allowed=DELIVERY_STATUSES, field_name="delivery_status")
    _validate_status(task_status, allowed=TASK_STATUSES, field_name="task_status")
    _validate_status(robot_status, allowed=ROBOT_STATUSES, field_name="robot_status")
    if borrow_status is not None:
        bundle.borrow_order.status = borrow_status
    if bundle.delivery_order is not None and delivery_status is not None:
        bundle.delivery_order.status = delivery_status
    if bundle.robot_task is not None and task_status is not None:
        bundle.robot_task.status = task_status
    if bundle.robot_unit is not None and robot_status is not None:
        bundle.robot_unit.status = robot_status

    _sync_copy_status_with_order(session, bundle.borrow_order)
    after_state = _event_payload(
        event_type="admin_correction",
        borrow_order=bundle.borrow_order,
        delivery_order=bundle.delivery_order,
        robot_task=bundle.robot_task,
        robot_unit=bundle.robot_unit,
    )
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="borrow_order_bundle",
            target_id=borrow_order_id,
            action="admin_correction",
            before_state=before_state,
            after_state=after_state,
        )
    )
    _record_robot_event(
        session,
        robot_id=bundle.robot_unit.id if bundle.robot_unit is not None else None,
        task_id=bundle.robot_task.id if bundle.robot_task is not None else None,
        event_type="admin_correction",
        payload=after_state,
    )
    session.commit()
    _publish_event_sync(after_state)
    return get_order_bundle(session, borrow_order_id)
