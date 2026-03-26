from __future__ import annotations

from datetime import timedelta

from app.admin.models import TopicBooklist, TopicBooklistItem
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot
from app.orders.models import BorrowOrder, DeliveryOrder
from app.readers.models import ReaderAccount, ReaderProfile


def reader_headers(account_id: int, profile_id: int) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_reader_experience_state() -> dict[str, int]:
    session = get_session_factory()()
    try:
        primary_account = ReaderAccount(
            username="reader-home",
            password_hash=hash_password("reader-pass"),
        )
        peer_account = ReaderAccount(
            username="reader-peer",
            password_hash=hash_password("peer-pass"),
        )
        session.add_all([primary_account, peer_account])
        session.flush()

        primary_profile = ReaderProfile(
            account_id=primary_account.id,
            display_name="Alice",
            affiliation_type="student",
            college="信息学院",
            major="人工智能",
            grade_year="2026",
            interest_tags=["AI", "考试复习"],
            reading_profile_summary="偏好课程配套和快速补强材料。",
        )
        peer_profile = ReaderProfile(
            account_id=peer_account.id,
            display_name="Bob",
            affiliation_type="student",
            college="信息学院",
            major="人工智能",
            grade_year="2026",
        )
        session.add_all([primary_profile, peer_profile])
        session.flush()

        books = [
            Book(
                title="机器学习导论",
                author="周老师",
                category="AI",
                keywords="machine learning,ai,exam",
                summary="适合考前梳理概念。",
            ),
            Book(
                title="深度学习实战",
                author="李老师",
                category="AI",
                keywords="deep learning,ai,lab",
                summary="适合项目实践和模型训练。",
            ),
            Book(
                title="推荐系统实践",
                author="项亮",
                category="AI",
                keywords="recommendation,ai,ranking",
                summary="适合做推荐课程专题阅读。",
            ),
            Book(
                title="概率论速读",
                author="王老师",
                category="Math",
                keywords="probability,exam,math",
                summary="适合在考前快速复习。",
            ),
        ]
        session.add_all(books)
        session.flush()

        cabinet = session.get(Cabinet, "cabinet-001")
        assert cabinet is not None

        copy_ids: list[int] = []
        slots = []
        for index, book in enumerate(books, start=1):
            copy = BookCopy(book_id=book.id, cabinet_id=cabinet.id, inventory_status="stored")
            session.add(copy)
            session.flush()
            copy_ids.append(copy.id)
            session.add(
                BookStock(
                    book_id=book.id,
                    cabinet_id=cabinet.id,
                    total_copies=1,
                    available_copies=1,
                    reserved_copies=0,
                )
            )
            slots.append(
                CabinetSlot(
                    cabinet_id=cabinet.id,
                    slot_code=f"A0{index}",
                    status="occupied",
                    current_copy_id=copy.id,
                )
            )
        session.add_all(slots)
        session.flush()

        active_order = BorrowOrder(
            reader_id=primary_profile.id,
            book_id=books[0].id,
            assigned_copy_id=copy_ids[0],
            order_mode="robot_delivery",
            status="delivered",
            due_at=utc_now() + timedelta(days=2),
            delivered_at=utc_now(),
        )
        history_order = BorrowOrder(
            reader_id=primary_profile.id,
            book_id=books[1].id,
            assigned_copy_id=copy_ids[1],
            order_mode="cabinet_pickup",
            status="returned",
            due_at=utc_now() - timedelta(days=5),
            completed_at=utc_now() - timedelta(days=4),
        )
        peer_order_a = BorrowOrder(
            reader_id=peer_profile.id,
            book_id=books[0].id,
            assigned_copy_id=copy_ids[0],
            order_mode="cabinet_pickup",
            status="completed",
            completed_at=utc_now() - timedelta(days=1),
        )
        peer_order_b = BorrowOrder(
            reader_id=peer_profile.id,
            book_id=books[2].id,
            assigned_copy_id=copy_ids[2],
            order_mode="cabinet_pickup",
            status="completed",
            completed_at=utc_now() - timedelta(days=1),
        )
        session.add_all([active_order, history_order, peer_order_a, peer_order_b])
        session.flush()

        session.add(
            DeliveryOrder(
                borrow_order_id=active_order.id,
                delivery_target="阅览室 A12",
                eta_minutes=12,
                status="delivered",
                completed_at=utc_now(),
            )
        )

        topic_booklist = TopicBooklist(
            slug="ai-exam-zone",
            title="AI 考试专区",
            description="适合考试周快速补强的主题书单。",
            status="active",
        )
        session.add(topic_booklist)
        session.flush()
        session.add_all(
            [
                TopicBooklistItem(topic_booklist_id=topic_booklist.id, book_id=books[2].id, rank_position=1),
                TopicBooklistItem(topic_booklist_id=topic_booklist.id, book_id=books[3].id, rank_position=2),
            ]
        )
        session.commit()
        return {
            "account_id": primary_account.id,
            "profile_id": primary_profile.id,
            "active_order_id": active_order.id,
            "source_book_id": books[0].id,
            "favorite_book_id": books[2].id,
            "secondary_book_id": books[3].id,
        }
    finally:
        session.close()


