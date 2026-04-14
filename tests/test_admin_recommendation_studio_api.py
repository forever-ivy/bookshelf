from __future__ import annotations

from datetime import timedelta

from app.admin.models import RecommendationPlacement, TopicBooklist, TopicBooklistItem
from app.auth.models import AdminAccount
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile
from app.system.models import SystemSetting


def admin_headers(account_id: int) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="admin", profile_id=None),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def reader_headers(account_id: int, profile_id: int) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="reader", profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_recommendation_studio_state() -> dict[str, int]:
    session = get_session_factory()()
    try:
        admin = AdminAccount(username="studio-admin", password_hash=hash_password("studio-admin"))
        reader_account = ReaderAccount(username="studio-reader", password_hash=hash_password("studio-reader"))
        session.add_all([admin, reader_account])
        session.flush()

        reader_profile = ReaderProfile(
            account_id=reader_account.id,
            display_name="策划读者",
            affiliation_type="student",
            college="信息学院",
            major="人工智能",
            grade_year="2026",
            interest_tags=["AI", "考试"],
        )
        session.add(reader_profile)
        session.flush()

        books = [
            Book(title="智能系统设计", author="程墨", category="人工智能", keywords="ai,system", summary="系统设计入门"),
            Book(title="推荐系统实践", author="项亮", category="人工智能", keywords="recommendation,ranking", summary="推荐课程常用参考"),
            Book(title="机器人系统调度", author="乔远", category="人工智能", keywords="robot,schedule", summary="适合系统与调度专题"),
            Book(title="概率论速读", author="王老师", category="数学", keywords="probability,exam", summary="适合考试周快速复习"),
            Book(title="数据库系统导论", author="李明", category="计算机", keywords="database,system", summary="系统课程基础书"),
            Book(title="算法复习手册", author="沈言", category="计算机", keywords="algorithm,exam", summary="面向考试冲刺"),
        ]
        session.add_all(books)
        session.flush()

        cabinet = session.get(Cabinet, "cabinet-001")
        assert cabinet is not None

        for index, book in enumerate(books, start=1):
            copy = BookCopy(book_id=book.id, inventory_status="stored")
            session.add(copy)
            session.flush()
            slot = CabinetSlot(
                cabinet_id=cabinet.id,
                slot_code=f"S{index:02d}",
                status="occupied",
            )
            session.add(slot)
            session.flush()
            copy.current_slot_id = slot.id
            session.add(
                BookStock(
                    book_id=book.id,
                    cabinet_id=cabinet.id,
                    total_copies=1,
                    available_copies=1,
                    reserved_copies=0,
                )
            )

        now = utc_now()
        session.add_all(
            [
                BorrowOrder(
                    reader_id=reader_profile.id,
                    book_id=books[0].id,
                    order_mode="cabinet_pickup",
                    status="completed",
                    completed_at=now - timedelta(days=4),
                ),
                BorrowOrder(
                    reader_id=reader_profile.id,
                    book_id=books[2].id,
                    order_mode="cabinet_pickup",
                    status="completed",
                    completed_at=now - timedelta(days=2),
                ),
            ]
        )

        ai_exam_topic = TopicBooklist(
            slug="ai-exam",
            title="AI 考试专区",
            description="适合考试周快速补强的 AI 主题书单。",
            status="active",
        )
        ops_topic = TopicBooklist(
            slug="system-course",
            title="系统课程专题",
            description="系统设计与数据库课程延伸阅读。",
            status="active",
        )
        aux_topic = TopicBooklist(
            slug="algorithm-review",
            title="算法复习",
            description="适合刷题前查漏补缺。",
            status="active",
        )
        session.add_all([ai_exam_topic, ops_topic, aux_topic])
        session.flush()
        session.add_all(
            [
                TopicBooklistItem(topic_booklist_id=ai_exam_topic.id, book_id=books[1].id, rank_position=1),
                TopicBooklistItem(topic_booklist_id=ai_exam_topic.id, book_id=books[3].id, rank_position=2),
                TopicBooklistItem(topic_booklist_id=ops_topic.id, book_id=books[0].id, rank_position=1),
                TopicBooklistItem(topic_booklist_id=ops_topic.id, book_id=books[4].id, rank_position=2),
                TopicBooklistItem(topic_booklist_id=aux_topic.id, book_id=books[5].id, rank_position=1),
            ]
        )
        session.commit()
        return {
            "admin_id": admin.id,
            "reader_account_id": reader_account.id,
            "reader_profile_id": reader_profile.id,
            "book_a": books[0].id,
            "book_b": books[1].id,
            "book_c": books[2].id,
            "book_d": books[3].id,
            "book_e": books[4].id,
            "book_f": books[5].id,
            "topic_a": ai_exam_topic.id,
            "topic_b": ops_topic.id,
            "topic_c": aux_topic.id,
        }
    finally:
        session.close()


