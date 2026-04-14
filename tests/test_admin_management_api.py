from __future__ import annotations

from datetime import timedelta

from app.admin.models import (
    AdminPermission,
    AdminRole,
    AdminRoleAssignment,
    AdminRolePermission,
    AlertRecord,
    RecommendationPlacement,
    TopicBooklist,
    TopicBooklistItem,
)
from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book, BookCategory, BookTag, BookTagLink
from app.catalog.taxonomy import backfill_book_taxonomy
from app.core.config import get_settings
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.orders.models import BorrowOrder, DeliveryOrder
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.admin import service as admin_service
from app.robot_sim.models import RobotTask, RobotUnit
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


EMBEDDING_DIMENSION = 1536


def build_embedding_vector(primary_index: int, secondary_index: int | None = None) -> list[float]:
    vector = [0.0] * EMBEDDING_DIMENSION
    vector[primary_index] = 1.0
    if secondary_index is not None:
        vector[secondary_index] = 0.32
    return vector


class FakeAdminDebugEmbeddingProvider:
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        assert texts
        return [build_embedding_vector(0, 1)]


class FakeAdminDebugLLMProvider:
    def rerank(self, query: str, candidates: list):
        return candidates

    def explain(self, query: str, candidate, context: dict) -> str:
        return f"debug explanation for {candidate.title}"

    def parse_book_from_ocr(self, ocr_texts: list[str]) -> dict:
        return {"title": ocr_texts[0] if ocr_texts else "未知书籍"}

    def chat(self, *, text: str, context: dict) -> str:
        return f"debug reply for {text}"


