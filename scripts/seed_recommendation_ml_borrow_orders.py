from __future__ import annotations

import argparse
import random
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
from sqlalchemy import func, select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile


BOOKS_DIR = Path(r"C:/Users/32140/Desktop/smart_bookshelf/books")
ML_DEMO_USERNAME_PREFIX = "demo_ml_reader_"
DEFAULT_RANDOM_SEED = 20260326
CN_REQUIRED_COLUMNS = {"书名", "作者", "关键词", "摘要", "中国图书分类号"}
DOUBAN_REQUIRED_COLUMNS = {"书名", "作者", "豆瓣成员常用的标签", "评分", "标签"}
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
    "经典",
    "社会",
    "作品",
}


@dataclass(slots=True)
class BorrowTimeline:
    created_at: datetime
    picked_at: datetime
    completed_at: datetime


@dataclass(slots=True)
class CategoryPool:
    root: str
    book_ids: list[int]
    anchor_book_ids: list[int]
    focus_tokens: list[str]
    focus_token_to_books: dict[str, list[int]]


@dataclass(slots=True)
class TagPool:
    tag: str
    book_ids: list[int]
    anchor_book_ids: list[int]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed richer borrow history for machine-learning recommendation training."
    )
    parser.add_argument(
        "--books-dir",
        default=str(BOOKS_DIR),
        help="Directory containing the Chinese and Douban Excel files.",
    )
    parser.add_argument(
        "--category-pool-limit",
        type=int,
        default=18,
        help="How many broad Chinese category pools to use.",
    )
    parser.add_argument(
        "--tag-pool-limit",
        type=int,
        default=12,
        help="How many matched Douban tag pools to use.",
    )
    parser.add_argument(
        "--readers-per-category-pool",
        type=int,
        default=10,
        help="How many demo readers to generate per Chinese category pool.",
    )
    parser.add_argument(
        "--readers-per-tag-pool",
        type=int,
        default=8,
        help="How many demo readers to generate per Douban tag pool.",
    )
    parser.add_argument(
        "--books-per-reader",
        type=int,
        default=14,
        help="How many borrow orders to create for each generated reader.",
    )
    parser.add_argument(
        "--min-category-books",
        type=int,
        default=180,
        help="Minimum matched books required to keep a Chinese category pool.",
    )
    parser.add_argument(
        "--min-tag-books",
        type=int,
        default=12,
        help="Minimum matched books required to keep a Douban tag pool.",
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
    text = text.replace("（", "(").replace("）", ")").replace("，", ",")
    text = re.sub(r"[^\w\u4e00-\u9fff]+", "", text)
    return text


def parse_category_root(value) -> str:
    text = str(value or "").strip().upper()
    match = re.match(r"[A-Z]+", text)
    if match:
        return match.group(0)
    text = text.split("/")[0].split("-")[0].strip()
    return text[:3] if text else ""


def split_terms(value) -> list[str]:
    if value is None:
        return []
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return []
    parts = re.split(r"[\s,/，、;；|]+", text)
    return [part.strip() for part in parts if len(part.strip()) >= 2]


def parse_rating(value) -> float | None:
    try:
        if value is None:
            return None
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


def load_book_lookup(session) -> tuple[dict[str, Book], dict[str, Book]]:
    rows = list(session.execute(select(Book).order_by(Book.id.asc())).scalars())
    by_title: dict[str, Book] = {}
    by_title_author: dict[str, Book] = {}
    for book in rows:
        title_key = normalize_text(book.title)
        author_key = normalize_text(book.author)
        if title_key and title_key not in by_title:
            by_title[title_key] = book
        if title_key:
            by_title_author[f"{title_key}|{author_key}"] = book
    return by_title, by_title_author


def match_book(row_title, row_author, *, by_title: dict[str, Book], by_title_author: dict[str, Book]) -> Book | None:
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


def choose_anchor_ids(
    rng: random.Random,
    book_ids: list[int],
    *,
    target_size: int,
    weight_by_book: dict[int, float],
) -> list[int]:
    exclude_ids: set[int] = set()
    return weighted_sample(
        rng,
        list(dict.fromkeys(book_ids)),
        count=min(target_size, len(set(book_ids))),
        exclude_ids=exclude_ids,
        weight_by_book=weight_by_book,
    )


def build_borrow_timeline(
    rng: random.Random,
    *,
    now: datetime,
    order_offset: int,
) -> BorrowTimeline:
    completed_at = now - timedelta(
        days=rng.randint(0, 320),
        hours=(order_offset * 4) + rng.randint(1, 36),
    )
    picked_at = completed_at - timedelta(
        days=rng.randint(5, 42),
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
            major="Machine Learning Recommendation",
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


def load_category_pools(
    chinese_path: Path,
    *,
    by_title: dict[str, Book],
    by_title_author: dict[str, Book],
    rng: random.Random,
    min_category_books: int,
    category_pool_limit: int,
    weight_by_book: dict[int, float],
) -> tuple[list[CategoryPool], dict[int, set[str]]]:
    df = pd.read_excel(chinese_path, usecols=["书名", "作者", "关键词", "中国图书分类号"])
    root_to_books: dict[str, list[int]] = defaultdict(list)
    root_to_token_counter: dict[str, Counter[str]] = defaultdict(Counter)
    root_to_token_books: dict[str, dict[str, set[int]]] = defaultdict(lambda: defaultdict(set))
    keywords_by_book: dict[int, set[str]] = defaultdict(set)

    for _, row in df.iterrows():
        book = match_book(row["书名"], row["作者"], by_title=by_title, by_title_author=by_title_author)
        if book is None:
            continue
        root = parse_category_root(row["中国图书分类号"] or book.category)
        if not root:
            continue
        root_to_books[root].append(book.id)
        tokens = [
            token for token in split_terms(row["关键词"])
            if token not in STOPWORD_TOKENS and len(token) >= 2
        ]
        for token in tokens:
            root_to_token_counter[root][token] += 1
            root_to_token_books[root][token].add(book.id)
            keywords_by_book[book.id].add(token)

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
        token_to_books = {
            token: sorted(book_ids)
            for token, book_ids in root_to_token_books[root].items()
            if len(book_ids) >= 12
        }
        focus_tokens = [
            token
            for token, _freq in root_to_token_counter[root].most_common(20)
            if token in token_to_books
        ][:8]
        anchor_book_ids = choose_anchor_ids(
            rng,
            unique_ids,
            target_size=26,
            weight_by_book=weight_by_book,
        )
        pools.append(
            CategoryPool(
                root=root,
                book_ids=unique_ids,
                anchor_book_ids=anchor_book_ids,
                focus_tokens=focus_tokens,
                focus_token_to_books={token: token_to_books[token] for token in focus_tokens},
            )
        )
    return pools, keywords_by_book


def load_douban_tag_pools(
    douban_path: Path,
    *,
    by_title: dict[str, Book],
    by_title_author: dict[str, Book],
    rng: random.Random,
    min_tag_books: int,
    tag_pool_limit: int,
) -> tuple[list[TagPool], dict[int, float], list[int]]:
    df = pd.read_excel(
        douban_path,
        usecols=["书名", "作者", "豆瓣成员常用的标签", "评分", "标签"],
    )
    tag_to_books: dict[str, set[int]] = defaultdict(set)
    rating_by_book: dict[int, float] = {}

    for _, row in df.iterrows():
        book = match_book(row["书名"], row["作者"], by_title=by_title, by_title_author=by_title_author)
        if book is None:
            continue
        rating = parse_rating(row["评分"])
        if rating is not None:
            rating_by_book[book.id] = max(rating_by_book.get(book.id, 0.0), rating)
        tags = split_terms(row["豆瓣成员常用的标签"]) + split_terms(row["标签"])
        for tag in tags:
            if tag in STOPWORD_TOKENS or len(tag) >= 10:
                continue
            tag_to_books[tag].add(book.id)

    ranked_tags = sorted(
        (
            (tag, len(book_ids))
            for tag, book_ids in tag_to_books.items()
            if len(book_ids) >= min_tag_books
        ),
        key=lambda item: (-item[1], item[0]),
    )[:tag_pool_limit]

    weight_by_book = {
        book_id: 1.0 + max(0.0, rating - 6.5) * 0.35
        for book_id, rating in rating_by_book.items()
    }
    pools: list[TagPool] = []
    for tag, _count in ranked_tags:
        book_ids = sorted(tag_to_books[tag])
        anchor_book_ids = choose_anchor_ids(
            rng,
            book_ids,
            target_size=18,
            weight_by_book=weight_by_book,
        )
        pools.append(TagPool(tag=tag, book_ids=book_ids, anchor_book_ids=anchor_book_ids))

    popular_book_ids = [
        book_id
        for book_id, _rating in sorted(
            rating_by_book.items(),
            key=lambda item: (-item[1], item[0]),
        )
    ]
    return pools, weight_by_book, popular_book_ids


def build_reader_history_from_category(
    rng: random.Random,
    *,
    primary_pool: CategoryPool,
    secondary_pool: CategoryPool | TagPool,
    books_per_reader: int,
    weight_by_book: dict[int, float],
) -> list[int]:
    exclude_ids: set[int] = set()
    primary_target = max(6, books_per_reader - 5)
    secondary_target = min(4, max(2, books_per_reader // 4))

    if primary_pool.focus_tokens:
        focus_token = rng.choice(primary_pool.focus_tokens)
        focus_ids = primary_pool.focus_token_to_books.get(focus_token, [])
    else:
        focus_ids = []

    selected: list[int] = []
    selected.extend(
        weighted_sample(
            rng,
            focus_ids or primary_pool.anchor_book_ids or primary_pool.book_ids,
            count=min(4, primary_target),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            primary_pool.anchor_book_ids + primary_pool.book_ids,
            count=max(0, primary_target - len(selected)),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            secondary_pool.anchor_book_ids + secondary_pool.book_ids,
            count=secondary_target,
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            primary_pool.book_ids,
            count=max(0, books_per_reader - len(selected)),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    return selected[:books_per_reader]


def build_reader_history_from_tag(
    rng: random.Random,
    *,
    primary_pool: TagPool,
    secondary_pool: CategoryPool,
    books_per_reader: int,
    weight_by_book: dict[int, float],
    global_popular_book_ids: list[int],
) -> list[int]:
    exclude_ids: set[int] = set()
    selected: list[int] = []
    selected.extend(
        weighted_sample(
            rng,
            primary_pool.anchor_book_ids + primary_pool.book_ids,
            count=max(5, books_per_reader - 6),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            secondary_pool.anchor_book_ids + secondary_pool.book_ids,
            count=3,
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    selected.extend(
        weighted_sample(
            rng,
            global_popular_book_ids,
            count=max(0, books_per_reader - len(selected)),
            exclude_ids=exclude_ids,
            weight_by_book=weight_by_book,
        )
    )
    return selected[:books_per_reader]


def seed_orders(
    session,
    *,
    category_pools: list[CategoryPool],
    tag_pools: list[TagPool],
    readers_per_category_pool: int,
    readers_per_tag_pool: int,
    books_per_reader: int,
    weight_by_book: dict[int, float],
    global_popular_book_ids: list[int],
    seed: int,
) -> dict:
    rng = random.Random(seed)
    removed_orders = delete_existing_demo_orders(session, get_demo_profile_ids(session))
    now = datetime.now(timezone.utc)

    total_orders = 0
    demo_profiles: list[ReaderProfile] = []
    distinct_book_ids: set[int] = set()
    source_summary = {"category_readers": 0, "tag_readers": 0}

    reader_index = 1
    for pool_index, pool in enumerate(category_pools):
        secondary_candidates = [item for item in (category_pools + tag_pools) if item is not pool]
        secondary_pool = secondary_candidates[(pool_index + 1) % len(secondary_candidates)]
        for _ in range(readers_per_category_pool):
            profile = get_or_create_demo_reader(session, reader_index)
            reader_index += 1
            demo_profiles.append(profile)
            source_summary["category_readers"] += 1
            history = build_reader_history_from_category(
                rng,
                primary_pool=pool,
                secondary_pool=secondary_pool,
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

    for pool_index, pool in enumerate(tag_pools):
        secondary_pool = category_pools[pool_index % len(category_pools)]
        for _ in range(readers_per_tag_pool):
            profile = get_or_create_demo_reader(session, reader_index)
            reader_index += 1
            demo_profiles.append(profile)
            source_summary["tag_readers"] += 1
            history = build_reader_history_from_tag(
                rng,
                primary_pool=pool,
                secondary_pool=secondary_pool,
                books_per_reader=books_per_reader,
                weight_by_book=weight_by_book,
                global_popular_book_ids=global_popular_book_ids,
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

    session.commit()
    return {
        "reader_count": len(demo_profiles),
        "removed_orders": removed_orders,
        "created_orders": total_orders,
        "distinct_books": len(distinct_book_ids),
        "source_summary": source_summary,
    }


def main() -> None:
    args = parse_args()
    if args.books_per_reader < 6:
        raise ValueError("--books-per-reader must be at least 6")

    books_dir = Path(args.books_dir)
    if not books_dir.exists():
        raise FileNotFoundError(f"books_dir does not exist: {books_dir}")

    log("正在定位 Excel 数据源...")
    chinese_path, douban_path = find_excel_sources(books_dir)
    log(f"中文图书表: {chinese_path.name}")
    log(f"豆瓣图书表: {douban_path.name}")

    settings = get_settings()
    init_engine(settings)
    session_factory = get_session_factory()
    rng = random.Random(args.seed)

    with session_factory() as session:
        log("正在读取当前 books 表...")
        by_title, by_title_author = load_book_lookup(session)

        log("正在构建中文分类/关键词主题池...")
        category_pools, _keywords_by_book = load_category_pools(
            chinese_path,
            by_title=by_title,
            by_title_author=by_title_author,
            rng=rng,
            min_category_books=args.min_category_books,
            category_pool_limit=args.category_pool_limit,
            weight_by_book={},
        )
        if not category_pools:
            raise RuntimeError("Could not build any category pools from the Chinese Excel file")
        log(f"已构建中文主题池 {len(category_pools)} 个")

        log("正在构建豆瓣标签/评分偏好池...")
        tag_pools, douban_weight_by_book, global_popular_book_ids = load_douban_tag_pools(
            douban_path,
            by_title=by_title,
            by_title_author=by_title_author,
            rng=rng,
            min_tag_books=args.min_tag_books,
            tag_pool_limit=args.tag_pool_limit,
        )
        if not tag_pools:
            raise RuntimeError("Could not build any matched Douban tag pools")
        log(f"已构建豆瓣标签池 {len(tag_pools)} 个")

        log("正在写入合成借阅历史...")
        result = seed_orders(
            session,
            category_pools=category_pools,
            tag_pools=tag_pools,
            readers_per_category_pool=args.readers_per_category_pool,
            readers_per_tag_pool=args.readers_per_tag_pool,
            books_per_reader=args.books_per_reader,
            weight_by_book=douban_weight_by_book,
            global_popular_book_ids=global_popular_book_ids,
            seed=args.seed,
        )

        total_orders = session.scalar(select(func.count(BorrowOrder.id))) or 0
        distinct_readers = session.scalar(select(func.count(func.distinct(BorrowOrder.reader_id)))) or 0
        distinct_books = session.scalar(select(func.count(func.distinct(BorrowOrder.book_id)))) or 0

    log("推荐训练借阅数据写入完成。")
    log(f"新增 demo_ml readers: {result['reader_count']}")
    log(f"删除旧 demo_ml borrow_orders: {result['removed_orders']}")
    log(f"新增 borrow_orders: {result['created_orders']}")
    log(f"本次使用 distinct books: {result['distinct_books']}")
    log(f"当前 borrow_orders 总量: {total_orders}")
    log(f"当前 borrow_orders 涉及读者数: {distinct_readers}")
    log(f"当前 borrow_orders 涉及图书数: {distinct_books}")
    log(
        "读者来源统计: "
        f"category={result['source_summary']['category_readers']}, "
        f"tag={result['source_summary']['tag_readers']}"
    )


if __name__ == "__main__":
    main()
