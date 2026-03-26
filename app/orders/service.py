from __future__ import annotations

from dataclasses import dataclass
from datetime import timezone, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent
from app.auth.models import AdminActionLog
from app.catalog.models import Book
from app.catalog.service import build_book_payload
from app.core.errors import ApiError
from app.core.events import broker
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.inventory.service import adjust_stock_counts
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
FINAL_BORROW_STATUSES = {"completed", "cancelled", "returned"}
RETURN_REQUEST_FINAL_STATUSES = {"completed"}
BORROW_STATUSES = set(BORROW_FLOW) | set(BORROW_FLOW.values()) | {"cancelled", "returned"}
DELIVERY_STATUSES = set(DELIVERY_FLOW) | set(DELIVERY_FLOW.values()) | {"cancelled"}
TASK_STATUSES = set(TASK_FLOW) | set(TASK_FLOW.values()) | {"cancelled"}
ROBOT_STATUSES = {"idle", "assigned", "carrying", "arriving", "returning", "offline"}
ORDER_PRIORITIES = {"urgent", "high", "normal", "low"}


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

    if order.status == "returned":
        return

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


def _find_free_slot_for_copy(session: Session, *, cabinet_id: str) -> CabinetSlot | None:
    return session.scalars(
        select(CabinetSlot)
        .where(
            CabinetSlot.cabinet_id == cabinet_id,
            CabinetSlot.current_copy_id.is_(None),
            CabinetSlot.status.in_(["empty", "free"]),
        )
        .order_by(CabinetSlot.slot_code.asc(), CabinetSlot.id.asc())
    ).first()


def _restore_copy_for_cancelled_order(session: Session, *, order: BorrowOrder) -> None:
    if order.assigned_copy_id is None:
        return
    copy = session.get(BookCopy, order.assigned_copy_id)
    if copy is None:
        return
    slot = _find_free_slot_for_copy(session, cabinet_id=copy.cabinet_id)
    if slot is None:
        raise ApiError(409, "slot_unavailable", "No free slot available to restore the cancelled order")

    slot.status = "occupied"
    slot.current_copy_id = copy.id
    copy.inventory_status = "stored"
    adjust_stock_counts(
        session,
        book_id=copy.book_id,
        cabinet_id=copy.cabinet_id,
        available_delta=1,
        reserved_delta=-1,
    )
    session.add(
        InventoryEvent(
            cabinet_id=copy.cabinet_id,
            event_type="book_restored",
            slot_code=slot.slot_code,
            book_id=copy.book_id,
            copy_id=copy.id,
            payload_json={
                "reason": "borrow_order_cancelled",
                "borrow_order_id": order.id,
            },
        )
    )


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


def _as_utc(value):
    if value is None:
        return None
    if getattr(value, "tzinfo", None) is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _is_order_renewable(order: BorrowOrder) -> bool:
    due_at = _as_utc(order.due_at)
    now = utc_now()
    return (
        order.status == "delivered"
        and due_at is not None
        and due_at >= now
        and due_at <= now + timedelta(days=3)
    )


def _reader_status(bundle: OrderBundle) -> str:
    order = bundle.borrow_order
    now = utc_now()
    due_at = _as_utc(order.due_at)
    if order.status in FINAL_BORROW_STATUSES:
        return "completed"
    if due_at is not None and due_at < now:
        return "overdue"
    if _is_order_renewable(order):
        return "renewable"
    if due_at is not None and due_at <= now + timedelta(days=2):
        return "dueSoon"
    return "active"


def _reader_status_label(status: str) -> str:
    return {
        "active": "进行中",
        "completed": "已完成",
        "dueSoon": "临近到期",
        "overdue": "已逾期",
        "renewable": "可续借",
    }.get(status, "进行中")


def _reader_due_date_label(order: BorrowOrder) -> str:
    due_at = _as_utc(order.due_at)
    if due_at is None:
        return "归还日期待定"
    return f"{due_at.date().isoformat()} 到期"


def _reader_timeline(bundle: OrderBundle) -> list[dict]:
    order = bundle.borrow_order
    if order.status in FINAL_BORROW_STATUSES:
        return [{"completed": True, "label": "已完成", "timestamp": _iso(order.completed_at or order.updated_at)}]

    if order.order_mode == "robot_delivery":
        labels = ["待取书", "机器人配送中", "已送达"]
        status_rank = {
            "created": 1,
            "awaiting_pick": 1,
            "picked_from_cabinet": 2,
            "delivering": 2,
            "delivered": 3,
        }
    else:
        labels = ["待取书", "书柜出书中", "已送达"]
        status_rank = {
            "awaiting_pick": 1,
            "picked_from_cabinet": 2,
            "delivering": 2,
            "delivered": 3,
        }

    completed_count = status_rank.get(order.status, 1)
    return [
        {
            "completed": index <= completed_count,
            "label": label,
            "timestamp": _iso(order.updated_at) if index == completed_count else None,
        }
        for index, label in enumerate(labels, start=1)
    ]