def seed_management_state() -> dict[str, int]:
    session = get_session_factory()()
    try:
        now = utc_now()
        admin = AdminAccount(username="admin", password_hash=hash_password("admin-password"))
        session.add(admin)
        session.flush()

        reader_account = ReaderAccount(username="reader-01", password_hash=hash_password("reader-password"))
        no_history_account = ReaderAccount(username="reader-02", password_hash=hash_password("reader-password"))
        overlap_reader_one_account = ReaderAccount(username="reader-03", password_hash=hash_password("reader-password"))
        overlap_reader_two_account = ReaderAccount(username="reader-04", password_hash=hash_password("reader-password"))
        session.add_all(
            [
                reader_account,
                no_history_account,
                overlap_reader_one_account,
                overlap_reader_two_account,
            ]
        )
        session.flush()

        reader_profile = ReaderProfile(
            account_id=reader_account.id,
            display_name="林栀",
            affiliation_type="student",
            college="信息学院",
            major="智能科学",
            grade_year="2024",
            restriction_status="limited",
            restriction_until=now + timedelta(days=7),
            risk_flags=["overdue", "high_frequency"],
            preference_profile_json={"favorite_categories": ["人工智能", "系统设计"], "delivery_preference": "robot"},
            segment_code="ai_power_user",
        )
        no_history_profile = ReaderProfile(
            account_id=no_history_account.id,
            display_name="周朔",
            affiliation_type="student",
            college="信息学院",
            major="数据科学",
            grade_year="2025",
            restriction_status="none",
            preference_profile_json={"favorite_categories": ["推荐系统"]},
            segment_code="cold_start",
        )
        overlap_reader_one = ReaderProfile(
            account_id=overlap_reader_one_account.id,
            display_name="谢珂",
            affiliation_type="student",
            college="计算机学院",
            major="软件工程",
            grade_year="2023",
            restriction_status="none",
            preference_profile_json={"favorite_categories": ["人工智能"]},
            segment_code="peer_reader",
        )
        overlap_reader_two = ReaderProfile(
            account_id=overlap_reader_two_account.id,
            display_name="何枝",
            affiliation_type="student",
            college="计算机学院",
            major="软件工程",
            grade_year="2023",
            restriction_status="none",
            preference_profile_json={"favorite_categories": ["人工智能"]},
            segment_code="peer_reader",
        )
        session.add_all([reader_profile, no_history_profile, overlap_reader_one, overlap_reader_two])
        session.flush()

        east_cabinet = Cabinet(id="cabinet-east", name="东区书柜", location="东区 一层", status="active")
        west_cabinet = Cabinet(id="cabinet-west", name="西区书柜", location="西区 一层", status="maintenance")
        session.add_all([east_cabinet, west_cabinet])

        ai_category = BookCategory(code="ai", name="人工智能", description="AI books")
        ops_category = BookCategory(code="ops", name="运营管理", description="Ops books")
        hot_tag = BookTag(code="hot", name="热门", description="Hot books")
        session.add_all([ai_category, ops_category, hot_tag])
        session.flush()

        book_today = Book(
            title="智能系统设计",
            author="程墨",
            category_id=ai_category.id,
            category=ai_category.name,
            isbn="9787111000001",
            barcode="AI-0001",
            cover_url="https://example.com/ai.jpg",
            keywords="AI,系统",
            summary="系统化管理 AI 服务。",
            shelf_status="on_shelf",
            embedding=build_embedding_vector(0, 1),
        )
        book_history = Book(
            title="图书馆运营方法",
            author="林舟",
            category_id=ops_category.id,
            category=ops_category.name,
            isbn="9787111000002",
            barcode="OPS-0002",
            keywords="运营,图书馆",
            summary="后台运营指南。",
            shelf_status="on_shelf",
            embedding=build_embedding_vector(2, 3),
        )
        book_match = Book(
            title="机器人系统调度",
            author="乔远",
            category_id=ai_category.id,
            category=ai_category.name,
            isbn="9787111000003",
            barcode="AI-0003",
            keywords="AI,系统,调度",
            summary="面向馆内配送与任务分发的调度实践。",
            shelf_status="on_shelf",
            embedding=build_embedding_vector(0, 4),
        )
        book_sparse = Book(
            title="馆藏盘点手册",
            author="季衡",
            category_id=ops_category.id,
            category=ops_category.name,
            isbn="9787111000004",
            barcode="OPS-0004",
            keywords="盘点,库存",
            summary="适合作为运营盘点参考。",
            shelf_status="on_shelf",
        )
        session.add_all([book_today, book_history, book_match, book_sparse])
        session.flush()

        session.add_all(
            [
                BookTagLink(book_id=book_today.id, tag_id=hot_tag.id),
                BookTagLink(book_id=book_history.id, tag_id=hot_tag.id),
                BookTagLink(book_id=book_match.id, tag_id=hot_tag.id),
            ]
        )

        east_copy = BookCopy(book_id=book_today.id, cabinet_id=east_cabinet.id, inventory_status="in_delivery")
        west_copy = BookCopy(book_id=book_history.id, cabinet_id=west_cabinet.id, inventory_status="stored")
        match_copy = BookCopy(book_id=book_match.id, cabinet_id=east_cabinet.id, inventory_status="stored")
        sparse_copy = BookCopy(book_id=book_sparse.id, cabinet_id=west_cabinet.id, inventory_status="stored")
        session.add_all([east_copy, west_copy, match_copy, sparse_copy])
        session.flush()

        east_slot = CabinetSlot(
            cabinet_id=east_cabinet.id,
            slot_code="A01",
            status="empty",
        )
        west_slot = CabinetSlot(
            cabinet_id=west_cabinet.id,
            slot_code="B01",
            status="occupied",
        )
        session.add_all(
            [
                BookStock(
                    book_id=book_today.id,
                    cabinet_id=east_cabinet.id,
                    total_copies=1,
                    available_copies=0,
                    reserved_copies=1,
                ),
                BookStock(
                    book_id=book_history.id,
                    cabinet_id=west_cabinet.id,
                    total_copies=1,
                    available_copies=1,
                    reserved_copies=0,
                ),
                BookStock(
                    book_id=book_match.id,
                    cabinet_id=east_cabinet.id,
                    total_copies=2,
                    available_copies=2,
                    reserved_copies=0,
                ),
                BookStock(
                    book_id=book_sparse.id,
                    cabinet_id=west_cabinet.id,
                    total_copies=1,
                    available_copies=1,
                    reserved_copies=0,
                ),
                east_slot,
                west_slot,
            ]
        )
        session.flush()
        west_copy.current_slot_id = west_slot.id

        borrow_today = BorrowOrder(
            reader_id=reader_profile.id,
            book_id=book_today.id,
            assigned_copy_id=east_copy.id,
            order_mode="robot_delivery",
            status="delivering",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(minutes=10),
            priority="urgent",
        )
        borrow_old = BorrowOrder(
            reader_id=reader_profile.id,
            book_id=book_history.id,
            assigned_copy_id=west_copy.id,
            order_mode="cabinet_pickup",
            status="completed",
            created_at=now - timedelta(days=2),
            updated_at=now - timedelta(days=1),
        )
        session.add_all([borrow_today, borrow_old])
        session.flush()

        overlap_borrows = [
            BorrowOrder(
                reader_id=overlap_reader_one.id,
                book_id=book_today.id,
                assigned_copy_id=east_copy.id,
                order_mode="cabinet_pickup",
                status="completed",
                created_at=now - timedelta(days=4),
                updated_at=now - timedelta(days=4),
            ),
            BorrowOrder(
                reader_id=overlap_reader_one.id,
                book_id=book_match.id,
                assigned_copy_id=match_copy.id,
                order_mode="cabinet_pickup",
                status="completed",
                created_at=now - timedelta(days=3),
                updated_at=now - timedelta(days=3),
            ),
            BorrowOrder(
                reader_id=overlap_reader_two.id,
                book_id=book_today.id,
                assigned_copy_id=east_copy.id,
                order_mode="cabinet_pickup",
                status="completed",
                created_at=now - timedelta(days=5),
                updated_at=now - timedelta(days=5),
            ),
            BorrowOrder(
                reader_id=overlap_reader_two.id,
                book_id=book_match.id,
                assigned_copy_id=match_copy.id,
                order_mode="cabinet_pickup",
                status="completed",
                created_at=now - timedelta(days=2),
                updated_at=now - timedelta(days=2),
            ),
        ]
        session.add_all(overlap_borrows)
        session.flush()

        delivery = DeliveryOrder(
            borrow_order_id=borrow_today.id,
            delivery_target="东区研讨间",
            eta_minutes=5,
            status="delivering",
            priority="urgent",
            created_at=now - timedelta(hours=1),
            updated_at=now - timedelta(minutes=8),
        )
        session.add(delivery)
        session.flush()

        online_robot = RobotUnit(
            code="BOT-01",
            status="carrying",
            battery_level=76,
            heartbeat_at=now - timedelta(minutes=2),
        )
        offline_robot = RobotUnit(
            code="BOT-02",
            status="offline",
            battery_level=8,
            heartbeat_at=now - timedelta(hours=2),
        )
        session.add_all([online_robot, offline_robot])
        session.flush()

        session.add(
            RobotTask(
                robot_id=online_robot.id,
                delivery_order_id=delivery.id,
                status="carrying",
                attempt_count=1,
                path_json={"nodes": ["cabinet-east", "东区研讨间"]},
            )
        )

        open_alert = AlertRecord(
            source_type="robot",
            source_id=str(online_robot.id),
            alert_type="robot_offline",
            severity="critical",
            status="open",
            title="机器人异常",
            message="机器人连接不稳定",
        )
        resolved_alert = AlertRecord(
            source_type="inventory",
            source_id="cabinet-west",
            alert_type="low_stock",
            severity="warning",
            status="resolved",
            title="库存不足",
            message="运营管理图书仅剩 1 本",
            resolved_by=admin.id,
            resolved_at=now - timedelta(hours=3),
        )
        setting = SystemSetting(
            setting_key="borrow.rules",
            value_type="json",
            value_json={"max_days": 30, "max_count": 5},
            description="默认借阅规则",
            created_by=admin.id,
            updated_by=admin.id,
        )
        session.add_all([open_alert, resolved_alert, setting])

        placement = RecommendationPlacement(
            code="homepage-hero",
            name="首页主推荐位",
            status="active",
            placement_type="homepage",
            config_json={"weight": 0.6, "audience": "all"},
        )
        topic = TopicBooklist(
            slug="ai-special",
            title="AI 专题书单",
            description="聚焦 AI 与系统设计",
            status="published",
            audience_segment="ai_power_user",
        )
        session.add_all([placement, topic])
        session.flush()

        session.add(
            TopicBooklistItem(
                topic_booklist_id=topic.id,
                book_id=book_today.id,
                rank_position=1,
                note="适合作为首页专题首位",
            )
        )
        session.add_all(
            [
                SearchLog(reader_id=reader_profile.id, query_text="AI 系统", query_mode="semantic", created_at=now - timedelta(hours=5)),
                RecommendationLog(
                    reader_id=reader_profile.id,
                    book_id=book_today.id,
                    query_text="AI 系统",
                    result_title=book_today.title,
                    rank_position=1,
                    score=0.98,
                    provider_note="admin-seed",
                    explanation="与用户画像高度匹配",
                    created_at=now - timedelta(hours=4),
                ),
                RecommendationLog(
                    reader_id=reader_profile.id,
                    book_id=book_history.id,
                    query_text="图书馆运营",
                    result_title=book_history.title,
                    rank_position=1,
                    score=0.82,
                    provider_note="admin-seed",
                    explanation="运营向用户也会看到",
                    created_at=now - timedelta(hours=3),
                ),
                ReadingEvent(
                    reader_id=reader_profile.id,
                    event_type="recommendation_viewed",
                    metadata_json={"book_id": book_today.id},
                    created_at=now - timedelta(hours=3),
                ),
                ReadingEvent(
                    reader_id=reader_profile.id,
                    event_type="borrow_order_created",
                    metadata_json={"borrow_order_id": borrow_today.id},
                    created_at=now - timedelta(hours=1),
                ),
                InventoryEvent(
                    cabinet_id=east_cabinet.id,
                    event_type="book_stored",
                    slot_code="A01",
                    book_id=book_today.id,
                    copy_id=east_copy.id,
                    payload_json={"source": "seed"},
                    created_at=now - timedelta(hours=2),
                ),
            ]
        )
        session.commit()
        return {
            "admin_id": admin.id,
            "reader_account_id": reader_account.id,
            "book_id": book_today.id,
            "category_id": ai_category.id,
            "tag_id": hot_tag.id,
            "alert_id": open_alert.id,
            "cabinet_id": east_cabinet.id,
            "reader_id": reader_profile.id,
            "no_history_reader_id": no_history_profile.id,
            "similar_book_id": book_match.id,
            "sparse_book_id": book_sparse.id,
        }
    finally:
        session.close()


