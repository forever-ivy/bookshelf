from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.db.base import import_model_modules
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile


DEMO_USERNAME_PREFIX = "demo_cf_reader_"
DEFAULT_RANDOM_SEED = 20260324


@dataclass(slots=True)
class CategoryPool:
    category: str
    books: list[Book]


@dataclass(slots=True)
class BorrowTimeline:
    created_at: datetime
    picked_at: datetime
    completed_at: datetime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed demo borrow history for collaborative filtering.")
    parser.add_argument("--clusters", type=int, default=8, help="How many book-interest clusters to use.")
    parser.add_argument(
        "--readers-per-cluster",
        type=int,
        default=6,
        help="How many demo readers to create in each cluster.",
    )
    parser.add_argument(
        "--books-per-reader",
        type=int,
        default=8,
        help="How many borrow orders to create for each demo reader.",
    )
    parser.add_argument(
        "--min-category-books",
        type=int,
        default=30,
        help="Only categories with at least this many books will be used.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=DEFAULT_RANDOM_SEED,
        help="Random seed for deterministic demo data generation.",
    )
    return parser.parse_args()


def load_category_pools(session, *, clusters: int, min_category_books: int) -> list[CategoryPool]:
    category_rows = session.execute(
        select(Book.category, func.count(Book.id).label("cnt"))
        .where(Book.category.is_not(None))
        .where(Book.category != "")
        .group_by(Book.category)
        .having(func.count(Book.id) >= min_category_books)
        .order_by(func.count(Book.id).desc(), Book.category.asc())
        .limit(max(clusters * 2, clusters))
    ).all()

    pools: list[CategoryPool] = []
    for row in category_rows:
        books = list(
            session.execute(
                select(Book)
                .where(Book.category == row.category)
                .order_by(Book.id.asc())
                .limit(80)
            ).scalars()
        )
        if len(books) >= min_category_books:
            pools.append(CategoryPool(category=row.category, books=books))
        if len(pools) >= clusters:
            break

    if len(pools) < clusters:
        raise RuntimeError(
            f"Not enough categories to build {clusters} clusters. "
            f"Only found {len(pools)} categories with at least {min_category_books} books."
        )
    return pools


