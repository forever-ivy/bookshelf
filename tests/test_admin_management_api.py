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
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.orders.models import BorrowOrder, DeliveryOrder
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotTask, RobotUnit
from app.system.models import SystemSetting


def admin_headers(account_id: int) -> dict[str, str]:
    token = create_token(
        AuthIdentity(account_id=account_id, role="admin", profile_id=None),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_management_state() -> dict[str, int]:
    session = get_session_factory()()
    try:
        now = utc_now()
        admin = AdminAccount(username="admin", password_hash=hash_password("admin-password"))
        session.add(admin)
        session.flush()

        reader_account = ReaderAccount(username="reader-01", password_hash=hash_password("reader-password"))
        session.add(reader_account)
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
        session.add(reader_profile)
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
        )
        session.add_all([book_today, book_history])
        session.flush()

        session.add_all(
            [
                BookTagLink(book_id=book_today.id, tag_id=hot_tag.id),
                BookTagLink(book_id=book_history.id, tag_id=hot_tag.id),
            ]
        )

        east_copy = BookCopy(book_id=book_today.id, cabinet_id=east_cabinet.id, inventory_status="in_delivery")
        west_copy = BookCopy(book_id=book_history.id, cabinet_id=west_cabinet.id, inventory_status="stored")
        session.add_all([east_copy, west_copy])
        session.flush()

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
                CabinetSlot(
                    cabinet_id=east_cabinet.id,
                    slot_code="A01",
                    status="empty",
                    current_copy_id=None,
                ),
                CabinetSlot(
                    cabinet_id=west_cabinet.id,
                    slot_code="B01",
                    status="occupied",
                    current_copy_id=west_copy.id,
                ),
            ]
        )

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
            "book_id": book_today.id,
            "category_id": ai_category.id,
            "tag_id": hot_tag.id,
            "alert_id": open_alert.id,
            "cabinet_id": east_cabinet.id,
            "reader_id": reader_profile.id,
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
                target_id=state["book_id"],
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
        "/api/v1/admin/recommendation/insights",
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


def test_admin_readers_and_recommendation_management_endpoints(client):
    state = seed_management_state()

    readers_response = client.get(
        "/api/v1/admin/readers",
        headers=admin_headers(state["admin_id"]),
        params={"page": 1, "page_size": 20},
    )
    assert readers_response.status_code == 200
    readers_payload = readers_response.json()
    assert readers_payload["total"] >= 1
    assert readers_payload["items"][0]["restriction_status"] == "limited"
    assert readers_payload["items"][0]["segment_code"] == "ai_power_user"

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

    placements_response = client.get(
        "/api/v1/admin/recommendation/placements",
        headers=admin_headers(state["admin_id"]),
    )
    assert placements_response.status_code == 200
    assert placements_response.json()["total"] >= 1

    create_placement_response = client.post(
        "/api/v1/admin/recommendation/placements",
        headers=admin_headers(state["admin_id"]),
        json={
            "code": "homepage-secondary",
            "name": "首页次级推荐位",
            "placement_type": "homepage",
            "status": "active",
            "config_json": {"weight": 0.2},
        },
    )
    assert create_placement_response.status_code == 201
    assert create_placement_response.json()["placement"]["code"] == "homepage-secondary"

    topics_response = client.get(
        "/api/v1/admin/recommendation/topic-booklists",
        headers=admin_headers(state["admin_id"]),
    )
    assert topics_response.status_code == 200
    assert topics_response.json()["items"][0]["item_count"] >= 1

    create_topic_response = client.post(
        "/api/v1/admin/recommendation/topic-booklists",
        headers=admin_headers(state["admin_id"]),
        json={
            "slug": "ops-special",
            "title": "运营专题",
            "description": "面向运营同学",
            "status": "draft",
            "audience_segment": "ops",
            "book_ids": [state["book_id"]],
        },
    )
    assert create_topic_response.status_code == 201
    assert create_topic_response.json()["topic_booklist"]["slug"] == "ops-special"

    insights_response = client.get(
        "/api/v1/admin/recommendation/insights",
        headers=admin_headers(state["admin_id"]),
    )
    assert insights_response.status_code == 200
    insights = insights_response.json()
    assert insights["summary"]["total_recommendations"] >= 2
    assert insights["summary"]["click_through_rate"] >= 0
    assert insights["hot_tags"][0]["tag_name"] == "热门"