def build_studio_draft_payload(state: dict[str, int]) -> dict:
    return {
        "today_recommendations": [
            {
                "book_id": state["book_a"],
                "custom_explanation": "本周重点推荐，适合系统设计课同学先看。",
                "source": "manual_review",
                "rank": 1,
            },
            {
                "book_id": state["book_b"],
                "custom_explanation": "推荐系统专题的核心参考书。",
                "source": "manual_review",
                "rank": 2,
            },
            {
                "book_id": state["book_c"],
                "custom_explanation": "适合继续追读调度与系统方向。",
                "source": "manual_review",
                "rank": 3,
            },
        ],
        "exam_zone": [
            {
                "book_id": state["book_d"],
                "custom_explanation": "考前快速补概率基础。",
                "source": "manual_review",
                "rank": 1,
            },
            {
                "book_id": state["book_e"],
                "custom_explanation": "数据库课程考试常见基础书。",
                "source": "manual_review",
                "rank": 2,
            },
            {
                "book_id": state["book_f"],
                "custom_explanation": "适合算法考试前做冲刺复习。",
                "source": "manual_review",
                "rank": 3,
            },
        ],
        "hot_lists": [
            {"id": "popular-now", "title": "本周热门", "description": "近期馆内借阅最活跃的图书集合。"},
            {"id": "exam-focus", "title": "考试专区", "description": "适合考试周快速补强的主题内容。"},
            {"id": "reader-focus", "title": "与你相关", "description": "结合课程与阅读偏好精选。"},
        ],
        "system_booklists": [
            {"booklist_id": state["topic_a"], "rank": 1},
            {"booklist_id": state["topic_b"], "rank": 2},
            {"booklist_id": state["topic_c"], "rank": 3},
        ],
        "explanation_card": {
            "title": "为什么这些内容在这里",
            "body": "这一版推荐由管理员基于候选池审核发布，优先保证课程相关性和可借性。",
        },
        "placements": [
            {"code": "today_recommendations", "name": "今日推荐", "status": "active", "placement_type": "home_feed", "rank": 1},
            {"code": "exam_zone", "name": "考试专区", "status": "active", "placement_type": "home_feed", "rank": 2},
            {"code": "hot_lists", "name": "热门榜单", "status": "paused", "placement_type": "home_feed", "rank": 3},
            {"code": "system_booklists", "name": "系统书单", "status": "active", "placement_type": "home_feed", "rank": 4},
        ],
        "strategy_weights": {
            "content": 0.55,
            "behavior": 0.3,
            "freshness": 0.15,
        },
    }


