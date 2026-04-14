from __future__ import annotations

from sqlalchemy import func, select

from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.database import get_session_factory
from app.core.security import verify_password
from app.demo_seed import seed_demo_data
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.orders.models import BorrowOrder, OrderFulfillment, ReturnRequest
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit
from app.tutor.models import TutorProfile


def _count(session, model) -> int:
    return int(session.execute(select(func.count()).select_from(model)).scalar_one())


def test_seed_demo_data_populates_all_main_entities(app):
    with get_session_factory()() as session:
        summary = seed_demo_data(session)

        assert summary == {
            "admins": 1,
            "readers": 12,
            "books": 24,
            "cabinets": 4,
            "copies": 40,
            "slots": 32,
            "orders": 36,
            "fulfillments": 11,
            "robot_tasks": 11,
            "robot_events": 28,
            "inventory_events": 24,
            "recommendations": 24,
            "conversations": 12,
            "messages": 32,
            "search_logs": 28,
            "reading_events": 36,
        }

        assert _count(session, AdminAccount) == 1
        assert _count(session, ReaderAccount) == 12
        assert _count(session, ReaderProfile) == 12
        assert _count(session, Book) == 24
        assert _count(session, Cabinet) == 4
        assert _count(session, BookCopy) == 40
        assert _count(session, BookStock) == 24
        assert _count(session, CabinetSlot) == 32
        assert _count(session, InventoryEvent) == 24
        assert _count(session, BorrowOrder) == 36
        assert _count(session, OrderFulfillment) == 11
        assert _count(session, ReturnRequest) == 7
        assert _count(session, RobotUnit) == 3
        assert _count(session, RobotTask) == 11
        assert _count(session, RobotStatusEvent) == 28
        assert _count(session, RecommendationLog) == 24
        assert _count(session, SearchLog) == 28
        assert _count(session, ConversationSession) == 12
        assert _count(session, ConversationMessage) == 32
        assert _count(session, ReadingEvent) == 36
        assert _count(session, AdminActionLog) == 1

        admin = session.scalar(select(AdminAccount).where(AdminAccount.username == "admin"))
        assert admin is not None
        assert verify_password("admin123", admin.password_hash)


def test_seed_demo_data_is_repeatable_without_duplicate_growth(app):
    with get_session_factory()() as session:
        first = seed_demo_data(session)
        second = seed_demo_data(session)

        assert first == second
        assert _count(session, AdminAccount) == 1
        assert _count(session, ReaderProfile) == 12
        assert _count(session, Book) == 24
        assert _count(session, BorrowOrder) == 36


def test_seed_demo_data_clears_tutor_records_before_reset(app):
    with get_session_factory()() as session:
        seed_demo_data(session)

        profile = TutorProfile(
            reader_id=1,
            source_type="book",
            book_id=1,
            title="待清理导学本",
            status="ready",
        )
        session.add(profile)
        session.commit()

        assert _count(session, TutorProfile) == 1

        seed_demo_data(session)

        assert _count(session, TutorProfile) == 0


def test_seeded_admin_can_log_in_and_fetch_orders(client):
    with get_session_factory()() as session:
        seed_demo_data(session)

    login_response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin", "password": "admin123", "role": "admin"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]

    orders_response = client.get(
        "/api/v1/admin/orders",
        headers={"Authorization": f"Bearer {token}"},
        params={"page": 2, "page_size": 10},
    )
    assert orders_response.status_code == 200
    payload = orders_response.json()
    assert payload["total"] == 36
    assert payload["page"] == 2
    assert payload["page_size"] == 10
    assert len(payload["items"]) == 10

    filtered_response = client.get(
        "/api/v1/admin/orders",
        headers={"Authorization": f"Bearer {token}"},
        params={"status": payload["items"][0]["order"]["status"], "page": 1, "page_size": 100},
    )
    assert filtered_response.status_code == 200
    filtered_payload = filtered_response.json()
    assert filtered_payload["page"] == 1
    assert filtered_payload["page_size"] == 100
    assert filtered_payload["total"] >= len(filtered_payload["items"]) >= 1
    assert all(item["order"]["status"] == payload["items"][0]["order"]["status"] for item in filtered_payload["items"])