def test_reader_home_feed_related_notifications_and_achievements(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])

    feed_response = client.get("/api/v1/recommendation/home-feed", headers=headers)
    assert feed_response.status_code == 200
    feed_payload = feed_response.json()
    assert feed_payload["today_recommendations"]
    assert feed_payload["exam_zone"]
    assert feed_payload["system_booklists"]
    assert feed_payload["quick_actions"]

    related_response = client.get(f"/api/v1/catalog/books/{state['source_book_id']}/related", headers=headers)
    assert related_response.status_code == 200
    assert related_response.json()["items"]

    notifications_response = client.get("/api/v1/notifications", headers=headers)
    assert notifications_response.status_code == 200
    assert notifications_response.json()["items"]

    achievements_response = client.get("/api/v1/achievements/me", headers=headers)
    assert achievements_response.status_code == 200
    achievements = achievements_response.json()
    assert achievements["summary"]["completed_orders"] >= 1
    assert achievements["current_points"] > 0


def test_reader_order_favorites_and_booklists_flow(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])

    active_response = client.get("/api/v1/orders/me/active", headers=headers)
    assert active_response.status_code == 200
    active_items = active_response.json()["items"]
    assert len(active_items) == 1
    assert active_items[0]["book"]["id"] == state["source_book_id"]
    assert active_items[0]["renewable"] is True

    history_response = client.get("/api/v1/orders/me/history", headers=headers)
    assert history_response.status_code == 200
    history_items = history_response.json()["items"]
    assert len(history_items) == 1

    renew_response = client.post(
        f"/api/v1/orders/borrow-orders/{state['active_order_id']}/renew",
        headers=headers,
    )
    assert renew_response.status_code == 200
    assert renew_response.json()["renewable"] is False

    create_favorite_response = client.post(
        "/api/v1/favorites/books",
        headers=headers,
        json={"book_id": state["favorite_book_id"]},
    )
    assert create_favorite_response.status_code == 201

    list_favorites_response = client.get("/api/v1/favorites/books", headers=headers)
    assert list_favorites_response.status_code == 200
    favorite_items = list_favorites_response.json()["items"]
    assert len(favorite_items) == 1
    assert favorite_items[0]["book"]["id"] == state["favorite_book_id"]

    delete_favorite_response = client.request(
        "DELETE",
        "/api/v1/favorites/books",
        headers=headers,
        json={"book_id": state["favorite_book_id"]},
    )
    assert delete_favorite_response.status_code == 200

    create_booklist_response = client.post(
        "/api/v1/booklists",
        headers=headers,
        json={
            "title": "稍后阅读",
            "description": "下周继续读。",
            "book_ids": [state["favorite_book_id"], state["secondary_book_id"]],
        },
    )
    assert create_booklist_response.status_code == 201

    list_booklists_response = client.get("/api/v1/booklists", headers=headers)
    assert list_booklists_response.status_code == 200
    payload = list_booklists_response.json()
    assert len(payload["custom_items"]) == 1
    assert payload["custom_items"][0]["books"]
    assert payload["system_items"]