def serialize_order(bundle: OrderBundle, *, session: Session | None = None) -> dict:
    payload = {
        "borrow_order": {
            "id": bundle.borrow_order.id,
            "reader_id": bundle.borrow_order.reader_id,
            "book_id": bundle.borrow_order.book_id,
            "assigned_copy_id": bundle.borrow_order.assigned_copy_id,
            "order_mode": bundle.borrow_order.order_mode,
            "status": bundle.borrow_order.status,
            "priority": bundle.borrow_order.priority,
            "due_at": _iso(bundle.borrow_order.due_at),
            "failure_reason": bundle.borrow_order.failure_reason,
            "intervention_status": bundle.borrow_order.intervention_status,
            "attempt_count": bundle.borrow_order.attempt_count,
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
            "priority": bundle.delivery_order.priority,
            "due_at": _iso(bundle.delivery_order.due_at),
            "failure_reason": bundle.delivery_order.failure_reason,
            "intervention_status": bundle.delivery_order.intervention_status,
            "attempt_count": bundle.delivery_order.attempt_count,
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
            "path_json": bundle.robot_task.path_json,
            "reassigned_from_task_id": bundle.robot_task.reassigned_from_task_id,
            "failure_reason": bundle.robot_task.failure_reason,
            "attempt_count": bundle.robot_task.attempt_count,
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
            "battery_level": bundle.robot_unit.battery_level,
            "heartbeat_at": _iso(bundle.robot_unit.heartbeat_at),
        },
        "robot": None
        if bundle.robot_unit is None
        else {
            "id": bundle.robot_unit.id,
            "code": bundle.robot_unit.code,
            "status": bundle.robot_unit.status,
            "battery_level": bundle.robot_unit.battery_level,
            "heartbeat_at": _iso(bundle.robot_unit.heartbeat_at),
        },
    }
    if session is None:
        return payload

    book = session.get(Book, bundle.borrow_order.book_id)
    book_payload = (
        build_book_payload(session, book)
        if book is not None
        else {
            "id": bundle.borrow_order.book_id,
            "title": "未知图书",
            "author": "未知作者",
            "summary": "",
            "availability_label": "暂不可借",
            "cabinet_label": "主书柜",
            "cover_tone": "blue",
            "delivery_available": False,
            "eta_label": "到柜自取",
            "eta_minutes": None,
            "shelf_label": "主馆 2 楼",
            "stock_status": "out_of_stock",
            "tags": [],
        }
    )
    status = _reader_status(bundle)
    renewable = _is_order_renewable(bundle.borrow_order)
    payload["borrow_order"]["renewable"] = renewable
    payload.update(
        {
            "actionableLabel": "去续借" if renewable else "查看借阅",
            "book": book_payload,
            "dueDateLabel": _reader_due_date_label(bundle.borrow_order),
            "mode": bundle.borrow_order.order_mode,
            "note": bundle.borrow_order.failure_reason
            or (
                f"配送目标：{bundle.delivery_order.delivery_target}"
                if bundle.delivery_order is not None
                else "订单状态由后端履约流转驱动。"
            ),
            "renewable": renewable,
            "status": status,
            "statusLabel": _reader_status_label(status),
            "timeline": _reader_timeline(bundle),
        }
    )
    return payload


def list_order_bundles(session: Session) -> list[OrderBundle]:
    borrow_orders = session.query(BorrowOrder).order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc()).all()
    return [get_order_bundle(session, borrow_order.id) for borrow_order in borrow_orders]


def list_reader_order_bundles(
    session: Session,
    *,
    reader_profile_id: int,
    status: str | None = None,
    active_only: bool = False,
) -> list[OrderBundle]:
    stmt = select(BorrowOrder.id).where(BorrowOrder.reader_id == reader_profile_id)
    normalized_status = (status or "").strip()
    if active_only:
        stmt = stmt.where(BorrowOrder.status.not_in(FINAL_BORROW_STATUSES))
    if normalized_status:
        stmt = stmt.where(BorrowOrder.status == normalized_status)
    stmt = stmt.order_by(BorrowOrder.created_at.desc(), BorrowOrder.id.desc())
    return [get_order_bundle(session, borrow_order_id) for borrow_order_id in session.execute(stmt).scalars()]


def get_reader_order_bundle(session: Session, *, reader_profile_id: int, borrow_order_id: int) -> OrderBundle:
    bundle = get_order_bundle(session, borrow_order_id)
    if bundle.borrow_order.reader_id != reader_profile_id:
        raise ApiError(403, "borrow_order_forbidden", "Borrow order does not belong to the current reader")
    return bundle