def test_admin_recommendation_studio_supports_draft_preview_publish_and_history(client):
    state = seed_recommendation_studio_state()
    headers = admin_headers(state["admin_id"])

    studio_response = client.get("/api/v1/admin/recommendation/studio", headers=headers)
    assert studio_response.status_code == 200
    studio_payload = studio_response.json()
    assert studio_payload["live_publication"] is None
    assert len(studio_payload["draft"]["today_recommendations"]) == 3
    assert len(studio_payload["draft"]["exam_zone"]) == 3
    assert len(studio_payload["draft"]["placements"]) == 4
    assert studio_payload["draft"]["strategy_weights"]["content"] > 0
    assert len(studio_payload["candidates"]["today_recommendations"]) >= 3
    assert len(studio_payload["candidates"]["system_booklists"]) >= 3
    assert "signals" in studio_payload["candidates"]["today_recommendations"][0]
    assert len(studio_payload["preview_feed"]["today_recommendations"]) == 3
    assert len(studio_payload["preview_feed"]["hot_lists"]) == 3
    assert all(item["source"] == "system_generated" for item in studio_payload["preview_feed"]["quick_actions"])

    draft_payload = build_studio_draft_payload(state)
    save_response = client.put(
        "/api/v1/admin/recommendation/studio/draft",
        headers=headers,
        json=draft_payload,
    )
    assert save_response.status_code == 200
    saved_payload = save_response.json()
    assert saved_payload["draft"]["today_recommendations"][0]["book_id"] == state["book_a"]
    assert saved_payload["draft"]["placements"][2]["status"] == "paused"
    assert saved_payload["draft"]["strategy_weights"]["behavior"] == 0.3
    assert saved_payload["preview_feed"]["today_recommendations"][0]["title"] == "智能系统设计"
    assert saved_payload["preview_feed"]["explanation_card"]["title"] == "为什么这些内容在这里"
    assert saved_payload["preview_feed"]["hot_lists"] == []

    publish_response = client.post("/api/v1/admin/recommendation/studio/publish", headers=headers)
    assert publish_response.status_code == 200
    publish_payload = publish_response.json()
    assert publish_payload["publication"]["version"] == 1
    assert publish_payload["publication"]["published_by_username"] == "studio-admin"
    assert publish_payload["preview_feed"]["hot_lists"] == []

    publications_response = client.get("/api/v1/admin/recommendation/studio/publications", headers=headers)
    assert publications_response.status_code == 200
    assert publications_response.json()["items"][0]["version"] == 1

    session = get_session_factory()()
    try:
        placement_rows = {
            row.code: row
            for row in session.query(RecommendationPlacement).order_by(RecommendationPlacement.id.asc()).all()
        }
        assert placement_rows["hot_lists"].status == "paused"
        assert placement_rows["system_booklists"].config_json["rank"] == 4

        weights_setting = session.query(SystemSetting).filter(SystemSetting.setting_key == "recommendation.weights").one()
        assert weights_setting.value_json == {
            "behavior": 0.3,
            "content": 0.55,
            "freshness": 0.15,
        }
    finally:
        session.close()


def test_admin_recommendation_studio_rejects_cross_section_duplicate_books(client):
    state = seed_recommendation_studio_state()
    headers = admin_headers(state["admin_id"])
    duplicate_payload = build_studio_draft_payload(state)
    duplicate_payload["exam_zone"][0]["book_id"] = state["book_a"]

    response = client.put(
        "/api/v1/admin/recommendation/studio/draft",
        headers=headers,
        json=duplicate_payload,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "recommendation_studio_invalid"


def test_reader_home_feed_prefers_latest_published_recommendation_studio_snapshot(client):
    state = seed_recommendation_studio_state()
    admin = admin_headers(state["admin_id"])
    reader = reader_headers(state["reader_account_id"], state["reader_profile_id"])

    client.put(
        "/api/v1/admin/recommendation/studio/draft",
        headers=admin,
        json=build_studio_draft_payload(state),
    )
    client.post("/api/v1/admin/recommendation/studio/publish", headers=admin)

    response = client.get("/api/v1/recommendation/home-feed", headers=reader)

    assert response.status_code == 200
    payload = response.json()
    assert payload["today_recommendations"][0]["book_id"] == state["book_a"]
    assert payload["today_recommendations"][0]["explanation"] == "本周重点推荐，适合系统设计课同学先看。"
    assert payload["system_booklists"][0]["id"] == str(state["topic_a"])
    assert payload["explanation_card"]["title"] == "为什么这些内容在这里"
    assert payload["hot_lists"] == []
    assert payload["quick_actions"]
    assert all(item["source"] == "system_generated" for item in payload["quick_actions"])
