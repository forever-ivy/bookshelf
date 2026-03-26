from __future__ import annotations

import argparse
import math
import random
import re
import warnings
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import func, select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.db.base import import_model_modules
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile


BOOKS_DIR = Path(__file__).resolve().parents[1] / "data"
ML_DEMO_USERNAME_PREFIX = "demo_ml_reader_"
DEFAULT_RANDOM_SEED = 20260326
CN_REQUIRED_COLUMNS = {"书名", "作者", "关键词", "摘要", "中国图书分类号"}
DOUBAN_REQUIRED_COLUMNS = {"书名", "作者", "豆瓣成员常用的标签", "评分", "标签"}
BORROWABLE_SIGNAL_STATUSES = {"completed", "returned"}
STOPWORD_TOKENS = {
    "中国",
    "研究",
    "理论",
    "方法",
    "教程",
    "基础",
    "应用",
    "导论",
    "教材",
    "分析",
    "实践",
    "文化",
    "文学",
    "历史",
    "小说",
    "作品",
    "丛书",
}

warnings.filterwarnings(
    "ignore",
    message=r"Cell .* is marked as a date but the serial value .* is outside the limits for dates\.",
    category=UserWarning,
    module=r"openpyxl\.worksheet\._reader",
)


@dataclass(slots=True)
class BorrowTimeline:
    created_at: datetime
    picked_at: datetime
    completed_at: datetime


@dataclass(slots=True)
class BookRecord:
    id: int
    title: str
    author: str | None
    category: str | None
    keywords: str | None
    summary: str | None


@dataclass(slots=True)
class CategoryPool:
    root: str
    book_ids: list[int]
    core_book_ids: list[int]
    subtopic_names: list[str]
    subtopic_to_books: dict[str, list[int]]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed denser same-topic borrow history for recommendation model training."
    )
    parser.add_argument(
        "--books-dir",
        default=str(BOOKS_DIR),
        help="Directory containing the Chinese and Douban Excel files.",
    )
    parser.add_argument(
        "--category-pool-limit",
        type=int,
        default=12,
        help="How many broad Chinese category pools to use.",
    )
    parser.add_argument(
        "--readers-per-category-pool",
        type=int,
        default=10,
        help="How many demo readers to generate per category pool.",
    )
    parser.add_argument(
        "--books-per-reader",
        type=int,
        default=8,
        help="How many borrow orders to create for each generated reader.",
    )
    parser.add_argument(
        "--min-category-books",
        type=int,
        default=30,
        help="Minimum matched books required to keep a category pool.",
    )
    parser.add_argument(
        "--max-books-per-pool",
        type=int,
        default=48,
        help="Cap each category pool to the most common books so the overlap stays dense.",
    )
    parser.add_argument(
        "--core-books-per-pool",
        type=int,
        default=16,
        help="How many highly reused core books to keep in each category pool.",
    )
    parser.add_argument(
        "--subtopics-per-pool",
        type=int,
        default=4,
        help="How many keyword-based subtopics to keep in each category pool.",
    )
    parser.add_argument(
        "--min-orders",
        type=int,
        default=500,
        help="Guarantee at least this many synthetic borrow orders.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_RANDOM_SEED,
        help="Random seed for deterministic synthetic history generation.",
    )
    return parser.parse_args()


def log(message: str) -> None:
    print(message, flush=True)


def normalize_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    if not text or text == "nan":
        return ""
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[^\w\u4e00-\u9fff]+", "", text)
    return text


def parse_category_root(value) -> str:
    text = str(value or "").strip().upper()
    match = re.match(r"[A-Z]+(?:-\d+)?", text)
    if match:
        return match.group(0)
    text = text.split("/")[0].split("-")[0].strip()
    return text[:6] if text else ""


def split_terms(value) -> list[str]:
    if value is None:
        return []
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return []
    parts = re.split(r"[\s,，、；;|/]+", text)
    return [part.strip() for part in parts if len(part.strip()) >= 2]


def parse_rating(value) -> float | None:
    try:
        rating = float(value)
    except (TypeError, ValueError):
        return None
    if rating <= 0:
        return None
    return rating


