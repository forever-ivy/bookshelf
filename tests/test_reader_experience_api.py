from __future__ import annotations

from datetime import timedelta

from app.admin.models import TopicBooklist, TopicBooklistItem
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot
from app.orders.models import BorrowOrder, OrderFulfillment
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
            copy = BookCopy(book_id=book.id, inventory_status="stored")
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
                )
            )
        session.add_all(slots)
        session.flush()
        for slot, copy_id in zip(slots, copy_ids, strict=False):
            session.get(BookCopy, copy_id).current_slot_id = slot.id

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
            OrderFulfillment(
                borrow_order_id=active_order.id,
                mode="robot_delivery",
                source_cabinet_id=cabinet.id,
                source_slot_id=slots[0].id,
                delivery_target="阅览室 A12",
                status="delivered",
                delivered_at=utc_now(),
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


def test_reader_can_dismiss_notifications_persistently(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])
    notification_id = f"due-{state['active_order_id']}"

    initial_response = client.get("/api/v1/notifications", headers=headers)
    assert initial_response.status_code == 200
    assert any(item["id"] == notification_id for item in initial_response.json()["items"])

    dismiss_response = client.post(
        "/api/v1/notifications/dismissals",
        headers=headers,
        json={"notification_id": notification_id},
    )
    assert dismiss_response.status_code == 200
    assert dismiss_response.json() == {"notification_id": notification_id, "ok": True}

    refreshed_response = client.get("/api/v1/notifications", headers=headers)
    assert refreshed_response.status_code == 200
    assert all(item["id"] != notification_id for item in refreshed_response.json()["items"])


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


def test_reader_booklists_support_unique_watch_later_and_book_membership_updates(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])

    create_watch_later_response = client.post(
        "/api/v1/booklists",
        headers=headers,
        json={
            "title": "稍后再看",
            "description": "准备晚点读。",
            "book_ids": [state["favorite_book_id"]],
        },
    )
    assert create_watch_later_response.status_code == 201
    watch_later_payload = create_watch_later_response.json()
    assert watch_later_payload["title"] == "稍后再看"
    assert [item["id"] for item in watch_later_payload["books"]] == [state["favorite_book_id"]]

    duplicate_watch_later_response = client.post(
        "/api/v1/booklists",
        headers=headers,
        json={
            "title": "稍后再看",
            "description": "重复创建不应生成第二个。",
            "book_ids": [state["secondary_book_id"]],
        },
    )
    assert duplicate_watch_later_response.status_code == 201
    duplicate_watch_later_payload = duplicate_watch_later_response.json()
    assert duplicate_watch_later_payload["id"] == watch_later_payload["id"]
    assert [item["id"] for item in duplicate_watch_later_payload["books"]] == [
        state["favorite_book_id"],
        state["secondary_book_id"],
    ]

    add_book_response = client.post(
        f"/api/v1/booklists/{watch_later_payload['id']}/books",
        headers=headers,
        json={"book_id": state["source_book_id"]},
    )
    assert add_book_response.status_code == 200
    added_payload = add_book_response.json()
    assert [item["id"] for item in added_payload["books"]] == [
        state["favorite_book_id"],
        state["secondary_book_id"],
        state["source_book_id"],
    ]

    remove_book_response = client.request(
        "DELETE",
        f"/api/v1/booklists/{watch_later_payload['id']}/books",
        headers=headers,
        json={"book_id": state["secondary_book_id"]},
    )
    assert remove_book_response.status_code == 200
    removed_payload = remove_book_response.json()
    assert [item["id"] for item in removed_payload["books"]] == [
        state["favorite_book_id"],
        state["source_book_id"],
    ]

    list_booklists_response = client.get("/api/v1/booklists", headers=headers)
    assert list_booklists_response.status_code == 200
    payload = list_booklists_response.json()
    assert len(payload["custom_items"]) == 1
    assert payload["custom_items"][0]["title"] == "稍后再看"
    assert [item["id"] for item in payload["custom_items"][0]["books"]] == [
        state["favorite_book_id"],
        state["source_book_id"],
    ]


def test_reader_booklists_support_deleting_custom_booklists_but_not_watch_later(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])

    watch_later_response = client.post(
        "/api/v1/booklists",
        headers=headers,
        json={
            "title": "稍后再看",
            "description": "默认待读。",
            "book_ids": [state["favorite_book_id"]],
        },
    )
    assert watch_later_response.status_code == 201
    watch_later_payload = watch_later_response.json()

    custom_response = client.post(
        "/api/v1/booklists",
        headers=headers,
        json={
            "title": "毕业设计",
            "description": "论文相关。",
            "book_ids": [state["secondary_book_id"]],
        },
    )
    assert custom_response.status_code == 201
    custom_payload = custom_response.json()

    delete_custom_response = client.delete(f"/api/v1/booklists/{custom_payload['id']}", headers=headers)
    assert delete_custom_response.status_code == 200
    assert delete_custom_response.json() == {"ok": True}

    list_booklists_response = client.get("/api/v1/booklists", headers=headers)
    assert list_booklists_response.status_code == 200
    remaining_custom_items = list_booklists_response.json()["custom_items"]
    assert [item["title"] for item in remaining_custom_items] == ["稍后再看"]

    delete_watch_later_response = client.delete(f"/api/v1/booklists/{watch_later_payload['id']}", headers=headers)
    assert delete_watch_later_response.status_code == 403
    assert delete_watch_later_response.json()["error"]["code"] == "reader_booklist_protected"


def test_reader_favorites_support_server_side_query_and_category_filters(client):
    state = seed_reader_experience_state()
    headers = reader_headers(state["account_id"], state["profile_id"])

    client.post(
        "/api/v1/favorites/books",
        headers=headers,
        json={"book_id": state["favorite_book_id"]},
    )
    client.post(
        "/api/v1/favorites/books",
        headers=headers,
        json={"book_id": state["secondary_book_id"]},
    )

    category_response = client.get(
        "/api/v1/favorites/books",
        headers=headers,
        params={"category": "science-tech"},
    )
    assert category_response.status_code == 200
    category_items = category_response.json()["items"]
    assert [item["book"]["id"] for item in category_items] == [state["favorite_book_id"]]

    query_response = client.get(
        "/api/v1/favorites/books",
        headers=headers,
        params={"query": "概率"},
    )
    assert query_response.status_code == 200
    query_items = query_response.json()["items"]
    assert [item["book"]["id"] for item in query_items] == [state["secondary_book_id"]]

    combined_response = client.get(
        "/api/v1/favorites/books",
        headers=headers,
        params={"query": "推荐", "category": "science-tech"},
    )
    assert combined_response.status_code == 200
    combined_items = combined_response.json()["items"]
    assert [item["book"]["id"] for item in combined_items] == [state["favorite_book_id"]]