def test_admin_dashboard_overview_and_heatmap(client):
    state = seed_management_state()

    overview_response = client.get(
        "/api/v1/admin/dashboard/overview",
        headers=admin_headers(state["admin_id"]),
    )

    assert overview_response.status_code == 200
    overview = overview_response.json()
    assert overview["today_borrow_count"] == 1
    assert overview["active_delivery_task_count"] == 1
    assert overview["robots"]["online"] == 1
    assert overview["robots"]["offline"] == 1
    assert overview["alerts"]["open"] == 1
    assert overview["top_books"][0]["title"] == "智能系统设计"

    heatmap_response = client.get(
        "/api/v1/admin/dashboard/heatmap",
        headers=admin_headers(state["admin_id"]),
    )

    assert heatmap_response.status_code == 200
    heatmap = heatmap_response.json()
    assert heatmap["items"][0]["area"] == "东区"
    assert heatmap["items"][0]["demand_count"] == 1


def test_admin_books_crud_taxonomy_and_audit_log(client):
    state = seed_management_state()

    create_book_response = client.post(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        json={
            "title": "多智能体协作",
            "author": "周岚",
            "category_id": state["category_id"],
            "isbn": "9787111000003",
            "barcode": "AI-0003",
            "cover_url": "https://example.com/agents.jpg",
            "keywords": "Agent,协作",
            "summary": "面向多智能体后台的设计方法。",
            "shelf_status": "draft",
            "tag_ids": [state["tag_id"]],
        },
    )

    assert create_book_response.status_code == 201
    created_book = create_book_response.json()["book"]
    assert created_book["shelf_status"] == "draft"
    assert created_book["tags"][0]["name"] == "热门"

    list_books_response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"query": "智能", "page": 1, "page_size": 10},
    )
    assert list_books_response.status_code == 200
    books_payload = list_books_response.json()
    assert books_payload["page"] == 1
    assert books_payload["page_size"] == 10
    assert books_payload["total"] >= 2
    listed_today = next(item for item in books_payload["items"] if item["title"] == "智能系统设计")
    assert listed_today["category"] == "人工智能"
    assert "classification_code" not in listed_today

    patch_book_response = client.patch(
        f"/api/v1/admin/books/{created_book['id']}",
        headers=admin_headers(state["admin_id"]),
        json={"summary": "更新后的简介", "author": "周岚 / 陈新"},
    )
    assert patch_book_response.status_code == 200
    assert patch_book_response.json()["book"]["author"] == "周岚 / 陈新"

    status_response = client.post(
        f"/api/v1/admin/books/{created_book['id']}/status",
        headers=admin_headers(state["admin_id"]),
        json={"shelf_status": "on_shelf"},
    )
    assert status_response.status_code == 200
    assert status_response.json()["book"]["shelf_status"] == "on_shelf"

    create_category_response = client.post(
        "/api/v1/admin/categories",
        headers=admin_headers(state["admin_id"]),
        json={"code": "design", "name": "设计", "description": "设计类书籍"},
    )
    assert create_category_response.status_code == 201

    create_tag_response = client.post(
        "/api/v1/admin/tags",
        headers=admin_headers(state["admin_id"]),
        json={"code": "featured", "name": "精选", "description": "精选书籍"},
    )
    assert create_tag_response.status_code == 201

    categories_response = client.get(
        "/api/v1/admin/categories",
        headers=admin_headers(state["admin_id"]),
    )
    tags_response = client.get(
        "/api/v1/admin/tags",
        headers=admin_headers(state["admin_id"]),
    )
    assert categories_response.status_code == 200
    assert tags_response.status_code == 200
    assert any(item["code"] == "design" for item in categories_response.json()["items"])
    assert any(item["code"] == "featured" for item in tags_response.json()["items"])

    session = get_session_factory()()
    try:
        audits = session.query(AdminActionLog).order_by(AdminActionLog.id.asc()).all()
        assert len(audits) >= 4
        assert audits[-1].target_type in {"book_tag", "book_category"}
    finally:
        session.close()