def find_excel_sources(books_dir: Path) -> tuple[Path, Path]:
    chinese_path: Path | None = None
    douban_path: Path | None = None
    for path in books_dir.iterdir():
        if path.suffix.lower() != ".xlsx":
            continue
        try:
            columns = set(pd.read_excel(path, nrows=0).columns)
        except Exception:
            continue
        if CN_REQUIRED_COLUMNS.issubset(columns):
            chinese_path = path
        if DOUBAN_REQUIRED_COLUMNS.issubset(columns):
            douban_path = path
    if chinese_path is None:
        raise FileNotFoundError("Could not find the Chinese book Excel file in books_dir")
    if douban_path is None:
        raise FileNotFoundError("Could not find the Douban Excel file in books_dir")
    return chinese_path, douban_path


def load_books(session) -> list[BookRecord]:
    rows = session.execute(
        select(
            Book.id,
            Book.title,
            Book.author,
            Book.category,
            Book.keywords,
            Book.summary,
        ).order_by(Book.id.asc())
    ).all()
    return [
        BookRecord(
            id=row.id,
            title=row.title,
            author=row.author,
            category=row.category,
            keywords=row.keywords,
            summary=row.summary,
        )
        for row in rows
    ]


def load_book_lookup(books: list[BookRecord]) -> tuple[dict[str, BookRecord], dict[str, BookRecord]]:
    by_title: dict[str, BookRecord] = {}
    by_title_author: dict[str, BookRecord] = {}
    for book in books:
        title_key = normalize_text(book.title)
        author_key = normalize_text(book.author)
        if title_key and title_key not in by_title:
            by_title[title_key] = book
        if title_key:
            by_title_author[f"{title_key}|{author_key}"] = book
    return by_title, by_title_author


def match_book(
    row_title,
    row_author,
    *,
    by_title: dict[str, BookRecord],
    by_title_author: dict[str, BookRecord],
) -> BookRecord | None:
    title_key = normalize_text(row_title)
    author_key = normalize_text(row_author)
    if not title_key:
        return None
    return by_title_author.get(f"{title_key}|{author_key}") or by_title.get(title_key)


def choose_index_by_weight(rng: random.Random, weights: list[float]) -> int:
    total = sum(max(weight, 0.0) for weight in weights)
    if total <= 0:
        return rng.randrange(len(weights))
    threshold = rng.random() * total
    cursor = 0.0
    for index, weight in enumerate(weights):
        cursor += max(weight, 0.0)
        if cursor >= threshold:
            return index
    return len(weights) - 1


def weighted_sample(
    rng: random.Random,
    book_ids: list[int],
    *,
    count: int,
    exclude_ids: set[int],
    weight_by_book: dict[int, float],
) -> list[int]:
    candidates = [book_id for book_id in book_ids if book_id not in exclude_ids]
    selected: list[int] = []
    while candidates and len(selected) < count:
        weights = [weight_by_book.get(book_id, 1.0) for book_id in candidates]
        index = choose_index_by_weight(rng, weights)
        chosen = candidates.pop(index)
        selected.append(chosen)
        exclude_ids.add(chosen)
    return selected


def build_borrow_timeline(
    rng: random.Random,
    *,
    now: datetime,
    order_offset: int,
) -> BorrowTimeline:
    completed_at = now - timedelta(
        days=rng.randint(0, 280),
        hours=(order_offset * 6) + rng.randint(1, 48),
    )
    picked_at = completed_at - timedelta(
        days=rng.randint(3, 28),
        hours=rng.randint(1, 12),
    )
    created_at = picked_at - timedelta(hours=rng.randint(1, 48))
    return BorrowTimeline(
        created_at=created_at,
        picked_at=picked_at,
        completed_at=completed_at,
    )