def get_or_create_demo_reader(session, index: int) -> ReaderProfile:
    username = f"{DEMO_USERNAME_PREFIX}{index:03d}"
    account = session.scalar(select(ReaderAccount).where(ReaderAccount.username == username))
    if account is None:
        account = ReaderAccount(username=username, password_hash="demo-cf-not-for-login")
        session.add(account)
        session.flush()

    profile = session.scalar(select(ReaderProfile).where(ReaderProfile.account_id == account.id))
    if profile is None:
        profile = ReaderProfile(
            account_id=account.id,
            display_name=f"演示读者{index:03d}",
            affiliation_type="student",
            college="Demo College",
            major="Recommendation Demo",
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
            .where(ReaderAccount.username.like(f"{DEMO_USERNAME_PREFIX}%"))
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


def sample_books(rng: random.Random, pool: list[Book], desired: int, *, exclude_ids: set[int] | None = None) -> list[Book]:
    exclude_ids = exclude_ids or set()
    candidates = [book for book in pool if book.id not in exclude_ids]
    if not candidates:
        return []
    take = min(desired, len(candidates))
    return rng.sample(candidates, take)


def build_reader_history(
    rng: random.Random,
    *,
    primary_pool: CategoryPool,
    secondary_pool: CategoryPool,
    books_per_reader: int,
) -> list[Book]:
    primary_anchor_count = min(4, max(2, books_per_reader // 2))
    secondary_count = min(2, max(1, books_per_reader // 4))

    anchor_books = primary_pool.books[: max(primary_anchor_count + 2, 6)]
    selected: list[Book] = []
    selected.extend(sample_books(rng, anchor_books, primary_anchor_count))

    selected_ids = {book.id for book in selected}
    remaining = books_per_reader - len(selected)
    if remaining > 0:
        secondary_books = sample_books(rng, secondary_pool.books, min(secondary_count, remaining), exclude_ids=selected_ids)
        selected.extend(secondary_books)
        selected_ids.update(book.id for book in secondary_books)

    remaining = books_per_reader - len(selected)
    if remaining > 0:
        more_primary = sample_books(rng, primary_pool.books, remaining, exclude_ids=selected_ids)
        selected.extend(more_primary)
        selected_ids.update(book.id for book in more_primary)

    remaining = books_per_reader - len(selected)
    if remaining > 0:
        spillover = sample_books(rng, secondary_pool.books, remaining, exclude_ids=selected_ids)
        selected.extend(spillover)

    return selected


def build_borrow_timeline(
    rng: random.Random,
    *,
    now: datetime,
    order_offset: int,
) -> BorrowTimeline:
    completed_at = now - timedelta(
        days=rng.randint(0, 150),
        hours=(order_offset * 3) + rng.randint(1, 23),
    )
    picked_at = completed_at - timedelta(
        days=rng.randint(7, 35),
        hours=rng.randint(1, 12),
    )
    created_at = picked_at - timedelta(hours=rng.randint(1, 48))
    return BorrowTimeline(
        created_at=created_at,
        picked_at=picked_at,
        completed_at=completed_at,
    )


def seed_demo_orders(
    session,
    *,
    pools: list[CategoryPool],
    readers_per_cluster: int,
    books_per_reader: int,
    seed: int,
) -> dict:
    rng = random.Random(seed)
    removed_orders = delete_existing_demo_orders(session, get_demo_profile_ids(session))
    demo_profiles: list[ReaderProfile] = []
    cluster_plan: list[tuple[ReaderProfile, CategoryPool, CategoryPool]] = []

    reader_index = 1
    for cluster_index, primary_pool in enumerate(pools):
        secondary_pool = pools[(cluster_index + 1) % len(pools)]
        for _ in range(readers_per_cluster):
            profile = get_or_create_demo_reader(session, reader_index)
            demo_profiles.append(profile)
            cluster_plan.append((profile, primary_pool, secondary_pool))
            reader_index += 1

    total_orders = 0
    now = datetime.now(timezone.utc)
    category_summary: dict[str, int] = {}

    for profile, primary_pool, secondary_pool in cluster_plan:
        history = build_reader_history(
            rng,
            primary_pool=primary_pool,
            secondary_pool=secondary_pool,
            books_per_reader=books_per_reader,
        )
        for order_offset, book in enumerate(history):
            timeline = build_borrow_timeline(rng, now=now, order_offset=order_offset)
            session.add(
                BorrowOrder(
                    reader_id=profile.id,
                    book_id=book.id,
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
            category_summary[primary_pool.category] = category_summary.get(primary_pool.category, 0) + 1

    session.commit()
    return {
        "reader_count": len(demo_profiles),
        "removed_orders": removed_orders,
        "created_orders": total_orders,
        "categories": [pool.category for pool in pools],
        "category_summary": category_summary,
    }


def main() -> None:
    args = parse_args()
    if args.clusters <= 0:
        raise ValueError("--clusters must be greater than 0")
    if args.readers_per_cluster <= 0:
        raise ValueError("--readers-per-cluster must be greater than 0")
    if args.books_per_reader < 3:
        raise ValueError("--books-per-reader must be at least 3")

    settings = get_settings()
    import_model_modules()
    init_engine(settings)
    session_factory = get_session_factory()

    with session_factory() as session:
        pools = load_category_pools(
            session,
            clusters=args.clusters,
            min_category_books=args.min_category_books,
        )
        result = seed_demo_orders(
            session,
            pools=pools,
            readers_per_cluster=args.readers_per_cluster,
            books_per_reader=args.books_per_reader,
            seed=args.seed,
        )

        total_orders = session.scalar(select(func.count(BorrowOrder.id))) or 0
        distinct_readers = session.scalar(select(func.count(func.distinct(BorrowOrder.reader_id)))) or 0

    print("Demo borrow history seeded successfully.")
    print(f"Demo readers: {result['reader_count']}")
    print(f"Removed existing demo orders: {result['removed_orders']}")
    print(f"Created borrow orders: {result['created_orders']}")
    print(f"Total borrow_orders now: {total_orders}")
    print(f"Distinct readers in borrow_orders: {distinct_readers}")
    print("Categories used:")
    for category in result["categories"]:
        print(f"  - {category}")


if __name__ == "__main__":
    main()
