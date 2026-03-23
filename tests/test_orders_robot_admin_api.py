from __future__ import annotations

import asyncio
import json

from app.auth.models import AdminAccount
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.events import broker
from app.core.sse import encode_sse
from app.core.security import AuthIdentity, create_token, hash_password
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot
from app.orders.models import BorrowOrder, DeliveryOrder, ReturnRequest
from app.readers.models import ReaderAccount, ReaderProfile
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit
from app.workers.robot_auto_progress import RobotAutoProgressWorker


def seed_state():
    session = get_session_factory()()
    try:
        session.add(
            AdminAccount(
                username="admin",
                password_hash=hash_password("admin-password"),
            )
        )
        session.add(
            ReaderAccount(
                username="reader",
                password_hash=hash_password("reader-password"),
            )
        )
        session.flush()

        admin = session.query(AdminAccount).filter_by(username="admin").one()
        reader = session.query(ReaderAccount).filter_by(username="reader").one()
        profile = ReaderProfile(
            account_id=reader.id,
            display_name="Alice",
            affiliation_type="student",
            college="Computer Science",
            major="AI",
            grade_year="2026",
        )
        book = Book(
            title="Socratic Systems",
            author="Ivy",
            category="AI",
            keywords="agent,graph,reading",
            summary="A book for planning conversational systems.",
        )
        cabinet = session.get(Cabinet, "cabinet-001")
        assert cabinet is not None
        robot = RobotUnit(code="robot-1", status="idle")
        session.add_all([profile, book, robot])
        session.flush()
        copy = BookCopy(book_id=book.id, cabinet_id=cabinet.id, inventory_status="stored")
        session.add(copy)
        session.flush()
        session.add(
            BookStock(
                book_id=book.id,
                cabinet_id=cabinet.id,
                total_copies=1,
                available_copies=1,
                reserved_copies=0,
            )
        )
        session.add(
            CabinetSlot(
                cabinet_id=cabinet.id,
                slot_code="A01",
                status="occupied",
                current_copy_id=copy.id,
            )
        )
        session.commit()
        return {
            "admin": admin,
            "reader": reader,
            "profile": profile,
            "book": book,
            "robot": robot,
            "copy": copy,
        }
    finally:
        session.close()