def get_or_create_demo_reader(session, index: int) -> ReaderProfile:
    username = f"{ML_DEMO_USERNAME_PREFIX}{index:03d}"
    account = session.scalar(select(ReaderAccount).where(ReaderAccount.username == username))
    if account is None:
        account = ReaderAccount(username=username, password_hash="demo-ml-not-for-login")
        session.add(account)
        session.flush()

    profile = session.scalar(select(ReaderProfile).where(ReaderProfile.account_id == account.id))
    if profile is None:
        profile = ReaderProfile(
            account_id=account.id,
            display_name=f"ML推荐读者{index:03d}",
            affiliation_type="student",
            college="Demo College",
            major="Recommendation",
            grade_year="2026",
        )
        session.add(profile)
        session.flush()
    return profile


def get_demo_profile_ids(session) -> list[int]:
    return list(
        session.execute(
            select(ReaderProfile.id)
            .join(ReaderAccount, ReaderProfile.account_id == ReaderAccount.id)
            .where(ReaderAccount.username.like(f"{ML_DEMO_USERNAME_PREFIX}%"))
        ).scalars()
    )


def delete_existing_demo_orders(session, profile_ids: list[int]) -> int:
    if not profile_ids:
        return 0
    rows = session.execute(
        select(BorrowOrder).where(BorrowOrder.reader_id.in_(profile_ids))
    ).scalars().all()
    count = len(rows)
    for row in rows:
        session.delete(row)
    session.flush()
    return count


def load_existing_borrow_counts(session) -> dict[int, int]:
    rows = session.execute(
        select(BorrowOrder.book_id, func.count(BorrowOrder.id))
        .where(BorrowOrder.book_id.is_not(None))
        .where(BorrowOrder.status.in_(BORROWABLE_SIGNAL_STATUSES))
        .group_by(BorrowOrder.book_id)
    ).all()
    return {
        int(book_id): int(count)
        for book_id, count in rows
        if book_id is not None
    }


def load_douban_metadata(
    douban_path: Path,
    *,
    by_title: dict[str, BookRecord],
    by_title_author: dict[str, BookRecord],
) -> tuple[dict[int, float], dict[int, int]]:
    df = pd.read_excel(
        douban_path,
        usecols=["书名", "作者", "豆瓣成员常用的标签", "评分", "标签"],
    )
    rating_by_book: dict[int, float] = {}
    tag_count_by_book: dict[int, int] = defaultdict(int)

    for _, row in df.iterrows():
        book = match_book(row["书名"], row["作者"], by_title=by_title, by_title_author=by_title_author)
        if book is None:
            continue
        rating = parse_rating(row["评分"])
        if rating is not None:
            rating_by_book[book.id] = max(rating_by_book.get(book.id, 0.0), rating)
        tags = split_terms(row["豆瓣成员常用的标签"]) + split_terms(row["标签"])
        cleaned_tags = [
            tag
            for tag in tags
            if tag not in STOPWORD_TOKENS and len(tag) <= 10
        ]
        if cleaned_tags:
            tag_count_by_book[book.id] += len(set(cleaned_tags))

    return rating_by_book, dict(tag_count_by_book)


def build_book_weights(
    session,
    *,
    books: list[BookRecord],
    douban_path: Path,
    by_title: dict[str, BookRecord],
    by_title_author: dict[str, BookRecord],
) -> tuple[dict[int, float], dict[int, float]]:
    rating_by_book, tag_count_by_book = load_douban_metadata(
        douban_path,
        by_title=by_title,
        by_title_author=by_title_author,
    )
    borrow_count_by_book = load_existing_borrow_counts(session)

    weight_by_book: dict[int, float] = {}
    for book in books:
        weight = 1.0
        borrow_count = borrow_count_by_book.get(book.id, 0)
        rating = rating_by_book.get(book.id)
        tag_count = tag_count_by_book.get(book.id, 0)

        weight += min(borrow_count, 18) * 0.45
        if rating is not None:
            weight += max(0.0, rating - 7.0) * 1.25
        weight += min(tag_count, 6) * 0.12
        if book.author:
            weight += 0.12
        if book.keywords:
            weight += 0.25
        if book.summary:
            weight += 0.25
        if book.category:
            weight += 0.15

        weight_by_book[book.id] = round(weight, 6)

    return weight_by_book, rating_by_book