def _is_bundle_cancellable(bundle: OrderBundle) -> bool:
    if bundle.borrow_order.order_mode == "cabinet_pickup":
        return bundle.borrow_order.status == "awaiting_pick"
    if bundle.borrow_order.order_mode == "robot_delivery":
        return (
            bundle.borrow_order.status == "created"
            and (bundle.delivery_order is None or bundle.delivery_order.status == "awaiting_pick")
            and (bundle.robot_task is None or bundle.robot_task.status == "assigned")
        )
    return False


def _find_open_return_request(session: Session, *, borrow_order_id: int) -> ReturnRequest | None:
    return session.scalars(
        select(ReturnRequest)
        .where(
            ReturnRequest.borrow_order_id == borrow_order_id,
            ReturnRequest.status.not_in(RETURN_REQUEST_FINAL_STATUSES),
        )
        .order_by(ReturnRequest.created_at.desc(), ReturnRequest.id.desc())
    ).first()


def _get_return_request_with_order(session: Session, *, return_request_id: int) -> tuple[ReturnRequest, BorrowOrder]:
    row = session.execute(
        select(ReturnRequest, BorrowOrder)
        .join(BorrowOrder, ReturnRequest.borrow_order_id == BorrowOrder.id)
        .where(ReturnRequest.id == return_request_id)
    ).first()
    if row is None:
        raise ApiError(404, "return_request_not_found", "Return request not found")
    return row


def serialize_task(task: RobotTask, robot: RobotUnit | None = None, delivery: DeliveryOrder | None = None) -> dict:
    return {
        "id": task.id,
        "robot_id": task.robot_id,
        "delivery_order_id": task.delivery_order_id,
        "status": task.status,
        "borrow_order_id": delivery.borrow_order_id if delivery is not None else None,
        "path_json": task.path_json,
        "reassigned_from_task_id": task.reassigned_from_task_id,
        "failure_reason": task.failure_reason,
        "attempt_count": task.attempt_count,
        "created_at": _iso(task.created_at),
        "updated_at": _iso(task.updated_at),
        "robot": None
        if robot is None
        else {
            "id": robot.id,
            "code": robot.code,
            "status": robot.status,
            "battery_level": robot.battery_level,
            "heartbeat_at": _iso(robot.heartbeat_at),
        },
    }


