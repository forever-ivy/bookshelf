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


def test_reader_cannot_create_return_request_before_book_is_borrowed(client):
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
    assert create_response.status_code == 201
    order_id = create_response.json()["borrow_order"]["id"]

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "Trying to return too early"},
    )
    assert return_response.status_code == 409
    assert return_response.json()["error"]["code"] == "borrow_order_not_returnable"


def test_admin_can_list_and_complete_return_request_restoring_inventory(client):
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
    assert create_response.status_code == 201
    order_payload = create_response.json()
    order_id = order_payload["borrow_order"]["id"]
    copy_id = order_payload["borrow_order"]["assigned_copy_id"]

    worker = RobotAutoProgressWorker()
    for _ in range(5):
        progressed = worker.tick()
        assert progressed >= 1

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "Please return to shelf"},
    )
    assert return_response.status_code == 201
    return_request_id = return_response.json()["return_request"]["id"]

    list_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert items[0]["id"] == return_request_id
    assert items[0]["status"] == "created"

    complete_response = client.post(
        f"/api/v1/admin/return-requests/{return_request_id}/complete",
        headers=admin_headers(state["admin"].id),
    )
    assert complete_response.status_code == 200
    payload = complete_response.json()
    assert payload["return_request"]["id"] == return_request_id
    assert payload["return_request"]["status"] == "completed"
    assert payload["order"]["borrow_order"]["id"] == order_id
    assert payload["order"]["borrow_order"]["status"] == "returned"
    assert payload["slot"]["status"] == "occupied"
    assert payload["slot"]["current_copy_id"] == copy_id

    session = get_session_factory()()
    try:
        copy = session.get(BookCopy, copy_id)
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        slot = session.query(CabinetSlot).filter_by(current_copy_id=copy_id).one()
        request_row = session.get(ReturnRequest, return_request_id)
        assert copy.inventory_status == "stored"
        assert stock.available_copies == 1
        assert stock.reserved_copies == 0
        assert slot.status == "occupied"
        assert request_row.status == "completed"
    finally:
        session.close()

    created_only_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"status": "created"},
    )
    assert created_only_response.status_code == 200
    assert created_only_response.json()["items"] == []

    completed_only_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"status": "completed"},
    )
    assert completed_only_response.status_code == 200
    assert completed_only_response.json()["items"][0]["id"] == return_request_id


def test_admin_can_filter_return_requests_by_status_and_reader(client):
    clear_broker_history()
    state = seed_state()

    session = get_session_factory()()
    try:
        second_reader = ReaderAccount(
            username="reader-return-filter-two",
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
        session.flush()

        created_order = BorrowOrder(
            reader_id=state["profile"].id,
            book_id=state["book"].id,
            order_mode="cabinet_pickup",
            status="completed",
        )
        completed_order = BorrowOrder(
            reader_id=second_profile.id,
            book_id=state["book"].id,
            order_mode="cabinet_pickup",
            status="returned",
        )
        session.add_all([created_order, completed_order])
        session.flush()

        created_request = ReturnRequest(
            borrow_order_id=created_order.id,
            note="pending return",
            status="created",
        )
        completed_request = ReturnRequest(
            borrow_order_id=completed_order.id,
            note="finished return",
            status="completed",
        )
        session.add_all([created_request, completed_request])
        session.commit()
        first_reader_id = state["profile"].id
        second_reader_id = second_profile.id
        created_request_id = created_request.id
        completed_request_id = completed_request.id
    finally:
        session.close()

    reader_filtered_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"reader_id": first_reader_id},
    )
    assert reader_filtered_response.status_code == 200
    reader_filtered_items = reader_filtered_response.json()["items"]
    assert [item["id"] for item in reader_filtered_items] == [created_request_id]
    assert [item["reader_id"] for item in reader_filtered_items] == [first_reader_id]

    combined_filtered_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"status": "completed", "reader_id": second_reader_id},
    )
    assert combined_filtered_response.status_code == 200
    combined_filtered_items = combined_filtered_response.json()["items"]
    assert [item["id"] for item in combined_filtered_items] == [completed_request_id]
    assert [item["status"] for item in combined_filtered_items] == ["completed"]
    assert [item["reader_id"] for item in combined_filtered_items] == [second_reader_id]

    empty_filtered_response = client.get(
        "/api/v1/admin/return-requests",
        headers=admin_headers(state["admin"].id),
        params={"status": "created", "reader_id": second_reader_id},
    )
    assert empty_filtered_response.status_code == 200
    assert empty_filtered_response.json()["items"] == []