def load_category_pools(
    chinese_path: Path,
    *,
    by_title: dict[str, BookRecord],
    by_title_author: dict[str, BookRecord],
    min_category_books: int,
    category_pool_limit: int,
    max_books_per_pool: int,
    core_books_per_pool: int,
    subtopics_per_pool: int,
    weight_by_book: dict[int, float],
) -> list[CategoryPool]:
    df = pd.read_excel(
        chinese_path,
        usecols=["书名", "作者", "关键词", "中国图书分类号"],
    )

    root_to_books: dict[str, list[int]] = defaultdict(list)
    root_to_token_books: dict[str, dict[str, set[int]]] = defaultdict(lambda: defaultdict(set))
    root_to_token_counter: dict[str, Counter[str]] = defaultdict(Counter)

    for _, row in df.iterrows():
        book = match_book(row["书名"], row["作者"], by_title=by_title, by_title_author=by_title_author)
        if book is None:
            continue

        root = parse_category_root(row["中国图书分类号"] or book.category)
        if not root:
            continue

        root_to_books[root].append(book.id)
        keyword_tokens = [
            token
            for token in split_terms(row["关键词"]) + split_terms(book.keywords)
            if token not in STOPWORD_TOKENS and len(token) >= 2
        ]
        for token in keyword_tokens:
            root_to_token_books[root][token].add(book.id)
            root_to_token_counter[root][token] += 1

    ranked_roots = sorted(
        (
            (root, len(set(book_ids)))
            for root, book_ids in root_to_books.items()
            if len(set(book_ids)) >= min_category_books
        ),
        key=lambda item: (-item[1], item[0]),
    )[:category_pool_limit]

    pools: list[CategoryPool] = []
    for root, _count in ranked_roots:
        unique_ids = list(dict.fromkeys(root_to_books[root]))
        unique_ids.sort(key=lambda book_id: (-weight_by_book.get(book_id, 1.0), book_id))
        trimmed_ids = unique_ids[:max_books_per_pool]
        trimmed_set = set(trimmed_ids)

        subtopic_candidates: list[tuple[str, float, list[int]]] = []
        for token, token_book_ids in root_to_token_books[root].items():
            filtered = [book_id for book_id in token_book_ids if book_id in trimmed_set]
            if len(filtered) < 4:
                continue
            filtered.sort(key=lambda book_id: (-weight_by_book.get(book_id, 1.0), book_id))
            score = sum(weight_by_book.get(book_id, 1.0) for book_id in filtered[:8]) + root_to_token_counter[root][token]
            subtopic_candidates.append((token, score, filtered[: max(10, core_books_per_pool)]))

        subtopic_candidates.sort(key=lambda item: (-item[1], item[0]))
        chosen_subtopics = subtopic_candidates[:subtopics_per_pool]

        if len(trimmed_ids) < max(8, core_books_per_pool):
            continue

        pools.append(
            CategoryPool(
                root=root,
                book_ids=trimmed_ids,
                core_book_ids=trimmed_ids[:core_books_per_pool],
                subtopic_names=[name for name, _score, _ids in chosen_subtopics],
                subtopic_to_books={name: ids for name, _score, ids in chosen_subtopics},
            )
        )

    return pools