def serialize_robot(robot: RobotUnit, task: RobotTask | None = None, delivery: DeliveryOrder | None = None) -> dict:
    return {
        "id": robot.id,
        "code": robot.code,
        "status": robot.status,
        "battery_level": robot.battery_level,
        "heartbeat_at": _iso(robot.heartbeat_at),
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


def serialize_return_request(return_request: ReturnRequest, borrow_order: BorrowOrder | None = None) -> dict:
    return {
        "id": return_request.id,
        "borrow_order_id": return_request.borrow_order_id,
        "reader_id": borrow_order.reader_id if borrow_order is not None else None,
        "book_id": borrow_order.book_id if borrow_order is not None else None,
        "assigned_copy_id": borrow_order.assigned_copy_id if borrow_order is not None else None,
        "borrow_order_status": borrow_order.status if borrow_order is not None else None,
        "order_mode": borrow_order.order_mode if borrow_order is not None else None,
        "status": return_request.status,
        "note": return_request.note,
        "created_at": _iso(return_request.created_at),
        "updated_at": _iso(return_request.updated_at),
    }


def _serialize_copy(copy: BookCopy | None) -> dict | None:
    if copy is None:
        return None
    return {
        "id": copy.id,
        "book_id": copy.book_id,
        "cabinet_id": copy.cabinet_id,
        "inventory_status": copy.inventory_status,
        "created_at": _iso(copy.created_at),
        "updated_at": _iso(copy.updated_at),
    }


def _serialize_slot(slot: CabinetSlot | None) -> dict | None:
    if slot is None:
        return None
    return {
        "id": slot.id,
        "cabinet_id": slot.cabinet_id,
        "slot_code": slot.slot_code,
        "status": slot.status,
        "current_copy_id": slot.current_copy_id,
        "created_at": _iso(slot.created_at),
        "updated_at": _iso(slot.updated_at),
    }


def list_return_requests(
    session: Session,
    *,
    page: int,
    page_size: int,
    status: str | None = None,
    borrow_order_id: int | None = None,
    reader_id: int | None = None,
) -> dict:
    normalized_page = max(page, 1)
    normalized_page_size = max(1, min(page_size, 100))
    stmt = (
        select(ReturnRequest, BorrowOrder)
        .join(BorrowOrder, ReturnRequest.borrow_order_id == BorrowOrder.id)
        .order_by(ReturnRequest.created_at.desc(), ReturnRequest.id.desc())
    )
    normalized_status = (status or "").strip()
    if normalized_status:
        stmt = stmt.where(ReturnRequest.status == normalized_status)
    if borrow_order_id is not None:
        stmt = stmt.where(ReturnRequest.borrow_order_id == borrow_order_id)
    if reader_id is not None:
        stmt = stmt.where(BorrowOrder.reader_id == reader_id)
    total = session.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = session.execute(
        stmt.offset((normalized_page - 1) * normalized_page_size).limit(normalized_page_size)
    ).all()
    return {
        "items": [
            serialize_return_request(request_row, borrow_order=borrow_order)
            for request_row, borrow_order in rows
        ],
        "total": int(total),
        "page": normalized_page,
        "page_size": normalized_page_size,
    }


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
        due_at=utc_now() + timedelta(days=14),
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
    if bundle.borrow_order.assigned_copy_id is None:
        raise ApiError(409, "borrow_copy_missing", "Borrow order does not have an assigned copy")
    copy = session.get(BookCopy, bundle.borrow_order.assigned_copy_id)
    if copy is None or copy.inventory_status != "borrowed":
        raise ApiError(409, "borrow_order_not_returnable", "Borrow order is not currently returnable")
    existing_request = _find_open_return_request(session, borrow_order_id=bundle.borrow_order.id)
    if existing_request is not None:
        raise ApiError(409, "return_request_already_exists", "An open return request already exists for this order")
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


def renew_borrow_order(
    session: Session,
    *,
    borrow_order_id: int,
    reader_profile_id: int,
) -> OrderBundle:
    bundle = get_reader_order_bundle(session, reader_profile_id=reader_profile_id, borrow_order_id=borrow_order_id)
    order = bundle.borrow_order
    if order.status in FINAL_BORROW_STATUSES:
        raise ApiError(409, "borrow_order_already_finalized", "Borrow order is already finalized")
    if not _is_order_renewable(order):
        raise ApiError(409, "borrow_order_not_renewable", "Borrow order is not renewable at the current stage")
    base_due_at = _as_utc(order.due_at) or utc_now()
    order.due_at = base_due_at + timedelta(days=7)
    session.add(
        ReadingEvent(
            reader_id=order.reader_id,
            event_type="borrow_order_renewed",
            metadata_json={"borrow_order_id": order.id, "due_at": _iso(order.due_at)},
        )
    )
    session.commit()
    return get_order_bundle(session, borrow_order_id)


def list_reader_return_requests(
    session: Session,
    *,
    reader_profile_id: int,
    status: str | None = None,
) -> list[dict]:
    stmt = (
        select(ReturnRequest, BorrowOrder)
        .join(BorrowOrder, ReturnRequest.borrow_order_id == BorrowOrder.id)
        .where(BorrowOrder.reader_id == reader_profile_id)
        .order_by(ReturnRequest.created_at.desc(), ReturnRequest.id.desc())
    )
    normalized_status = (status or "").strip()
    if normalized_status:
        stmt = stmt.where(ReturnRequest.status == normalized_status)
    return [
        serialize_return_request(request_row, borrow_order=borrow_order)
        for request_row, borrow_order in session.execute(stmt).all()
    ]


def get_reader_return_request_detail(
    session: Session,
    *,
    reader_profile_id: int,
    return_request_id: int,
) -> dict:
    request_row, borrow_order = _get_return_request_with_order(session, return_request_id=return_request_id)
    if borrow_order.reader_id != reader_profile_id:
        raise ApiError(403, "return_request_forbidden", "Return request does not belong to the current reader")
    return {
        "return_request": serialize_return_request(request_row, borrow_order=borrow_order),
        "order": serialize_order(get_order_bundle(session, borrow_order.id)),
    }


def get_return_request_detail(
    session: Session,
    *,
    return_request_id: int,
) -> dict:
    request_row, borrow_order = _get_return_request_with_order(session, return_request_id=return_request_id)
    bundle = get_order_bundle(session, borrow_order.id)
    copy = None if borrow_order.assigned_copy_id is None else session.get(BookCopy, borrow_order.assigned_copy_id)
    slot = None
    if copy is not None:
        slot = session.scalars(
            select(CabinetSlot)
            .where(CabinetSlot.current_copy_id == copy.id)
            .order_by(CabinetSlot.id.asc())
        ).first()
    return {
        "return_request": serialize_return_request(request_row, borrow_order=borrow_order),
        "order": serialize_order(bundle),
        "copy": _serialize_copy(copy),
        "slot": _serialize_slot(slot),
    }


def process_return_request(
    session: Session,
    *,
    return_request_id: int,
    admin_id: int,
) -> dict:
    request_row = session.get(ReturnRequest, return_request_id)
    if request_row is None:
        raise ApiError(404, "return_request_not_found", "Return request not found")
    if request_row.status in RETURN_REQUEST_FINAL_STATUSES:
        raise ApiError(409, "return_request_already_processed", "Return request is already processed")

    bundle = get_order_bundle(session, request_row.borrow_order_id)
    order = bundle.borrow_order
    if order.assigned_copy_id is None:
        raise ApiError(409, "borrow_copy_missing", "Borrow order does not have an assigned copy")
    copy = session.get(BookCopy, order.assigned_copy_id)
    if copy is None:
        raise ApiError(404, "book_copy_not_found", "Assigned book copy not found")
    if copy.inventory_status != "borrowed":
        raise ApiError(409, "copy_not_borrowed", "Assigned copy is not currently in borrowed status")

    slot = _find_free_slot_for_copy(session, cabinet_id=copy.cabinet_id)
    if slot is None:
        raise ApiError(409, "slot_unavailable", "No free slot available to store the returned book")

    before_state = {
        "return_request": serialize_return_request(request_row, borrow_order=order),
        "copy_inventory_status": copy.inventory_status,
        "slot_code": slot.slot_code,
    }

    slot.status = "occupied"
    slot.current_copy_id = copy.id
    copy.inventory_status = "stored"
    adjust_stock_counts(
        session,
        book_id=copy.book_id,
        cabinet_id=copy.cabinet_id,
        available_delta=1,
    )
    order.status = "returned"
    request_row.status = "completed"
    if order.completed_at is None:
        order.completed_at = utc_now()

    session.add(
        InventoryEvent(
            cabinet_id=copy.cabinet_id,
            event_type="book_returned",
            slot_code=slot.slot_code,
            book_id=copy.book_id,
            copy_id=copy.id,
            payload_json={
                "return_request_id": request_row.id,
                "borrow_order_id": order.id,
            },
        )
    )
    session.add(
        ReadingEvent(
            reader_id=order.reader_id,
            event_type="return_request_completed",
            metadata_json={
                "return_request_id": request_row.id,
                "borrow_order_id": order.id,
                "slot_code": slot.slot_code,
            },
        )
    )

    after_state = {
        "return_request": serialize_return_request(request_row, borrow_order=order),
        "copy_inventory_status": copy.inventory_status,
        "slot_code": slot.slot_code,
    }
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="return_request",
            target_id=request_row.id,
            action="process_return_request",
            before_state=before_state,
            after_state=after_state,
        )
    )
    session.commit()

    payload = {
        **_event_payload(
            event_type="return_request_completed",
            borrow_order=order,
            delivery_order=bundle.delivery_order,
            robot_task=bundle.robot_task,
            robot_unit=bundle.robot_unit,
        ),
        "return_request_id": request_row.id,
        "slot_code": slot.slot_code,
    }
    _publish_event_sync(payload)
    return {
        "return_request": serialize_return_request(request_row, borrow_order=order),
        "slot": {
            "slot_code": slot.slot_code,
            "status": slot.status,
            "current_copy_id": slot.current_copy_id,
        },
        "order": serialize_order(get_order_bundle(session, order.id)),
    }