def test_admin_can_get_return_request_detail_before_and_after_completion(client):
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
    assert create_response.status_code == 201
    order_payload = create_response.json()
    order_id = order_payload["borrow_order"]["id"]
    copy_id = order_payload["borrow_order"]["assigned_copy_id"]

    worker = RobotAutoProgressWorker()
    for _ in range(5):
        progressed = worker.tick()
        assert progressed >= 1

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "Admin detail check"},
    )
    assert return_response.status_code == 201
    return_request_id = return_response.json()["return_request"]["id"]

    detail_response = client.get(
        f"/api/v1/admin/return-requests/{return_request_id}",
        headers=admin_headers(state["admin"].id),
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["return_request"]["id"] == return_request_id
    assert detail["return_request"]["status"] == "created"
    assert detail["order"]["borrow_order"]["id"] == order_id
    assert detail["order"]["borrow_order"]["status"] == "completed"
    assert detail["copy"]["id"] == copy_id
    assert detail["copy"]["inventory_status"] == "borrowed"
    assert detail["slot"] is None

    complete_response = client.post(
        f"/api/v1/admin/return-requests/{return_request_id}/complete",
        headers=admin_headers(state["admin"].id),
    )
    assert complete_response.status_code == 200

    completed_detail_response = client.get(
        f"/api/v1/admin/return-requests/{return_request_id}",
        headers=admin_headers(state["admin"].id),
    )
    assert completed_detail_response.status_code == 200
    completed_detail = completed_detail_response.json()
    assert completed_detail["return_request"]["status"] == "completed"
    assert completed_detail["order"]["borrow_order"]["status"] == "returned"
    assert completed_detail["copy"]["id"] == copy_id
    assert completed_detail["copy"]["inventory_status"] == "stored"
    assert completed_detail["slot"]["status"] == "occupied"
    assert completed_detail["slot"]["current_copy_id"] == copy_id


def test_admin_get_return_request_detail_returns_404_for_missing_request(client):
    clear_broker_history()
    state = seed_state()

    response = client.get(
        "/api/v1/admin/return-requests/99999",
        headers=admin_headers(state["admin"].id),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "return_request_not_found"


def test_reader_can_list_and_get_own_return_requests(client):
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
    assert create_response.status_code == 201
    order_id = create_response.json()["borrow_order"]["id"]

    worker = RobotAutoProgressWorker()
    for _ in range(5):
        progressed = worker.tick()
        assert progressed >= 1

    return_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/return-requests",
        headers=reader_headers(state["profile"].id),
        json={"note": "Reader list/detail check"},
    )
    assert return_response.status_code == 201
    return_request_id = return_response.json()["return_request"]["id"]

    list_response = client.get(
        "/api/v1/orders/return-requests",
        headers=reader_headers(state["profile"].id),
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == return_request_id
    assert items[0]["borrow_order_id"] == order_id
    assert items[0]["reader_id"] == state["profile"].id
    assert items[0]["borrow_order_status"] == "completed"

    detail_response = client.get(
        f"/api/v1/orders/return-requests/{return_request_id}",
        headers=reader_headers(state["profile"].id),
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["return_request"]["id"] == return_request_id
    assert detail["order"]["borrow_order"]["id"] == order_id
    assert detail["order"]["borrow_order"]["status"] == "completed"

    session = get_session_factory()()
    try:
        second_reader = ReaderAccount(
            username="reader-return-detail-two",
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

    forbidden_response = client.get(
        f"/api/v1/orders/return-requests/{return_request_id}",
        headers=reader_headers(second_profile.id),
    )
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["error"]["code"] == "return_request_forbidden"


def test_reader_can_list_and_filter_own_borrow_orders(client):
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
    assert create_response.status_code == 201
    active_order_id = create_response.json()["borrow_order"]["id"]

    session = get_session_factory()()
    try:
        second_reader = ReaderAccount(
            username="reader-list-two",
            password_hash=hash_password("reader-two-password"),
        )
        session.add(second_reader)
        session.flush()
        second_profile = ReaderProfile(
            account_id=second_reader.id,
            display_name="Bob",
            affiliation_type="student",
            college="Math",
            major="Statistics",
            grade_year="2027",
        )
        session.add(second_profile)
        session.flush()

        returned_order = BorrowOrder(
            reader_id=state["profile"].id,
            book_id=state["book"].id,
            order_mode="cabinet_pickup",
            status="returned",
        )
        other_order = BorrowOrder(
            reader_id=second_profile.id,
            book_id=state["book"].id,
            order_mode="cabinet_pickup",
            status="awaiting_pick",
        )
        session.add_all([returned_order, other_order])
        session.commit()
        returned_order_id = returned_order.id
    finally:
        session.close()

    list_response = client.get(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
    )
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert {item["borrow_order"]["id"] for item in items} == {active_order_id, returned_order_id}

    active_only_response = client.get(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        params={"active_only": True},
    )
    assert active_only_response.status_code == 200
    active_items = active_only_response.json()["items"]
    assert [item["borrow_order"]["id"] for item in active_items] == [active_order_id]

    returned_response = client.get(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        params={"status": "returned"},
    )
    assert returned_response.status_code == 200
    returned_items = returned_response.json()["items"]
    assert [item["borrow_order"]["id"] for item in returned_items] == [returned_order_id]


def test_reader_can_get_own_order_detail_and_is_forbidden_from_other_readers_order(client):
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
    assert create_response.status_code == 201
    own_order_id = create_response.json()["borrow_order"]["id"]

    session = get_session_factory()()
    try:
        second_reader = ReaderAccount(
            username="reader-detail-two",
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
        session.flush()
        other_order = BorrowOrder(
            reader_id=second_profile.id,
            book_id=state["book"].id,
            order_mode="cabinet_pickup",
            status="awaiting_pick",
        )
        session.add(other_order)
        session.commit()
        other_order_id = other_order.id
    finally:
        session.close()

    detail_response = client.get(
        f"/api/v1/orders/borrow-orders/{own_order_id}",
        headers=reader_headers(state["profile"].id),
    )
    assert detail_response.status_code == 200
    detail = detail_response.json()
    assert detail["borrow_order"]["id"] == own_order_id
    assert detail["borrow_order"]["reader_id"] == state["profile"].id

    forbidden_response = client.get(
        f"/api/v1/orders/borrow-orders/{other_order_id}",
        headers=reader_headers(state["profile"].id),
    )
    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["error"]["code"] == "borrow_order_forbidden"


def test_reader_can_cancel_fresh_robot_delivery_order_and_restore_inventory(client):
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
    assert create_response.status_code == 201
    payload = create_response.json()
    order_id = payload["borrow_order"]["id"]
    copy_id = payload["borrow_order"]["assigned_copy_id"]

    cancel_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/cancel",
        headers=reader_headers(state["profile"].id),
    )
    assert cancel_response.status_code == 200
    cancelled = cancel_response.json()
    assert cancelled["borrow_order"]["status"] == "cancelled"
    assert cancelled["delivery_order"]["status"] == "cancelled"
    assert cancelled["robot_task"]["status"] == "cancelled"
    assert cancelled["robot_unit"]["status"] == "idle"

    session = get_session_factory()()
    try:
        copy = session.get(BookCopy, copy_id)
        stock = session.query(BookStock).filter_by(book_id=state["book"].id, cabinet_id="cabinet-001").one()
        slot = session.query(CabinetSlot).filter_by(current_copy_id=copy_id).one()
        assert copy.inventory_status == "stored"
        assert stock.available_copies == 1
        assert stock.reserved_copies == 0
        assert slot.status == "occupied"
    finally:
        session.close()

    active_orders_response = client.get(
        "/api/v1/orders/borrow-orders",
        headers=reader_headers(state["profile"].id),
        params={"active_only": True},
    )
    assert active_orders_response.status_code == 200
    assert active_orders_response.json()["items"] == []

    overview_response = client.get(
        "/api/v1/readers/me/overview",
        headers=reader_headers(state["profile"].id),
    )
    assert overview_response.status_code == 200
    assert overview_response.json()["overview"]["stats"]["active_orders_count"] == 0


def test_reader_cannot_cancel_progressed_robot_delivery_order(client):
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
    assert create_response.status_code == 201
    order_id = create_response.json()["borrow_order"]["id"]

    tick_response = client.post(
        f"/api/v1/robot-sim/orders/{order_id}/tick",
        headers=admin_headers(state["admin"].id),
        json={"steps": 1},
    )
    assert tick_response.status_code == 200

    cancel_response = client.post(
        f"/api/v1/orders/borrow-orders/{order_id}/cancel",
        headers=reader_headers(state["profile"].id),
    )
    assert cancel_response.status_code == 409
    assert cancel_response.json()["error"]["code"] == "borrow_order_not_cancellable"


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


def test_robot_sim_tick_endpoint_progresses_order_to_completion(client):
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
    assert create_response.status_code == 201
    payload = create_response.json()
    order_id = payload["borrow_order"]["id"]

    tick_response = client.post(
        "/api/v1/robot-sim/tick",
        headers=admin_headers(state["admin"].id),
        json={"steps": 5},
    )

    assert tick_response.status_code == 200
    tick_payload = tick_response.json()
    assert tick_payload["ok"] is True
    assert tick_payload["requested_steps"] == 5
    assert tick_payload["executed_steps"] == 5
    assert tick_payload["total_progressed_orders"] == 5
    assert [item["progressed_orders"] for item in tick_payload["steps"]] == [1, 1, 1, 1, 1]
    assert tick_payload["items"][0]["borrow_order"]["id"] == order_id
    assert tick_payload["items"][0]["borrow_order"]["status"] == "completed"
    assert tick_payload["items"][0]["delivery_order"]["status"] == "completed"
    assert tick_payload["items"][0]["robot_task"]["status"] == "completed"
    assert tick_payload["items"][0]["robot_unit"]["status"] == "idle"


def test_robot_sim_tick_endpoint_requires_admin(client):
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
    assert create_response.status_code == 201

    tick_response = client.post(
        "/api/v1/robot-sim/tick",
        headers=reader_headers(state["profile"].id),
        json={"steps": 1},
    )

    assert tick_response.status_code == 403


def test_robot_sim_single_order_tick_endpoint_progresses_target_order(client):
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
    assert create_response.status_code == 201
    order_id = create_response.json()["borrow_order"]["id"]

    tick_response = client.post(
        f"/api/v1/robot-sim/orders/{order_id}/tick",
        headers=admin_headers(state["admin"].id),
        json={"steps": 2},
    )

    assert tick_response.status_code == 200
    payload = tick_response.json()
    assert payload["ok"] is True
    assert payload["borrow_order_id"] == order_id
    assert payload["requested_steps"] == 2
    assert payload["executed_steps"] == 2
    assert payload["progressed_steps"] == 2
    assert [item["borrow_status"] for item in payload["steps"]] == ["awaiting_pick", "picked_from_cabinet"]
    assert [item["delivery_status"] for item in payload["steps"]] == ["picked_from_cabinet", "delivering"]
    assert payload["item"]["borrow_order"]["status"] == "picked_from_cabinet"
    assert payload["item"]["delivery_order"]["status"] == "delivering"
    assert payload["item"]["robot_task"]["status"] == "arriving"
    assert payload["item"]["robot_unit"]["status"] == "arriving"


def test_robot_sim_single_order_tick_endpoint_returns_404_for_missing_order(client):
    clear_broker_history()
    state = seed_state()

    tick_response = client.post(
        "/api/v1/robot-sim/orders/99999/tick",
        headers=admin_headers(state["admin"].id),
        json={"steps": 1},
    )

    assert tick_response.status_code == 404
    assert tick_response.json()["error"]["code"] == "borrow_order_not_found"
