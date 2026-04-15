from __future__ import annotations

from bisect import bisect_left
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
import hashlib
import json
import math
from pathlib import Path
import random
import re
from typing import Any

from sqlalchemy import insert, inspect, text, update
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.admin.service import DEFAULT_ADMIN_PERMISSIONS
from app.admin.models import (
    AdminPermission,
    AdminRole,
    AdminRoleAssignment,
    AdminRolePermission,
    AlertRecord,
    RecommendationPlacement,
    RecommendationStudioPublication,
    TopicBooklist,
    TopicBooklistItem,
)
from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book, BookCategory, BookSourceDocument, BookTag, BookTagLink
from app.conversation.models import ConversationMessage, ConversationSession
from app.core.security import hash_password
from app.db.base import Base, import_model_modules
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.learning.models import (
    LearningAgentRun,
    LearningBridgeAction,
    LearningCheckpoint,
    LearningFragment,
    LearningJob,
    LearningPathStep,
    LearningPathVersion,
    LearningProfile,
    LearningRemediationPlan,
    LearningReport,
    LearningSession,
    LearningSourceAsset,
    LearningSourceBundle,
    LearningStepContextItem,
    LearningTurn,
)
from app.orders.models import BorrowOrder, OrderFulfillment, ReturnRequest
from app.readers.models import (
    DismissedNotification,
    FavoriteBook,
    ReaderAccount,
    ReaderBooklist,
    ReaderBooklistItem,
    ReaderProfile,
)
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotStatusEvent, RobotTask, RobotUnit
from app.system.models import SystemSetting

DEFAULT_REQUIRED_TABLES = set(Base.metadata.tables)
PURGE_TABLE_ORDER = [
    LearningBridgeAction.__table__,
    LearningStepContextItem.__table__,
    LearningAgentRun.__table__,
    LearningCheckpoint.__table__,
    LearningRemediationPlan.__table__,
    LearningReport.__table__,
    LearningTurn.__table__,
    LearningSession.__table__,
    LearningPathStep.__table__,
    LearningPathVersion.__table__,
    LearningFragment.__table__,
    LearningSourceAsset.__table__,
    LearningJob.__table__,
    LearningProfile.__table__,
    LearningSourceBundle.__table__,
    RobotStatusEvent.__table__,
    RobotTask.__table__,
    RobotUnit.__table__,
    ReturnRequest.__table__,
    OrderFulfillment.__table__,
    BorrowOrder.__table__,
    InventoryEvent.__table__,
    BookStock.__table__,
    BookCopy.__table__,
    CabinetSlot.__table__,
    Cabinet.__table__,
    ConversationMessage.__table__,
    ConversationSession.__table__,
    RecommendationLog.__table__,
    SearchLog.__table__,
    ReadingEvent.__table__,
    TopicBooklistItem.__table__,
    TopicBooklist.__table__,
    ReaderBooklistItem.__table__,
    ReaderBooklist.__table__,
    FavoriteBook.__table__,
    DismissedNotification.__table__,
    ReaderProfile.__table__,
    ReaderAccount.__table__,
    BookTagLink.__table__,
    BookSourceDocument.__table__,
    Book.__table__,
    BookTag.__table__,
    BookCategory.__table__,
    RecommendationStudioPublication.__table__,
    RecommendationPlacement.__table__,
    AlertRecord.__table__,
    SystemSetting.__table__,
    AdminActionLog.__table__,
    AdminRoleAssignment.__table__,
    AdminRolePermission.__table__,
    AdminPermission.__table__,
    AdminRole.__table__,
    AdminAccount.__table__,
]

AFFILIATION_TYPES = (
    ("student", 0.72),
    ("teacher", 0.13),
    ("researcher", 0.08),
    ("staff", 0.05),
    ("visitor", 0.02),
)
READER_SEGMENTS = (
    ("power", 0.09, 6.5),
    ("regular", 0.31, 3.4),
    ("casual", 0.36, 1.7),
    ("dormant", 0.17, 0.45),
    ("at_risk", 0.07, 0.8),
)
COLLEGES = {
    "计算机学院": ["软件工程", "人工智能", "计算机科学", "数据科学"],
    "文学院": ["汉语言文学", "新闻传播", "历史学"],
    "商学院": ["工商管理", "金融学", "会计学", "市场营销"],
    "理学院": ["数学", "物理学", "统计学"],
    "医学院": ["临床医学", "护理学", "药学"],
    "建筑学院": ["建筑学", "城乡规划", "风景园林"],
}
COMMON_SURNAMES = (
    "李", "王", "张", "刘", "陈", "杨", "黄", "赵", "周", "吴",
    "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗",
    "梁", "宋", "郑", "谢", "韩", "唐", "冯", "于", "董", "萧",
    "程", "曹", "袁", "邓", "许", "傅", "沈", "曾", "彭", "吕",
    "苏", "卢", "蒋", "蔡", "贾", "丁", "魏", "薛", "叶", "阎",
    "余", "潘", "杜", "戴", "夏", "钟", "汪", "田", "任", "姜",
)
COMMON_GIVEN_NAMES = (
    "子涵", "雨桐", "欣怡", "梓涵", "宇轩", "浩然", "若曦", "佳宁", "诗涵", "书宁",
    "思远", "安然", "亦辰", "沐阳", "嘉言", "知夏", "可欣", "景行", "清妍", "泽宇",
    "语彤", "星辰", "锦程", "思齐", "嘉禾", "初晴", "若宁", "明轩", "乐瑶", "沐宸",
    "奕辰", "书瑶", "静姝", "景瑜", "安琪", "子墨", "芷晴", "辰逸", "怀瑾", "若彤",
    "依诺", "柏言", "清越", "舒窈", "昭宁", "嘉树", "言希", "歆然", "慕言", "云舒",
    "君浩", "晓彤", "楚涵", "瑾瑜", "嘉宁", "洛伊", "予安", "知远", "昕妍", "文博",
    "诗琪", "亦凡", "安宁", "瑶华", "思睿", "清欢", "星月", "修远", "子衿", "雅宁",
    "泽远", "念慈", "语晴", "景初", "承安", "心怡", "晏清", "书航", "明玥", "可心",
    "映雪", "嘉怡", "若白", "启明", "青禾", "舒然", "嘉月", "晨曦", "思源", "南乔",
)
ALL_ADMIN_PERMISSION_CODES = tuple(permission["code"] for permission in DEFAULT_ADMIN_PERMISSIONS)
ROLE_TEMPLATE = {
    "super-admin": ALL_ADMIN_PERMISSION_CODES,
    "ops-manager": ("dashboard.view", "inventory.manage", "orders.manage", "robots.manage", "alerts.manage"),
    "content-editor": ("dashboard.view", "books.manage", "recommendation.manage", "analytics.view"),
    "analyst": ("dashboard.view", "analytics.view", "system.audit.view", "recommendation.manage"),
}
SYSTEM_SETTINGS_TEMPLATE = (
    ("inventory.default_pick_window", {"minutes": 90}),
    ("inventory.overdue_grace_days", {"days": 3}),
    ("recommendation.hot_window_days", {"days": 14}),
    ("robot.max_parallel_tasks", {"count": 12}),
    ("learning.default_chunk_size", {"tokens": 700}),
    ("learning.default_overlap", {"tokens": 120}),
    ("analytics.cold_start_ratio_target", {"ratio": 0.18}),
)
PLACEMENT_TEMPLATE = (
    ("home.hero", "首页主推荐", "homepage"),
    ("home.new_arrivals", "首页新书推荐", "homepage"),
    ("reader.detail.related", "详情页关联推荐", "detail"),
    ("borrow.return.cross_sell", "归还后推荐", "post_order"),
    ("learning.entry", "学习入口推荐", "learning"),
)
RECOMMENDATION_PROVIDER_WEIGHTS = (
    ("ml", 0.46),
    ("hot", 0.2),
    ("fallback", 0.17),
    ("cold_start", 0.09),
    ("rule", 0.08),
)
SEARCH_MODE_WEIGHTS = (
    ("keyword", 0.62),
    ("semantic", 0.18),
    ("title", 0.12),
    ("barcode", 0.05),
    ("voice", 0.03),
)