def _resolve_return_slot(session: Session, *, cabinet_id: str, slot_code: str | None) -> CabinetSlot:
    cabinet = session.get(Cabinet, cabinet_id)
    if cabinet is None:
        raise ApiError(404, "cabinet_not_found", "Cabinet not found")

    if slot_code:
        slot = session.scalars(
            select(CabinetSlot).where(CabinetSlot.cabinet_id == cabinet_id, CabinetSlot.slot_code == slot_code)
        ).first()
        if slot is None:
            slot = CabinetSlot(cabinet_id=cabinet_id, slot_code=slot_code, status="empty", current_copy_id=None)
            session.add(slot)
            session.flush()
    else:
        slot = session.scalars(
            select(CabinetSlot)
            .where(
                CabinetSlot.cabinet_id == cabinet_id,
                CabinetSlot.current_copy_id.is_(None),
                CabinetSlot.status.in_(["empty", "free"]),
            )
            .order_by(CabinetSlot.slot_code.asc(), CabinetSlot.id.asc())
        ).first()
        if slot is None:
            raise ApiError(409, "cabinet_full", "No free slot available in the selected cabinet")

    if slot.current_copy_id is not None or slot.status not in {"empty", "free"}:
        raise ApiError(409, "slot_not_available", "The selected slot is not available")
    return slot


def receive_return_request(
    session: Session,
    *,
    return_request_id: int,
    admin_id: int,
    note: str | None = None,
) -> ReturnRequest:
    request_row = session.get(ReturnRequest, return_request_id)
    if request_row is None:
        raise ApiError(404, "return_request_not_found", "Return request not found")

    bundle = get_order_bundle(session, request_row.borrow_order_id)
    before_state = serialize_return_request(request_row, bundle.borrow_order)
    if request_row.status == "completed":
        raise ApiError(409, "return_request_completed", "Return request has already been completed")
    copy = session.get(BookCopy, bundle.borrow_order.assigned_copy_id) if bundle.borrow_order.assigned_copy_id else None

    request_row.status = "received"
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="return_request",
            target_id=request_row.id,
            action="receive_return_request",
            before_state=before_state,
            after_state=serialize_return_request(request_row, bundle.borrow_order),
            note=note,
        )
    )
    session.add(
        ReadingEvent(
            reader_id=bundle.borrow_order.reader_id,
            event_type="return_request_received",
            metadata_json={"borrow_order_id": bundle.borrow_order.id, "return_request_id": request_row.id, "note": note},
        )
    )
    if copy is not None:
        session.add(
            InventoryEvent(
                cabinet_id=copy.cabinet_id,
                event_type="return_received",
                book_id=bundle.borrow_order.book_id,
                copy_id=copy.id,
                payload_json={"return_request_id": request_row.id, "note": note},
            )
        )
    session.commit()
    _publish_event_sync(
        {
            **_event_payload(
                event_type="return_request_received",
                borrow_order=bundle.borrow_order,
                delivery_order=bundle.delivery_order,
                robot_task=bundle.robot_task,
                robot_unit=bundle.robot_unit,
                note=note,
            ),
            "return_request_id": request_row.id,
            "return_request_status": request_row.status,
        }
    )
    return request_row


