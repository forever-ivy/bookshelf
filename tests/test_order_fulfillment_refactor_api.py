from __future__ import annotations

from app.auth.models import AdminAccount
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.inventory.models import BookCopy, Cabinet, CabinetSlot
from app.readers.models import ReaderAccount, ReaderProfile
from app.robot_sim.models import RobotUnit


def auth_headers(role: str, account_id: int, profile_id: int | None = None):
    token = create_token(
        AuthIdentity(account_id=account_id, role=role, profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def reader_headers(profile_id: int):
    session = get_session_factory()()
    try:
        reader = (
            session.query(ReaderAccount)
            .join(ReaderProfile, ReaderProfile.account_id == ReaderAccount.id)
            .filter(ReaderProfile.id == profile_id)
            .one()
        )
        return auth_headers("reader", reader.id, profile_id)
    finally:
        session.close()


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

        slot = CabinetSlot(cabinet_id=cabinet.id, slot_code="A01", status="occupied")
        session.add(slot)
        session.flush()

        copy = BookCopy(book_id=book.id, cabinet_id=cabinet.id, current_slot_id=slot.id, inventory_status="stored")
        session.add(copy)
        session.flush()
        session.commit()
        return {
            "admin": admin,
            "profile": profile,
            "book": book,
            "copy": copy,
            "slot": slot,
        }
    finally:
        session.close()


def test_reader_borrow_order_returns_refactored_fulfillment_bundle(client):
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
    assert "order" in payload
    assert "fulfillment" in payload
    assert "currentRobotTask" in payload
    assert "robotTaskHistory" in payload
    assert "inventorySnapshot" in payload
    assert "delivery_order" not in payload
    assert payload["order"]["requestedBookId"] == state["book"].id
    assert payload["order"]["fulfilledCopyId"] == state["copy"].id
    assert payload["fulfillment"]["mode"] == "robot_delivery"
    assert payload["fulfillment"]["status"] == "awaiting_pick"
    assert payload["currentRobotTask"]["status"] == "assigned"
    assert payload["robotTaskHistory"][0]["isCurrent"] is True
    assert payload["inventorySnapshot"]["slotCode"] == "A01"
    assert payload["inventorySnapshot"]["copyStatus"] == "reserved"


def test_take_by_text_requires_order_or_fulfillment_binding(client):
    response = client.post("/api/v1/inventory/take-by-text", json={"text": "帮我拿《Socratic Systems》"})

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "fulfillment_binding_required"
