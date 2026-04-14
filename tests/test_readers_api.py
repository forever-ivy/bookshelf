from __future__ import annotations

from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount
from app.catalog.models import Book
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.orders.models import BorrowOrder, OrderFulfillment
from app.recommendation.models import RecommendationLog
from app.readers.models import ReaderAccount, ReaderProfile


def auth_headers(role: str, account_id: int, profile_id: int | None = None) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role=role, profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_reader() -> dict[str, int]:
    with get_session_factory()() as session:
        account = ReaderAccount(
            username="reader-profile",
            password_hash=hash_password("reader-profile-pass"),
        )
        session.add(account)
        session.flush()
        profile = ReaderProfile(
            account_id=account.id,
            display_name="张三",
            affiliation_type="student",
            college="计算机学院",
            major="人工智能",
            grade_year="2023",
        )
        session.add(profile)
        session.commit()
        return {"account_id": account.id, "profile_id": profile.id}


def seed_reader_hub_state() -> dict[str, int]:
    with get_session_factory()() as session:
        admin = AdminAccount(username="admin-readers", password_hash=hash_password("admin-pass"))
        reader_account = ReaderAccount(username="reader-hub", password_hash=hash_password("reader-pass"))
        other_account = ReaderAccount(username="reader-other", password_hash=hash_password("other-pass"))
        session.add_all([admin, reader_account, other_account])
        session.flush()

        profile = ReaderProfile(
            account_id=reader_account.id,
            display_name="李四",
            affiliation_type="student",
            college="信息学院",
            major="数据科学",
            grade_year="2022",
        )
        other_profile = ReaderProfile(
            account_id=other_account.id,
            display_name="王五",
            affiliation_type="teacher",
            college="文学院",
            major="中文",
            grade_year="教师",
        )
        session.add_all([profile, other_profile])
        session.flush()

        book1 = Book(title="数据库系统概论", author="王珊", category="计算机")
        book2 = Book(title="推荐系统实践", author="项亮", category="人工智能")
        session.add_all([book1, book2])
        session.flush()

        active_order = BorrowOrder(
            reader_id=profile.id,
            book_id=book1.id,
            order_mode="robot_delivery",
            status="delivering",
        )
        returned_order = BorrowOrder(
            reader_id=profile.id,
            book_id=book2.id,
            order_mode="cabinet_pickup",
            status="returned",
        )
        other_order = BorrowOrder(
            reader_id=other_profile.id,
            book_id=book2.id,
            order_mode="cabinet_pickup",
            status="awaiting_pick",
        )
        session.add_all([active_order, returned_order, other_order])
        session.flush()

        session.add(
            OrderFulfillment(
                borrow_order_id=active_order.id,
                mode="robot_delivery",
                delivery_target="A-201",
                status="delivering",
            )
        )

        conversation = ConversationSession(reader_id=profile.id, status="active")
        session.add(conversation)
        session.flush()
        session.add_all(
            [
                ConversationMessage(session_id=conversation.id, role="user", content="推荐一本机器学习入门书"),
                ConversationMessage(session_id=conversation.id, role="assistant", content="可以看看《推荐系统实践》"),
            ]
        )

        session.add_all(
            [
                SearchLog(reader_id=profile.id, query_text="机器学习 入门", query_mode="natural_language"),
                SearchLog(reader_id=profile.id, query_text="数据库", query_mode="keyword"),
                RecommendationLog(
                    reader_id=profile.id,
                    book_id=book2.id,
                    query_text="机器学习 入门",
                    result_title=book2.title,
                    rank_position=1,
                    score=9.5,
                    provider_note="fallback",
                    explanation="与用户问题主题接近",
                    evidence_json={"matched_fields": ["category", "summary"]},
                ),
                ReadingEvent(
                    reader_id=profile.id,
                    event_type="conversation_message_created",
                    metadata_json={"session_id": conversation.id},
                ),
            ]
        )
        session.commit()
        return {
            "admin_id": admin.id,
            "reader_account_id": reader_account.id,
            "reader_profile_id": profile.id,
            "other_account_id": other_account.id,
            "other_profile_id": other_profile.id,
            "book1_id": book1.id,
            "book2_id": book2.id,
            "active_order_id": active_order.id,
            "conversation_id": conversation.id,
        }


