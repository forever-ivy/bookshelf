from __future__ import annotations

from sqlalchemy.orm import Session

from app.orders.service import advance_order_bundle, get_order_bundle, list_order_bundles, serialize_order
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit


def tick_once(session: Session) -> int:
    bundles = list_order_bundles(session)
    progressed = 0
    for bundle in bundles:
        before = serialize_order(bundle)
        updated = advance_order_bundle(session, bundle)
        after = serialize_order(updated)
        if before != after:
            progressed += 1
    return progressed


def get_robot_state(session: Session) -> list[dict]:
    bundles = list_order_bundles(session)
    return [serialize_order(bundle) for bundle in bundles]


def tick_steps(session: Session, *, steps: int) -> dict:
    step_items: list[dict] = []
    total_progressed = 0

    for index in range(steps):
        progressed = tick_once(session)
        step_items.append(
            {
                "step": index + 1,
                "progressed_orders": progressed,
            }
        )
        total_progressed += progressed
        if progressed <= 0:
            break

    return {
        "requested_steps": steps,
        "executed_steps": len(step_items),
        "total_progressed_orders": total_progressed,
        "stopped_early": len(step_items) < steps,
        "steps": step_items,
        "items": get_robot_state(session),
    }


def tick_order_steps(session: Session, *, borrow_order_id: int, steps: int) -> dict:
    bundle = get_order_bundle(session, borrow_order_id)
    step_items: list[dict] = []
    progressed_steps = 0

    for index in range(steps):
        before = serialize_order(bundle)
        bundle = advance_order_bundle(session, bundle)
        after = serialize_order(bundle)
        progressed = before != after
        step_items.append(
            {
                "step": index + 1,
                "progressed": progressed,
                "borrow_status": after["order"]["status"],
                "fulfillment_status": None if after["fulfillment"] is None else after["fulfillment"]["status"],
                "task_status": None if after["currentRobotTask"] is None else after["currentRobotTask"]["status"],
                "robot_status": None if after["robot"] is None else after["robot"]["status"],
            }
        )
        if progressed:
            progressed_steps += 1
        else:
            break

    final_item = serialize_order(bundle)
    return {
        "borrowOrderId": borrow_order_id,
        "requested_steps": steps,
        "executed_steps": len(step_items),
        "progressed_steps": progressed_steps,
        "stopped_early": len(step_items) < steps,
        "steps": step_items,
        "item": final_item,
    }


def list_robot_tasks(session: Session) -> list[dict]:
    tasks = session.query(RobotTask).order_by(RobotTask.id.desc()).all()
    return [
        {
            "id": task.id,
            "robot_id": task.robot_id,
            "fulfillment_id": task.fulfillment_id,
            "status": task.status,
        }
        for task in tasks
    ]


def list_robot_units(session: Session) -> list[dict]:
    robots = session.query(RobotUnit).order_by(RobotUnit.id.asc()).all()
    return [
        {
            "id": robot.id,
            "code": robot.code,
            "status": robot.status,
        }
        for robot in robots
    ]


def list_robot_events(session: Session, *, limit: int = 20) -> list[dict]:
    events = session.query(RobotStatusEvent).order_by(RobotStatusEvent.id.desc()).limit(limit).all()
    items = []
    for event in events:
        items.append(
            {
                "id": event.id,
                "robot_id": event.robot_id,
                "task_id": event.task_id,
                "event_type": event.event_type,
                "metadata": event.metadata_json or {},
            }
        )
    return items