def complete_return_request(
    session: Session,
    *,
    return_request_id: int,
    admin_id: int,
    cabinet_id: str,
    slot_code: str | None = None,
    note: str | None = None,
) -> ReturnRequest:
    request_row = session.get(ReturnRequest, return_request_id)
    if request_row is None:
        raise ApiError(404, "return_request_not_found", "Return request not found")
    if request_row.status == "completed":
        return request_row

    bundle = get_order_bundle(session, request_row.borrow_order_id)
    if bundle.borrow_order.assigned_copy_id is None:
        raise ApiError(409, "return_copy_missing", "The borrow order has no assigned copy")

    copy = session.get(BookCopy, bundle.borrow_order.assigned_copy_id)
    if copy is None:
        raise ApiError(404, "book_copy_not_found", "Assigned book copy not found")

    before_state = serialize_return_request(request_row, bundle.borrow_order)
    target_slot = _resolve_return_slot(session, cabinet_id=cabinet_id, slot_code=slot_code)

    original_cabinet_id = copy.cabinet_id
    if original_cabinet_id == cabinet_id:
        adjust_stock_counts(session, book_id=copy.book_id, cabinet_id=cabinet_id, available_delta=1)
    else:
        adjust_stock_counts(session, book_id=copy.book_id, cabinet_id=original_cabinet_id, total_delta=-1)
        adjust_stock_counts(session, book_id=copy.book_id, cabinet_id=cabinet_id, total_delta=1, available_delta=1)

    copy.cabinet_id = cabinet_id
    copy.inventory_status = "stored"
    target_slot.status = "occupied"
    target_slot.current_copy_id = copy.id
    bundle.borrow_order.status = "returned"
    if bundle.borrow_order.completed_at is None:
        bundle.borrow_order.completed_at = utc_now()
    request_row.status = "completed"

    session.add(
        InventoryEvent(
            cabinet_id=cabinet_id,
            event_type="return_completed",
            slot_code=target_slot.slot_code,
            book_id=copy.book_id,
            copy_id=copy.id,
            payload_json={"return_request_id": request_row.id, "note": note},
        )
    )
    session.add(
        ReadingEvent(
            reader_id=bundle.borrow_order.reader_id,
            event_type="return_completed",
            metadata_json={
                "borrow_order_id": bundle.borrow_order.id,
                "return_request_id": request_row.id,
                "cabinet_id": cabinet_id,
                "slot_code": target_slot.slot_code,
                "note": note,
            },
        )
    )
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="return_request",
            target_id=request_row.id,
            action="complete_return_request",
            before_state=before_state,
            after_state=serialize_return_request(request_row, bundle.borrow_order),
            note=note,
        )
    )
    session.commit()
    _publish_event_sync(
        {
            **_event_payload(
                event_type="return_request_completed",
                borrow_order=bundle.borrow_order,
                delivery_order=bundle.delivery_order,
                robot_task=bundle.robot_task,
                robot_unit=bundle.robot_unit,
                note=note,
            ),
            "return_request_id": request_row.id,
            "return_request_status": request_row.status,
            "cabinet_id": cabinet_id,
            "slot_code": target_slot.slot_code,
        }
    )
    return request_row