def auth_headers(role: str, account_id: int, profile_id: int | None = None):
    token = create_token(
        AuthIdentity(account_id=account_id, role=role, profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def post_borrow_order(client, reader_id: int, book_id: int):
    return client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(reader_id),
        json={
            "book_id": book_id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )


def reader_headers(profile_id: int):
    session = get_session_factory()()
    try:
        reader = session.query(ReaderAccount).join(ReaderProfile, ReaderProfile.account_id == ReaderAccount.id).filter(ReaderProfile.id == profile_id).one()
        return auth_headers("reader", reader.id, profile_id)
    finally:
        session.close()


def admin_headers(account_id: int):
    return auth_headers("admin", account_id, None)


def clear_broker_history():
    broker._history.clear()
    broker._subscribers.clear()


def test_reader_borrow_order_creates_delivery_and_task(client):
    clear_broker_history()
    state = seed_state()

    response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["borrow_order"]["status"] == "created"
    assert payload["delivery_order"]["status"] == "awaiting_pick"
    assert payload["robot_task"]["status"] == "assigned"
    assert payload["robot_unit"]["status"] == "assigned"
    assert payload["borrow_order"]["assigned_copy_id"] == state["copy"].id

    admin_response = client.get(
        f"/api/v1/admin/orders/{payload['borrow_order']['id']}",
        headers=admin_headers(state["admin"].id),
    )
    assert admin_response.status_code == 200
    detail = admin_response.json()
    assert detail["borrow_order"]["status"] == "created"
    assert detail["delivery_order"]["delivery_target"] == "Reading Hall Seat A7"
    assert detail["robot_task"]["status"] == "assigned"

    tasks_response = client.get(
        "/api/v1/admin/tasks",
        headers=admin_headers(state["admin"].id),
    )
    assert tasks_response.status_code == 200
    tasks = tasks_response.json()["items"]
    assert len(tasks) == 1
    assert tasks[0]["status"] == "assigned"

    robots_response = client.get(
        "/api/v1/admin/robots",
        headers=admin_headers(state["admin"].id),
    )
    assert robots_response.status_code == 200
    robots = robots_response.json()["items"]
    assert len(robots) == 1
    assert robots[0]["status"] == "assigned"

    events_response = client.get(
        "/api/v1/admin/events",
        headers=admin_headers(state["admin"].id),
    )
    assert events_response.status_code == 200
    events = events_response.json()["items"]
    assert events[0]["event_type"] == "order_created"
    assert events[0]["metadata"]["borrow_status"] == "created"

    session = get_session_factory()()
    try:
        slot = session.query(CabinetSlot).filter_by(slot_code="A01").one()
        copy = session.get(BookCopy, state["copy"].id)
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        assert slot.current_copy_id is None
        assert copy.inventory_status == "in_delivery"
        assert stock.total_copies == 1
        assert stock.available_copies == 0
        assert stock.reserved_copies == 1
    finally:
        session.close()


def test_cabinet_pickup_order_does_not_create_delivery_task(client):
    clear_broker_history()
    state = seed_state()

    response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "order_mode": "cabinet_pickup",
        },
    )

    assert response.status_code == 201
    payload = response.json()
    assert payload["borrow_order"]["order_mode"] == "cabinet_pickup"
    assert payload["delivery_order"] is None
    assert payload["robot_task"] is None
    assert payload["robot_unit"] is None
    assert payload["borrow_order"]["assigned_copy_id"] == state["copy"].id

    tasks_response = client.get(
        "/api/v1/admin/tasks",
        headers=admin_headers(state["admin"].id),
    )
    assert tasks_response.status_code == 200
    assert tasks_response.json()["items"] == []

    session = get_session_factory()()
    try:
        copy = session.get(BookCopy, state["copy"].id)
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        assert copy.inventory_status == "reserved"
        assert stock.available_copies == 0
        assert stock.reserved_copies == 1
    finally:
        session.close()

def test_robot_auto_progress_worker_completes_delivery(client):
    clear_broker_history()
    state = seed_state()

    create_response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )
    order_id = create_response.json()["borrow_order"]["id"]

    worker = RobotAutoProgressWorker()
    for _ in range(5):
        progressed = worker.tick()
        assert progressed >= 1

    session = get_session_factory()()
    try:
        order = session.get(BorrowOrder, order_id)
        delivery = session.get(DeliveryOrder, create_response.json()["delivery_order"]["id"])
        robot = session.get(RobotUnit, create_response.json()["robot_unit"]["id"])
        task = session.get(RobotTask, create_response.json()["robot_task"]["id"])
        copy = session.get(BookCopy, create_response.json()["borrow_order"]["assigned_copy_id"])
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        assert order.status == "completed"
        assert delivery.status == "completed"
        assert robot.status == "idle"
        assert task.status == "completed"
        assert copy.inventory_status == "borrowed"
        assert stock.total_copies == 1
        assert stock.available_copies == 0
        assert stock.reserved_copies == 0
    finally:
        session.close()

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "Please collect after class"},
    )
    assert return_response.status_code == 201
    return_payload = return_response.json()
    assert return_payload["return_request"]["status"] == "created"

    session = get_session_factory()()
    try:
        request_row = session.get(ReturnRequest, return_payload["return_request"]["id"])
        assert request_row.status == "created"
    finally:
        session.close()


def test_reader_cannot_create_return_request_for_another_readers_order(client):
    clear_broker_history()
    state = seed_state()

    session = get_session_factory()()
    try:
        second_reader = ReaderAccount(
            username="reader-two",
            password_hash=hash_password("reader-two-password"),
        )
        session.add(second_reader)
        session.flush()
        second_profile = ReaderProfile(
            account_id=second_reader.id,
            display_name="Mallory",
            affiliation_type="student",
            college="Math",
            major="Statistics",
            grade_year="2027",
        )
        session.add(second_profile)
        session.commit()
    finally:
        session.close()

    create_response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )
    order_id = create_response.json()["borrow_order"]["id"]

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(second_profile.id),
        json={"note": "Trying to return another user's book"},
    )
    assert return_response.status_code == 403