@dataclass(slots=True)
class LargeDatasetConfig:
    snapshot_path: Path
    random_seed: int = 20260415
    chunk_size: int = 2_000
    purge_existing_data: bool = True
    target_books: int = 100_000
    target_readers: int = 1_284
    target_book_source_documents: int = 24_000
    target_book_copies: int = 135_000
    target_borrow_orders: int = 80_000
    target_search_logs: int = 150_000
    target_recommendation_logs: int = 250_000
    target_conversation_sessions: int = 25_000
    target_conversation_messages: int = 150_000
    target_learning_profiles: int = 6_000
    target_learning_fragments: int = 120_000
    target_learning_sessions: int = 20_000
    target_learning_turns: int = 90_000
    max_unique_categories: int = 320
    max_unique_tags: int = 6_000
    anchor_time: datetime = field(default_factory=lambda: datetime(2026, 4, 15, 12, 0, tzinfo=timezone.utc))
    history_days: int = 540
    robot_unit_count: int | None = None
    reading_event_count: int | None = None
    inventory_event_count: int | None = None
    favorite_book_count: int | None = None
    reader_booklist_count: int | None = None
    topic_booklist_count: int | None = None

    def __post_init__(self) -> None:
        self.snapshot_path = Path(self.snapshot_path)

    @property
    def target_robot_units(self) -> int:
        if self.robot_unit_count is not None:
            return self.robot_unit_count
        return max(8, min(32, math.ceil(self.target_borrow_orders / 6_000)))

    @property
    def target_reading_events(self) -> int:
        if self.reading_event_count is not None:
            return self.reading_event_count
        return max(self.target_readers * 14, self.target_borrow_orders)

    @property
    def target_inventory_events(self) -> int:
        if self.inventory_event_count is not None:
            return self.inventory_event_count
        return max(self.target_book_copies, int(self.target_borrow_orders * 1.4))

    @property
    def target_favorite_books(self) -> int:
        if self.favorite_book_count is not None:
            return self.favorite_book_count
        return max(self.target_readers * 6, self.target_readers)

    @property
    def target_reader_booklists(self) -> int:
        if self.reader_booklist_count is not None:
            return self.reader_booklist_count
        return max(self.target_readers // 2, 1)

    @property
    def target_topic_booklists(self) -> int:
        if self.topic_booklist_count is not None:
            return self.topic_booklist_count
        return max(12, min(80, self.target_books // 2_500))

    @property
    def target_learning_assets(self) -> int:
        return max(self.target_learning_profiles * 2, math.ceil(self.target_learning_fragments / 5))


@dataclass(slots=True)
class WeightedSampler:
    values: list[Any]
    cumulative_weights: list[float]
    total_weight: float

    @classmethod
    def from_weight_map(cls, weighted_values: list[tuple[Any, float]]) -> "WeightedSampler":
        values: list[Any] = []
        cumulative: list[float] = []
        total = 0.0
        for value, weight in weighted_values:
            if weight <= 0:
                continue
            total += weight
            values.append(value)
            cumulative.append(total)
        return cls(values=values, cumulative_weights=cumulative, total_weight=total)

    def sample(self, rng: random.Random) -> Any:
        needle = rng.random() * self.total_weight
        index = bisect_left(self.cumulative_weights, needle)
        return self.values[index]


def _build_real_name_pool(count: int, rng: random.Random) -> list[str]:
    capacity = len(COMMON_SURNAMES) * len(COMMON_GIVEN_NAMES)
    if count > capacity:
        raise ValueError(f"cannot generate {count} unique real-name usernames from current name pool")

    surnames = list(COMMON_SURNAMES)
    given_names = list(COMMON_GIVEN_NAMES)
    rng.shuffle(surnames)
    rng.shuffle(given_names)

    names: list[str] = []
    for given_name in given_names:
        for surname in surnames:
            names.append(f"{surname}{given_name}")
            if len(names) >= count:
                return names
    return names


def validate_large_dataset_schema(
    engine: Engine,
    *,
    available_tables: set[str] | None = None,
) -> None:
    import_model_modules()
    actual_tables = available_tables or set(inspect(engine).get_table_names())
    missing_tables = sorted(DEFAULT_REQUIRED_TABLES - actual_tables)
    if missing_tables:
        raise RuntimeError(
            "large dataset seeding requires the latest learning schema; "
            f"missing required tables: {', '.join(missing_tables)}"
        )


def seed_large_dataset(session: Session, config: LargeDatasetConfig) -> dict[str, int]:
    validate_large_dataset_schema(session.get_bind())
    rng = random.Random(config.random_seed)
    snapshot_records = _load_snapshot_records(config)

    if config.purge_existing_data:
        _purge_existing_business_data(session)

    summary: dict[str, int] = {}
    book_rows, book_state, category_rows, tag_rows, tag_link_rows = _build_catalog_records(snapshot_records, config, rng)
    summary["book_categories"] = len(category_rows)
    summary["book_tags"] = len(tag_rows)
    summary["books"] = len(book_rows)
    summary["book_tag_links"] = len(tag_link_rows)

    _insert_rows(session, BookCategory, category_rows, config.chunk_size)
    _insert_rows(session, BookTag, tag_rows, config.chunk_size)
    _insert_rows(session, Book, book_rows, config.chunk_size)
    _insert_rows(session, BookTagLink, tag_link_rows, config.chunk_size)
    session.commit()

    doc_rows, book_documents = _build_book_source_documents(book_state, config, rng)
    summary["book_source_documents"] = len(doc_rows)
    _insert_rows(session, BookSourceDocument, doc_rows, config.chunk_size)
    session.commit()

    admin_payload = _build_admin_records(config, rng)
    for model, rows, key in admin_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    reader_rows, profile_rows, reader_state = _build_reader_records(config, book_state, rng)
    summary["reader_accounts"] = len(reader_rows)
    summary["reader_profiles"] = len(profile_rows)
    summary["readers"] = len(profile_rows)
    _insert_rows(session, ReaderAccount, reader_rows, config.chunk_size)
    _insert_rows(session, ReaderProfile, profile_rows, config.chunk_size)
    session.commit()

    reader_side_payload = _build_reader_side_records(reader_state, book_state, config, rng)
    for model, rows, key in reader_side_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    inventory_payload, copy_state = _build_inventory_records(book_state, config, rng)
    for model, rows, key in inventory_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    order_payload, fulfillment_state = _build_order_records(reader_state, book_state, copy_state, config, rng)
    for model, rows, key in order_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    robot_payload = _build_robot_records(fulfillment_state, config, rng)
    for model, rows, key in robot_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    analytics_payload = _build_analytics_records(reader_state, book_state, config, rng)
    for model, rows, key in analytics_payload:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    session.commit()

    conversation_rows, conversation_state = _build_conversation_records(reader_state, book_state, config, rng)
    summary["conversation_sessions"] = len(conversation_rows["sessions"])
    summary["conversation_messages"] = len(conversation_rows["messages"])
    _insert_rows(session, ConversationSession, conversation_rows["sessions"], config.chunk_size)
    _insert_rows(session, ConversationMessage, conversation_rows["messages"], config.chunk_size)
    session.commit()

    learning_payload = _build_learning_records(
        reader_state=reader_state,
        book_state=book_state,
        book_documents=book_documents,
        conversation_state=conversation_state,
        config=config,
        rng=rng,
    )
    for model, rows, key in learning_payload["rows"]:
        _insert_rows(session, model, rows, config.chunk_size)
        summary[key] = len(rows)
    if learning_payload["profile_updates"]:
        session.execute(
            update(LearningProfile),
            learning_payload["profile_updates"],
        )
        summary["learning_profile_updates"] = len(learning_payload["profile_updates"])
    session.commit()

    _sync_identity_sequences(session)
    session.commit()
    return summary


def _load_snapshot_records(config: LargeDatasetConfig) -> list[dict[str, Any]]:
    if not config.snapshot_path.exists():
        raise FileNotFoundError(f"snapshot not found: {config.snapshot_path}")
    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    with config.snapshot_path.open("r", encoding="utf-8") as fin:
        for line in fin:
            line = line.strip()
            if not line:
                continue
            payload = json.loads(line)
            title = _clean_text(payload.get("title"), max_length=255)
            if not title:
                continue
            dedupe_key = payload.get("work_key") or f"{_slugify(title, 80)}|{_slugify(str(payload.get('author') or ''), 80)}"
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            payload["title"] = title
            records.append(payload)
    if len(records) < config.target_books:
        raise RuntimeError(
            f"snapshot only contains {len(records)} usable records but target_books={config.target_books}"
        )
    return records[: config.target_books]


def _purge_existing_business_data(session: Session) -> None:
    for table in PURGE_TABLE_ORDER:
        session.execute(table.delete())
    session.commit()


def _build_catalog_records(
    snapshot_records: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    shuffled_records = list(snapshot_records)
    rng.shuffle(shuffled_records)

    category_counter = Counter(
        _normalize_category(record)
        for record in shuffled_records
        if _normalize_category(record)
    )
    category_names = [name for name, _count in category_counter.most_common(config.max_unique_categories)]
    if "综合参考" not in category_names:
        category_names.append("综合参考")
    category_rows: list[dict[str, Any]] = []
    category_ids: dict[str, int] = {}
    for index, name in enumerate(category_names, start=1):
        category_rows.append(
            {
                "id": index,
                "code": _unique_slug(name, index, max_length=64),
                "name": name,
                "description": f"{name} 主题分类",
                "status": "active",
                "created_at": config.anchor_time - timedelta(days=30),
                "updated_at": config.anchor_time - timedelta(days=1),
            }
        )
        category_ids[name] = index

    tag_counter = Counter()
    for record in shuffled_records:
        for tag in _normalize_tags(record):
            tag_counter[tag] += 1
    tag_names = [name for name, _count in tag_counter.most_common(config.max_unique_tags)]
    tag_rows: list[dict[str, Any]] = []
    tag_ids: dict[str, int] = {}
    for index, name in enumerate(tag_names, start=1):
        tag_rows.append(
            {
                "id": index,
                "code": _unique_slug(name, index, max_length=64),
                "name": name,
                "description": f"{name} 标签",
                "created_at": config.anchor_time - timedelta(days=21),
                "updated_at": config.anchor_time - timedelta(days=1),
            }
        )
        tag_ids[name] = index

    book_rows: list[dict[str, Any]] = []
    tag_link_rows: list[dict[str, Any]] = []
    book_state: list[dict[str, Any]] = []
    tag_link_id = 1
    publication_floor = max(config.anchor_time.year - 80, 1940)

    for index, record in enumerate(shuffled_records[: config.target_books], start=1):
        category_name = _normalize_category(record) or "综合参考"
        if category_name not in category_ids:
            category_name = "综合参考"
        tags = [tag for tag in _normalize_tags(record) if tag in tag_ids][:6]
        if not tags and category_name in tag_ids:
            tags = [category_name]

        created_at = _random_datetime(config.anchor_time, config.history_days, rng)
        updated_at = created_at + timedelta(days=rng.randint(0, 60), minutes=rng.randint(0, 180))
        first_publish_year = record.get("first_publish_year")
        if isinstance(first_publish_year, int):
            publication_floor = min(publication_floor, first_publish_year)
        popularity = round(((config.target_books - index + 1) / config.target_books) ** 0.58 * (0.65 + rng.random() * 0.7), 6)
        summary = _clean_text(record.get("summary"), max_length=2_000)
        search_text = _clean_text(record.get("search_text"), max_length=8_000) or " ".join(
            part
            for part in (record["title"], record.get("author"), category_name, " ".join(tags), summary)
            if part
        )

        book_rows.append(
            {
                "id": index,
                "title": record["title"],
                "author": _clean_text(record.get("author"), max_length=255),
                "category_id": category_ids[category_name],
                "category": category_name,
                "isbn": _clean_text(record.get("isbn"), max_length=32),
                "barcode": f"BC{2026000000 + index}",
                "cover_url": _clean_text(record.get("cover_url"), max_length=512),
                "keywords": ", ".join(tags) or None,
                "summary": summary,
                "shelf_status": _pick_weighted(
                    rng,
                    [
                        ("available", 0.86),
                        ("archived", 0.05),
                        ("repairing", 0.05),
                        ("missing", 0.04),
                    ],
                ),
                "search_document": search_text,
                "search_vector": search_text,
                "embedding": None,
                "created_at": created_at,
                "updated_at": updated_at,
            }
        )
        book_state.append(
            {
                "id": index,
                "title": record["title"],
                "author": _clean_text(record.get("author"), max_length=255),
                "category": category_name,
                "category_id": category_ids[category_name],
                "tags": tags,
                "summary": summary,
                "search_text": search_text,
                "popularity": popularity,
                "language": record.get("language") or "eng",
                "first_publish_year": first_publish_year if isinstance(first_publish_year, int) else publication_floor,
            }
        )
        for tag in tags:
            tag_link_rows.append(
                {
                    "id": tag_link_id,
                    "book_id": index,
                    "tag_id": tag_ids[tag],
                    "created_at": created_at,
                }
            )
            tag_link_id += 1

    return book_rows, book_state, category_rows, tag_rows, tag_link_rows


def _build_book_source_documents(
    book_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> tuple[list[dict[str, Any]], dict[int, list[int]]]:
    target = min(config.target_book_source_documents, max(len(book_state), config.target_book_source_documents))
    sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    chosen_books: list[int] = []
    chosen_set: set[int] = set()
    primary_target = min(len(book_state), max(1, int(target * 0.78)))
    while len(chosen_books) < primary_target:
        book_id = sampler.sample(rng)
        if book_id in chosen_set:
            continue
        chosen_set.add(book_id)
        chosen_books.append(book_id)

    rows: list[dict[str, Any]] = []
    document_map: dict[int, list[int]] = defaultdict(list)
    source_kind_weights = [("pdf", 0.56), ("epub", 0.14), ("scan", 0.12), ("notes", 0.1), ("ppt", 0.08)]
    parse_status_weights = [("parsed", 0.72), ("pending", 0.16), ("failed", 0.12)]

    for document_id, book_id in enumerate(chosen_books, start=1):
        kind = _pick_weighted(rng, source_kind_weights)
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        rows.append(
            {
                "id": document_id,
                "book_id": book_id,
                "source_kind": kind,
                "mime_type": _mime_type_for_source_kind(kind),
                "file_name": f"book-{book_id:06d}-primary.{_extension_for_source_kind(kind)}",
                "storage_path": f"artifacts/book-sources/book-{book_id:06d}/primary.{_extension_for_source_kind(kind)}",
                "extracted_text_path": f"artifacts/book-sources/book-{book_id:06d}/primary.txt",
                "content_hash": _stable_hash(f"primary|{book_id}|{kind}"),
                "parse_status": _pick_weighted(rng, parse_status_weights),
                "is_primary": True,
                "metadata_json": {"pages": rng.randint(24, 480), "ocr_noise": round(rng.random() * 0.18, 3)},
                "created_at": created_at,
                "updated_at": created_at + timedelta(minutes=rng.randint(0, 180)),
            }
        )
        document_map[book_id].append(document_id)

    document_id = len(rows) + 1
    while len(rows) < target:
        book_id = chosen_books[rng.randrange(len(chosen_books))]
        kind = _pick_weighted(rng, source_kind_weights)
        created_at = _random_datetime(config.anchor_time, config.history_days // 3, rng)
        rows.append(
            {
                "id": document_id,
                "book_id": book_id,
                "source_kind": kind,
                "mime_type": _mime_type_for_source_kind(kind),
                "file_name": f"book-{book_id:06d}-extra-{document_map[book_id].__len__()}.{_extension_for_source_kind(kind)}",
                "storage_path": f"artifacts/book-sources/book-{book_id:06d}/extra-{document_map[book_id].__len__()}.{_extension_for_source_kind(kind)}",
                "extracted_text_path": f"artifacts/book-sources/book-{book_id:06d}/extra-{document_map[book_id].__len__()}.txt",
                "content_hash": _stable_hash(f"extra|{book_id}|{document_id}|{kind}"),
                "parse_status": _pick_weighted(rng, parse_status_weights),
                "is_primary": False,
                "metadata_json": {"pages": rng.randint(8, 220), "ocr_noise": round(rng.random() * 0.3, 3)},
                "created_at": created_at,
                "updated_at": created_at + timedelta(minutes=rng.randint(0, 120)),
            }
        )
        document_map[book_id].append(document_id)
        document_id += 1

    return rows, document_map


def _build_admin_records(config: LargeDatasetConfig, rng: random.Random) -> list[tuple[type[Any], list[dict[str, Any]], str]]:
    now = config.anchor_time
    admin_rows = [
        {
            "id": 1,
            "username": "admin",
            "password_hash": hash_password("admin123"),
            "created_at": now - timedelta(days=180),
            "updated_at": now - timedelta(days=1),
        }
    ]
    admin_rows.extend(
        [
            {
                "id": index + 1,
                "username": f"admin_{index:02d}",
                "password_hash": hash_password(f"admin-password-{index}"),
                "created_at": now - timedelta(days=180 - index),
                "updated_at": now - timedelta(days=index % 9),
            }
            for index in range(1, 9)
        ]
    )
    role_rows = []
    permission_rows = []
    role_permission_rows = []
    role_assignment_rows = []
    permission_ids: dict[str, int] = {}
    role_ids: dict[str, int] = {}
    permission_index = 1
    for payload in DEFAULT_ADMIN_PERMISSIONS:
        permission_ids[payload["code"]] = permission_index
        permission_rows.append(
            {
                "id": permission_index,
                "code": payload["code"],
                "name": payload["name"],
                "description": payload["description"],
                "created_at": now - timedelta(days=120),
            }
        )
        permission_index += 1
    for role_index, (role_code, permission_codes) in enumerate(ROLE_TEMPLATE.items(), start=1):
        role_ids[role_code] = role_index
        role_rows.append(
            {
                "id": role_index,
                "code": role_code,
                "name": role_code.replace("-", " ").title(),
                "description": f"{role_code} role",
                "created_at": now - timedelta(days=120),
                "updated_at": now - timedelta(days=1),
            }
        )
        unknown_codes = [code for code in permission_codes if code not in permission_ids]
        if unknown_codes:
            raise RuntimeError(f"Seed role {role_code} references unknown admin permissions: {', '.join(unknown_codes)}")
    role_permission_id = 1
    for role_code, permission_codes in ROLE_TEMPLATE.items():
        for code in permission_codes:
            role_permission_rows.append(
                {
                    "id": role_permission_id,
                    "role_id": role_ids[role_code],
                    "permission_id": permission_ids[code],
                    "created_at": now - timedelta(days=60),
                }
            )
            role_permission_id += 1
    role_assignment_rows.append(
        {
            "id": 1,
            "admin_id": 1,
            "role_id": role_ids["super-admin"],
            "created_at": now - timedelta(days=44),
        }
    )
    noise_role_codes = [role_code for role_code in ROLE_TEMPLATE if role_code != "super-admin"] or list(ROLE_TEMPLATE)
    for assignment_id, admin_row in enumerate(admin_rows[1:], start=2):
        role_code = noise_role_codes[(assignment_id - 2) % len(noise_role_codes)]
        role_assignment_rows.append(
            {
                "id": assignment_id,
                "admin_id": admin_row["id"],
                "role_id": role_ids[role_code],
                "created_at": now - timedelta(days=45 - assignment_id),
            }
        )

    system_setting_rows = []
    for index, (setting_key, value_json) in enumerate(SYSTEM_SETTINGS_TEMPLATE, start=1):
        system_setting_rows.append(
            {
                "id": index,
                "setting_key": setting_key,
                "value_type": "json",
                "value_json": value_json,
                "description": f"{setting_key} config",
                "created_by": 1,
                "updated_by": 1 + (index % len(admin_rows)),
                "created_at": now - timedelta(days=90),
                "updated_at": now - timedelta(days=index % 6),
            }
        )

    placement_rows = []
    for index, (code, name, placement_type) in enumerate(PLACEMENT_TEMPLATE, start=1):
        placement_rows.append(
            {
                "id": index,
                "code": code,
                "name": name,
                "status": "active" if index % 5 else "paused",
                "placement_type": placement_type,
                "config_json": {"refresh_minutes": 30 + index * 5, "fallback": "hot"},
                "created_at": now - timedelta(days=42),
                "updated_at": now - timedelta(days=index % 8),
            }
        )

    publication_rows = []
    for index in range(1, 13):
        published_at = now - timedelta(days=index * 7)
        publication_rows.append(
            {
                "id": index,
                "version": index,
                "status": "published" if index < 11 else "draft",
                "payload_json": {"placements": rng.sample([row["code"] for row in placement_rows], k=min(3, len(placement_rows)))},
                "published_by": 1 + (index % len(admin_rows)),
                "published_at": published_at if index < 11 else None,
                "created_at": published_at,
                "updated_at": published_at,
            }
        )

    alert_rows = []
    for index in range(1, 41):
        status = _pick_weighted(rng, [("open", 0.32), ("acknowledged", 0.28), ("resolved", 0.4)])
        acknowledged_by = 1 + (index % len(admin_rows)) if status in {"acknowledged", "resolved"} else None
        resolved_by = 1 + ((index + 1) % len(admin_rows)) if status == "resolved" else None
        created_at = now - timedelta(days=rng.randint(0, 60), hours=rng.randint(0, 23))
        alert_rows.append(
            {
                "id": index,
                "source_type": _pick_weighted(rng, [("robot", 0.28), ("inventory", 0.26), ("learning", 0.2), ("recommendation", 0.14), ("search", 0.12)]),
                "source_id": f"evt-{index:05d}",
                "alert_type": _pick_weighted(rng, [("timeout", 0.24), ("queue_backlog", 0.18), ("content_parse_failed", 0.17), ("stock_mismatch", 0.21), ("model_drift", 0.2)]),
                "severity": _pick_weighted(rng, [("info", 0.1), ("warning", 0.56), ("critical", 0.34)]),
                "status": status,
                "title": f"运营告警 {index:02d}",
                "message": f"随机噪声告警 {index:02d}",
                "metadata_json": {"noise": round(rng.random(), 3), "source_rank": index % 7},
                "acknowledged_by": acknowledged_by,
                "acknowledged_at": created_at + timedelta(minutes=35) if acknowledged_by else None,
                "resolved_by": resolved_by,
                "resolved_at": created_at + timedelta(hours=3) if resolved_by else None,
                "created_at": created_at,
                "updated_at": created_at + timedelta(minutes=90),
            }
        )

    action_rows = []
    action_types = ("approve", "reseed", "publish", "pause", "resume", "resolve")
    target_types = ("recommendation", "inventory", "learning", "alert", "catalog")
    for index in range(1, 121):
        created_at = now - timedelta(days=rng.randint(0, 90), hours=rng.randint(0, 23))
        action_rows.append(
            {
                "id": index,
                "admin_id": 1 + (index % len(admin_rows)),
                "target_type": target_types[index % len(target_types)],
                "target_ref": f"target-{index:05d}",
                "action": action_types[index % len(action_types)],
                "before_state": {"status": "draft", "index": index},
                "after_state": {"status": "active", "index": index},
                "note": f"noise-admin-action-{index}",
                "created_at": created_at,
            }
        )

    return [
        (AdminAccount, admin_rows, "admin_accounts"),
        (AdminRole, role_rows, "admin_roles"),
        (AdminPermission, permission_rows, "admin_permissions"),
        (AdminRolePermission, role_permission_rows, "admin_role_permissions"),
        (AdminRoleAssignment, role_assignment_rows, "admin_role_assignments"),
        (SystemSetting, system_setting_rows, "system_settings"),
        (RecommendationPlacement, placement_rows, "recommendation_placements"),
        (RecommendationStudioPublication, publication_rows, "recommendation_studio_publications"),
        (AlertRecord, alert_rows, "alert_records"),
        (AdminActionLog, action_rows, "admin_action_logs"),
    ]


def _build_reader_records(
    config: LargeDatasetConfig,
    book_state: list[dict[str, Any]],
    rng: random.Random,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    now = config.anchor_time
    top_tags = [book["tags"][0] for book in book_state if book["tags"]][:80]
    reader_rows: list[dict[str, Any]] = []
    profile_rows: list[dict[str, Any]] = []
    reader_state: list[dict[str, Any]] = []
    affiliation_sampler = WeightedSampler.from_weight_map([(name, weight) for name, weight in AFFILIATION_TYPES])
    segment_sampler = WeightedSampler.from_weight_map([(name, weight) for name, weight, _activity in READER_SEGMENTS])
    segment_activity = {name: activity for name, _weight, activity in READER_SEGMENTS}
    college_names = list(COLLEGES.keys())
    real_names = _build_real_name_pool(config.target_readers, rng)

    for reader_id in range(1, config.target_readers + 1):
        created_at = _random_datetime(now, config.history_days, rng)
        username = real_names[reader_id - 1]
        affiliation = affiliation_sampler.sample(rng)
        segment = segment_sampler.sample(rng)
        college = college_names[rng.randrange(len(college_names))]
        major = COLLEGES[college][rng.randrange(len(COLLEGES[college]))]
        display_name = username
        interest_count = rng.randint(2, 5)
        interest_tags = rng.sample(top_tags, k=min(interest_count, len(top_tags))) if top_tags else []
        restriction_status = _pick_weighted(rng, [("active", 0.93), ("watch", 0.04), ("blocked", 0.03)])
        restriction_until = None
        if restriction_status == "blocked":
            restriction_until = now + timedelta(days=rng.randint(7, 45))
        elif restriction_status == "watch":
            restriction_until = now + timedelta(days=rng.randint(2, 14))
        risk_flags = ["late_return"] if restriction_status != "active" else ([] if rng.random() < 0.7 else ["cold_start"])

        reader_rows.append(
            {
                "id": reader_id,
                "username": username,
                "password_hash": _stable_hash(f"reader-password-{reader_id}")[:128],
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 90)),
            }
        )
        profile_rows.append(
            {
                "id": reader_id,
                "account_id": reader_id,
                "display_name": display_name,
                "affiliation_type": affiliation,
                "college": college,
                "major": major,
                "grade_year": _pick_weighted(rng, [("2022", 0.16), ("2023", 0.28), ("2024", 0.3), ("2025", 0.18), ("faculty", 0.08)]),
                "interest_tags": interest_tags,
                "reading_profile_summary": f"{display_name} 偏好 {', '.join(interest_tags[:3])}" if interest_tags else "冷启动读者",
                "restriction_status": restriction_status,
                "restriction_until": restriction_until,
                "risk_flags": risk_flags or None,
                "preference_profile_json": {
                    "segment": segment,
                    "preferred_modes": ["semantic", "chat"] if segment in {"power", "regular"} else ["keyword"],
                    "late_night_ratio": round(rng.uniform(0.08, 0.42), 3),
                },
                "segment_code": segment,
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 90)),
            }
        )
        reader_state.append(
            {
                "id": reader_id,
                "segment": segment,
                "activity_weight": segment_activity[segment] * (0.8 + rng.random() * 0.5),
                "interest_tags": interest_tags,
                "college": college,
                "major": major,
                "display_name": display_name,
                "restriction_status": restriction_status,
            }
        )

    return reader_rows, profile_rows, reader_state


def _build_reader_side_records(
    reader_state: list[dict[str, Any]],
    book_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> list[tuple[type[Any], list[dict[str, Any]], str]]:
    reader_sampler = WeightedSampler.from_weight_map([(reader["id"], reader["activity_weight"]) for reader in reader_state])
    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    book_by_id = {book["id"]: book for book in book_state}

    favorite_rows: list[dict[str, Any]] = []
    seen_favorites: set[tuple[int, int]] = set()
    favorite_id = 1
    while len(favorite_rows) < config.target_favorite_books:
        reader_id = reader_sampler.sample(rng)
        book_id = book_sampler.sample(rng)
        key = (reader_id, book_id)
        if key in seen_favorites:
            continue
        seen_favorites.add(key)
        favorite_rows.append(
            {
                "id": favorite_id,
                "reader_id": reader_id,
                "book_id": book_id,
                "created_at": _random_datetime(config.anchor_time, config.history_days, rng),
            }
        )
        favorite_id += 1

    booklist_rows: list[dict[str, Any]] = []
    booklist_item_rows: list[dict[str, Any]] = []
    booklist_id = 1
    booklist_item_id = 1
    for _ in range(config.target_reader_booklists):
        reader_id = reader_sampler.sample(rng)
        title_seed = book_by_id[book_sampler.sample(rng)]["title"][:20]
        created_at = _random_datetime(config.anchor_time, config.history_days, rng)
        booklist_rows.append(
            {
                "id": booklist_id,
                "reader_id": reader_id,
                "title": f"{title_seed} 主题书单",
                "description": f"reader-{reader_id} 的噪声书单",
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 30)),
            }
        )
        item_count = rng.randint(4, 10)
        selected_books: set[int] = set()
        for rank in range(1, item_count + 1):
            book_id = _sample_unique_book(book_sampler, selected_books, rng)
            booklist_item_rows.append(
                {
                    "id": booklist_item_id,
                    "booklist_id": booklist_id,
                    "book_id": book_id,
                    "rank_position": rank,
                    "created_at": created_at + timedelta(minutes=rank),
                }
            )
            booklist_item_id += 1
        booklist_id += 1

    dismissed_rows: list[dict[str, Any]] = []
    dismissed_pairs: set[tuple[int, str]] = set()
    dismiss_id = 1
    target_dismissed_rows = max(config.target_readers, config.target_readers // 2)
    while len(dismissed_rows) < target_dismissed_rows:
        reader_id = reader_sampler.sample(rng)
        notification_id = f"notif-{rng.randint(1, config.target_readers * 8):06d}"
        key = (reader_id, notification_id)
        if key in dismissed_pairs:
            continue
        dismissed_pairs.add(key)
        dismissed_rows.append(
            {
                "id": dismiss_id,
                "reader_id": reader_id,
                "notification_id": notification_id,
                "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
            }
        )
        dismiss_id += 1

    topic_rows: list[dict[str, Any]] = []
    topic_item_rows: list[dict[str, Any]] = []
    topic_item_id = 1
    segment_codes = list({reader["segment"] for reader in reader_state})
    for topic_id in range(1, config.target_topic_booklists + 1):
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        title_book = book_by_id[book_sampler.sample(rng)]
        topic_rows.append(
            {
                "id": topic_id,
                "slug": f"topic-{topic_id:03d}-{_slugify(title_book['category'], 32)}",
                "title": f"{title_book['category']} 专题 {topic_id:02d}",
                "description": f"围绕 {title_book['title']} 扩展的一组专题推荐",
                "status": _pick_weighted(rng, [("published", 0.82), ("draft", 0.18)]),
                "audience_segment": segment_codes[topic_id % len(segment_codes)],
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 20)),
            }
        )
        item_count = rng.randint(10, 28)
        selected_books: set[int] = set()
        for rank in range(1, item_count + 1):
            book_id = _sample_unique_book(book_sampler, selected_books, rng)
            topic_item_rows.append(
                {
                    "id": topic_item_id,
                    "topic_booklist_id": topic_id,
                    "book_id": book_id,
                    "rank_position": rank,
                    "note": "运营专题噪声样本" if rng.random() < 0.23 else None,
                    "created_at": created_at + timedelta(minutes=rank),
                }
            )
            topic_item_id += 1

    return [
        (FavoriteBook, favorite_rows, "favorite_books"),
        (ReaderBooklist, booklist_rows, "reader_booklists"),
        (ReaderBooklistItem, booklist_item_rows, "reader_booklist_items"),
        (DismissedNotification, dismissed_rows, "dismissed_notifications"),
        (TopicBooklist, topic_rows, "topic_booklists"),
        (TopicBooklistItem, topic_item_rows, "topic_booklist_items"),
    ]


def _build_inventory_records(
    book_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> tuple[list[tuple[type[Any], list[dict[str, Any]], str]], list[dict[str, Any]]]:
    cabinet_count = max(3, min(24, math.ceil(config.target_book_copies / 8_000)))
    assigned_slot_count = int(config.target_book_copies * 0.78)
    free_slot_count = max(cabinet_count * 25, int(assigned_slot_count * 0.12))
    total_slot_count = assigned_slot_count + free_slot_count

    cabinet_rows: list[dict[str, Any]] = []
    for cabinet_index in range(1, cabinet_count + 1):
        cabinet_rows.append(
            {
                "id": f"cabinet-{cabinet_index:03d}",
                "name": f"馆藏书柜 {cabinet_index:02d}",
                "location": _pick_weighted(
                    rng,
                    [
                        ("主馆一层东区", 0.24),
                        ("主馆二层阅览区", 0.26),
                        ("主馆地下一层自助区", 0.12),
                        ("信息楼共享空间", 0.18),
                        ("宿舍北区服务点", 0.2),
                    ],
                ),
                "status": "maintenance" if cabinet_index % 11 == 0 else "active",
                "created_at": config.anchor_time - timedelta(days=180),
                "updated_at": config.anchor_time - timedelta(days=cabinet_index % 7),
            }
        )

    cabinet_cycle = [row["id"] for row in cabinet_rows]
    slot_rows: list[dict[str, Any]] = []
    slot_assignments: list[int] = []
    slot_to_cabinet: dict[int, str] = {}
    slot_to_code: dict[int, str] = {}
    for slot_id in range(1, total_slot_count + 1):
        cabinet_id = cabinet_cycle[(slot_id - 1) % len(cabinet_cycle)]
        slot_code = f"S{slot_id:06d}"
        occupied = slot_id <= assigned_slot_count
        status = "locked" if occupied and rng.random() < 0.18 else ("occupied" if occupied else _pick_weighted(rng, [("free", 0.76), ("empty", 0.24)]))
        slot_rows.append(
            {
                "id": slot_id,
                "cabinet_id": cabinet_id,
                "slot_code": slot_code,
                "status": status,
                "created_at": config.anchor_time - timedelta(days=150),
                "updated_at": config.anchor_time - timedelta(days=rng.randint(0, 10)),
            }
        )
        slot_to_cabinet[slot_id] = cabinet_id
        slot_to_code[slot_id] = slot_code
        if occupied:
            slot_assignments.append(slot_id)

    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    copy_rows: list[dict[str, Any]] = []
    copy_state: list[dict[str, Any]] = []
    book_stock_buckets: dict[tuple[int, str], dict[str, int]] = defaultdict(lambda: {"total": 0, "available": 0, "reserved": 0})

    slot_cursor = 0
    for copy_id in range(1, config.target_book_copies + 1):
        book_id = book_sampler.sample(rng)
        inventory_status = _pick_weighted(
            rng,
            [
                ("stored", 0.61),
                ("reserved", 0.17),
                ("in_delivery", 0.07),
                ("borrowed", 0.15),
            ],
        )
        current_slot_id = None
        cabinet_id = None
        slot_code = None
        if inventory_status in {"stored", "reserved"}:
            if slot_cursor < len(slot_assignments):
                current_slot_id = slot_assignments[slot_cursor]
                slot_cursor += 1
                cabinet_id = slot_to_cabinet[current_slot_id]
                slot_code = slot_to_code[current_slot_id]
                bucket = book_stock_buckets[(book_id, cabinet_id)]
                bucket["total"] += 1
                if inventory_status == "stored":
                    bucket["available"] += 1
                else:
                    bucket["reserved"] += 1
            else:
                inventory_status = "borrowed"

        created_at = _random_datetime(config.anchor_time, config.history_days, rng)
        copy_rows.append(
            {
                "id": copy_id,
                "book_id": book_id,
                "current_slot_id": current_slot_id,
                "inventory_status": inventory_status,
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 45)),
            }
        )
        copy_state.append(
            {
                "id": copy_id,
                "book_id": book_id,
                "current_slot_id": current_slot_id,
                "inventory_status": inventory_status,
                "cabinet_id": cabinet_id,
                "slot_code": slot_code,
            }
        )

    book_stock_rows: list[dict[str, Any]] = []
    for stock_id, ((book_id, cabinet_id), bucket) in enumerate(book_stock_buckets.items(), start=1):
        book_stock_rows.append(
            {
                "id": stock_id,
                "book_id": book_id,
                "cabinet_id": cabinet_id,
                "total_copies": bucket["total"],
                "available_copies": bucket["available"],
                "reserved_copies": bucket["reserved"],
                "created_at": config.anchor_time - timedelta(days=7),
                "updated_at": config.anchor_time - timedelta(hours=rng.randint(1, 48)),
            }
        )

    inventory_event_rows: list[dict[str, Any]] = []
    copy_lookup = {copy["id"]: copy for copy in copy_state}
    event_types = [
        ("stocked", 0.28),
        ("reserved", 0.16),
        ("picked", 0.13),
        ("returned", 0.17),
        ("audit", 0.1),
        ("relocated", 0.08),
        ("slot_locked", 0.08),
    ]
    for event_id in range(1, config.target_inventory_events + 1):
        copy = copy_lookup[rng.randint(1, len(copy_state))]
        cabinet_id = copy["cabinet_id"] or cabinet_cycle[(event_id - 1) % len(cabinet_cycle)]
        inventory_event_rows.append(
            {
                "id": event_id,
                "cabinet_id": cabinet_id,
                "event_type": _pick_weighted(rng, event_types),
                "slot_code": copy["slot_code"],
                "book_id": copy["book_id"],
                "copy_id": copy["id"],
                "payload_json": {"noise": round(rng.random(), 3), "status": copy["inventory_status"]},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
            }
        )

    return [
        (Cabinet, cabinet_rows, "cabinets"),
        (CabinetSlot, slot_rows, "cabinet_slots"),
        (BookCopy, copy_rows, "book_copies"),
        (BookStock, book_stock_rows, "book_stock"),
        (InventoryEvent, inventory_event_rows, "inventory_events"),
    ], copy_state