def cancel_borrow_order(
    session: Session,
    *,
    borrow_order_id: int,
    reader_profile_id: int,
) -> OrderBundle:
    bundle = get_order_bundle(session, borrow_order_id)
    if bundle.borrow_order.reader_id != reader_profile_id:
        raise ApiError(403, "borrow_order_forbidden", "Borrow order does not belong to the current reader")
    if bundle.borrow_order.status in FINAL_BORROW_STATUSES:
        raise ApiError(409, "borrow_order_already_finalized", "Borrow order is already finalized")
    if not _is_bundle_cancellable(bundle):
        raise ApiError(409, "borrow_order_not_cancellable", "Borrow order cannot be cancelled at the current stage")

    order = bundle.borrow_order
    delivery = bundle.delivery_order
    task = bundle.robot_task
    robot = bundle.robot_unit

    _restore_copy_for_cancelled_order(session, order=order)

    order.status = "cancelled"
    order.completed_at = utc_now()

    if delivery is not None:
        delivery.status = "cancelled"
        if delivery.completed_at is None:
            delivery.completed_at = utc_now()

    if task is not None:
        task.status = "cancelled"
        if task.completed_at is None:
            task.completed_at = utc_now()

    if robot is not None:
        robot.status = "idle"

    session.add(
        ReadingEvent(
            reader_id=order.reader_id,
            event_type="borrow_order_cancelled",
            metadata_json={
                "borrow_order_id": order.id,
                "assigned_copy_id": order.assigned_copy_id,
            },
        )
    )
    payload = _event_payload(
        event_type="order_cancelled",
        borrow_order=order,
        delivery_order=delivery,
        robot_task=task,
        robot_unit=robot,
    )
    _record_robot_event(
        session,
        robot_id=robot.id if robot is not None else None,
        task_id=task.id if task is not None else None,
        event_type="order_cancelled",
        payload=payload,
    )
    session.commit()
    _publish_event_sync(payload)
    return get_order_bundle(session, order.id)


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


def prioritize_order_bundle(
    session: Session,
    *,
    borrow_order_id: int,
    admin_id: int,
    priority: str,
) -> OrderBundle:
    normalized_priority = (priority or "").strip().lower()
    if normalized_priority not in ORDER_PRIORITIES:
        raise ApiError(400, "invalid_order_priority", f"Unsupported order priority: {priority}")

    bundle = get_order_bundle(session, borrow_order_id)
    before_state = _event_payload(
        event_type="order_priority_before",
        borrow_order=bundle.borrow_order,
        delivery_order=bundle.delivery_order,
        robot_task=bundle.robot_task,
        robot_unit=bundle.robot_unit,
    )
    bundle.borrow_order.priority = normalized_priority
    if bundle.delivery_order is not None:
        bundle.delivery_order.priority = normalized_priority
    after_state = {
        **_event_payload(
            event_type="order_prioritized",
            borrow_order=bundle.borrow_order,
            delivery_order=bundle.delivery_order,
            robot_task=bundle.robot_task,
            robot_unit=bundle.robot_unit,
        ),
        "priority": normalized_priority,
    }
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="borrow_order_bundle",
            target_id=borrow_order_id,
            action="prioritize_order",
            before_state=before_state,
            after_state=after_state,
        )
    )
    _record_robot_event(
        session,
        robot_id=bundle.robot_unit.id if bundle.robot_unit is not None else None,
        task_id=bundle.robot_task.id if bundle.robot_task is not None else None,
        event_type="order_prioritized",
        payload=after_state,
    )
    session.commit()
    _publish_event_sync(after_state)
    return get_order_bundle(session, borrow_order_id)


def intervene_order_bundle(
    session: Session,
    *,
    borrow_order_id: int,
    admin_id: int,
    intervention_status: str,
    failure_reason: str | None = None,
) -> OrderBundle:
    normalized_intervention = (intervention_status or "").strip()
    if not normalized_intervention:
        raise ApiError(400, "intervention_status_required", "Intervention status is required")

    bundle = get_order_bundle(session, borrow_order_id)
    before_state = _event_payload(
        event_type="order_intervention_before",
        borrow_order=bundle.borrow_order,
        delivery_order=bundle.delivery_order,
        robot_task=bundle.robot_task,
        robot_unit=bundle.robot_unit,
    )
    bundle.borrow_order.intervention_status = normalized_intervention
    bundle.borrow_order.failure_reason = failure_reason
    if bundle.delivery_order is not None:
        bundle.delivery_order.intervention_status = normalized_intervention
        bundle.delivery_order.failure_reason = failure_reason
    if bundle.robot_task is not None:
        bundle.robot_task.failure_reason = failure_reason
    after_state = {
        **_event_payload(
            event_type="order_intervened",
            borrow_order=bundle.borrow_order,
            delivery_order=bundle.delivery_order,
            robot_task=bundle.robot_task,
            robot_unit=bundle.robot_unit,
            note=failure_reason,
        ),
        "intervention_status": normalized_intervention,
        "failure_reason": failure_reason,
    }
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="borrow_order_bundle",
            target_id=borrow_order_id,
            action="intervene_order",
            before_state=before_state,
            after_state=after_state,
        )
    )
    _record_robot_event(
        session,
        robot_id=bundle.robot_unit.id if bundle.robot_unit is not None else None,
        task_id=bundle.robot_task.id if bundle.robot_task is not None else None,
        event_type="order_intervened",
        payload=after_state,
    )
    session.commit()
    _publish_event_sync(after_state)
    return get_order_bundle(session, borrow_order_id)