def test_admin_books_list_derives_shelf_status_from_stock_when_missing(client):
    state = seed_management_state()
    session = get_session_factory()()
    try:
        stocked_book = Book(
            title="Python 自动化与管理脚本",
            author="罗景川",
            shelf_status=None,
        )
        draft_book = Book(
            title="还未入柜的临时编目",
            author="馆员",
            shelf_status=None,
        )
        session.add_all([stocked_book, draft_book])
        session.flush()
        session.add(
            BookStock(
                book_id=stocked_book.id,
                cabinet_id=state["cabinet_id"],
                total_copies=2,
                available_copies=1,
                reserved_copies=1,
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 50},
    )

    assert response.status_code == 200
    payload = response.json()
    stocked_item = next(item for item in payload["items"] if item["title"] == "Python 自动化与管理脚本")
    draft_item = next(item for item in payload["items"] if item["title"] == "还未入柜的临时编目")
    assert stocked_item["stock_summary"]["total_copies"] == 2
    assert stocked_item["shelf_status"] == "on_shelf"
    assert draft_item["stock_summary"]["total_copies"] == 0
    assert draft_item["shelf_status"] == "draft"


def test_admin_books_filter_uses_effective_shelf_status_when_missing(client):
    state = seed_management_state()
    session = get_session_factory()()
    try:
        stocked_book = Book(title="入柜但状态缺失", author="馆员", shelf_status=None)
        draft_book = Book(title="未入柜且状态缺失", author="馆员", shelf_status=None)
        session.add_all([stocked_book, draft_book])
        session.flush()
        session.add(
            BookStock(
                book_id=stocked_book.id,
                cabinet_id=state["cabinet_id"],
                total_copies=1,
                available_copies=1,
                reserved_copies=0,
            )
        )
        session.commit()
    finally:
        session.close()

    on_shelf_response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 50, "shelf_status": "on_shelf"},
    )
    draft_response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 50, "shelf_status": "draft"},
    )

    assert on_shelf_response.status_code == 200
    assert draft_response.status_code == 200
    on_shelf_titles = {item["title"] for item in on_shelf_response.json()["items"]}
    draft_titles = {item["title"] for item in draft_response.json()["items"]}
    assert "入柜但状态缺失" in on_shelf_titles
    assert "未入柜且状态缺失" not in on_shelf_titles
    assert "未入柜且状态缺失" in draft_titles
    assert "入柜但状态缺失" not in draft_titles