def test_admin_state_correction_creates_audit_log(client):
    from app.auth.models import AdminActionLog

    clear_broker_history()
    state = seed_state()

    create_response = post_borrow_order(client, state["profile"].id, state["book"].id)
    order_id = create_response.json()["borrow_order"]["id"]

    response = client.patch(
        f"/api/v1/admin/orders/{order_id}/state",
        headers=admin_headers(state["admin"].id),
        json={
            "borrow_status": "delivered",
            "delivery_status": "delivered",
            "task_status": "arriving",
            "robot_status": "arriving",
        },
    )

    assert response.status_code == 200

    session = get_session_factory()()
    try:
        audit = session.query(AdminActionLog).order_by(AdminActionLog.id.desc()).first()
        assert audit is not None
        assert audit.admin_id == state["admin"].id
        assert audit.target_type == "borrow_order_bundle"
        assert audit.target_id == order_id
        assert audit.action == "admin_correction"
        assert audit.before_state["borrow_status"] == "created"
        assert audit.after_state["borrow_status"] == "delivered"
    finally:
        session.close()


def test_admin_stream_emits_events_and_admin_can_correct_state(client):
    clear_broker_history()
    state = seed_state()

    create_response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )
    order_id = create_response.json()["borrow_order"]["id"]

    async def read_first_event():
        stream = encode_sse(broker.subscribe())
        return await stream.__anext__()

    event_text = asyncio.run(read_first_event())
    assert "order_created" in event_text

    correction_response = client.patch(
        f"/api/v1/admin/orders/{order_id}/state",
        headers=admin_headers(state["admin"].id),
        json={
            "borrow_status": "delivered",
            "delivery_status": "delivered",
            "robot_status": "returning",
            "task_status": "returning",
        },
    )

    assert correction_response.status_code == 200
    correction = correction_response.json()
    assert correction["borrow_order"]["status"] == "delivered"
    assert correction["delivery_order"]["status"] == "delivered"
    assert correction["robot"]["status"] == "returning"

    forbidden = client.get(
        "/api/v1/admin/orders",
        headers=reader_headers(state["profile"].id),
    )
    assert forbidden.status_code == 403