def retry_order_bundle(
    session: Session,
    *,
    borrow_order_id: int,
    admin_id: int,
    note: str | None = None,
) -> OrderBundle:
    bundle = get_order_bundle(session, borrow_order_id)
    before_state = _event_payload(
        event_type="order_retry_before",
        borrow_order=bundle.borrow_order,
        delivery_order=bundle.delivery_order,
        robot_task=bundle.robot_task,
        robot_unit=bundle.robot_unit,
        note=note,
    )

    bundle.borrow_order.status = "created" if bundle.delivery_order is not None else "awaiting_pick"
    bundle.borrow_order.attempt_count = int(bundle.borrow_order.attempt_count or 0) + 1
    bundle.borrow_order.failure_reason = None
    bundle.borrow_order.intervention_status = None

    if bundle.delivery_order is not None:
        bundle.delivery_order.status = "awaiting_pick"
        bundle.delivery_order.attempt_count = int(bundle.delivery_order.attempt_count or 0) + 1
        bundle.delivery_order.failure_reason = None
        bundle.delivery_order.intervention_status = None

    if bundle.robot_task is not None:
        bundle.robot_task.status = "assigned"
        bundle.robot_task.attempt_count = int(bundle.robot_task.attempt_count or 0) + 1
        bundle.robot_task.failure_reason = None

    if bundle.robot_unit is not None:
        bundle.robot_unit.status = "assigned"
        bundle.robot_unit.heartbeat_at = utc_now()

    after_state = {
        **_event_payload(
            event_type="order_retried",
            borrow_order=bundle.borrow_order,
            delivery_order=bundle.delivery_order,
            robot_task=bundle.robot_task,
            robot_unit=bundle.robot_unit,
            note=note,
        ),
        "attempt_count": bundle.borrow_order.attempt_count,
    }
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="borrow_order_bundle",
            target_id=borrow_order_id,
            action="retry_order",
            before_state=before_state,
            after_state=after_state,
            note=note,
        )
    )
    _record_robot_event(
        session,
        robot_id=bundle.robot_unit.id if bundle.robot_unit is not None else None,
        task_id=bundle.robot_task.id if bundle.robot_task is not None else None,
        event_type="order_retried",
        payload=after_state,
    )
    session.commit()
    _publish_event_sync(after_state)
    return get_order_bundle(session, borrow_order_id)


def reassign_robot_task(
    session: Session,
    *,
    task_id: int,
    admin_id: int,
    robot_id: int,
    reason: str | None = None,
) -> dict:
    task = session.get(RobotTask, task_id)
    if task is None:
        raise ApiError(404, "robot_task_not_found", "Robot task not found")
    next_robot = session.get(RobotUnit, robot_id)
    if next_robot is None:
        raise ApiError(404, "robot_not_found", "Robot not found")

    previous_robot = session.get(RobotUnit, task.robot_id)
    delivery = session.get(DeliveryOrder, task.delivery_order_id)
    if delivery is None:
        raise ApiError(404, "delivery_order_not_found", "Delivery order not found")
    borrow_order = session.get(BorrowOrder, delivery.borrow_order_id)
    if borrow_order is None:
        raise ApiError(404, "borrow_order_not_found", "Borrow order not found")

    before_state = {
        "task": serialize_task(task, previous_robot, delivery),
        "robot": None if previous_robot is None else serialize_robot(previous_robot),
    }

    previous_robot_id = task.robot_id
    task.robot_id = next_robot.id
    next_robot.status = "assigned"
    next_robot.heartbeat_at = utc_now()

    if previous_robot is not None and previous_robot.id != next_robot.id:
        has_other_active_tasks = session.scalar(
            select(RobotTask.id)
            .where(RobotTask.robot_id == previous_robot_id, RobotTask.id != task.id, RobotTask.status != "completed")
            .limit(1)
        )
        if has_other_active_tasks is None:
            previous_robot.status = "idle"

    after_state = {
        "task": serialize_task(task, next_robot, delivery),
        "robot": serialize_robot(next_robot, task, delivery),
        "reason": reason,
    }
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type="robot_task",
            target_id=task.id,
            action="reassign_robot_task",
            before_state=before_state,
            after_state=after_state,
            note=reason,
        )
    )
    _record_robot_event(
        session,
        robot_id=next_robot.id,
        task_id=task.id,
        event_type="task_reassigned",
        payload={
            "reason": reason,
            "previous_robot_id": previous_robot_id,
            "next_robot_id": next_robot.id,
            **_event_payload(
                event_type="task_reassigned",
                borrow_order=borrow_order,
                delivery_order=delivery,
                robot_task=task,
                robot_unit=next_robot,
                note=reason,
            ),
        },
    )
    session.commit()
    _publish_event_sync(
        {
            "event_type": "task_reassigned",
            "task_id": task.id,
            "previous_robot_id": previous_robot_id,
            "next_robot_id": next_robot.id,
            "reason": reason,
        }
    )
    return {
        "task": serialize_task(task, next_robot, delivery),
        "robot": serialize_robot(next_robot, task, delivery),
    }