def build_reader_templates(
    rng: random.Random,
    *,
    pool: CategoryPool,
    books_per_reader: int,
    weight_by_book: dict[int, float],
) -> list[list[int]]:
    template_count = min(4, max(2, books_per_reader // 2))
    templates: list[list[int]] = []

    for template_index in range(template_count):
        exclude_ids: set[int] = set()
        selected: list[int] = []
        selected.extend(
            weighted_sample(
                rng,
                pool.core_book_ids,
                count=min(4, books_per_reader - 2),
                exclude_ids=exclude_ids,
                weight_by_book=weight_by_book,
            )
        )

        if pool.subtopic_names:
            subtopic_name = pool.subtopic_names[template_index % len(pool.subtopic_names)]
            selected.extend(
                weighted_sample(
                    rng,
                    pool.subtopic_to_books[subtopic_name],
                    count=min(2, max(0, books_per_reader - len(selected) - 1)),
                    exclude_ids=exclude_ids,
                    weight_by_book=weight_by_book,
                )
            )

        selected.extend(
            weighted_sample(
                rng,
                pool.book_ids,
                count=min(2, max(0, books_per_reader - len(selected))),
                exclude_ids=exclude_ids,
                weight_by_book=weight_by_book,
            )
        )
        templates.append(selected[:books_per_reader])

    return templates


def build_reader_history(
    rng: random.Random,
    *,
    pool: CategoryPool,
    template: list[int],
    books_per_reader: int,
    weight_by_book: dict[int, float],
) -> list[int]:
    exclude_ids: set[int] = set()
    selected: list[int] = []

    selected.extend(template[:books_per_reader])
    exclude_ids.update(selected)

    if pool.subtopic_names:
        subtopic_name = rng.choice(pool.subtopic_names)
        selected.extend(
            weighted_sample(
                rng,
                pool.subtopic_to_books[subtopic_name],
                count=min(2, max(0, books_per_reader - len(selected))),
                exclude_ids=exclude_ids,
                weight_by_book=weight_by_book,
            )
        )

    selected.extend(
        weighted_sample(
            rng,
            pool.core_book_ids,
            count=min(2, max(0, books_per_reader - len(selected))),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            pool.book_ids,
            count=max(0, books_per_reader - len(selected)),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    return selected[:books_per_reader]


def ensure_reader_quota(
    *,
    category_pool_count: int,
    readers_per_category_pool: int,
    books_per_reader: int,
    min_orders: int,
) -> int:
    if category_pool_count <= 0:
        raise RuntimeError("No category pools were built")
    base_orders = category_pool_count * readers_per_category_pool * books_per_reader
    if base_orders >= min_orders:
        return readers_per_category_pool
    required_readers = math.ceil(min_orders / max(1, books_per_reader))
    return max(readers_per_category_pool, math.ceil(required_readers / category_pool_count))


def seed_orders(
    session,
    *,
    category_pools: list[CategoryPool],
    readers_per_category_pool: int,
    books_per_reader: int,
    min_orders: int,
    weight_by_book: dict[int, float],
    seed: int,
) -> dict:
    rng = random.Random(seed)
    removed_orders = delete_existing_demo_orders(session, get_demo_profile_ids(session))
    now = datetime.now(timezone.utc)

    effective_readers_per_pool = ensure_reader_quota(
        category_pool_count=len(category_pools),
        readers_per_category_pool=readers_per_category_pool,
        books_per_reader=books_per_reader,
        min_orders=min_orders,
    )

    total_orders = 0
    demo_profiles: list[ReaderProfile] = []
    distinct_book_ids: set[int] = set()
    category_summary: dict[str, int] = {}

    reader_index = 1
    for pool in category_pools:
        templates = build_reader_templates(
            rng,
            pool=pool,
            books_per_reader=books_per_reader,
            weight_by_book=weight_by_book,
        )
        for reader_offset in range(effective_readers_per_pool):
            profile = get_or_create_demo_reader(session, reader_index)
            reader_index += 1
            demo_profiles.append(profile)

            template = templates[reader_offset % len(templates)]
            history = build_reader_history(
                rng,
                pool=pool,
                template=template,
                books_per_reader=books_per_reader,
                weight_by_book=weight_by_book,
            )

            for order_offset, book_id in enumerate(history):
                timeline = build_borrow_timeline(rng, now=now, order_offset=order_offset)
                session.add(
                    BorrowOrder(
                        reader_id=profile.id,
                        book_id=book_id,
                        assigned_copy_id=None,
                        order_mode="cabinet_pickup",
                        status="completed",
                        created_at=timeline.created_at,
                        updated_at=timeline.completed_at,
                        picked_at=timeline.picked_at,
                        delivered_at=timeline.picked_at,
                        completed_at=timeline.completed_at,
                    )
                )
                total_orders += 1
                distinct_book_ids.add(book_id)
                category_summary[pool.root] = category_summary.get(pool.root, 0) + 1

    session.commit()
    return {
        "reader_count": len(demo_profiles),
        "removed_orders": removed_orders,
        "created_orders": total_orders,
        "distinct_books": len(distinct_book_ids),
        "category_summary": category_summary,
        "readers_per_pool": effective_readers_per_pool,
    }


def main() -> None:
    args = parse_args()
    if args.books_per_reader < 6:
        raise ValueError("--books-per-reader must be at least 6")
    if args.min_orders < 500:
        raise ValueError("--min-orders must be at least 500")
    if args.max_books_per_pool < args.core_books_per_pool:
        raise ValueError("--max-books-per-pool must be >= --core-books-per-pool")

    books_dir = Path(args.books_dir)
    if not books_dir.exists():
        raise FileNotFoundError(f"books_dir does not exist: {books_dir}")

    log("正在定位 Excel 数据源...")
    chinese_path, douban_path = find_excel_sources(books_dir)
    log(f"中文图书表: {chinese_path.name}")
    log(f"豆瓣图书表: {douban_path.name}")

    settings = get_settings()
    import_model_modules()
    init_engine(settings)
    session_factory = get_session_factory()

    with session_factory() as session:
        log("正在读取当前 books 表...")
        books = load_books(session)
        by_title, by_title_author = load_book_lookup(books)
        log(f"已加载图书元数据: {len(books)} 本")

        log("正在计算图书热度权重...")
        weight_by_book, rating_by_book = build_book_weights(
            session,
            books=books,
            douban_path=douban_path,
            by_title=by_title,
            by_title_author=by_title_author,
        )

        log("正在构建同类借阅主题池...")
        category_pools = load_category_pools(
            chinese_path,
            by_title=by_title,
            by_title_author=by_title_author,
            min_category_books=args.min_category_books,
            category_pool_limit=args.category_pool_limit,
            max_books_per_pool=args.max_books_per_pool,
            core_books_per_pool=args.core_books_per_pool,
            subtopics_per_pool=args.subtopics_per_pool,
            weight_by_book=weight_by_book,
        )
        if not category_pools:
            raise RuntimeError("Could not build any category pools from the Chinese Excel file")
        log(f"已构建稳定主题池 {len(category_pools)} 个")

        log("正在写入更密集的同类借阅历史...")
        result = seed_orders(
            session,
            category_pools=category_pools,
            readers_per_category_pool=args.readers_per_category_pool,
            books_per_reader=args.books_per_reader,
            min_orders=args.min_orders,
            weight_by_book=weight_by_book,
            seed=args.seed,
        )

        total_orders = session.scalar(select(func.count(BorrowOrder.id))) or 0
        distinct_readers = session.scalar(select(func.count(func.distinct(BorrowOrder.reader_id)))) or 0
        distinct_books = session.scalar(select(func.count(func.distinct(BorrowOrder.book_id)))) or 0

    overlap_ratio = round(result["created_orders"] / max(1, result["distinct_books"]), 2)
    rated_books = sum(1 for _book_id, rating in rating_by_book.items() if rating is not None)

    log("推荐训练借阅数据写入完成。")
    log(f"新增 demo_ml readers: {result['reader_count']}")
    log(f"删除旧 demo_ml borrow_orders: {result['removed_orders']}")
    log(f"新增 borrow_orders: {result['created_orders']}")
    log(f"本次使用 distinct books: {result['distinct_books']}")
    log(f"本次平均每本书被借阅次数: {overlap_ratio}")
    log(f"每个主题池生成读者数: {result['readers_per_pool']}")
    log(f"参与权重计算的豆瓣匹配图书数: {rated_books}")
    log(f"当前 borrow_orders 总量: {total_orders}")
    log(f"当前 borrow_orders 涉及读者数: {distinct_readers}")
    log(f"当前 borrow_orders 涉及图书数: {distinct_books}")
    log("主题池借阅分布:")
    for category_root, count in sorted(result["category_summary"].items(), key=lambda item: (-item[1], item[0])):
        log(f"  - {category_root}: {count}")


if __name__ == "__main__":
    main()
