from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.security import hash_password
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.orders.models import BorrowOrder, DeliveryOrder, ReturnRequest
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit
from app.tutor.models import (
    TutorDocumentChunk,
    TutorGenerationJob,
    TutorProfile,
    TutorSession,
    TutorSessionMessage,
    TutorSourceDocument,
    TutorStepCompletion,
)


@dataclass(slots=True)
class SeedContext:
    session: Session


def _reset_all_tables(session: Session) -> None:
    for model in (
        TutorStepCompletion,
        TutorSessionMessage,
        TutorSession,
        TutorDocumentChunk,
        TutorSourceDocument,
        TutorGenerationJob,
        TutorProfile,
        ConversationMessage,
        RobotStatusEvent,
        AdminActionLog,
        RobotTask,
        ReturnRequest,
        DeliveryOrder,
        BorrowOrder,
        InventoryEvent,
        CabinetSlot,
        BookStock,
        BookCopy,
        RecommendationLog,
        SearchLog,
        ReadingEvent,
        ConversationSession,
        ReaderProfile,
        ReaderAccount,
        AdminAccount,
        RobotUnit,
        Book,
        Cabinet,
    ):
        session.execute(delete(model))
    session.commit()


def seed_demo_data(session: Session) -> dict[str, int]:
    _reset_all_tables(session)
    now = utc_now()

    admin = AdminAccount(username="admin", password_hash=hash_password("admin123"))
    session.add(admin)

    readers: list[tuple[ReaderAccount, ReaderProfile]] = []
    for username, display_name, affiliation_type, college, major, grade_year in (
        ("reader.ai", "张一凡", "student", "信息学院", "软件工程", "2024"),
        ("reader.ops", "林书乔", "student", "管理学院", "信息管理", "2023"),
        ("reader.lab", "周清和", "teacher", "计算机学院", "人工智能", None),
        ("reader.arch", "顾望舒", "student", "建筑学院", "数字媒体", "2022"),
        ("reader.policy", "许见山", "teacher", "公共管理学院", "知识治理", None),
        ("reader.service", "陈南乔", "student", "文学院", "数字出版", "2025"),
        ("reader.media", "沈星野", "student", "新闻传播学院", "网络与新媒体", "2024"),
        ("reader.cloud", "梁叙白", "teacher", "计算机学院", "云计算", None),
        ("reader.design", "宋以宁", "student", "艺术学院", "交互媒体", "2025"),
        ("reader.logistics", "贺川", "student", "管理学院", "物流工程", "2023"),
        ("reader.security", "姜予安", "teacher", "信息学院", "网络安全", None),
        ("reader.research", "白清禾", "student", "教育学院", "教育技术", "2022"),
    ):
        account = ReaderAccount(username=username, password_hash=hash_password("reader123"))
        session.add(account)
        session.flush()
        profile = ReaderProfile(
            account_id=account.id,
            display_name=display_name,
            affiliation_type=affiliation_type,
            college=college,
            major=major,
            grade_year=grade_year,
        )
        session.add(profile)
        session.flush()
        readers.append((account, profile))

    books_by_key: dict[str, Book] = {}
    for key, title, author, category, keywords, summary in (
        (
            "ops",
            "智能图书馆运营实战",
            "馆务创新组",
            "运营管理",
            "图书馆, 运营, 服务设计",
            "面向现代图书馆的运营指挥、空间服务和馆务数字化实践。",
        ),
        (
            "genai",
            "生成式 AI 管理实践",
            "程墨",
            "人工智能",
            "AI, 管理, 生成式模型",
            "从应用场景到治理策略，帮助管理团队落地生成式 AI。",
        ),
        (
            "data",
            "数据密集型产品设计",
            "裴知行",
            "产品设计",
            "数据产品, 指标, 平台",
            "讲解高密度后台、监控视图与数据工作流的产品设计方法。",
        ),
        (
            "python",
            "Python 自动化与管理脚本",
            "罗景川",
            "开发效率",
            "Python, 自动化, 脚本",
            "适合运营与开发混合团队的脚本自动化入门与实战。",
        ),
        (
            "hci",
            "人机交互导论",
            "王语宁",
            "交互设计",
            "HCI, 交互, 用户研究",
            "从研究方法到交互评估，梳理人机交互基础框架。",
        ),
        (
            "arch",
            "校园服务系统架构",
            "沈知白",
            "系统架构",
            "架构, 校园系统, SaaS",
            "围绕校园业务、权限和服务编排的系统架构案例集。",
        ),
        (
            "rec",
            "机器学习推荐系统",
            "许凌波",
            "推荐算法",
            "推荐系统, 机器学习, 排序",
            "覆盖召回、排序、特征工程与线上评估的推荐系统教材。",
        ),
        (
            "ocr",
            "OCR 与文档数字化",
            "段青",
            "数字化",
            "OCR, 识别, 文档处理",
            "面向纸质资料数字化和识别流程的工程实践。",
        ),
        (
            "policy",
            "知识治理与权限设计",
            "陆安澜",
            "治理设计",
            "治理, 权限, 组织设计",
            "围绕权限分层、流程审批与知识治理边界的后台设计案例。",
        ),
        (
            "service",
            "服务蓝图与系统运营",
            "谢闻舟",
            "服务设计",
            "服务蓝图, 运营, 旅程设计",
            "帮助运营团队把服务触点、流程和后台支撑编织成稳定体系。",
        ),
        (
            "ux",
            "界面系统与交互节奏",
            "宋知微",
            "交互设计",
            "界面系统, 动效, 交互节奏",
            "从结构、留白到运动反馈，系统梳理产品界面的节奏感构建方法。",
        ),
        (
            "network",
            "校园网络与边缘设备运维",
            "何望川",
            "运维工程",
            "网络, 边缘设备, 运维",
            "覆盖校园场景中的网络节点、边缘设备和巡检运维实践。",
        ),
        (
            "workflow",
            "协同工作流编排方法",
            "季临川",
            "流程编排",
            "工作流, 编排, 协同",
            "围绕跨团队协同、节点编排和运营自动化的流程设计方法。",
        ),
        (
            "security",
            "校园安全与权限运营",
            "顾砚秋",
            "安全治理",
            "安全, 权限, 风控",
            "聚焦校园业务中的账号安全、权限治理与风控运营机制。",
        ),
        (
            "research",
            "科研服务数字化转型",
            "韩知远",
            "科研管理",
            "科研服务, 数字化, 协同",
            "把科研项目、资料流转与服务支持放到统一数字底座中。",
        ),
        (
            "leadership",
            "组织领导力与服务协作",
            "莫清辞",
            "组织管理",
            "领导力, 团队协作, 服务",
            "帮助运营与服务团队建立稳定分工和跨部门协同机制。",
        ),
        (
            "database",
            "数据库可靠性工程",
            "苏见川",
            "数据工程",
            "数据库, 可用性, 容灾",
            "从备份、监控到扩展性，系统介绍数据库可靠性实践。",
        ),
        (
            "service_design",
            "服务设计地图",
            "唐时雨",
            "服务设计",
            "服务设计, 蓝图, 旅程",
            "将用户旅程、服务触点与后台协同串成完整服务地图。",
        ),
        (
            "automation",
            "运营自动化脚本集",
            "闻一舟",
            "开发效率",
            "自动化, 脚本, 运营",
            "面向馆务与运营场景的自动化脚本案例合集。",
        ),
        (
            "prompt",
            "提示词工程与知识检索",
            "许知遥",
            "人工智能",
            "提示词, 检索, LLM",
            "讲解知识库检索、提示词编排与回答质量控制。",
        ),
        (
            "metrics",
            "指标系统设计手册",
            "范遇安",
            "产品设计",
            "指标, 监控, 运营",
            "覆盖指标口径、分析看板和异常监控的设计方法。",
        ),
        (
            "cloud",
            "云原生应用运维",
            "江述白",
            "运维工程",
            "云原生, 容器, 运维",
            "从容器编排到发布治理，系统梳理云原生运维实践。",
        ),
        (
            "media",
            "媒体资产管理实务",
            "方疏影",
            "数字化",
            "媒体资产, 编目, 数字化",
            "面向图片、视频与复合媒体资料的编目和资产管理流程。",
        ),
        (
            "learning",
            "学习空间与知识服务",
            "陆初晴",
            "教育服务",
            "学习空间, 知识服务, 教育",
            "讨论学习空间设计、知识服务触点与读者陪伴体验。",
        ),
    ):
        book = Book(
            title=title,
            author=author,
            category=category,
            keywords=keywords,
            summary=summary,
        )
        session.add(book)
        session.flush()
        books_by_key[key] = book

    cabinets = [
        Cabinet(id="cabinet-001", name="东区主书柜", location="图书馆一层大厅", status="active"),
        Cabinet(id="cabinet-002", name="南区副书柜", location="图书馆二层南阅览区", status="active"),
        Cabinet(id="cabinet-003", name="西区流通柜", location="图书馆一层西翼流通区", status="active"),
        Cabinet(id="cabinet-004", name="北区研修柜", location="图书馆三层北研修区", status="active"),
    ]
    session.add_all(cabinets)
    session.flush()

    copy_specs = [
        ("ops", "cabinet-001", "stored", "A01"),
        ("ops", "cabinet-001", "borrowed", None),
        ("genai", "cabinet-001", "stored", "A02"),
        ("genai", "cabinet-001", "in_delivery", None),
        ("data", "cabinet-001", "borrowed", None),
        ("python", "cabinet-001", "reserved", None),
        ("policy", "cabinet-001", "stored", "A03"),
        ("policy", "cabinet-001", "in_delivery", None),
        ("service", "cabinet-001", "stored", "A06"),
        ("service", "cabinet-001", "reserved", None),
        ("hci", "cabinet-002", "stored", "B01"),
        ("hci", "cabinet-002", "stored", "B02"),
        ("arch", "cabinet-002", "borrowed", None),
        ("rec", "cabinet-002", "stored", "B03"),
        ("ocr", "cabinet-002", "stored", "B04"),
        ("ux", "cabinet-002", "stored", "B05"),
        ("ux", "cabinet-002", "borrowed", None),
        ("network", "cabinet-002", "stored", "B06"),
        ("workflow", "cabinet-003", "stored", "C01"),
        ("workflow", "cabinet-003", "borrowed", None),
        ("security", "cabinet-003", "stored", "C02"),
        ("security", "cabinet-003", "in_delivery", None),
        ("research", "cabinet-003", "stored", "C03"),
        ("leadership", "cabinet-003", "stored", "C04"),
        ("leadership", "cabinet-003", "borrowed", None),
        ("database", "cabinet-003", "stored", "C05"),
        ("database", "cabinet-003", "reserved", None),
        ("service_design", "cabinet-003", "stored", "C06"),
        ("service_design", "cabinet-003", "reserved", None),
        ("automation", "cabinet-004", "stored", "D01"),
        ("automation", "cabinet-004", "borrowed", None),
        ("prompt", "cabinet-004", "stored", "D02"),
        ("prompt", "cabinet-004", "reserved", None),
        ("metrics", "cabinet-004", "stored", "D03"),
        ("metrics", "cabinet-004", "borrowed", None),
        ("cloud", "cabinet-004", "stored", "D04"),
        ("cloud", "cabinet-004", "in_delivery", None),
        ("media", "cabinet-004", "stored", "D05"),
        ("learning", "cabinet-004", "stored", "D06"),
        ("learning", "cabinet-004", "borrowed", None),
    ]

    copies: list[BookCopy] = []
    slots_by_code: dict[tuple[str, str], CabinetSlot] = {}
    for cabinet_id, slot_code in (
        ("cabinet-001", "A01"),
        ("cabinet-001", "A02"),
        ("cabinet-001", "A03"),
        ("cabinet-001", "A04"),
        ("cabinet-001", "A05"),
        ("cabinet-001", "A06"),
        ("cabinet-001", "A07"),
        ("cabinet-001", "A08"),
        ("cabinet-002", "B01"),
        ("cabinet-002", "B02"),
        ("cabinet-002", "B03"),
        ("cabinet-002", "B04"),
        ("cabinet-002", "B05"),
        ("cabinet-002", "B06"),
        ("cabinet-002", "B07"),
        ("cabinet-002", "B08"),
        ("cabinet-003", "C01"),
        ("cabinet-003", "C02"),
        ("cabinet-003", "C03"),
        ("cabinet-003", "C04"),
        ("cabinet-003", "C05"),
        ("cabinet-003", "C06"),
        ("cabinet-003", "C07"),
        ("cabinet-003", "C08"),
        ("cabinet-004", "D01"),
        ("cabinet-004", "D02"),
        ("cabinet-004", "D03"),
        ("cabinet-004", "D04"),
        ("cabinet-004", "D05"),
        ("cabinet-004", "D06"),
        ("cabinet-004", "D07"),
        ("cabinet-004", "D08"),
    ):
        slot = CabinetSlot(
            cabinet_id=cabinet_id,
            slot_code=slot_code,
            status="empty",
        )
        session.add(slot)
        session.flush()
        slots_by_code[(cabinet_id, slot_code)] = slot

    for key, cabinet_id, inventory_status, slot_code in copy_specs:
        copy = BookCopy(
            book_id=books_by_key[key].id,
            cabinet_id=cabinet_id,
            inventory_status=inventory_status,
            created_at=now - timedelta(days=7),
            updated_at=now - timedelta(hours=2),
        )
        session.add(copy)
        session.flush()
        copies.append(copy)
        if slot_code is not None:
            slot = slots_by_code[(cabinet_id, slot_code)]
            copy.current_slot_id = slot.id
            slot.status = "occupied"

    stock_rows = [
        ("ops", "cabinet-001", 2, 1, 0),
        ("genai", "cabinet-001", 2, 1, 1),
        ("data", "cabinet-001", 1, 0, 0),
        ("python", "cabinet-001", 1, 0, 1),
        ("policy", "cabinet-001", 2, 1, 0),
        ("service", "cabinet-001", 2, 1, 1),
        ("hci", "cabinet-002", 2, 2, 0),
        ("arch", "cabinet-002", 1, 0, 0),
        ("rec", "cabinet-002", 1, 1, 0),
        ("ocr", "cabinet-002", 1, 1, 0),
        ("ux", "cabinet-002", 2, 1, 0),
        ("network", "cabinet-002", 1, 1, 0),
        ("workflow", "cabinet-003", 2, 1, 0),
        ("security", "cabinet-003", 2, 1, 0),
        ("research", "cabinet-003", 1, 1, 0),
        ("leadership", "cabinet-003", 2, 1, 0),
        ("database", "cabinet-003", 2, 1, 1),
        ("service_design", "cabinet-003", 2, 1, 1),
        ("automation", "cabinet-004", 2, 1, 0),
        ("prompt", "cabinet-004", 2, 1, 1),
        ("metrics", "cabinet-004", 2, 1, 0),
        ("cloud", "cabinet-004", 2, 1, 0),
        ("media", "cabinet-004", 1, 1, 0),
        ("learning", "cabinet-004", 2, 1, 0),
    ]
    for key, cabinet_id, total_copies, available_copies, reserved_copies in stock_rows:
        session.add(
            BookStock(
                book_id=books_by_key[key].id,
                cabinet_id=cabinet_id,
                total_copies=total_copies,
                available_copies=available_copies,
                reserved_copies=reserved_copies,
                created_at=now - timedelta(days=7),
                updated_at=now - timedelta(hours=2),
            )
        )

    session.flush()
    copy_by_status = {copy.inventory_status: [] for copy in copies}
    for copy in copies:
        copy_by_status.setdefault(copy.inventory_status, []).append(copy)

    active_delivery_copy = next(copy for copy in copies if copy.book_id == books_by_key["genai"].id and copy.inventory_status == "in_delivery")
    completed_pickup_copy = next(copy for copy in copies if copy.book_id == books_by_key["data"].id and copy.inventory_status == "borrowed")
    awaiting_pick_copy = next(copy for copy in copies if copy.book_id == books_by_key["python"].id and copy.inventory_status == "reserved")
    completed_delivery_copy = next(copy for copy in copies if copy.book_id == books_by_key["arch"].id and copy.inventory_status == "borrowed")
    delivered_copy = next(copy for copy in copies if copy.book_id == books_by_key["ops"].id and copy.inventory_status == "borrowed")
    policy_delivery_copy = next(copy for copy in copies if copy.book_id == books_by_key["policy"].id and copy.inventory_status == "in_delivery")
    service_reserved_copy = next(copy for copy in copies if copy.book_id == books_by_key["service"].id and copy.inventory_status == "reserved")
    ux_borrowed_copy = next(copy for copy in copies if copy.book_id == books_by_key["ux"].id and copy.inventory_status == "borrowed")
    used_copy_ids = {
        active_delivery_copy.id,
        completed_pickup_copy.id,
        awaiting_pick_copy.id,
        completed_delivery_copy.id,
        delivered_copy.id,
        policy_delivery_copy.id,
        service_reserved_copy.id,
        ux_borrowed_copy.id,
    }

    def claim_copy(book_key: str, inventory_status: str) -> BookCopy:
        for copy in copies:
            if (
                copy.book_id == books_by_key[book_key].id
                and copy.inventory_status == inventory_status
                and copy.id not in used_copy_ids
            ):
                used_copy_ids.add(copy.id)
                return copy
        raise LookupError(f"missing copy for {book_key}:{inventory_status}")

    workflow_borrowed_copy = claim_copy("workflow", "borrowed")
    security_delivery_copy = claim_copy("security", "in_delivery")
    leadership_borrowed_copy = claim_copy("leadership", "borrowed")
    database_reserved_copy = claim_copy("database", "reserved")
    service_design_reserved_copy = claim_copy("service_design", "reserved")
    automation_borrowed_copy = claim_copy("automation", "borrowed")
    prompt_reserved_copy = claim_copy("prompt", "reserved")
    metrics_borrowed_copy = claim_copy("metrics", "borrowed")
    cloud_delivery_copy = claim_copy("cloud", "in_delivery")
    learning_borrowed_copy = claim_copy("learning", "borrowed")

    robot_1 = RobotUnit(code="BOT-01", status="carrying", created_at=now - timedelta(days=2), updated_at=now - timedelta(minutes=8))
    robot_2 = RobotUnit(code="BOT-02", status="returning", created_at=now - timedelta(days=3), updated_at=now - timedelta(minutes=14))
    robot_3 = RobotUnit(code="BOT-03", status="carrying", created_at=now - timedelta(days=1), updated_at=now - timedelta(minutes=5))
    session.add_all([robot_1, robot_2, robot_3])
    session.flush()

    reader_1 = readers[0][1]
    reader_2 = readers[1][1]
    reader_3 = readers[2][1]
    reader_4 = readers[3][1]
    reader_5 = readers[4][1]
    reader_6 = readers[5][1]
    reader_7 = readers[6][1]
    reader_8 = readers[7][1]
    reader_9 = readers[8][1]
    reader_10 = readers[9][1]
    reader_11 = readers[10][1]
    reader_12 = readers[11][1]

    order_1 = BorrowOrder(
        reader_id=reader_1.id,
        book_id=books_by_key["genai"].id,
        assigned_copy_id=active_delivery_copy.id,
        order_mode="robot_delivery",
        status="delivering",
        created_at=now - timedelta(hours=6),
        updated_at=now - timedelta(minutes=8),
        picked_at=now - timedelta(hours=5, minutes=30),
    )
    order_2 = BorrowOrder(
        reader_id=reader_2.id,
        book_id=books_by_key["data"].id,
        assigned_copy_id=completed_pickup_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=2),
        updated_at=now - timedelta(days=1, hours=18),
        picked_at=now - timedelta(days=2, hours=-1),
        delivered_at=now - timedelta(days=1, hours=20),
        completed_at=now - timedelta(days=1, hours=18),
    )
    order_3 = BorrowOrder(
        reader_id=reader_3.id,
        book_id=books_by_key["python"].id,
        assigned_copy_id=awaiting_pick_copy.id,
        order_mode="cabinet_pickup",
        status="awaiting_pick",
        created_at=now - timedelta(hours=10),
        updated_at=now - timedelta(hours=9, minutes=30),
    )
    order_4 = BorrowOrder(
        reader_id=reader_1.id,
        book_id=books_by_key["arch"].id,
        assigned_copy_id=completed_delivery_copy.id,
        order_mode="robot_delivery",
        status="completed",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=3, hours=20),
        picked_at=now - timedelta(days=4, hours=-1),
        delivered_at=now - timedelta(days=3, hours=21),
        completed_at=now - timedelta(days=3, hours=20),
    )
    order_5 = BorrowOrder(
        reader_id=reader_4.id,
        book_id=books_by_key["ops"].id,
        assigned_copy_id=delivered_copy.id,
        order_mode="robot_delivery",
        status="delivered",
        created_at=now - timedelta(hours=20),
        updated_at=now - timedelta(hours=1, minutes=40),
        picked_at=now - timedelta(hours=19, minutes=20),
        delivered_at=now - timedelta(hours=1, minutes=40),
    )
    order_6 = BorrowOrder(
        reader_id=reader_5.id,
        book_id=books_by_key["policy"].id,
        assigned_copy_id=policy_delivery_copy.id,
        order_mode="robot_delivery",
        status="delivering",
        created_at=now - timedelta(hours=4, minutes=30),
        updated_at=now - timedelta(minutes=22),
        picked_at=now - timedelta(hours=4),
    )
    order_7 = BorrowOrder(
        reader_id=reader_6.id,
        book_id=books_by_key["service"].id,
        assigned_copy_id=service_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="awaiting_pick",
        created_at=now - timedelta(hours=14),
        updated_at=now - timedelta(hours=13, minutes=40),
    )
    order_8 = BorrowOrder(
        reader_id=reader_5.id,
        book_id=books_by_key["ux"].id,
        assigned_copy_id=ux_borrowed_copy.id,
        order_mode="robot_delivery",
        status="completed",
        created_at=now - timedelta(days=3, hours=2),
        updated_at=now - timedelta(days=2, hours=20),
        picked_at=now - timedelta(days=3, hours=1, minutes=10),
        delivered_at=now - timedelta(days=2, hours=21),
        completed_at=now - timedelta(days=2, hours=20),
    )
    order_9 = BorrowOrder(
        reader_id=reader_7.id,
        book_id=books_by_key["workflow"].id,
        assigned_copy_id=workflow_borrowed_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=5, hours=3),
        updated_at=now - timedelta(days=4, hours=20),
        picked_at=now - timedelta(days=5, hours=2, minutes=20),
        delivered_at=now - timedelta(days=4, hours=22),
        completed_at=now - timedelta(days=4, hours=20),
    )
    order_10 = BorrowOrder(
        reader_id=reader_8.id,
        book_id=books_by_key["security"].id,
        assigned_copy_id=security_delivery_copy.id,
        order_mode="robot_delivery",
        status="delivering",
        created_at=now - timedelta(hours=3, minutes=40),
        updated_at=now - timedelta(minutes=18),
        picked_at=now - timedelta(hours=3, minutes=10),
    )
    order_11 = BorrowOrder(
        reader_id=reader_9.id,
        book_id=books_by_key["leadership"].id,
        assigned_copy_id=leadership_borrowed_copy.id,
        order_mode="robot_delivery",
        status="delivered",
        created_at=now - timedelta(hours=28),
        updated_at=now - timedelta(hours=2, minutes=10),
        picked_at=now - timedelta(hours=27, minutes=15),
        delivered_at=now - timedelta(hours=2, minutes=10),
    )
    order_12 = BorrowOrder(
        reader_id=reader_10.id,
        book_id=books_by_key["database"].id,
        assigned_copy_id=database_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="awaiting_pick",
        created_at=now - timedelta(hours=9, minutes=20),
        updated_at=now - timedelta(hours=8, minutes=55),
    )
    order_13 = BorrowOrder(
        reader_id=reader_11.id,
        book_id=books_by_key["service_design"].id,
        assigned_copy_id=service_design_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="awaiting_pick",
        created_at=now - timedelta(hours=6, minutes=10),
        updated_at=now - timedelta(hours=5, minutes=30),
    )
    order_14 = BorrowOrder(
        reader_id=reader_12.id,
        book_id=books_by_key["automation"].id,
        assigned_copy_id=automation_borrowed_copy.id,
        order_mode="robot_delivery",
        status="completed",
        created_at=now - timedelta(days=6, hours=2),
        updated_at=now - timedelta(days=5, hours=18),
        picked_at=now - timedelta(days=6, hours=1, minutes=10),
        delivered_at=now - timedelta(days=5, hours=20),
        completed_at=now - timedelta(days=5, hours=18),
    )
    order_15 = BorrowOrder(
        reader_id=reader_8.id,
        book_id=books_by_key["prompt"].id,
        assigned_copy_id=prompt_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="awaiting_pick",
        created_at=now - timedelta(hours=18, minutes=10),
        updated_at=now - timedelta(hours=17, minutes=20),
    )
    order_16 = BorrowOrder(
        reader_id=reader_9.id,
        book_id=books_by_key["metrics"].id,
        assigned_copy_id=metrics_borrowed_copy.id,
        order_mode="robot_delivery",
        status="completed",
        created_at=now - timedelta(days=2, hours=3),
        updated_at=now - timedelta(days=1, hours=18),
        picked_at=now - timedelta(days=2, hours=2, minutes=10),
        delivered_at=now - timedelta(days=1, hours=20),
        completed_at=now - timedelta(days=1, hours=18),
    )
    order_17 = BorrowOrder(
        reader_id=reader_10.id,
        book_id=books_by_key["cloud"].id,
        assigned_copy_id=cloud_delivery_copy.id,
        order_mode="robot_delivery",
        status="delivering",
        created_at=now - timedelta(hours=2, minutes=20),
        updated_at=now - timedelta(minutes=9),
        picked_at=now - timedelta(hours=1, minutes=55),
    )
    order_18 = BorrowOrder(
        reader_id=reader_11.id,
        book_id=books_by_key["learning"].id,
        assigned_copy_id=learning_borrowed_copy.id,
        order_mode="robot_delivery",
        status="completed",
        created_at=now - timedelta(days=4, hours=6),
        updated_at=now - timedelta(days=3, hours=20),
        picked_at=now - timedelta(days=4, hours=5, minutes=20),
        delivered_at=now - timedelta(days=3, hours=22),
        completed_at=now - timedelta(days=3, hours=20),
    )
    order_19 = BorrowOrder(
        reader_id=reader_2.id,
        book_id=books_by_key["ops"].id,
        assigned_copy_id=delivered_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=1, hours=8),
        updated_at=now - timedelta(days=1, hours=6),
        picked_at=now - timedelta(days=1, hours=7, minutes=20),
        delivered_at=now - timedelta(days=1, hours=6, minutes=40),
        completed_at=now - timedelta(days=1, hours=6),
    )
    order_20 = BorrowOrder(
        reader_id=reader_3.id,
        book_id=books_by_key["genai"].id,
        assigned_copy_id=active_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=2, hours=5),
        updated_at=now - timedelta(days=2, hours=3),
        picked_at=now - timedelta(days=2, hours=4, minutes=15),
        delivered_at=now - timedelta(days=2, hours=3, minutes=35),
        completed_at=now - timedelta(days=2, hours=3),
    )
    order_21 = BorrowOrder(
        reader_id=reader_4.id,
        book_id=books_by_key["data"].id,
        assigned_copy_id=completed_pickup_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=1, hours=16),
        updated_at=now - timedelta(days=1, hours=14),
        picked_at=now - timedelta(days=1, hours=15, minutes=10),
        delivered_at=now - timedelta(days=1, hours=14, minutes=20),
        completed_at=now - timedelta(days=1, hours=14),
    )
    order_22 = BorrowOrder(
        reader_id=reader_5.id,
        book_id=books_by_key["service_design"].id,
        assigned_copy_id=service_design_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=3, hours=6),
        updated_at=now - timedelta(days=3, hours=4),
        picked_at=now - timedelta(days=3, hours=5, minutes=30),
        delivered_at=now - timedelta(days=3, hours=4, minutes=45),
        completed_at=now - timedelta(days=3, hours=4),
    )
    order_23 = BorrowOrder(
        reader_id=reader_6.id,
        book_id=books_by_key["cloud"].id,
        assigned_copy_id=cloud_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=4, hours=7),
        updated_at=now - timedelta(days=4, hours=5),
        picked_at=now - timedelta(days=4, hours=6, minutes=15),
        delivered_at=now - timedelta(days=4, hours=5, minutes=20),
        completed_at=now - timedelta(days=4, hours=5),
    )
    order_24 = BorrowOrder(
        reader_id=reader_7.id,
        book_id=books_by_key["database"].id,
        assigned_copy_id=database_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=5, hours=8),
        updated_at=now - timedelta(days=5, hours=6),
        picked_at=now - timedelta(days=5, hours=7, minutes=10),
        delivered_at=now - timedelta(days=5, hours=6, minutes=25),
        completed_at=now - timedelta(days=5, hours=6),
    )
    order_25 = BorrowOrder(
        reader_id=reader_8.id,
        book_id=books_by_key["ops"].id,
        assigned_copy_id=delivered_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=1, hours=4),
        updated_at=now - timedelta(days=1, hours=2),
        picked_at=now - timedelta(days=1, hours=3, minutes=20),
        delivered_at=now - timedelta(days=1, hours=2, minutes=30),
        completed_at=now - timedelta(days=1, hours=2),
    )
    order_26 = BorrowOrder(
        reader_id=reader_9.id,
        book_id=books_by_key["ops"].id,
        assigned_copy_id=delivered_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=2, hours=7),
        updated_at=now - timedelta(days=2, hours=5),
        picked_at=now - timedelta(days=2, hours=6, minutes=15),
        delivered_at=now - timedelta(days=2, hours=5, minutes=30),
        completed_at=now - timedelta(days=2, hours=5),
    )
    order_27 = BorrowOrder(
        reader_id=reader_10.id,
        book_id=books_by_key["ops"].id,
        assigned_copy_id=delivered_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=6, hours=4),
        updated_at=now - timedelta(days=6, hours=2),
        picked_at=now - timedelta(days=6, hours=3, minutes=30),
        delivered_at=now - timedelta(days=6, hours=2, minutes=40),
        completed_at=now - timedelta(days=6, hours=2),
    )
    order_28 = BorrowOrder(
        reader_id=reader_11.id,
        book_id=books_by_key["genai"].id,
        assigned_copy_id=active_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=1, hours=10),
        updated_at=now - timedelta(days=1, hours=8),
        picked_at=now - timedelta(days=1, hours=9, minutes=15),
        delivered_at=now - timedelta(days=1, hours=8, minutes=20),
        completed_at=now - timedelta(days=1, hours=8),
    )
    order_29 = BorrowOrder(
        reader_id=reader_12.id,
        book_id=books_by_key["genai"].id,
        assigned_copy_id=active_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=3, hours=9),
        updated_at=now - timedelta(days=3, hours=7),
        picked_at=now - timedelta(days=3, hours=8, minutes=25),
        delivered_at=now - timedelta(days=3, hours=7, minutes=35),
        completed_at=now - timedelta(days=3, hours=7),
    )
    order_30 = BorrowOrder(
        reader_id=reader_1.id,
        book_id=books_by_key["genai"].id,
        assigned_copy_id=active_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=5, hours=5),
        updated_at=now - timedelta(days=5, hours=3),
        picked_at=now - timedelta(days=5, hours=4, minutes=20),
        delivered_at=now - timedelta(days=5, hours=3, minutes=35),
        completed_at=now - timedelta(days=5, hours=3),
    )
    order_31 = BorrowOrder(
        reader_id=reader_2.id,
        book_id=books_by_key["data"].id,
        assigned_copy_id=completed_pickup_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=1, hours=21),
        updated_at=now - timedelta(days=1, hours=19),
        picked_at=now - timedelta(days=1, hours=20, minutes=15),
        delivered_at=now - timedelta(days=1, hours=19, minutes=30),
        completed_at=now - timedelta(days=1, hours=19),
    )
    order_32 = BorrowOrder(
        reader_id=reader_3.id,
        book_id=books_by_key["data"].id,
        assigned_copy_id=completed_pickup_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=4, hours=8),
        updated_at=now - timedelta(days=4, hours=6),
        picked_at=now - timedelta(days=4, hours=7, minutes=10),
        delivered_at=now - timedelta(days=4, hours=6, minutes=20),
        completed_at=now - timedelta(days=4, hours=6),
    )
    order_33 = BorrowOrder(
        reader_id=reader_4.id,
        book_id=books_by_key["service_design"].id,
        assigned_copy_id=service_design_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=2, hours=12),
        updated_at=now - timedelta(days=2, hours=10),
        picked_at=now - timedelta(days=2, hours=11, minutes=25),
        delivered_at=now - timedelta(days=2, hours=10, minutes=35),
        completed_at=now - timedelta(days=2, hours=10),
    )
    order_34 = BorrowOrder(
        reader_id=reader_5.id,
        book_id=books_by_key["service_design"].id,
        assigned_copy_id=service_design_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=5, hours=11),
        updated_at=now - timedelta(days=5, hours=9),
        picked_at=now - timedelta(days=5, hours=10, minutes=20),
        delivered_at=now - timedelta(days=5, hours=9, minutes=30),
        completed_at=now - timedelta(days=5, hours=9),
    )
    order_35 = BorrowOrder(
        reader_id=reader_6.id,
        book_id=books_by_key["cloud"].id,
        assigned_copy_id=cloud_delivery_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=6, hours=9),
        updated_at=now - timedelta(days=6, hours=7),
        picked_at=now - timedelta(days=6, hours=8, minutes=10),
        delivered_at=now - timedelta(days=6, hours=7, minutes=25),
        completed_at=now - timedelta(days=6, hours=7),
    )
    order_36 = BorrowOrder(
        reader_id=reader_7.id,
        book_id=books_by_key["database"].id,
        assigned_copy_id=database_reserved_copy.id,
        order_mode="cabinet_pickup",
        status="completed",
        created_at=now - timedelta(days=3, hours=14),
        updated_at=now - timedelta(days=3, hours=12),
        picked_at=now - timedelta(days=3, hours=13, minutes=5),
        delivered_at=now - timedelta(days=3, hours=12, minutes=20),
        completed_at=now - timedelta(days=3, hours=12),
    )
    session.add_all(
        [
            order_1,
            order_2,
            order_3,
            order_4,
            order_5,
            order_6,
            order_7,
            order_8,
            order_9,
            order_10,
            order_11,
            order_12,
            order_13,
            order_14,
            order_15,
            order_16,
            order_17,
            order_18,
            order_19,
            order_20,
            order_21,
            order_22,
            order_23,
            order_24,
            order_25,
            order_26,
            order_27,
            order_28,
            order_29,
            order_30,
            order_31,
            order_32,
            order_33,
            order_34,
            order_35,
            order_36,
        ]
    )
    session.flush()

    delivery_1 = DeliveryOrder(
        borrow_order_id=order_1.id,
        delivery_target="三楼南阅览区 A 区",
        eta_minutes=6,
        status="delivering",
        created_at=now - timedelta(hours=6),
        updated_at=now - timedelta(minutes=8),
    )
    delivery_2 = DeliveryOrder(
        borrow_order_id=order_4.id,
        delivery_target="二楼研讨间 04",
        eta_minutes=0,
        status="completed",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=3, hours=20),
        completed_at=now - timedelta(days=3, hours=20),
    )
    delivery_3 = DeliveryOrder(
        borrow_order_id=order_5.id,
        delivery_target="一楼服务台",
        eta_minutes=1,
        status="delivered",
        created_at=now - timedelta(hours=20),
        updated_at=now - timedelta(hours=1, minutes=40),
    )
    delivery_4 = DeliveryOrder(
        borrow_order_id=order_6.id,
        delivery_target="北区教师研修室",
        eta_minutes=5,
        status="delivering",
        created_at=now - timedelta(hours=4, minutes=30),
        updated_at=now - timedelta(minutes=22),
    )
    delivery_5 = DeliveryOrder(
        borrow_order_id=order_8.id,
        delivery_target="数字媒体实验室",
        eta_minutes=0,
        status="completed",
        created_at=now - timedelta(days=3, hours=2),
        updated_at=now - timedelta(days=2, hours=20),
        completed_at=now - timedelta(days=2, hours=20),
    )
    delivery_6 = DeliveryOrder(
        borrow_order_id=order_10.id,
        delivery_target="信息学院实验中心",
        eta_minutes=4,
        status="delivering",
        created_at=now - timedelta(hours=3, minutes=40),
        updated_at=now - timedelta(minutes=18),
    )
    delivery_7 = DeliveryOrder(
        borrow_order_id=order_11.id,
        delivery_target="艺术学院展厅准备区",
        eta_minutes=0,
        status="delivered",
        created_at=now - timedelta(hours=28),
        updated_at=now - timedelta(hours=2, minutes=10),
    )
    delivery_8 = DeliveryOrder(
        borrow_order_id=order_14.id,
        delivery_target="西区运营工位",
        eta_minutes=0,
        status="completed",
        created_at=now - timedelta(days=6, hours=2),
        updated_at=now - timedelta(days=5, hours=18),
        completed_at=now - timedelta(days=5, hours=18),
    )
    delivery_9 = DeliveryOrder(
        borrow_order_id=order_16.id,
        delivery_target="二楼数据分析室",
        eta_minutes=0,
        status="completed",
        created_at=now - timedelta(days=2, hours=3),
        updated_at=now - timedelta(days=1, hours=18),
        completed_at=now - timedelta(days=1, hours=18),
    )
    delivery_10 = DeliveryOrder(
        borrow_order_id=order_17.id,
        delivery_target="北区云原生工坊",
        eta_minutes=3,
        status="delivering",
        created_at=now - timedelta(hours=2, minutes=20),
        updated_at=now - timedelta(minutes=9),
    )
    delivery_11 = DeliveryOrder(
        borrow_order_id=order_18.id,
        delivery_target="学习共享空间 3A",
        eta_minutes=0,
        status="completed",
        created_at=now - timedelta(days=4, hours=6),
        updated_at=now - timedelta(days=3, hours=20),
        completed_at=now - timedelta(days=3, hours=20),
    )
    session.add_all(
        [
            delivery_1,
            delivery_2,
            delivery_3,
            delivery_4,
            delivery_5,
            delivery_6,
            delivery_7,
            delivery_8,
            delivery_9,
            delivery_10,
            delivery_11,
        ]
    )
    session.flush()

    task_1 = RobotTask(
        robot_id=robot_1.id,
        delivery_order_id=delivery_1.id,
        status="carrying",
        created_at=now - timedelta(hours=6),
        updated_at=now - timedelta(minutes=8),
    )
    task_2 = RobotTask(
        robot_id=robot_2.id,
        delivery_order_id=delivery_2.id,
        status="completed",
        created_at=now - timedelta(days=4),
        updated_at=now - timedelta(days=3, hours=20),
        completed_at=now - timedelta(days=3, hours=20),
    )
    task_3 = RobotTask(
        robot_id=robot_2.id,
        delivery_order_id=delivery_3.id,
        status="returning",
        created_at=now - timedelta(hours=20),
        updated_at=now - timedelta(hours=1, minutes=10),
    )
    task_4 = RobotTask(
        robot_id=robot_1.id,
        delivery_order_id=delivery_4.id,
        status="carrying",
        created_at=now - timedelta(hours=4, minutes=30),
        updated_at=now - timedelta(minutes=22),
    )
    task_5 = RobotTask(
        robot_id=robot_1.id,
        delivery_order_id=delivery_5.id,
        status="completed",
        created_at=now - timedelta(days=3, hours=2),
        updated_at=now - timedelta(days=2, hours=20),
        completed_at=now - timedelta(days=2, hours=20),
    )
    task_6 = RobotTask(
        robot_id=robot_3.id,
        delivery_order_id=delivery_6.id,
        status="carrying",
        created_at=now - timedelta(hours=3, minutes=40),
        updated_at=now - timedelta(minutes=18),
    )
    task_7 = RobotTask(
        robot_id=robot_2.id,
        delivery_order_id=delivery_7.id,
        status="returning",
        created_at=now - timedelta(hours=28),
        updated_at=now - timedelta(hours=1, minutes=50),
    )
    task_8 = RobotTask(
        robot_id=robot_1.id,
        delivery_order_id=delivery_8.id,
        status="completed",
        created_at=now - timedelta(days=6, hours=2),
        updated_at=now - timedelta(days=5, hours=18),
        completed_at=now - timedelta(days=5, hours=18),
    )
    task_9 = RobotTask(
        robot_id=robot_3.id,
        delivery_order_id=delivery_9.id,
        status="completed",
        created_at=now - timedelta(days=2, hours=3),
        updated_at=now - timedelta(days=1, hours=18),
        completed_at=now - timedelta(days=1, hours=18),
    )
    task_10 = RobotTask(
        robot_id=robot_2.id,
        delivery_order_id=delivery_10.id,
        status="carrying",
        created_at=now - timedelta(hours=2, minutes=20),
        updated_at=now - timedelta(minutes=9),
    )
    task_11 = RobotTask(
        robot_id=robot_3.id,
        delivery_order_id=delivery_11.id,
        status="completed",
        created_at=now - timedelta(days=4, hours=6),
        updated_at=now - timedelta(days=3, hours=20),
        completed_at=now - timedelta(days=3, hours=20),
    )
    session.add_all([task_1, task_2, task_3, task_4, task_5, task_6, task_7, task_8, task_9, task_10, task_11])
    session.flush()

    session.add_all(
        [
            ReturnRequest(
                borrow_order_id=order_2.id,
                note="已阅读完毕，准备归还到东区主书柜",
                status="created",
                created_at=now - timedelta(hours=12),
                updated_at=now - timedelta(hours=12),
            ),
            ReturnRequest(
                borrow_order_id=order_4.id,
                note="借阅周期结束，等待老师统一归还",
                status="created",
                created_at=now - timedelta(hours=3),
                updated_at=now - timedelta(hours=3),
            ),
            ReturnRequest(
                borrow_order_id=order_8.id,
                note="课程展示结束后统一归还到南区副书柜",
                status="created",
                created_at=now - timedelta(hours=6),
                updated_at=now - timedelta(hours=6),
            ),
            ReturnRequest(
                borrow_order_id=order_9.id,
                note="工作流课程项目已结束，计划归还到西区流通柜。",
                status="created",
                created_at=now - timedelta(hours=16),
                updated_at=now - timedelta(hours=16),
            ),
            ReturnRequest(
                borrow_order_id=order_14.id,
                note="自动化脚本演示完成，等待机器人回收。",
                status="created",
                created_at=now - timedelta(hours=10),
                updated_at=now - timedelta(hours=10),
            ),
            ReturnRequest(
                borrow_order_id=order_16.id,
                note="指标复盘会结束后统一归还。",
                status="created",
                created_at=now - timedelta(hours=5),
                updated_at=now - timedelta(hours=5),
            ),
            ReturnRequest(
                borrow_order_id=order_18.id,
                note="学习空间共创结束后归还到北区研修柜。",
                status="created",
                created_at=now - timedelta(hours=2, minutes=30),
                updated_at=now - timedelta(hours=2, minutes=30),
            ),
        ]
    )

    robot_event_specs = [
        (robot_2.id, task_2.id, "order_created", now - timedelta(days=4), {"delivery_target": "二楼研讨间 04", "borrow_order_id": order_4.id, "borrow_status": "created"}),
        (robot_2.id, task_2.id, "order_progressed", now - timedelta(days=3, hours=23), {"delivery_target": "二楼研讨间 04", "borrow_order_id": order_4.id, "borrow_status": "delivering"}),
        (robot_2.id, task_2.id, "order_progressed", now - timedelta(days=3, hours=20), {"delivery_target": "二楼研讨间 04", "borrow_order_id": order_4.id, "borrow_status": "completed"}),
        (robot_1.id, task_1.id, "order_created", now - timedelta(hours=6), {"delivery_target": "三楼南阅览区 A 区", "borrow_order_id": order_1.id, "borrow_status": "created"}),
        (robot_1.id, task_1.id, "order_progressed", now - timedelta(minutes=40), {"delivery_target": "三楼南阅览区 A 区", "borrow_order_id": order_1.id, "borrow_status": "delivering"}),
        (robot_2.id, task_3.id, "order_progressed", now - timedelta(hours=1, minutes=30), {"delivery_target": "一楼服务台", "borrow_order_id": order_5.id, "borrow_status": "delivered"}),
        (robot_2.id, task_3.id, "admin_correction", now - timedelta(hours=1, minutes=5), {"delivery_target": "一楼服务台", "borrow_order_id": order_5.id, "borrow_status": "delivered"}),
        (robot_1.id, task_4.id, "order_created", now - timedelta(hours=4, minutes=30), {"delivery_target": "北区教师研修室", "borrow_order_id": order_6.id, "borrow_status": "created"}),
        (robot_1.id, task_4.id, "order_progressed", now - timedelta(minutes=22), {"delivery_target": "北区教师研修室", "borrow_order_id": order_6.id, "borrow_status": "delivering"}),
        (robot_1.id, task_5.id, "order_created", now - timedelta(days=3, hours=2), {"delivery_target": "数字媒体实验室", "borrow_order_id": order_8.id, "borrow_status": "created"}),
        (robot_1.id, task_5.id, "order_progressed", now - timedelta(days=2, hours=23), {"delivery_target": "数字媒体实验室", "borrow_order_id": order_8.id, "borrow_status": "delivering"}),
        (robot_1.id, task_5.id, "order_progressed", now - timedelta(days=2, hours=20), {"delivery_target": "数字媒体实验室", "borrow_order_id": order_8.id, "borrow_status": "completed"}),
        (robot_3.id, task_6.id, "order_created", now - timedelta(hours=3, minutes=40), {"delivery_target": "信息学院实验中心", "borrow_order_id": order_10.id, "borrow_status": "created"}),
        (robot_3.id, task_6.id, "order_progressed", now - timedelta(minutes=18), {"delivery_target": "信息学院实验中心", "borrow_order_id": order_10.id, "borrow_status": "delivering"}),
        (robot_2.id, task_7.id, "order_created", now - timedelta(hours=28), {"delivery_target": "艺术学院展厅准备区", "borrow_order_id": order_11.id, "borrow_status": "created"}),
        (robot_2.id, task_7.id, "order_progressed", now - timedelta(hours=2, minutes=10), {"delivery_target": "艺术学院展厅准备区", "borrow_order_id": order_11.id, "borrow_status": "delivered"}),
        (robot_2.id, task_7.id, "admin_correction", now - timedelta(hours=1, minutes=50), {"delivery_target": "艺术学院展厅准备区", "borrow_order_id": order_11.id, "borrow_status": "delivered"}),
        (robot_1.id, task_8.id, "order_created", now - timedelta(days=6, hours=2), {"delivery_target": "西区运营工位", "borrow_order_id": order_14.id, "borrow_status": "created"}),
        (robot_1.id, task_8.id, "order_progressed", now - timedelta(days=5, hours=21), {"delivery_target": "西区运营工位", "borrow_order_id": order_14.id, "borrow_status": "delivering"}),
        (robot_1.id, task_8.id, "order_progressed", now - timedelta(days=5, hours=18), {"delivery_target": "西区运营工位", "borrow_order_id": order_14.id, "borrow_status": "completed"}),
        (robot_3.id, task_9.id, "order_created", now - timedelta(days=2, hours=3), {"delivery_target": "二楼数据分析室", "borrow_order_id": order_16.id, "borrow_status": "created"}),
        (robot_3.id, task_9.id, "order_progressed", now - timedelta(days=1, hours=20), {"delivery_target": "二楼数据分析室", "borrow_order_id": order_16.id, "borrow_status": "delivering"}),
        (robot_3.id, task_9.id, "order_progressed", now - timedelta(days=1, hours=18), {"delivery_target": "二楼数据分析室", "borrow_order_id": order_16.id, "borrow_status": "completed"}),
        (robot_2.id, task_10.id, "order_created", now - timedelta(hours=2, minutes=20), {"delivery_target": "北区云原生工坊", "borrow_order_id": order_17.id, "borrow_status": "created"}),
        (robot_2.id, task_10.id, "order_progressed", now - timedelta(minutes=9), {"delivery_target": "北区云原生工坊", "borrow_order_id": order_17.id, "borrow_status": "delivering"}),
        (robot_3.id, task_11.id, "order_created", now - timedelta(days=4, hours=6), {"delivery_target": "学习共享空间 3A", "borrow_order_id": order_18.id, "borrow_status": "created"}),
        (robot_3.id, task_11.id, "order_progressed", now - timedelta(days=3, hours=22), {"delivery_target": "学习共享空间 3A", "borrow_order_id": order_18.id, "borrow_status": "delivering"}),
        (robot_3.id, task_11.id, "order_progressed", now - timedelta(days=3, hours=20), {"delivery_target": "学习共享空间 3A", "borrow_order_id": order_18.id, "borrow_status": "completed"}),
    ]
    session.add_all(
        [
            RobotStatusEvent(
                robot_id=robot_id,
                task_id=task_id,
                event_type=event_type,
                metadata_json=payload,
                created_at=created_at,
            )
            for robot_id, task_id, event_type, created_at, payload in robot_event_specs
        ]
    )

    inventory_event_specs = [
        ("cabinet-001", "book_stored", "A01", books_by_key["ops"].id, copies[0].id, now - timedelta(days=7), {"source": "manual_seed"}),
        ("cabinet-001", "book_stored", "A02", books_by_key["genai"].id, copies[2].id, now - timedelta(days=6, hours=20), {"source": "manual_seed"}),
        ("cabinet-001", "book_picked", "A04", books_by_key["genai"].id, active_delivery_copy.id, now - timedelta(hours=6), {"borrow_order_id": order_1.id}),
        ("cabinet-001", "book_picked", "A05", books_by_key["python"].id, awaiting_pick_copy.id, now - timedelta(hours=10), {"borrow_order_id": order_3.id}),
        ("cabinet-002", "book_stored", "B03", books_by_key["rec"].id, copies[9].id, now - timedelta(days=2), {"source": "manual_seed"}),
        ("cabinet-002", "stock_recount", "B04", books_by_key["ocr"].id, copies[10].id, now - timedelta(hours=4), {"operator": "seed-script"}),
        ("cabinet-001", "book_stored", "A03", books_by_key["policy"].id, copies[6].id, now - timedelta(days=5), {"source": "manual_seed"}),
        ("cabinet-001", "book_stored", "A06", books_by_key["service"].id, copies[8].id, now - timedelta(days=4, hours=6), {"source": "manual_seed"}),
        ("cabinet-001", "book_picked", "A07", books_by_key["policy"].id, policy_delivery_copy.id, now - timedelta(hours=4, minutes=30), {"borrow_order_id": order_6.id}),
        ("cabinet-002", "book_stored", "B06", books_by_key["network"].id, copies[17].id, now - timedelta(days=1, hours=8), {"operator": "seed-script"}),
        ("cabinet-003", "book_stored", "C01", books_by_key["workflow"].id, next(copy for copy in copies if copy.book_id == books_by_key["workflow"].id and copy.inventory_status == "stored").id, now - timedelta(days=6, hours=8), {"source": "manual_seed"}),
        ("cabinet-003", "book_stored", "C02", books_by_key["security"].id, next(copy for copy in copies if copy.book_id == books_by_key["security"].id and copy.inventory_status == "stored").id, now - timedelta(days=5, hours=18), {"source": "manual_seed"}),
        ("cabinet-003", "book_stored", "C03", books_by_key["research"].id, next(copy for copy in copies if copy.book_id == books_by_key["research"].id and copy.inventory_status == "stored").id, now - timedelta(days=5, hours=3), {"source": "manual_seed"}),
        ("cabinet-003", "book_stored", "C04", books_by_key["leadership"].id, next(copy for copy in copies if copy.book_id == books_by_key["leadership"].id and copy.inventory_status == "stored").id, now - timedelta(days=4, hours=16), {"source": "manual_seed"}),
        ("cabinet-003", "book_stored", "C05", books_by_key["database"].id, next(copy for copy in copies if copy.book_id == books_by_key["database"].id and copy.inventory_status == "stored").id, now - timedelta(days=4, hours=6), {"source": "manual_seed"}),
        ("cabinet-003", "stock_recount", "C06", books_by_key["service_design"].id, next(copy for copy in copies if copy.book_id == books_by_key["service_design"].id and copy.inventory_status == "stored").id, now - timedelta(hours=11), {"operator": "seed-script"}),
        ("cabinet-003", "book_picked", "C07", books_by_key["security"].id, security_delivery_copy.id, now - timedelta(hours=3, minutes=40), {"borrow_order_id": order_10.id}),
        ("cabinet-003", "book_picked", "C08", books_by_key["database"].id, database_reserved_copy.id, now - timedelta(hours=9, minutes=20), {"borrow_order_id": order_12.id}),
        ("cabinet-004", "book_stored", "D01", books_by_key["automation"].id, next(copy for copy in copies if copy.book_id == books_by_key["automation"].id and copy.inventory_status == "stored").id, now - timedelta(days=6, hours=6), {"source": "manual_seed"}),
        ("cabinet-004", "book_stored", "D02", books_by_key["prompt"].id, next(copy for copy in copies if copy.book_id == books_by_key["prompt"].id and copy.inventory_status == "stored").id, now - timedelta(days=3, hours=12), {"source": "manual_seed"}),
        ("cabinet-004", "book_stored", "D03", books_by_key["metrics"].id, next(copy for copy in copies if copy.book_id == books_by_key["metrics"].id and copy.inventory_status == "stored").id, now - timedelta(days=2, hours=22), {"source": "manual_seed"}),
        ("cabinet-004", "book_stored", "D04", books_by_key["cloud"].id, next(copy for copy in copies if copy.book_id == books_by_key["cloud"].id and copy.inventory_status == "stored").id, now - timedelta(days=1, hours=20), {"source": "manual_seed"}),
        ("cabinet-004", "stock_recount", "D05", books_by_key["media"].id, next(copy for copy in copies if copy.book_id == books_by_key["media"].id and copy.inventory_status == "stored").id, now - timedelta(hours=7), {"operator": "seed-script"}),
        ("cabinet-004", "book_picked", "D08", books_by_key["cloud"].id, cloud_delivery_copy.id, now - timedelta(hours=2, minutes=20), {"borrow_order_id": order_17.id}),
    ]
    session.add_all(
        [
            InventoryEvent(
                cabinet_id=cabinet_id,
                event_type=event_type,
                slot_code=slot_code,
                book_id=book_id,
                copy_id=copy_id,
                payload_json=payload_json,
                created_at=created_at,
            )
            for cabinet_id, event_type, slot_code, book_id, copy_id, created_at, payload_json in inventory_event_specs
        ]
    )

    search_specs = [
        (reader_1.id, "AI 管理 入门", "natural_language", now - timedelta(hours=7)),
        (reader_1.id, "后台 指挥台 设计", "natural_language", now - timedelta(hours=5)),
        (reader_2.id, "产品 数据密集", "keyword", now - timedelta(days=1)),
        (reader_2.id, "推荐系统 实战", "keyword", now - timedelta(hours=15)),
        (reader_3.id, "自动化 脚本", "natural_language", now - timedelta(hours=12)),
        (reader_3.id, "校园 系统 架构", "keyword", now - timedelta(hours=11)),
        (reader_4.id, "OCR 数字化", "keyword", now - timedelta(hours=9)),
        (reader_4.id, "交互 设计 入门", "natural_language", now - timedelta(hours=8)),
        (reader_5.id, "权限 系统 治理", "keyword", now - timedelta(hours=4, minutes=20)),
        (reader_5.id, "图书馆 服务 蓝图", "natural_language", now - timedelta(hours=3, minutes=40)),
        (reader_6.id, "交互 节奏 设计", "keyword", now - timedelta(hours=14)),
        (reader_6.id, "边缘 设备 运维", "keyword", now - timedelta(hours=13, minutes=15)),
        (reader_7.id, "工作流 自动化 协同", "natural_language", now - timedelta(days=1, hours=4)),
        (reader_7.id, "流程 编排 设计", "keyword", now - timedelta(days=1, hours=2)),
        (reader_8.id, "安全 权限 运营", "keyword", now - timedelta(hours=3, minutes=50)),
        (reader_8.id, "云原生 运维", "natural_language", now - timedelta(hours=2, minutes=40)),
        (reader_9.id, "领导力 服务 协作", "keyword", now - timedelta(hours=30)),
        (reader_9.id, "指标 看板 设计", "natural_language", now - timedelta(days=2, hours=4)),
        (reader_10.id, "数据库 容灾", "keyword", now - timedelta(hours=9, minutes=30)),
        (reader_10.id, "云原生 发布 治理", "keyword", now - timedelta(hours=2, minutes=10)),
        (reader_11.id, "服务地图 旅程", "natural_language", now - timedelta(hours=6, minutes=15)),
        (reader_11.id, "学习空间 设计", "keyword", now - timedelta(days=4, hours=4)),
        (reader_12.id, "自动化 脚本 案例", "keyword", now - timedelta(days=6, hours=1)),
        (reader_12.id, "知识检索 提示词", "natural_language", now - timedelta(hours=18)),
        (reader_1.id, "服务 触点 后台 协同", "natural_language", now - timedelta(hours=2)),
        (reader_2.id, "媒体 资产 编目", "keyword", now - timedelta(days=2, hours=6)),
        (reader_5.id, "学习空间 知识 服务", "natural_language", now - timedelta(hours=1, minutes=20)),
        (reader_6.id, "数据库 可靠性", "keyword", now - timedelta(hours=7, minutes=30)),
    ]
    session.add_all(
        [
            SearchLog(reader_id=reader_id, query_text=query_text, query_mode=query_mode, created_at=created_at)
            for reader_id, query_text, query_mode, created_at in search_specs
        ]
    )

    recommendation_specs = [
        (reader_1.id, books_by_key["genai"].id, "AI 管理 入门", "生成式 AI 管理实践", 1, 0.96, "seed", "适合当前 AI 管理主题检索", now - timedelta(hours=7)),
        (reader_1.id, books_by_key["ops"].id, "后台 指挥台 设计", "智能图书馆运营实战", 2, 0.88, "seed", "和运营指挥台主题高度相关", now - timedelta(hours=5)),
        (reader_2.id, books_by_key["data"].id, "产品 数据密集", "数据密集型产品设计", 1, 0.94, "seed", "命中高密度数据管理主题", now - timedelta(days=1)),
        (reader_2.id, books_by_key["rec"].id, "推荐系统 实战", "机器学习推荐系统", 1, 0.93, "seed", "契合推荐系统学习路径", now - timedelta(hours=15)),
        (reader_3.id, books_by_key["python"].id, "自动化 脚本", "Python 自动化与管理脚本", 1, 0.9, "seed", "满足自动化脚本需求", now - timedelta(hours=12)),
        (reader_4.id, books_by_key["ocr"].id, "OCR 数字化", "OCR 与文档数字化", 1, 0.95, "seed", "紧贴 OCR 和数字化主题", now - timedelta(hours=9)),
        (reader_5.id, books_by_key["policy"].id, "权限 系统 治理", "知识治理与权限设计", 1, 0.97, "seed", "覆盖治理台最常见的权限设计议题", now - timedelta(hours=4, minutes=20)),
        (reader_5.id, books_by_key["service"].id, "图书馆 服务 蓝图", "服务蓝图与系统运营", 2, 0.91, "seed", "适合把前台触点与后台运营串起来", now - timedelta(hours=3, minutes=40)),
        (reader_6.id, books_by_key["ux"].id, "交互 节奏 设计", "界面系统与交互节奏", 1, 0.96, "seed", "直接命中界面节奏与交互语言主题", now - timedelta(hours=14)),
        (reader_6.id, books_by_key["network"].id, "边缘 设备 运维", "校园网络与边缘设备运维", 1, 0.89, "seed", "补充设备和网络巡检运维视角", now - timedelta(hours=13, minutes=15)),
        (reader_7.id, books_by_key["workflow"].id, "工作流 自动化 协同", "协同工作流编排方法", 1, 0.95, "seed", "非常适合工作流配置和协作编排主题", now - timedelta(days=1, hours=4)),
        (reader_7.id, books_by_key["service_design"].id, "流程 编排 设计", "服务设计地图", 2, 0.88, "seed", "可以把前台流程和后台协同关系串起来", now - timedelta(days=1, hours=2)),
        (reader_8.id, books_by_key["security"].id, "安全 权限 运营", "校园安全与权限运营", 1, 0.96, "seed", "覆盖权限治理和安全运营重点", now - timedelta(hours=3, minutes=50)),
        (reader_8.id, books_by_key["cloud"].id, "云原生 运维", "云原生应用运维", 2, 0.9, "seed", "补齐云原生发布和运维视角", now - timedelta(hours=2, minutes=40)),
        (reader_9.id, books_by_key["leadership"].id, "领导力 服务 协作", "组织领导力与服务协作", 1, 0.92, "seed", "适合组织协作和服务管理主题", now - timedelta(hours=30)),
        (reader_9.id, books_by_key["metrics"].id, "指标 看板 设计", "指标系统设计手册", 1, 0.94, "seed", "有助于构建可执行的指标体系", now - timedelta(days=2, hours=4)),
        (reader_10.id, books_by_key["database"].id, "数据库 容灾", "数据库可靠性工程", 1, 0.97, "seed", "直接命中数据库可靠性和容灾设计", now - timedelta(hours=9, minutes=30)),
        (reader_10.id, books_by_key["cloud"].id, "云原生 发布 治理", "云原生应用运维", 2, 0.91, "seed", "适合作为数据库运维的配套阅读", now - timedelta(hours=2, minutes=10)),
        (reader_11.id, books_by_key["service_design"].id, "服务地图 旅程", "服务设计地图", 1, 0.95, "seed", "可以帮你拆出服务旅程和支撑节点", now - timedelta(hours=6, minutes=15)),
        (reader_11.id, books_by_key["learning"].id, "学习空间 设计", "学习空间与知识服务", 1, 0.93, "seed", "和学习空间、知识服务主题高度相关", now - timedelta(days=4, hours=4)),
        (reader_12.id, books_by_key["automation"].id, "自动化 脚本 案例", "运营自动化脚本集", 1, 0.94, "seed", "适合快速搭建自动化脚本实践", now - timedelta(days=6, hours=1)),
        (reader_12.id, books_by_key["prompt"].id, "知识检索 提示词", "提示词工程与知识检索", 2, 0.92, "seed", "适合作为 AI 检索与问答的延伸阅读", now - timedelta(hours=18)),
        (reader_2.id, books_by_key["media"].id, "媒体 资产 编目", "媒体资产管理实务", 1, 0.89, "seed", "补充数字化编目和媒体资料管理视角", now - timedelta(days=2, hours=6)),
        (reader_4.id, books_by_key["research"].id, "科研服务协同", "科研服务数字化转型", 2, 0.87, "seed", "帮助理解科研资料流转和服务协同", now - timedelta(days=1, hours=10)),
    ]
    session.add_all(
        [
            RecommendationLog(
                reader_id=reader_id,
                book_id=book_id,
                query_text=query_text,
                result_title=result_title,
                rank_position=rank_position,
                score=score,
                provider_note=provider_note,
                explanation=explanation,
                evidence_json={"source": "demo_seed", "book_id": book_id},
                created_at=created_at,
            )
            for reader_id, book_id, query_text, result_title, rank_position, score, provider_note, explanation, created_at in recommendation_specs
        ]
    )

    session_specs = [
        (reader_1.id, "active", now - timedelta(hours=7), now - timedelta(hours=5)),
        (reader_1.id, "closed", now - timedelta(days=1), now - timedelta(days=1, minutes=30)),
        (reader_2.id, "active", now - timedelta(hours=16), now - timedelta(hours=15)),
        (reader_4.id, "active", now - timedelta(hours=9), now - timedelta(hours=8)),
        (reader_5.id, "active", now - timedelta(hours=4, minutes=25), now - timedelta(hours=3, minutes=35)),
        (reader_6.id, "active", now - timedelta(hours=14), now - timedelta(hours=13, minutes=10)),
        (reader_7.id, "closed", now - timedelta(days=1, hours=4), now - timedelta(days=1, hours=3, minutes=20)),
        (reader_8.id, "active", now - timedelta(hours=3, minutes=50), now - timedelta(hours=2, minutes=35)),
        (reader_9.id, "closed", now - timedelta(hours=30), now - timedelta(hours=29, minutes=10)),
        (reader_10.id, "active", now - timedelta(hours=9, minutes=30), now - timedelta(hours=2, minutes=5)),
        (reader_11.id, "active", now - timedelta(hours=6, minutes=15), now - timedelta(hours=5, minutes=5)),
        (reader_12.id, "closed", now - timedelta(days=6, hours=1), now - timedelta(days=5, hours=23, minutes=40)),
    ]
    conversations: list[ConversationSession] = []
    for reader_id, status, created_at, updated_at in session_specs:
        conversation = ConversationSession(
            reader_id=reader_id,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
        )
        session.add(conversation)
        session.flush()
        conversations.append(conversation)

    message_specs = [
        (conversations[0].id, "user", "我想看关于 AI 管理的入门书。", now - timedelta(hours=7), {"source": "chat"}),
        (conversations[0].id, "assistant", "可以先看《生成式 AI 管理实践》。", now - timedelta(hours=7) + timedelta(minutes=2), {"recommendation_book_id": books_by_key["genai"].id}),
        (conversations[0].id, "user", "还想了解后台指挥台。", now - timedelta(hours=5, minutes=10), {"source": "chat"}),
        (conversations[1].id, "user", "上次借的书什么时候要还？", now - timedelta(days=1), {"source": "chat"}),
        (conversations[1].id, "assistant", "你有一笔完成订单，归还申请已创建。", now - timedelta(days=1) + timedelta(minutes=1), {"borrow_order_id": order_2.id}),
        (conversations[2].id, "user", "有没有适合做高密度后台的书？", now - timedelta(hours=16), {"source": "chat"}),
        (conversations[2].id, "assistant", "推荐《数据密集型产品设计》。", now - timedelta(hours=16) + timedelta(minutes=2), {"recommendation_book_id": books_by_key["data"].id}),
        (conversations[2].id, "assistant", "也可以搭配《机器学习推荐系统》一起看。", now - timedelta(hours=15, minutes=55), {"recommendation_book_id": books_by_key["rec"].id}),
        (conversations[3].id, "user", "OCR 入柜识别总是匹配错怎么办？", now - timedelta(hours=9), {"source": "chat"}),
        (conversations[3].id, "assistant", "先检查图片清晰度，再看候选书目匹配。", now - timedelta(hours=9) + timedelta(minutes=3), {"source": "support"}),
        (conversations[3].id, "assistant", "你可以先参考《OCR 与文档数字化》。", now - timedelta(hours=8, minutes=50), {"recommendation_book_id": books_by_key["ocr"].id}),
        (conversations[4].id, "user", "权限系统分层应该怎么做？", now - timedelta(hours=4, minutes=25), {"source": "chat"}),
        (conversations[4].id, "assistant", "可以先看《知识治理与权限设计》，它对角色和边界讲得很清楚。", now - timedelta(hours=4, minutes=23), {"recommendation_book_id": books_by_key["policy"].id}),
        (conversations[4].id, "assistant", "如果你还要梳理服务触点，再补《服务蓝图与系统运营》。", now - timedelta(hours=3, minutes=36), {"recommendation_book_id": books_by_key["service"].id}),
        (conversations[5].id, "user", "有没有讲界面节奏和动效的书？", now - timedelta(hours=14), {"source": "chat"}),
        (conversations[5].id, "assistant", "推荐《界面系统与交互节奏》，很适合做后台界面参考。", now - timedelta(hours=13, minutes=56), {"recommendation_book_id": books_by_key["ux"].id}),
        (conversations[6].id, "user", "我想把多团队流程串起来，有什么书适合？", now - timedelta(days=1, hours=4), {"source": "chat"}),
        (conversations[6].id, "assistant", "可以先看《协同工作流编排方法》。", now - timedelta(days=1, hours=3, minutes=56), {"recommendation_book_id": books_by_key["workflow"].id}),
        (conversations[6].id, "assistant", "如果你还要补服务旅程视角，再看《服务设计地图》。", now - timedelta(days=1, hours=3, minutes=48), {"recommendation_book_id": books_by_key["service_design"].id}),
        (conversations[7].id, "user", "权限运营和云原生运维我都想补一下。", now - timedelta(hours=3, minutes=50), {"source": "chat"}),
        (conversations[7].id, "assistant", "先看《校园安全与权限运营》，再配《云原生应用运维》。", now - timedelta(hours=3, minutes=47), {"recommendation_book_id": books_by_key["security"].id}),
        (conversations[7].id, "user", "那我先下单安全治理这本。", now - timedelta(hours=3, minutes=35), {"borrow_order_id": order_10.id}),
        (conversations[8].id, "user", "有没有适合带团队做服务协同的书？", now - timedelta(hours=30), {"source": "chat"}),
        (conversations[8].id, "assistant", "《组织领导力与服务协作》会很适合你。", now - timedelta(hours=29, minutes=54), {"recommendation_book_id": books_by_key["leadership"].id}),
        (conversations[9].id, "user", "数据库可靠性和云原生治理想一起学。", now - timedelta(hours=9, minutes=30), {"source": "chat"}),
        (conversations[9].id, "assistant", "先看《数据库可靠性工程》，再搭配《云原生应用运维》。", now - timedelta(hours=9, minutes=26), {"recommendation_book_id": books_by_key["database"].id}),
        (conversations[9].id, "assistant", "这两本组合很适合值班和发布治理场景。", now - timedelta(hours=9, minutes=21), {"recommendation_book_id": books_by_key["cloud"].id}),
        (conversations[10].id, "user", "我在做学习空间服务地图，有参考书吗？", now - timedelta(hours=6, minutes=15), {"source": "chat"}),
        (conversations[10].id, "assistant", "先看《服务设计地图》。", now - timedelta(hours=6, minutes=12), {"recommendation_book_id": books_by_key["service_design"].id}),
        (conversations[10].id, "assistant", "再补《学习空间与知识服务》，会更完整。", now - timedelta(hours=6, minutes=8), {"recommendation_book_id": books_by_key["learning"].id}),
        (conversations[11].id, "user", "有没有把自动化脚本和提示词工程一起讲的？", now - timedelta(days=6, hours=1), {"source": "chat"}),
        (conversations[11].id, "assistant", "可以先读《运营自动化脚本集》，再补《提示词工程与知识检索》。", now - timedelta(days=6, hours=0, minutes=56), {"recommendation_book_id": books_by_key["automation"].id}),
    ]
    session.add_all(
        [
            ConversationMessage(
                session_id=session_id,
                role=role,
                content=content,
                metadata_json=metadata_json,
                created_at=created_at,
            )
            for session_id, role, content, created_at, metadata_json in message_specs
        ]
    )

    reading_event_specs = [
        (reader_1.id, "borrow_order_created", {"borrow_order_id": order_1.id}, now - timedelta(hours=6)),
        (reader_1.id, "recommendation_viewed", {"book_id": books_by_key["genai"].id}, now - timedelta(hours=5)),
        (reader_2.id, "borrow_order_completed", {"borrow_order_id": order_2.id}, now - timedelta(days=1, hours=18)),
        (reader_2.id, "return_request_created", {"borrow_order_id": order_2.id}, now - timedelta(hours=12)),
        (reader_3.id, "borrow_order_created", {"borrow_order_id": order_3.id}, now - timedelta(hours=10)),
        (reader_3.id, "search_performed", {"query": "自动化 脚本"}, now - timedelta(hours=12)),
        (reader_4.id, "borrow_order_created", {"borrow_order_id": order_5.id}, now - timedelta(hours=20)),
        (reader_4.id, "conversation_started", {"session_id": conversations[3].id}, now - timedelta(hours=9)),
        (reader_1.id, "delivery_completed", {"borrow_order_id": order_5.id}, now - timedelta(hours=1, minutes=40)),
        (reader_1.id, "borrow_order_completed", {"borrow_order_id": order_4.id}, now - timedelta(days=3, hours=20)),
        (reader_5.id, "borrow_order_created", {"borrow_order_id": order_6.id}, now - timedelta(hours=4, minutes=30)),
        (reader_5.id, "recommendation_viewed", {"book_id": books_by_key["policy"].id}, now - timedelta(hours=3, minutes=50)),
        (reader_5.id, "borrow_order_completed", {"borrow_order_id": order_8.id}, now - timedelta(days=2, hours=20)),
        (reader_6.id, "borrow_order_created", {"borrow_order_id": order_7.id}, now - timedelta(hours=14)),
        (reader_6.id, "conversation_started", {"session_id": conversations[5].id}, now - timedelta(hours=14)),
        (reader_7.id, "borrow_order_completed", {"borrow_order_id": order_9.id}, now - timedelta(days=4, hours=20)),
        (reader_7.id, "recommendation_viewed", {"book_id": books_by_key["workflow"].id}, now - timedelta(days=1, hours=2)),
        (reader_7.id, "conversation_started", {"session_id": conversations[6].id}, now - timedelta(days=1, hours=4)),
        (reader_7.id, "return_request_created", {"borrow_order_id": order_9.id}, now - timedelta(hours=16)),
        (reader_8.id, "borrow_order_created", {"borrow_order_id": order_10.id}, now - timedelta(hours=3, minutes=40)),
        (reader_8.id, "borrow_order_created", {"borrow_order_id": order_15.id}, now - timedelta(hours=18, minutes=10)),
        (reader_8.id, "recommendation_viewed", {"book_id": books_by_key["security"].id}, now - timedelta(hours=3, minutes=47)),
        (reader_8.id, "conversation_started", {"session_id": conversations[7].id}, now - timedelta(hours=3, minutes=50)),
        (reader_9.id, "borrow_order_created", {"borrow_order_id": order_11.id}, now - timedelta(hours=28)),
        (reader_9.id, "borrow_order_completed", {"borrow_order_id": order_16.id}, now - timedelta(days=1, hours=18)),
        (reader_9.id, "recommendation_viewed", {"book_id": books_by_key["leadership"].id}, now - timedelta(hours=29, minutes=54)),
        (reader_10.id, "borrow_order_created", {"borrow_order_id": order_12.id}, now - timedelta(hours=9, minutes=20)),
        (reader_10.id, "borrow_order_created", {"borrow_order_id": order_17.id}, now - timedelta(hours=2, minutes=20)),
        (reader_10.id, "conversation_started", {"session_id": conversations[9].id}, now - timedelta(hours=9, minutes=30)),
        (reader_10.id, "recommendation_viewed", {"book_id": books_by_key["database"].id}, now - timedelta(hours=9, minutes=26)),
        (reader_11.id, "borrow_order_created", {"borrow_order_id": order_13.id}, now - timedelta(hours=6, minutes=10)),
        (reader_11.id, "borrow_order_completed", {"borrow_order_id": order_18.id}, now - timedelta(days=3, hours=20)),
        (reader_11.id, "recommendation_viewed", {"book_id": books_by_key["learning"].id}, now - timedelta(hours=6, minutes=8)),
        (reader_11.id, "conversation_started", {"session_id": conversations[10].id}, now - timedelta(hours=6, minutes=15)),
        (reader_12.id, "borrow_order_completed", {"borrow_order_id": order_14.id}, now - timedelta(days=5, hours=18)),
        (reader_12.id, "conversation_started", {"session_id": conversations[11].id}, now - timedelta(days=6, hours=1)),
    ]
    session.add_all(
        [
            ReadingEvent(
                reader_id=reader_id,
                event_type=event_type,
                metadata_json=metadata_json,
                created_at=created_at,
            )
            for reader_id, event_type, metadata_json, created_at in reading_event_specs
        ]
    )

    session.add(
        AdminActionLog(
            admin_id=admin.id,
            target_type="borrow_order_bundle",
            target_id=order_5.id,
            action="admin_correction",
            before_state={
                "borrow_status": "delivering",
                "delivery_status": "delivering",
                "task_status": "arriving",
                "robot_status": "arriving",
            },
            after_state={
                "borrow_status": "delivered",
                "delivery_status": "delivered",
                "task_status": "returning",
                "robot_status": "returning",
            },
            note="演示环境中手动将订单推进到送达状态。",
            created_at=now - timedelta(hours=1, minutes=5),
        )
    )

    session.commit()

    return {
        "admins": 1,
        "readers": 12,
        "books": 24,
        "cabinets": 4,
        "copies": 40,
        "slots": 32,
        "orders": 36,
        "deliveries": 11,
        "robot_tasks": 11,
        "robot_events": 28,
        "inventory_events": 24,
        "recommendations": 24,
        "conversations": 12,
        "messages": 32,
        "search_logs": 28,
        "reading_events": 36,
    }