def _build_order_records(
    reader_state: list[dict[str, Any]],
    book_state: list[dict[str, Any]],
    copy_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> tuple[list[tuple[type[Any], list[dict[str, Any]], str]], list[dict[str, Any]]]:
    reader_sampler = WeightedSampler.from_weight_map([(reader["id"], reader["activity_weight"]) for reader in reader_state])
    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    copies_by_book: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for copy in copy_state:
        copies_by_book[copy["book_id"]].append(copy)

    borrow_rows: list[dict[str, Any]] = []
    fulfillment_rows: list[dict[str, Any]] = []
    return_rows: list[dict[str, Any]] = []
    fulfillment_state: list[dict[str, Any]] = []

    order_status_weights = [
        ("created", 0.08),
        ("awaiting_pick", 0.12),
        ("picked_from_cabinet", 0.08),
        ("delivering", 0.07),
        ("delivered", 0.07),
        ("completed", 0.32),
        ("cancelled", 0.13),
        ("returned", 0.13),
    ]

    admin_ids = [1, 2, 3, 4]
    fulfillment_id = 1
    return_id = 1
    for order_id in range(1, config.target_borrow_orders + 1):
        reader_id = reader_sampler.sample(rng)
        book_id = book_sampler.sample(rng)
        status = _pick_weighted(rng, order_status_weights)
        fulfillment_mode = _pick_weighted(rng, [("cabinet_pickup", 0.58), ("robot_delivery", 0.42)])
        book_copies = copies_by_book.get(book_id) or []
        assigned_copy = book_copies[rng.randrange(len(book_copies))] if book_copies and rng.random() < 0.93 else None
        created_at = _random_datetime(config.anchor_time, config.history_days, rng)
        picked_at = created_at + timedelta(hours=rng.randint(1, 24)) if status in {"picked_from_cabinet", "delivering", "delivered", "completed", "returned"} else None
        delivered_at = picked_at + timedelta(hours=rng.randint(1, 8)) if status in {"delivered", "completed", "returned"} and picked_at else None
        completed_at = delivered_at + timedelta(hours=rng.randint(2, 72)) if status in {"completed", "returned"} and delivered_at else None
        failure_reason = None
        if status == "cancelled":
            failure_reason = _pick_weighted(
                rng,
                [("reader_cancelled", 0.46), ("copy_unavailable", 0.28), ("robot_timeout", 0.14), ("manual_intervention", 0.12)],
            )
        borrow_rows.append(
            {
                "id": order_id,
                "reader_id": reader_id,
                "requested_book_id": book_id,
                "fulfilled_copy_id": assigned_copy["id"] if assigned_copy and status != "created" else None,
                "fulfillment_mode": fulfillment_mode,
                "status": status,
                "priority": _pick_weighted(rng, [("low", 0.22), ("normal", 0.61), ("urgent", 0.17)]),
                "due_at": created_at + timedelta(days=rng.randint(7, 45)),
                "failure_reason": failure_reason,
                "intervention_status": "manual_review" if status == "cancelled" and rng.random() < 0.36 else None,
                "attempt_count": rng.randint(0, 3),
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 14)),
                "picked_at": picked_at,
                "delivered_at": delivered_at,
                "completed_at": completed_at,
            }
        )

        if assigned_copy and status != "created":
            fulfillment_status = _order_to_fulfillment_status(status)
            fulfillment_rows.append(
                {
                    "id": fulfillment_id,
                    "borrow_order_id": order_id,
                    "mode": fulfillment_mode,
                    "source_cabinet_id": assigned_copy["cabinet_id"] or f"cabinet-{1 + (order_id % 3):03d}",
                    "source_slot_id": assigned_copy["current_slot_id"],
                    "delivery_target": _pick_weighted(
                        rng,
                        [("主馆自助提取口", 0.44), ("宿舍北区前台", 0.24), ("实验楼共享工位", 0.18), ("行政楼服务台", 0.14)],
                    ),
                    "status": fulfillment_status,
                    "picked_at": picked_at,
                    "delivered_at": delivered_at,
                    "completed_at": completed_at,
                    "created_at": created_at,
                    "updated_at": created_at + timedelta(hours=rng.randint(1, 48)),
                }
            )
            fulfillment_state.append(
                {
                    "id": fulfillment_id,
                    "order_id": order_id,
                    "mode": fulfillment_mode,
                    "status": fulfillment_status,
                    "copy_id": assigned_copy["id"],
                }
            )
            fulfillment_id += 1

        if status in {"returned", "completed"} and assigned_copy and rng.random() < 0.54:
            return_status = _pick_weighted(rng, [("created", 0.12), ("received", 0.22), ("completed", 0.58), ("cancelled", 0.08)])
            created_return_at = created_at + timedelta(days=rng.randint(8, 60))
            return_rows.append(
                {
                    "id": return_id,
                    "borrow_order_id": order_id,
                    "copy_id": assigned_copy["id"],
                    "receive_cabinet_id": assigned_copy["cabinet_id"] or f"cabinet-{1 + (order_id % 3):03d}",
                    "receive_slot_id": assigned_copy["current_slot_id"],
                    "processed_by_admin_id": admin_ids[order_id % len(admin_ids)] if return_status in {"received", "completed", "cancelled"} else None,
                    "processed_at": created_return_at + timedelta(hours=6) if return_status in {"completed", "cancelled"} else None,
                    "result": "shelved" if return_status == "completed" else ("rejected" if return_status == "cancelled" else None),
                    "condition_code": _pick_weighted(rng, [("good", 0.72), ("worn", 0.18), ("damaged", 0.1)]),
                    "received_at": created_return_at + timedelta(hours=2) if return_status in {"received", "completed"} else None,
                    "note": "封面磨损" if rng.random() < 0.11 else None,
                    "status": return_status,
                    "created_at": created_return_at,
                    "updated_at": created_return_at + timedelta(hours=8),
                }
            )
            return_id += 1

    return [
        (BorrowOrder, borrow_rows, "borrow_orders"),
        (OrderFulfillment, fulfillment_rows, "order_fulfillments"),
        (ReturnRequest, return_rows, "return_requests"),
    ], fulfillment_state