def test_admin_correction_rejects_unknown_status_values(client):
    clear_broker_history()
    state = seed_state()

    create_response = client.post(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        json={
            "book_id": state["book"].id,
            "delivery_target": "Reading Hall Seat A7",
            "order_mode": "robot_delivery",
        },
    )
    order_id = create_response.json()["borrow_order"]["id"]

    response = client.patch(
        f"/api/v1/admin/orders/{order_id}/state",
        headers=admin_headers(state["admin"].id),
        json={
            "borrow_status": "teleported",
            "delivery_status": "flying",
        },
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "invalid_status_transition"


def test_admin_can_prioritize_retry_and_intervene_order_bundle(client):
    clear_broker_history()
    state = seed_state()

    create_response = post_borrow_order(client, state["profile"].id, state["book"].id)
    order_id = create_response.json()["borrow_order"]["id"]

    priority_response = client.post(
        f"/api/v1/admin/orders/{order_id}/priority",
        headers=admin_headers(state["admin"].id),
        json={"priority": "urgent"},
    )
    assert priority_response.status_code == 200
    assert priority_response.json()["borrow_order"]["priority"] == "urgent"
    assert priority_response.json()["delivery_order"]["priority"] == "urgent"

    intervene_response = client.post(
        f"/api/v1/admin/orders/{order_id}/intervene",
        headers=admin_headers(state["admin"].id),
        json={"intervention_status": "manual_review", "failure_reason": "机器人在通道口等待人工处理"},
    )
    assert intervene_response.status_code == 200
    intervention_bundle = intervene_response.json()
    assert intervention_bundle["borrow_order"]["intervention_status"] == "manual_review"
    assert intervention_bundle["borrow_order"]["failure_reason"] == "机器人在通道口等待人工处理"

    retry_response = client.post(
        f"/api/v1/admin/orders/{order_id}/retry",
        headers=admin_headers(state["admin"].id),
        json={"note": "人工确认后重新派单"},
    )
    assert retry_response.status_code == 200
    retry_bundle = retry_response.json()
    assert retry_bundle["borrow_order"]["status"] == "created"
    assert retry_bundle["delivery_order"]["status"] == "awaiting_pick"
    assert retry_bundle["robot_task"]["status"] == "assigned"
    assert retry_bundle["robot_unit"]["status"] == "assigned"
    assert retry_bundle["borrow_order"]["attempt_count"] == 1


def test_admin_can_reassign_robot_task(client):
    clear_broker_history()
    state = seed_state()

    session = get_session_factory()()
    try:
        second_robot = RobotUnit(code="robot-2", status="idle", battery_level=91)
        session.add(second_robot)
        session.commit()
        second_robot_id = second_robot.id
    finally:
        session.close()

    create_response = post_borrow_order(client, state["profile"].id, state["book"].id)
    task_id = create_response.json()["robot_task"]["id"]
    old_robot_id = create_response.json()["robot_unit"]["id"]

    reassign_response = client.post(
        f"/api/v1/admin/tasks/{task_id}/reassign",
        headers=admin_headers(state["admin"].id),
        json={"robot_id": second_robot_id, "reason": "原机器人电量过低"},
    )
    assert reassign_response.status_code == 200
    payload = reassign_response.json()
    assert payload["task"]["robot_id"] == second_robot_id
    assert payload["robot"]["id"] == second_robot_id

    session = get_session_factory()()
    try:
        task = session.get(RobotTask, task_id)
        old_robot = session.get(RobotUnit, old_robot_id)
        new_robot = session.get(RobotUnit, second_robot_id)
        assert task is not None
        assert old_robot is not None
        assert new_robot is not None
        assert task.robot_id == second_robot_id
        assert old_robot.status == "idle"
        assert new_robot.status == "assigned"
    finally:
        session.close()


def test_admin_can_receive_and_complete_return_request(client):
    clear_broker_history()
    state = seed_state()

    create_response = post_borrow_order(client, state["profile"].id, state["book"].id)
    order_id = create_response.json()["borrow_order"]["id"]

    worker = RobotAutoProgressWorker()
    for _ in range(5):
        worker.tick()

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "下课后归还"},
    )
    assert return_response.status_code == 201
    return_request_id = return_response.json()["return_request"]["id"]

    list_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"status": "created", "borrow_order_id": order_id},
    )
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == return_request_id

    receive_response = client.post(
        f"/api/v1/admin/return-requests/{return_request_id}/receive",
        headers=admin_headers(state["admin"].id),
        json={"note": "机器人已完成回收"},
    )
    assert receive_response.status_code == 200
    assert receive_response.json()["return_request"]["status"] == "received"

    complete_response = client.post(
        f"/api/v1/admin/return-requests/{return_request_id}/complete",
        headers=admin_headers(state["admin"].id),
        json={"cabinet_id": "cabinet-001", "slot_code": "A01", "note": "书柜识别成功并完成上架"},
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["return_request"]["status"] == "completed"

    session = get_session_factory()()
    try:
        request_row = session.get(ReturnRequest, return_request_id)
        copy = session.get(BookCopy, state["copy"].id)
        slot = session.query(CabinetSlot).filter_by(cabinet_id="cabinet-001", slot_code="A01").one()
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        assert request_row is not None
        assert copy is not None
        assert request_row.status == "completed"
        assert copy.inventory_status == "stored"
        assert slot.current_copy_id == copy.id
        assert slot.status == "occupied"
        assert stock.total_copies == 1
        assert stock.available_copies == 1
        assert stock.reserved_copies == 0
    finally:
        session.close()