def test_reader_can_get_own_profile(client):
    ids = seed_reader()

    response = client.get(
        "/api/v1/readers/me/profile",
        headers=auth_headers("reader", ids["account_id"], ids["profile_id"]),
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["profile"]["id"] == ids["profile_id"]
    assert payload["profile"]["display_name"] == "张三"
    assert payload["profile"]["college"] == "计算机学院"
    assert payload["profile"]["interest_tags"] == []
    assert payload["profile"]["reading_profile_summary"] is None


def test_reader_can_update_own_profile(client):
    state = seed_reader_hub_state()

    response = client.patch(
        "/api/v1/readers/me/profile",
        headers=auth_headers("reader", state["reader_account_id"], state["reader_profile_id"]),
        json={
            "display_name": "李四同学",
            "major": "智能科学与技术",
            "interest_tags": ["AI", "机器人"],
            "reading_profile_summary": "偏好先看案例，再补理论。",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["profile"]["display_name"] == "李四同学"
    assert payload["profile"]["major"] == "智能科学与技术"
    assert payload["profile"]["interest_tags"] == ["AI", "机器人"]
    assert payload["profile"]["reading_profile_summary"] == "偏好先看案例，再补理论。"


def test_reader_can_get_own_overview_and_orders(client):
    state = seed_reader_hub_state()
    headers = auth_headers("reader", state["reader_account_id"], state["reader_profile_id"])

    overview_response = client.get("/api/v1/readers/me/overview", headers=headers)
    assert overview_response.status_code == 200
    overview = overview_response.json()["overview"]
    assert overview["profile"]["id"] == state["reader_profile_id"]
    assert overview["stats"]["active_orders_count"] == 1
    assert overview["stats"]["borrow_history_count"] == 2
    assert "机器学习 入门" in overview["recent_queries"]
    assert overview["recent_conversations"][0]["id"] == state["conversation_id"]

    orders_response = client.get("/api/v1/readers/me/orders", headers=headers)
    assert orders_response.status_code == 200
    items = orders_response.json()["items"]
    assert len(items) == 2
    assert items[0]["order"]["readerId"] == state["reader_profile_id"]


def test_admin_can_list_readers_and_view_reader_resources(client):
    state = seed_reader_hub_state()
    headers = auth_headers("admin", state["admin_id"])

    list_response = client.get("/api/v1/readers", headers=headers)
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert any(item["id"] == state["reader_profile_id"] for item in items)

    detail_response = client.get(f"/api/v1/readers/{state['reader_profile_id']}", headers=headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["reader"]["display_name"] == "李四"

    overview_response = client.get(f"/api/v1/readers/{state['reader_profile_id']}/overview", headers=headers)
    assert overview_response.status_code == 200
    assert overview_response.json()["overview"]["stats"]["recommendation_count"] == 1

    conversations_response = client.get(
        f"/api/v1/readers/{state['reader_profile_id']}/conversations",
        headers=headers,
    )
    assert conversations_response.status_code == 200
    assert conversations_response.json()["items"][0]["id"] == state["conversation_id"]

    recommendations_response = client.get(
        f"/api/v1/readers/{state['reader_profile_id']}/recommendations",
        headers=headers,
    )
    assert recommendations_response.status_code == 200
    assert recommendations_response.json()["items"][0]["book_id"] == state["book2_id"]


def test_reader_cannot_access_admin_reader_routes(client):
    state = seed_reader_hub_state()

    response = client.get(
        f"/api/v1/readers/{state['reader_profile_id']}/overview",
        headers=auth_headers("reader", state["reader_account_id"], state["reader_profile_id"]),
    )

    assert response.status_code == 403