def test_admin_books_list_includes_copy_location_details(client):
    state = seed_management_state()

    response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 50, "query": "智能系统设计"},
    )

    assert response.status_code == 200
    payload = response.json()
    book_item = next(item for item in payload["items"] if item["title"] == "智能系统设计")
    copies = book_item["copies"]
    assert len(copies) == 1
    assert copies[0]["cabinet_id"] == "cabinet-east"
    assert copies[0]["cabinet_name"] == "东区书柜"
    assert copies[0]["cabinet_location"] == "东区 一层"
    assert copies[0]["slot_code"] is None
    assert copies[0]["inventory_status"] == "in_delivery"
    assert copies[0]["available_for_borrow"] is False


def test_admin_books_search_prioritizes_title_matches_over_summary_only_matches(client):
    state = seed_management_state()
    session = get_session_factory()()
    try:
        ai_category = session.query(BookCategory).filter_by(code="ai").one()
        title_match = Book(
            title="机器学习导论",
            author="陈言",
            category_id=ai_category.id,
            category=ai_category.name,
            summary="面向初学者的机器学习教材。",
            shelf_status="on_shelf",
        )
        summary_match = Book(
            title="复杂交通跟踪研究",
            author="作者吴刚",
            category_id=ai_category.id,
            category=ai_category.name,
            summary="应用机器学习算法解决复杂场景中的目标跟踪问题。",
            shelf_status="on_shelf",
        )
        session.add_all([title_match, summary_match])
        session.commit()
    finally:
        session.close()

    response = client.get(
        "/api/v1/admin/books",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20, "query": "机器学习"},
    )

    assert response.status_code == 200
    payload = response.json()
    titles = [item["title"] for item in payload["items"]]
    assert titles.index("机器学习导论") < titles.index("复杂交通跟踪研究")


def test_backfill_book_taxonomy_maps_legacy_category_codes_into_official_taxonomy(app):
    session = get_session_factory()()
    try:
        legacy_mappable = Book(title="安全系统工程", author="馆员", category="X913.4")
        legacy_unmappable = Book(title="未识别分类记录", author="馆员", category="??")
        session.add_all([legacy_mappable, legacy_unmappable])
        session.commit()

        backfill_book_taxonomy(session)
        session.commit()
        session.refresh(legacy_mappable)
        session.refresh(legacy_unmappable)

        mapped_category = session.get(BookCategory, legacy_mappable.category_id)
        assert legacy_mappable.category == "环境科学、安全科学"
        assert mapped_category is not None
        assert mapped_category.code == "clc-x"
        assert mapped_category.name == "环境科学、安全科学"

        assert legacy_unmappable.category_id is None
        assert legacy_unmappable.category is None
    finally:
        session.close()


def test_admin_alerts_and_system_settings_workflow(client):
    state = seed_management_state()

    alerts_response = client.get(
        "/api/v1/admin/alerts",
        headers=admin_headers(state["admin_id"]),
        params={"status": "open"},
    )
    assert alerts_response.status_code == 200
    alerts_payload = alerts_response.json()
    assert alerts_payload["total"] == 1
    assert alerts_payload["items"][0]["status"] == "open"

    ack_response = client.post(
        f"/api/v1/admin/alerts/{state['alert_id']}/ack",
        headers=admin_headers(state["admin_id"]),
        json={"note": "已收到，处理中"},
    )
    assert ack_response.status_code == 200
    assert ack_response.json()["alert"]["status"] == "acknowledged"

    resolve_response = client.post(
        f"/api/v1/admin/alerts/{state['alert_id']}/resolve",
        headers=admin_headers(state["admin_id"]),
        json={"note": "已恢复"},
    )
    assert resolve_response.status_code == 200
    assert resolve_response.json()["alert"]["status"] == "resolved"

    update_setting_response = client.put(
        "/api/v1/admin/system/settings/borrow.rules",
        headers=admin_headers(state["admin_id"]),
        json={
            "value_type": "json",
            "value_json": {"max_days": 45, "max_count": 8},
            "description": "更新后的借阅规则",
        },
    )
    assert update_setting_response.status_code == 200
    assert update_setting_response.json()["setting"]["value_json"]["max_days"] == 45

    settings_response = client.get(
        "/api/v1/admin/system/settings",
        headers=admin_headers(state["admin_id"]),
    )
    assert settings_response.status_code == 200
    settings_payload = settings_response.json()
    assert settings_payload["total"] >= 1
    assert settings_payload["items"][0]["setting_key"] == "borrow.rules"

    session = get_session_factory()()
    try:
        alert = session.get(AlertRecord, state["alert_id"])
        setting = session.query(SystemSetting).filter_by(setting_key="borrow.rules").one()
        assert alert is not None
        assert alert.status == "resolved"
        assert alert.acknowledged_by == state["admin_id"]
        assert alert.resolved_by == state["admin_id"]
        assert setting.value_json["max_count"] == 8
    finally:
        session.close()