def _build_robot_records(
    fulfillment_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> list[tuple[type[Any], list[dict[str, Any]], str]]:
    robot_rows: list[dict[str, Any]] = []
    for robot_id in range(1, config.target_robot_units + 1):
        robot_rows.append(
            {
                "id": robot_id,
                "code": f"RB-{robot_id:03d}",
                "status": _pick_weighted(rng, [("idle", 0.34), ("assigned", 0.16), ("carrying", 0.14), ("arriving", 0.09), ("returning", 0.17), ("offline", 0.1)]),
                "battery_level": rng.randint(28, 100),
                "heartbeat_at": config.anchor_time - timedelta(minutes=rng.randint(0, 90)),
                "created_at": config.anchor_time - timedelta(days=120),
                "updated_at": config.anchor_time - timedelta(minutes=rng.randint(0, 90)),
            }
        )

    robot_task_rows: list[dict[str, Any]] = []
    status_event_rows: list[dict[str, Any]] = []
    task_id = 1
    event_id = 1
    robot_fulfillments = [item for item in fulfillment_state if item["mode"] == "robot_delivery"]
    for fulfillment in robot_fulfillments:
        if rng.random() < 0.18:
            continue
        robot_id = 1 + (task_id % len(robot_rows))
        status = _pick_weighted(rng, [("assigned", 0.18), ("carrying", 0.18), ("arriving", 0.16), ("returning", 0.12), ("completed", 0.28), ("cancelled", 0.08)])
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        robot_task_rows.append(
            {
                "id": task_id,
                "robot_id": robot_id,
                "fulfillment_id": fulfillment["id"],
                "status": status,
                "path_json": {"stops": rng.randint(2, 5), "noise": round(rng.random(), 3)},
                "reassigned_from_task_id": None,
                "superseded_by_task_id": None,
                "superseded_at": None,
                "sequence_no": 1,
                "is_current": True,
                "failure_reason": "obstacle_timeout" if status == "cancelled" else None,
                "attempt_count": rng.randint(1, 3),
                "created_at": created_at,
                "updated_at": created_at + timedelta(minutes=rng.randint(10, 120)),
                "completed_at": created_at + timedelta(minutes=rng.randint(25, 180)) if status == "completed" else None,
            }
        )
        event_types = ["assigned", "departed", "arrived"] if status != "cancelled" else ["assigned", "reroute", "cancelled"]
        for event_type in event_types:
            status_event_rows.append(
                {
                    "id": event_id,
                    "robot_id": robot_id,
                    "task_id": task_id,
                    "event_type": event_type,
                    "metadata_json": {"fulfillment_id": fulfillment["id"], "noise": round(rng.random(), 3)},
                    "created_at": created_at + timedelta(minutes=event_id % 40),
                }
            )
            event_id += 1
        task_id += 1

    while len(status_event_rows) < max(len(robot_task_rows) * 3, len(robot_rows)):
        robot_id = 1 + (len(status_event_rows) % len(robot_rows))
        status_event_rows.append(
            {
                "id": event_id,
                "robot_id": robot_id,
                "task_id": None,
                "event_type": _pick_weighted(rng, [("heartbeat", 0.54), ("battery_low", 0.12), ("self_check", 0.24), ("offline", 0.1)]),
                "metadata_json": {"noise": round(rng.random(), 3)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
            }
        )
        event_id += 1

    return [
        (RobotUnit, robot_rows, "robot_units"),
        (RobotTask, robot_task_rows, "robot_tasks"),
        (RobotStatusEvent, status_event_rows, "robot_status_events"),
    ]


def _build_analytics_records(
    reader_state: list[dict[str, Any]],
    book_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> list[tuple[type[Any], list[dict[str, Any]], str]]:
    reader_sampler = WeightedSampler.from_weight_map([(reader["id"], reader["activity_weight"]) for reader in reader_state])
    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    book_by_id = {book["id"]: book for book in book_state}

    recent_queries: list[str] = []
    search_rows: list[dict[str, Any]] = []
    for search_id in range(1, config.target_search_logs + 1):
        book = book_by_id[book_sampler.sample(rng)]
        if rng.random() < 0.045:
            query_text = ""
        elif recent_queries and rng.random() < 0.24:
            query_text = recent_queries[rng.randrange(len(recent_queries))]
        else:
            query_text = _search_phrase_for_book(book, rng)
            if rng.random() < 0.18 and len(query_text) > 6:
                query_text = query_text[:-1]
        recent_queries.append(query_text)
        if len(recent_queries) > 500:
            recent_queries.pop(0)
        search_rows.append(
            {
                "id": search_id,
                "reader_id": None if rng.random() < 0.06 else reader_sampler.sample(rng),
                "query_text": query_text,
                "query_mode": _pick_weighted(rng, SEARCH_MODE_WEIGHTS),
                "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
            }
        )

    recommendation_rows: list[dict[str, Any]] = []
    query_pool = [row["query_text"] for row in search_rows if row["query_text"]][: max(300, min(3_000, len(search_rows)))]
    for rec_id in range(1, config.target_recommendation_logs + 1):
        provider = _pick_weighted(rng, RECOMMENDATION_PROVIDER_WEIGHTS)
        book = book_by_id[book_sampler.sample(rng)] if rng.random() > 0.05 else None
        low_score = rng.random() < 0.29
        score = round(rng.uniform(0.03, 0.23), 4) if low_score else round(rng.uniform(0.26, 0.99), 4)
        recommendation_rows.append(
            {
                "id": rec_id,
                "reader_id": None if rng.random() < 0.05 else reader_sampler.sample(rng),
                "book_id": book["id"] if book else None,
                "query_text": query_pool[rng.randrange(len(query_pool))] if query_pool else "热门推荐",
                "result_title": (book["title"] if book else "暂无合适结果")[:255],
                "rank_position": rng.randint(1, 20),
                "score": score,
                "provider_note": provider,
                "explanation": None if rng.random() < 0.22 else f"{provider} 推荐解释",
                "evidence_json": {
                    "category": book["category"] if book else None,
                    "noise": round(rng.random(), 3),
                    "cold_start": provider == "cold_start",
                },
                "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
            }
        )

    reading_event_rows: list[dict[str, Any]] = []
    reading_types = [
        ("detail_view", 0.28),
        ("sample_open", 0.18),
        ("recommendation_click", 0.16),
        ("borrow_click", 0.16),
        ("favorite_add", 0.08),
        ("topic_browse", 0.08),
        ("conversation_open", 0.06),
    ]
    for event_id in range(1, config.target_reading_events + 1):
        book = book_by_id[book_sampler.sample(rng)]
        reading_event_rows.append(
            {
                "id": event_id,
                "reader_id": None if rng.random() < 0.03 else reader_sampler.sample(rng),
                "event_type": _pick_weighted(rng, reading_types),
                "metadata_json": {
                    "book_id": book["id"],
                    "category": book["category"],
                    "noise": round(rng.random(), 3),
                },
                "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
            }
        )

    return [
        (SearchLog, search_rows, "search_logs"),
        (RecommendationLog, recommendation_rows, "recommendation_logs"),
        (ReadingEvent, reading_event_rows, "reading_events"),
    ]


def _build_conversation_records(
    reader_state: list[dict[str, Any]],
    book_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> tuple[dict[str, list[dict[str, Any]]], list[dict[str, Any]]]:
    reader_sampler = WeightedSampler.from_weight_map([(reader["id"], reader["activity_weight"]) for reader in reader_state])
    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    book_by_id = {book["id"]: book for book in book_state}

    session_rows: list[dict[str, Any]] = []
    conversation_state: list[dict[str, Any]] = []
    for session_id in range(1, config.target_conversation_sessions + 1):
        book = book_by_id[book_sampler.sample(rng)]
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        status = _pick_weighted(rng, [("active", 0.28), ("closed", 0.56), ("abandoned", 0.16)])
        session_rows.append(
            {
                "id": session_id,
                "reader_id": None if rng.random() < 0.04 else reader_sampler.sample(rng),
                "status": status,
                "created_at": created_at,
                "updated_at": created_at + timedelta(minutes=rng.randint(1, 180)),
            }
        )
        conversation_state.append({"id": session_id, "status": status, "seed_book_id": book["id"]})

    message_counts = _distribute_total(
        total=max(config.target_conversation_messages, config.target_conversation_sessions * 2),
        bucket_count=config.target_conversation_sessions,
        min_each=2,
        weights=[1.8 if row["status"] == "active" else (1.2 if row["status"] == "closed" else 0.8) for row in conversation_state],
        rng=rng,
        max_each=12,
    )
    message_rows: list[dict[str, Any]] = []
    message_id = 1
    for session_info, count in zip(conversation_state, message_counts, strict=False):
        book = book_by_id[session_info["seed_book_id"]]
        for index in range(count):
            role = "user" if index % 2 == 0 else "assistant"
            if index == 0 and rng.random() < 0.08:
                role = "system"
            content = (
                f"{book['title']} 适合什么人看？"
                if role == "user"
                else f"可以先从 {book['category']} 的入门章节开始。"
            )
            if role == "system":
                content = "对话已接入噪声测试模式。"
            message_rows.append(
                {
                    "id": message_id,
                    "session_id": session_info["id"],
                    "role": role,
                    "content": content,
                    "metadata_json": {"book_id": book["id"], "noise": round(rng.random(), 3)} if rng.random() < 0.42 else None,
                    "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
                }
            )
            message_id += 1

    return {"sessions": session_rows, "messages": message_rows}, conversation_state


def _build_learning_records(
    *,
    reader_state: list[dict[str, Any]],
    book_state: list[dict[str, Any]],
    book_documents: dict[int, list[int]],
    conversation_state: list[dict[str, Any]],
    config: LargeDatasetConfig,
    rng: random.Random,
) -> dict[str, Any]:
    reader_sampler = WeightedSampler.from_weight_map([(reader["id"], reader["activity_weight"] * 1.2) for reader in reader_state])
    book_sampler = WeightedSampler.from_weight_map([(book["id"], book["popularity"]) for book in book_state])
    book_by_id = {book["id"]: book for book in book_state}

    bundle_rows: list[dict[str, Any]] = []
    profile_rows: list[dict[str, Any]] = []
    for profile_id in range(1, config.target_learning_profiles + 1):
        reader_id = reader_sampler.sample(rng)
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        bundle_rows.append(
            {
                "id": profile_id,
                "reader_id": reader_id,
                "title": f"学习资料包 {profile_id:05d}",
                "metadata_json": {"reader_segment": reader_state[reader_id - 1]["segment"], "noise": round(rng.random(), 3)},
                "created_at": created_at,
                "updated_at": created_at + timedelta(hours=rng.randint(0, 48)),
            }
        )
        profile_rows.append(
            {
                "id": profile_id,
                "reader_id": reader_id,
                "source_bundle_id": profile_id,
                "title": f"{reader_state[reader_id - 1]['display_name']} 学习空间 {profile_id:05d}",
                "goal_mode": _pick_weighted(rng, [("preview", 0.34), ("exam", 0.26), ("research", 0.22), ("project", 0.18)]),
                "difficulty_mode": _pick_weighted(rng, [("guided", 0.46), ("adaptive", 0.28), ("challenge", 0.26)]),
                "status": _pick_weighted(rng, [("queued", 0.08), ("active", 0.46), ("completed", 0.28), ("stalled", 0.18)]),
                "active_path_version_id": None,
                "metadata_json": {"noise": round(rng.random(), 3), "conversation_hint_id": conversation_state[rng.randrange(len(conversation_state))]["id"] if conversation_state else None},
                "created_at": created_at,
                "updated_at": created_at + timedelta(days=rng.randint(0, 21)),
            }
        )

    asset_rows: list[dict[str, Any]] = []
    asset_state: list[dict[str, Any]] = []
    for asset_id in range(1, config.target_learning_assets + 1):
        profile_id = 1 + ((asset_id - 1) % config.target_learning_profiles)
        book_id = book_sampler.sample(rng)
        docs = book_documents.get(book_id, [])
        source_document_id = docs[rng.randrange(len(docs))] if docs and rng.random() < 0.72 else None
        created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
        asset_kind = _pick_weighted(rng, [("document", 0.58), ("notes", 0.17), ("slides", 0.11), ("audio", 0.06), ("summary", 0.08)])
        parse_status = _pick_weighted(rng, [("parsed", 0.74), ("pending", 0.16), ("failed", 0.1)])
        row = {
            "id": asset_id,
            "bundle_id": profile_id,
            "asset_kind": asset_kind,
            "book_id": book_id,
            "book_source_document_id": source_document_id,
            "mime_type": _mime_type_for_source_kind("pdf" if asset_kind == "document" else "txt"),
            "file_name": f"learning-{profile_id:05d}-{asset_id:06d}.{_extension_for_source_kind('pdf' if asset_kind == 'document' else 'txt')}",
            "storage_path": f"artifacts/learning/profile-{profile_id:05d}/{asset_id:06d}",
            "extracted_text_path": f"artifacts/learning/profile-{profile_id:05d}/{asset_id:06d}.txt",
            "parse_status": parse_status,
            "content_hash": _stable_hash(f"learning-asset|{profile_id}|{asset_id}|{book_id}"),
            "metadata_json": {"book_category": book_by_id[book_id]["category"], "noise": round(rng.random(), 3)},
            "created_at": created_at,
            "updated_at": created_at + timedelta(hours=rng.randint(1, 72)),
        }
        asset_rows.append(row)
        asset_state.append({"id": asset_id, "profile_id": profile_id, "book_id": book_id, "parse_status": parse_status})

    fragment_counts = _distribute_total(
        total=max(config.target_learning_fragments, len(asset_rows)),
        bucket_count=len(asset_rows),
        min_each=1,
        weights=[1.6 if item["parse_status"] == "parsed" else 0.5 for item in asset_state],
        rng=rng,
        max_each=12,
    )
    fragment_rows: list[dict[str, Any]] = []
    fragment_id = 1
    for asset, count in zip(asset_state, fragment_counts, strict=False):
        book = book_by_id[asset["book_id"]]
        for chunk_index in range(count):
            content = (
                f"{book['title']} - {book['category']} 片段 {chunk_index}。"
                f" 关键词：{', '.join(book['tags'][:3]) if book['tags'] else '通识'}。"
            )
            fragment_rows.append(
                {
                    "id": fragment_id,
                    "profile_id": asset["profile_id"],
                    "asset_id": asset["id"],
                    "chunk_index": chunk_index,
                    "fragment_type": _pick_weighted(rng, [("text", 0.68), ("summary", 0.14), ("quote", 0.08), ("exercise", 0.1)]),
                    "chapter_label": None if rng.random() < 0.18 else f"Chapter {1 + (chunk_index % 9)}",
                    "semantic_summary": None if rng.random() < 0.24 else f"{book['title']} 的学习摘要 {chunk_index}",
                    "content": content,
                    "content_tsv": content,
                    "search_vector": content,
                    "citation_anchor_json": {"book_id": book["id"], "offset": chunk_index * 150},
                    "embedding": None,
                    "metadata_json": {"noise": round(rng.random(), 3), "language": book["language"]},
                    "created_at": _random_datetime(config.anchor_time, config.history_days // 2, rng),
                }
            )
            fragment_id += 1

    path_version_rows: list[dict[str, Any]] = []
    path_step_rows: list[dict[str, Any]] = []
    profile_updates: list[dict[str, Any]] = []
    path_version_id = 1
    step_id = 1
    for profile_id in range(1, config.target_learning_profiles + 1):
        version_count = 1 + (1 if rng.random() < 0.24 else 0) + (1 if rng.random() < 0.08 else 0)
        active_version_id = None
        for version_number in range(1, version_count + 1):
            created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
            status = "active" if version_number == version_count else _pick_weighted(rng, [("superseded", 0.64), ("archived", 0.36)])
            path_version_rows.append(
                {
                    "id": path_version_id,
                    "profile_id": profile_id,
                    "version_number": version_number,
                    "status": status,
                    "title": f"学习路径 {profile_id:05d}.v{version_number}",
                    "overview": "路径会随着对话和检查点动态调整。",
                    "graph_snapshot_json": {"nodes": rng.randint(4, 10), "edges": rng.randint(3, 14)},
                    "graph_provider": _pick_weighted(rng, [("disabled", 0.7), ("neo4j", 0.2), ("local", 0.1)]),
                    "metadata_json": {"noise": round(rng.random(), 3)},
                    "created_at": created_at,
                }
            )
            step_count = rng.randint(4, 8)
            for step_index in range(step_count):
                path_step_rows.append(
                    {
                        "id": step_id,
                        "path_version_id": path_version_id,
                        "step_index": step_index,
                        "step_type": _pick_weighted(rng, [("lesson", 0.44), ("discussion", 0.14), ("quiz", 0.22), ("practice", 0.2)]),
                        "title": f"步骤 {step_index + 1}",
                        "objective": f"完成 {step_index + 1} 号目标",
                        "guiding_question": "这一部分最关键的概念是什么？",
                        "success_criteria": "能够解释并举例",
                        "prerequisite_step_ids": [step_index - 1] if step_index > 0 and rng.random() < 0.72 else [],
                        "keywords_json": [f"concept-{profile_id % 17}", f"step-{step_index}"],
                        "metadata_json": {"noise": round(rng.random(), 3)},
                        "created_at": created_at + timedelta(minutes=step_index),
                    }
                )
                step_id += 1
            if status == "active":
                active_version_id = path_version_id
            path_version_id += 1
        profile_updates.append({"id": profile_id, "active_path_version_id": active_version_id, "updated_at": config.anchor_time})

    session_rows: list[dict[str, Any]] = []
    session_state: list[dict[str, Any]] = []
    guide_session_ids_by_profile: dict[int, list[int]] = defaultdict(list)
    session_counts = _distribute_total(
        total=max(config.target_learning_sessions, config.target_learning_profiles),
        bucket_count=config.target_learning_profiles,
        min_each=1,
        weights=[1.8 if row["status"] == "active" else 1.0 for row in profile_rows],
        rng=rng,
        max_each=8,
    )
    session_id = 1
    for profile_id, count in enumerate(session_counts, start=1):
        for _ in range(count):
            created_at = _random_datetime(config.anchor_time, config.history_days // 2, rng)
            session_kind = _pick_weighted(rng, [("guide", 0.68), ("explore", 0.32)])
            source_session_id = None
            if session_kind == "explore" and guide_session_ids_by_profile[profile_id] and rng.random() < 0.82:
                source_session_id = guide_session_ids_by_profile[profile_id][rng.randrange(len(guide_session_ids_by_profile[profile_id]))]
            status = _pick_weighted(rng, [("active", 0.34), ("completed", 0.32), ("stalled", 0.18), ("abandoned", 0.16)])
            row = {
                "id": session_id,
                "profile_id": profile_id,
                "learning_mode": _pick_weighted(rng, [("preview", 0.38), ("study", 0.34), ("challenge", 0.16), ("review", 0.12)]),
                "session_kind": session_kind,
                "source_session_id": source_session_id,
                "source_turn_id": None,
                "focus_step_index": rng.randint(0, 5) if rng.random() < 0.82 else None,
                "focus_context_json": {"noise": round(rng.random(), 3)} if rng.random() < 0.54 else None,
                "status": status,
                "current_step_index": rng.randint(0, 5),
                "current_step_title": None if rng.random() < 0.18 else f"步骤 {1 + rng.randint(0, 5)}",
                "mastery_score": round(rng.uniform(0.12, 0.96), 4),
                "remediation_status": _pick_weighted(rng, [("none", 0.62), ("watch", 0.22), ("active", 0.16)]),
                "completed_steps_count": rng.randint(0, 5),
                "metadata_json": {"noise": round(rng.random(), 3)},
                "started_at": created_at,
                "updated_at": created_at + timedelta(minutes=rng.randint(5, 180)),
            }
            session_rows.append(row)
            session_state.append({"id": session_id, "profile_id": profile_id, "kind": session_kind, "status": status})
            if session_kind == "guide":
                guide_session_ids_by_profile[profile_id].append(session_id)
            session_id += 1

    turn_counts = _distribute_total(
        total=max(config.target_learning_turns, len(session_rows)),
        bucket_count=len(session_rows),
        min_each=1,
        weights=[1.5 if item["kind"] == "guide" else 1.1 for item in session_state],
        rng=rng,
        max_each=14,
    )
    turn_rows: list[dict[str, Any]] = []
    turn_state: list[dict[str, Any]] = []
    turn_id = 1
    for session_info, count in zip(session_state, turn_counts, strict=False):
        profile_id = session_info["profile_id"]
        for turn_index in range(count):
            user_content = None if rng.random() < 0.08 else f"我想继续看 profile {profile_id} 的第 {turn_index + 1} 轮。"
            teacher_content = None if rng.random() < 0.06 else f"先解释这个概念，再给你一个例子。"
            peer_content = None if rng.random() < 0.45 else "我会换一个更生活化的角度来补充。"
            assistant_content = None if rng.random() < 0.18 else "我们先记住定义，再做迁移练习。"
            row = {
                "id": turn_id,
                "session_id": session_info["id"],
                "turn_kind": _pick_weighted(rng, [("guide", 0.48), ("reflection", 0.16), ("quiz", 0.16), ("explore", 0.2)]),
                "user_content": user_content,
                "teacher_content": teacher_content,
                "peer_content": peer_content,
                "assistant_content": assistant_content,
                "citations_json": [{"type": "fragment", "id": rng.randint(1, len(fragment_rows))}] if rng.random() < 0.54 else None,
                "evaluation_json": {"quality": round(rng.uniform(0.1, 0.98), 3)} if rng.random() < 0.72 else None,
                "related_concepts_json": [f"concept-{rng.randint(1, 40)}", f"concept-{rng.randint(41, 80)}"] if rng.random() < 0.66 else None,
                "bridge_metadata_json": {"noise": round(rng.random(), 3)} if rng.random() < 0.22 else None,
                "token_usage_json": {"prompt": rng.randint(120, 900), "completion": rng.randint(80, 600)},
                "latency_ms": rng.randint(220, 5_400),
                "metadata_json": {"noise": round(rng.random(), 3)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
            }
            turn_rows.append(row)
            turn_state.append({"id": turn_id, "session_id": session_info["id"], "profile_id": profile_id})
            turn_id += 1

    turns_by_session: dict[int, list[int]] = defaultdict(list)
    for turn in turn_state:
        turns_by_session[turn["session_id"]].append(turn["id"])

    context_rows: list[dict[str, Any]] = []
    context_id = 1
    for session_info in session_state:
        if session_info["kind"] != "guide":
            continue
        item_count = rng.randint(0, 3)
        for _ in range(item_count):
            source_session_id = None
            source_turn_id = None
            if rng.random() < 0.62 and turns_by_session[session_info["id"]]:
                source_session_id = session_info["id"]
                source_turn_id = turns_by_session[session_info["id"]][rng.randrange(len(turns_by_session[session_info["id"]]))]
            context_rows.append(
                {
                    "id": context_id,
                    "guide_session_id": session_info["id"],
                    "step_index": rng.randint(0, 5),
                    "source_session_id": source_session_id,
                    "source_turn_id": source_turn_id,
                    "title": f"步骤上下文 {context_id}",
                    "summary": None if rng.random() < 0.2 else "来自前序会话的知识摘录",
                    "content": "这一段上下文用于制造桥接与噪声。",
                    "citations_json": [{"type": "fragment", "id": rng.randint(1, len(fragment_rows))}] if fragment_rows and rng.random() < 0.55 else None,
                    "related_concepts_json": [f"concept-{rng.randint(1, 40)}"] if rng.random() < 0.5 else None,
                    "embedding": None,
                    "metadata_json": {"noise": round(rng.random(), 3)},
                    "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
                }
            )
            context_id += 1

    bridge_rows: list[dict[str, Any]] = []
    bridge_id = 1
    for session_info in session_state:
        if session_info["kind"] != "explore" or rng.random() < 0.22:
            continue
        candidate_turns = turns_by_session.get(session_info["id"]) or []
        bridge_rows.append(
            {
                "id": bridge_id,
                "action_type": _pick_weighted(rng, [("fork", 0.34), ("drill_down", 0.28), ("backtrack", 0.18), ("summary_jump", 0.2)]),
                "from_session_id": session_info["id"],
                "from_turn_id": candidate_turns[0] if candidate_turns and rng.random() < 0.72 else None,
                "to_session_id": session_info["id"] if rng.random() < 0.62 else None,
                "status": _pick_weighted(rng, [("completed", 0.7), ("pending", 0.18), ("failed", 0.12)]),
                "payload_json": {"noise": round(rng.random(), 3)},
                "result_json": None if rng.random() < 0.26 else {"turns": len(candidate_turns)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 4, rng),
            }
        )
        bridge_id += 1

    agent_run_rows: list[dict[str, Any]] = []
    agent_run_id = 1
    for turn in turn_state:
        agents = ["teacher"]
        if rng.random() < 0.58:
            agents.append("peer")
        if rng.random() < 0.44:
            agents.append("critic")
        for agent_name in agents:
            agent_run_rows.append(
                {
                    "id": agent_run_id,
                    "turn_id": turn["id"],
                    "agent_name": agent_name,
                    "model_name": _pick_weighted(rng, [("gpt-4.1-mini", 0.44), ("gpt-4.1", 0.32), ("local-llm", 0.24)]),
                    "status": _pick_weighted(rng, [("completed", 0.82), ("partial", 0.1), ("failed", 0.08)]),
                    "input_summary": "教学代理输入摘要",
                    "output_summary": None if rng.random() < 0.1 else "教学代理输出摘要",
                    "latency_ms": rng.randint(180, 4_200),
                    "metadata_json": {"noise": round(rng.random(), 3)},
                    "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
                }
            )
            agent_run_id += 1

    checkpoint_rows: list[dict[str, Any]] = []
    checkpoint_id = 1
    for turn in turn_state:
        if rng.random() < 0.42:
            mastery = round(rng.uniform(0.08, 0.96), 4)
            passed = mastery >= 0.58 and rng.random() > 0.12
            checkpoint_rows.append(
                {
                    "id": checkpoint_id,
                    "session_id": turn["session_id"],
                    "turn_id": turn["id"],
                    "step_index": rng.randint(0, 5),
                    "mastery_score": mastery,
                    "passed": passed,
                    "missing_concepts_json": None if passed else [f"concept-{rng.randint(1, 40)}", f"concept-{rng.randint(41, 80)}"],
                    "evidence_json": {"noise": round(rng.random(), 3)},
                    "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
                }
            )
            checkpoint_id += 1

    remediation_rows: list[dict[str, Any]] = []
    remediation_id = 1
    failed_sessions = {checkpoint["session_id"] for checkpoint in checkpoint_rows if not checkpoint["passed"]}
    for session_id in failed_sessions:
        if rng.random() < 0.16:
            continue
        remediation_rows.append(
            {
                "id": remediation_id,
                "session_id": session_id,
                "step_index": rng.randint(0, 5),
                "status": _pick_weighted(rng, [("active", 0.48), ("completed", 0.34), ("dismissed", 0.18)]),
                "missing_concepts_json": [f"concept-{rng.randint(1, 40)}"],
                "suggested_questions_json": ["这个概念和上一步的关系是什么？", "请给我一个反例。"],
                "plan_json": {"noise": round(rng.random(), 3)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 4, rng),
                "updated_at": _random_datetime(config.anchor_time, config.history_days // 4, rng),
            }
        )
        remediation_id += 1

    report_rows: list[dict[str, Any]] = []
    report_id = 1
    for session_info in session_state:
        if session_info["status"] not in {"completed", "stalled"} and rng.random() < 0.48:
            continue
        report_rows.append(
            {
                "id": report_id,
                "session_id": session_info["id"],
                "report_type": _pick_weighted(rng, [("session_summary", 0.62), ("checkpoint_summary", 0.22), ("handoff", 0.16)]),
                "summary": "学习报告自动总结了这段路径中的强项与弱项。",
                "weak_points_json": [f"concept-{rng.randint(1, 80)}"] if rng.random() < 0.62 else None,
                "suggested_next_action": "建议回看第一步材料并完成一轮自测。",
                "metadata_json": {"noise": round(rng.random(), 3)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 4, rng),
                "updated_at": _random_datetime(config.anchor_time, config.history_days // 4, rng),
            }
        )
        report_id += 1

    job_rows: list[dict[str, Any]] = []
    for job_id in range(1, max(config.target_learning_profiles, config.target_learning_profiles // 2) + 1):
        profile_id = 1 + ((job_id - 1) % config.target_learning_profiles)
        status = _pick_weighted(rng, [("queued", 0.12), ("running", 0.12), ("completed", 0.64), ("failed", 0.12)])
        job_rows.append(
            {
                "id": job_id,
                "profile_id": profile_id,
                "job_type": _pick_weighted(rng, [("build_path", 0.34), ("parse_assets", 0.26), ("run_checkpoint", 0.22), ("draft_report", 0.18)]),
                "status": status,
                "attempt_count": rng.randint(0, 3),
                "error_message": "provider timeout" if status == "failed" else None,
                "payload_json": {"noise": round(rng.random(), 3)},
                "created_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
                "updated_at": _random_datetime(config.anchor_time, config.history_days // 3, rng),
            }
        )

    return {
        "rows": [
            (LearningSourceBundle, bundle_rows, "learning_source_bundles"),
            (LearningProfile, profile_rows, "learning_profiles"),
            (LearningSourceAsset, asset_rows, "learning_source_assets"),
            (LearningFragment, fragment_rows, "learning_fragments"),
            (LearningPathVersion, path_version_rows, "learning_path_versions"),
            (LearningPathStep, path_step_rows, "learning_path_steps"),
            (LearningSession, session_rows, "learning_sessions"),
            (LearningTurn, turn_rows, "learning_turns"),
            (LearningStepContextItem, context_rows, "learning_step_context_items"),
            (LearningBridgeAction, bridge_rows, "learning_bridge_actions"),
            (LearningAgentRun, agent_run_rows, "learning_agent_runs"),
            (LearningCheckpoint, checkpoint_rows, "learning_checkpoints"),
            (LearningRemediationPlan, remediation_rows, "learning_remediation_plans"),
            (LearningReport, report_rows, "learning_reports"),
            (LearningJob, job_rows, "learning_jobs"),
        ],
        "profile_updates": profile_updates,
    }


def _insert_rows(session: Session, model: type[Any], rows: list[dict[str, Any]], chunk_size: int) -> None:
    if not rows:
        return
    statement = insert(model)
    for start in range(0, len(rows), chunk_size):
        session.execute(statement, rows[start : start + chunk_size])


def _sync_identity_sequences(session: Session) -> None:
    bind = session.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for table in Base.metadata.sorted_tables:
        id_column = table.columns.get("id")
        if id_column is None:
            continue
        if not getattr(id_column.type, "python_type", None) == int:
            continue
        session.execute(
            text(
                """
                SELECT setval(
                    pg_get_serial_sequence(:table_name, 'id'),
                    COALESCE((SELECT MAX(id) FROM {table_name}), 1),
                    true
                )
                """.replace("{table_name}", table.name)
            ),
            {"table_name": table.name},
        )


def _normalize_category(record: dict[str, Any]) -> str | None:
    category = _clean_text(record.get("category"), max_length=128)
    if category:
        return category
    subjects = record.get("subjects") or record.get("tags") or []
    if isinstance(subjects, list):
        for subject in subjects:
            normalized = _clean_text(subject, max_length=128)
            if normalized:
                return normalized
    return None


def _normalize_tags(record: dict[str, Any]) -> list[str]:
    raw_tags = record.get("tags") or record.get("subjects") or []
    if not isinstance(raw_tags, list):
        return []
    tags: list[str] = []
    seen: set[str] = set()
    for item in raw_tags:
        tag = _clean_text(item, max_length=128)
        if not tag:
            continue
        key = _slugify(tag, max_length=80)
        if key in seen:
            continue
        seen.add(key)
        tags.append(tag)
        if len(tags) >= 8:
            break
    return tags


def _clean_text(value: Any, *, max_length: int) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    text_value = re.sub(r"\s+", " ", text_value)
    if not text_value:
        return None
    return text_value[:max_length]


def _slugify(value: str, max_length: int = 64) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    slug = re.sub(r"-{2,}", "-", slug)
    return (slug or "item")[:max_length]


def _unique_slug(value: str, suffix: int, *, max_length: int) -> str:
    slug = _slugify(value, max_length=max_length - 8)
    return f"{slug}-{suffix}"[:max_length]


def _stable_hash(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()


def _pick_weighted(rng: random.Random, weighted_items: list[tuple[Any, float]]) -> Any:
    total_weight = sum(weight for _value, weight in weighted_items if weight > 0)
    if total_weight <= 0:
        raise ValueError("weighted_items must contain at least one positive weight")
    needle = rng.random() * total_weight
    cumulative = 0.0
    for value, weight in weighted_items:
        if weight <= 0:
            continue
        cumulative += weight
        if needle <= cumulative:
            return value
    return weighted_items[-1][0]


def _random_datetime(anchor: datetime, history_days: int, rng: random.Random) -> datetime:
    return anchor - timedelta(
        days=rng.randint(0, max(history_days, 1)),
        hours=rng.randint(0, 23),
        minutes=rng.randint(0, 59),
        seconds=rng.randint(0, 59),
    )


def _sample_unique_book(sampler: WeightedSampler, selected_books: set[int], rng: random.Random) -> int:
    while True:
        book_id = sampler.sample(rng)
        if book_id in selected_books:
            continue
        selected_books.add(book_id)
        return book_id


def _extension_for_source_kind(source_kind: str) -> str:
    return {
        "pdf": "pdf",
        "epub": "epub",
        "scan": "pdf",
        "notes": "md",
        "ppt": "pptx",
        "txt": "txt",
    }.get(source_kind, "txt")


def _mime_type_for_source_kind(source_kind: str) -> str:
    return {
        "pdf": "application/pdf",
        "epub": "application/epub+zip",
        "scan": "application/pdf",
        "notes": "text/markdown",
        "ppt": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "txt": "text/plain",
    }.get(source_kind, "text/plain")


def _order_to_fulfillment_status(order_status: str) -> str:
    return {
        "awaiting_pick": "awaiting_pick",
        "picked_from_cabinet": "picked_from_cabinet",
        "delivering": "delivering",
        "delivered": "delivered",
        "completed": "completed",
        "returned": "completed",
        "cancelled": "cancelled",
    }.get(order_status, "awaiting_pick")


def _search_phrase_for_book(book: dict[str, Any], rng: random.Random) -> str:
    options = [
        book["title"],
        f"{book['title']} {book['author'] or ''}".strip(),
        book["category"],
        book["tags"][0] if book["tags"] else book["category"],
        f"{book['category']} 入门",
        f"{book['title']} 适合谁",
    ]
    return options[rng.randrange(len(options))]


def _distribute_total(
    *,
    total: int,
    bucket_count: int,
    min_each: int,
    weights: list[float],
    rng: random.Random,
    max_each: int | None = None,
) -> list[int]:
    if bucket_count <= 0:
        return []
    counts = [min_each] * bucket_count
    remaining = total - bucket_count * min_each
    if remaining <= 0:
        return counts
    sampler = WeightedSampler.from_weight_map([(index, weight) for index, weight in enumerate(weights, start=0)])
    while remaining > 0:
        index = sampler.sample(rng)
        if max_each is not None and counts[index] >= max_each:
            continue
        counts[index] += 1
        remaining -= 1
    return counts
