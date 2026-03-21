from __future__ import annotations

from sqlalchemy.orm import Session

from app.orders.service import advance_order_bundle, list_order_bundles, serialize_order
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


def list_robot_tasks(session: Session) -> list[dict]:
    tasks = session.query(RobotTask).order_by(RobotTask.id.desc()).all()
    return [
        {
            "id": task.id,
            "robot_id": task.robot_id,
            "delivery_order_id": task.delivery_order_id,
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