def test_admin_audit_logs_endpoint_lists_recent_logs(client):
    state = seed_management_state()

    session = get_session_factory()()
    try:
        session.add(
            AdminActionLog(
                admin_id=state["admin_id"],
                target_type="book",
                target_ref=str(state["book_id"]),
                action="update_book",
                before_state={"summary": "旧简介"},
                after_state={"summary": "新简介"},
                note="管理后台手动更新图书简介",
            )
        )
        session.commit()
    finally:
        session.close()

    response = client.get(
        "/api/v1/admin/audit-logs",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["page"] == 1
    assert payload["page_size"] == 20
    assert payload["total"] >= 1
    assert payload["items"][0]["action"] == "update_book"
    assert payload["items"][0]["target_type"] == "book"


def test_admin_roles_permissions_and_audit_log_filters(client):
    state = seed_management_state()
    session = get_session_factory()()
    try:
        managed_admin = AdminAccount(username="ops-managed", password_hash=hash_password("ops-password"))
        session.add(managed_admin)
        session.commit()
        managed_admin_id = managed_admin.id
    finally:
        session.close()

    role_upsert_response = client.put(
        "/api/v1/admin/system/roles/ops-manager",
        headers=admin_headers(state["admin_id"]),
        json={
            "name": "运营管理员",
            "description": "负责运营和告警处理",
            "permission_codes": ["dashboard.view", "alerts.manage", "system.audit.view"],
            "admin_ids": [managed_admin_id],
        },
    )
    assert role_upsert_response.status_code == 200
    role_payload = role_upsert_response.json()["role"]
    assert role_payload["code"] == "ops-manager"
    assert "dashboard.view" in role_payload["permission_codes"]
    assert managed_admin_id in role_payload["assigned_admin_ids"]

    permissions_response = client.get(
        "/api/v1/admin/system/permissions",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 50},
    )
    assert permissions_response.status_code == 200
    assert any(item["code"] == "dashboard.view" for item in permissions_response.json()["items"])
    assert any(
        item["code"] == "recommendation.manage" and item["name"] == "管理推荐运营台"
        for item in permissions_response.json()["items"]
    )

    roles_response = client.get(
        "/api/v1/admin/system/roles",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert roles_response.status_code == 200
    assert any(item["code"] == "ops-manager" for item in roles_response.json()["items"])

    admins_response = client.get(
        "/api/v1/admin/system/admins",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert admins_response.status_code == 200
    assert admins_response.json()["items"][0]["username"] == "admin"

    filtered_audit_response = client.get(
        "/api/v1/admin/audit-logs",
        headers=admin_headers(state["admin_id"]),
        params={"target_type": "system_role", "action": "upsert_admin_role", "page": 1, "page_size": 20},
    )
    assert filtered_audit_response.status_code == 200
    filtered_payload = filtered_audit_response.json()
    assert filtered_payload["total"] >= 1
    assert filtered_payload["items"][0]["target_type"] == "system_role"
    assert filtered_payload["items"][0]["action"] == "upsert_admin_role"

    session = get_session_factory()()
    try:
        role = session.query(AdminRole).filter_by(code="ops-manager").one()
        permissions = session.query(AdminPermission).order_by(AdminPermission.code.asc()).all()
        assignments = session.query(AdminRoleAssignment).filter_by(role_id=role.id).all()
        links = session.query(AdminRolePermission).filter_by(role_id=role.id).all()
        assert len(permissions) >= 3
        assert len(links) == 3
        assert len(assignments) == 1
    finally:
        session.close()


def test_admin_permissions_are_returned_and_enforced(client):
    state = seed_management_state()

    session = get_session_factory()()
    try:
        limited_admin = AdminAccount(username="ops-viewer", password_hash=hash_password("ops-password"))
        session.add(limited_admin)
        session.commit()
        limited_admin_id = limited_admin.id
    finally:
        session.close()

    setup_role_response = client.put(
        "/api/v1/admin/system/roles/dashboard-viewer",
        headers=admin_headers(state["admin_id"]),
        json={
            "name": "总览查看员",
            "description": "仅能查看首页总览",
            "permission_codes": ["dashboard.view"],
            "admin_ids": [limited_admin_id],
        },
    )
    assert setup_role_response.status_code == 200

    identity_response = client.get(
        "/api/v1/auth/admin/me",
        headers=admin_headers(limited_admin_id),
    )
    assert identity_response.status_code == 200
    identity_payload = identity_response.json()
    assert identity_payload["account"]["role_codes"] == ["dashboard-viewer"]
    assert identity_payload["account"]["permission_codes"] == ["dashboard.view"]

    dashboard_response = client.get(
        "/api/v1/admin/dashboard/overview",
        headers=admin_headers(limited_admin_id),
    )
    assert dashboard_response.status_code == 200

    settings_response = client.get(
        "/api/v1/admin/system/settings",
        headers=admin_headers(limited_admin_id),
    )
    assert settings_response.status_code == 403
    assert settings_response.json()["error"]["code"] == "admin_permission_required"

    recommendation_response = client.get(
        "/api/v1/admin/recommendation/studio",
        headers=admin_headers(limited_admin_id),
    )
    assert recommendation_response.status_code == 403
    assert recommendation_response.json()["error"]["code"] == "admin_permission_required"


def test_admin_inventory_management_endpoints(client):
    state = seed_management_state()

    cabinets_response = client.get(
        "/api/v1/admin/cabinets",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert cabinets_response.status_code == 200
    cabinets_payload = cabinets_response.json()
    assert cabinets_payload["total"] >= 2
    assert any(item["slot_total"] >= 1 for item in cabinets_payload["items"])

    slots_response = client.get(
        f"/api/v1/admin/cabinets/{state['cabinet_id']}/slots",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert slots_response.status_code == 200
    slots_payload = slots_response.json()
    assert slots_payload["items"][0]["slot_code"] == "A01"

    records_response = client.get(
        "/api/v1/admin/inventory/records",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert records_response.status_code == 200
    records_payload = records_response.json()
    assert records_payload["total"] >= 1
    assert records_payload["items"][0]["event_type"] in {"book_stored", "manual_correction"}

    alerts_response = client.get(
        "/api/v1/admin/inventory/alerts",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert alerts_response.status_code == 200
    assert alerts_response.json()["total"] >= 1

    filtered_alerts_response = client.get(
        "/api/v1/admin/inventory/alerts",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20, "status": "resolved", "source_id": "cabinet-west"},
    )
    assert filtered_alerts_response.status_code == 200
    filtered_payload = filtered_alerts_response.json()
    assert filtered_payload["total"] == 1
    assert [item["source_id"] for item in filtered_payload["items"]] == ["cabinet-west"]

    empty_filtered_alerts_response = client.get(
        "/api/v1/admin/inventory/alerts",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20, "status": "resolved", "source_id": "cabinet-east"},
    )
    assert empty_filtered_alerts_response.status_code == 200
    assert empty_filtered_alerts_response.json()["total"] == 0

    correction_response = client.post(
        "/api/v1/admin/inventory/corrections",
        headers=admin_headers(state["admin_id"]),
        json={
            "cabinet_id": state["cabinet_id"],
            "book_id": state["book_id"],
            "total_delta": 1,
            "available_delta": 1,
            "reason": "管理员盘点补录一册",
            "slot_code": "A01",
        },
    )
    assert correction_response.status_code == 200
    correction_payload = correction_response.json()["correction"]
    assert correction_payload["stock"]["total_copies"] == 2
    assert correction_payload["stock"]["available_copies"] == 1


def test_admin_reader_management_endpoints(client):
    state = seed_management_state()

    readers_response = client.get(
        "/api/v1/admin/readers",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert readers_response.status_code == 200
    readers_payload = readers_response.json()
    assert readers_payload["total"] >= 1
    seeded_reader = next(item for item in readers_payload["items"] if item["id"] == state["reader_id"])
    assert seeded_reader["restriction_status"] == "limited"
    assert seeded_reader["segment_code"] == "ai_power_user"

    reader_detail_response = client.get(
        f"/api/v1/admin/readers/{state['reader_id']}",
        headers=admin_headers(state["admin_id"]),
    )
    assert reader_detail_response.status_code == 200
    assert reader_detail_response.json()["reader"]["risk_flags"] == ["overdue", "high_frequency"]

    reader_patch_response = client.patch(
        f"/api/v1/admin/readers/{state['reader_id']}",
        headers=admin_headers(state["admin_id"]),
        json={
            "restriction_status": "blacklisted",
            "segment_code": "manual_review",
            "risk_flags": ["manual_escalation"],
        },
    )
    assert reader_patch_response.status_code == 200
    updated_reader = reader_patch_response.json()["reader"]
    assert updated_reader["restriction_status"] == "blacklisted"
    assert updated_reader["segment_code"] == "manual_review"

def test_legacy_admin_recommendation_workspace_routes_are_removed(client):
    state = seed_management_state()
    headers = admin_headers(state["admin_id"])

    for path in (
        f"/api/v1/admin/recommendation/workspace/{state['reader_id']}/dashboard",
        f"/api/v1/admin/recommendation/workspace/{state['reader_id']}/search",
        f"/api/v1/admin/recommendation/workspace/{state['reader_id']}/books/{state['book_id']}/similar",
        f"/api/v1/admin/recommendation/workspace/{state['reader_id']}/books/{state['book_id']}/collaborative",
        f"/api/v1/admin/recommendation/workspace/{state['reader_id']}/books/{state['book_id']}/hybrid",
        "/api/v1/admin/recommendation/placements",
        "/api/v1/admin/recommendation/topic-booklists",
        "/api/v1/admin/recommendation/insights",
    ):
        response = client.get(path, headers=headers)
        assert response.status_code == 404


def test_legacy_admin_recommendation_workspace_helpers_are_not_part_of_active_service_surface():
    for name in (
        "_resolve_reader_workspace",
        "recommendation_workspace_dashboard",
        "recommendation_workspace_search",
        "recommendation_workspace_similar",
        "recommendation_workspace_collaborative",
        "recommendation_workspace_hybrid",
    ):
        assert hasattr(admin_service, name) is False


def test_admin_recommendation_studio_requires_admin_permission(client):
    state = seed_management_state()

    anonymous_response = client.get(
        "/api/v1/admin/recommendation/studio",
    )
    assert anonymous_response.status_code == 401
    assert anonymous_response.json()["error"]["code"] == "auth_required"

    reader_response = client.get(
        "/api/v1/admin/recommendation/studio",
        headers=reader_headers(state["reader_account_id"], state["reader_id"]),
    )
    assert reader_response.status_code == 403
    assert reader_response.json()["error"]["code"] == "admin_required"


def test_admin_recommendation_debug_endpoints_require_permission(client):
    state = seed_management_state()

    anonymous_response = client.post(
        "/api/v1/admin/recommendation/debug/search",
        json={"reader_id": state["reader_id"], "query": "AI 系统", "limit": 2},
    )
    assert anonymous_response.status_code == 401
    assert anonymous_response.json()["error"]["code"] == "auth_required"

    reader_response = client.post(
        "/api/v1/admin/recommendation/debug/search",
        headers=reader_headers(state["reader_account_id"], state["reader_id"]),
        json={"reader_id": state["reader_id"], "query": "AI 系统", "limit": 2},
    )
    assert reader_response.status_code == 403
    assert reader_response.json()["error"]["code"] == "admin_required"


def test_admin_recommendation_debug_endpoints_return_runtime_metadata(client, monkeypatch):
    from app.admin import router as admin_router

    state = seed_management_state()
    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.setenv("LIBRARY_LLM_MODEL", "deepseek-chat")
    monkeypatch.setenv("LIBRARY_LLM_BASE_URL", "https://api.deepseek.com/v1")
    monkeypatch.setenv("LIBRARY_EMBEDDING_PROVIDER", "hash")
    monkeypatch.setenv("LIBRARY_RECOMMENDATION_ML_ENABLED", "false")
    get_settings.cache_clear()
    monkeypatch.setattr(admin_router, "build_llm_provider", lambda: FakeAdminDebugLLMProvider())
    monkeypatch.setattr(admin_router, "build_embedding_provider", lambda: FakeAdminDebugEmbeddingProvider())

    search_response = client.post(
        "/api/v1/admin/recommendation/debug/search",
        headers=admin_headers(state["admin_id"]),
        json={"reader_id": state["reader_id"], "query": "AI 系统", "limit": 2},
    )
    assert search_response.status_code == 200
    search_payload = search_response.json()
    assert search_payload["query"] == "AI 系统"
    assert search_payload["runtime"] == {
        "llm_provider": "openai-compatible",
        "llm_model": "deepseek-chat",
        "embedding_provider": "hash",
        "embedding_model": "text-embedding-3-small",
        "recommendation_ml_enabled": False,
        "provider_note": "provider",
    }
    assert search_payload["results"][0]["explanation"].startswith("debug explanation for")

    dashboard_response = client.get(
        f"/api/v1/admin/recommendation/debug/readers/{state['reader_id']}/dashboard?limit=2&history_limit=1",
        headers=admin_headers(state["admin_id"]),
    )
    assert dashboard_response.status_code == 200
    dashboard_payload = dashboard_response.json()
    assert dashboard_payload["reader_id"] == state["reader_id"]
    assert dashboard_payload["runtime"]["llm_provider"] == "openai-compatible"
    assert "provider_note" in dashboard_payload["runtime"]

    module_response = client.get(
        f"/api/v1/admin/recommendation/debug/readers/{state['reader_id']}/books/{state['book_id']}?mode=hybrid&limit=2",
        headers=admin_headers(state["admin_id"]),
    )
    assert module_response.status_code == 200
    module_payload = module_response.json()
    assert module_payload["source_book"]["book_id"] == state["book_id"]
    assert module_payload["runtime"]["provider_note"] == "hybrid"


def test_admin_recommendation_debug_endpoints_surface_lookup_and_provider_errors(client, monkeypatch):
    state = seed_management_state()

    missing_reader_response = client.get(
        "/api/v1/admin/recommendation/debug/readers/999/dashboard",
        headers=admin_headers(state["admin_id"]),
    )
    assert missing_reader_response.status_code == 404
    assert missing_reader_response.json()["error"]["code"] == "reader_not_found"

    missing_book_response = client.get(
        f"/api/v1/admin/recommendation/debug/readers/{state['reader_id']}/books/999?mode=hybrid",
        headers=admin_headers(state["admin_id"]),
    )
    assert missing_book_response.status_code == 404
    assert missing_book_response.json()["error"]["code"] == "book_not_found"

    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "openai-compatible")
    monkeypatch.setenv("LIBRARY_EMBEDDING_PROVIDER", "hash")
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()
    llm_error_response = client.post(
        "/api/v1/admin/recommendation/debug/search",
        headers=admin_headers(state["admin_id"]),
        json={"reader_id": state["reader_id"], "query": "AI 系统", "limit": 2},
    )
    assert llm_error_response.status_code == 503
    assert llm_error_response.json()["error"]["code"] == "llm_provider_misconfigured"

    monkeypatch.setenv("LIBRARY_LLM_PROVIDER", "null")
    monkeypatch.setenv("LIBRARY_EMBEDDING_PROVIDER", "openai-compatible")
    monkeypatch.delenv("LIBRARY_EMBEDDING_API_KEY", raising=False)
    monkeypatch.delenv("LIBRARY_LLM_API_KEY", raising=False)
    get_settings.cache_clear()
    embedding_error_response = client.post(
        "/api/v1/admin/recommendation/debug/search",
        headers=admin_headers(state["admin_id"]),
        json={"reader_id": state["reader_id"], "query": "AI 系统", "limit": 2},
    )
    assert embedding_error_response.status_code == 503
    assert embedding_error_response.json()["error"]["code"] == "embedding_provider_misconfigured"
