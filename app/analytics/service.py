from __future__ import annotations

import json
from collections import defaultdict
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book
from app.db.base import utc_now
from app.inventory.models import BookCopy, Cabinet, InventoryEvent
from app.orders.models import BorrowOrder
from app.readers.models import ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotTask, RobotUnit


def record_search(session: Session, *, reader_id: int | None, query_text: str, query_mode: str) -> None:
    session.add(SearchLog(reader_id=reader_id, query_text=query_text, query_mode=query_mode))


def record_reading_event(session: Session, *, reader_id: int | None, event_type: str, metadata_json: str | None) -> None:
    session.add(
        ReadingEvent(
            reader_id=reader_id,
            event_type=event_type,
            metadata_json=json.loads(metadata_json) if metadata_json else None,
        )
    )


def get_borrow_trends(session: Session, *, days: int = 7) -> dict:
    window_days = max(days, 1)
    since = utc_now() - timedelta(days=window_days)
    orders = session.scalars(
        select(BorrowOrder)
        .where(BorrowOrder.created_at >= since)
        .order_by(BorrowOrder.created_at.asc(), BorrowOrder.id.asc())
    ).all()
    grouped: dict[str, int] = defaultdict(int)
    for order in orders:
        if order.created_at is None:
            continue
        grouped[order.created_at.date().isoformat()] += 1
    items = [{"date": day, "count": count} for day, count in sorted(grouped.items())]
    peak = max(items, key=lambda item: item["count"], default=None)
    return {
        "items": items,
        "summary": {
            "days": window_days,
            "total_orders": len(orders),
            "peak_day": None if peak is None else peak["date"],
            "peak_count": 0 if peak is None else peak["count"],
        },
    }


def get_college_preferences(session: Session) -> dict:
    rows = session.execute(
        select(ReaderProfile.college, Book.category, func.count(BorrowOrder.id))
        .join(BorrowOrder, BorrowOrder.reader_id == ReaderProfile.id)
        .join(Book, Book.id == BorrowOrder.book_id)
        .group_by(ReaderProfile.college, Book.category)
    ).all()
    grouped: dict[str, dict] = defaultdict(lambda: {"college": "", "total_orders": 0, "categories": []})
    for college, category, count in rows:
        key = college or "未标注学院"
        item = grouped[key]
        item["college"] = key
        item["total_orders"] += int(count)
        item["categories"].append({"category": category or "未分类", "count": int(count)})
    items = list(grouped.values())
    for item in items:
        item["categories"].sort(key=lambda row: (-row["count"], row["category"]))
    items.sort(key=lambda row: (-row["total_orders"], row["college"]))
    return {"items": items, "summary": {"total_colleges": len(items)}}


def get_time_peaks(session: Session, *, days: int = 7) -> dict:
    since = utc_now() - timedelta(days=max(days, 1))
    orders = session.scalars(
        select(BorrowOrder)
        .where(BorrowOrder.created_at >= since)
        .order_by(BorrowOrder.created_at.asc(), BorrowOrder.id.asc())
    ).all()
    buckets: dict[int, int] = defaultdict(int)
    for order in orders:
        if order.created_at is None:
            continue
        buckets[order.created_at.hour] += 1
    items = [{"hour": hour, "count": count} for hour, count in sorted(buckets.items())]
    peak = max(items, key=lambda item: item["count"], default=None)
    return {
        "items": items,
        "summary": {
            "peak_hour": None if peak is None else peak["hour"],
            "peak_count": 0 if peak is None else peak["count"],
        },
    }


def get_popular_books(session: Session, *, limit: int = 10) -> dict:
    order_counts = {
        int(book_id): int(count)
        for book_id, count in session.execute(
            select(BorrowOrder.book_id, func.count(BorrowOrder.id))
            .group_by(BorrowOrder.book_id)
            .order_by(func.count(BorrowOrder.id).desc(), BorrowOrder.book_id.asc())
        ).all()
    }
    recommendation_counts = {
        int(book_id): int(count)
        for book_id, count in session.execute(
            select(RecommendationLog.book_id, func.count(RecommendationLog.id))
            .where(RecommendationLog.book_id.is_not(None))
            .group_by(RecommendationLog.book_id)
        ).all()
    }
    book_ids = sorted(set(order_counts) | set(recommendation_counts))
    items: list[dict] = []
    for book_id in book_ids:
        book = session.get(Book, book_id)
        if book is None:
            continue
        borrow_count = order_counts.get(book_id, 0)
        recommendation_count = recommendation_counts.get(book_id, 0)
        prediction_score = round((borrow_count * 0.7) + (recommendation_count * 0.3), 2)
        items.append(
            {
                "book_id": book.id,
                "title": book.title,
                "author": book.author,
                "borrow_count": borrow_count,
                "recommendation_count": recommendation_count,
                "prediction_score": prediction_score,
            }
        )
    items.sort(key=lambda item: (-item["borrow_count"], -item["prediction_score"], item["book_id"]))
    return {"items": items[:limit], "summary": {"total_ranked_books": len(items)}}


def get_cabinet_turnover(session: Session, *, days: int = 7) -> dict:
    since = utc_now() - timedelta(days=max(days, 1))
    cabinets = session.scalars(select(Cabinet).order_by(Cabinet.id.asc())).all()
    items: list[dict] = []
    for cabinet in cabinets:
        copy_count = session.scalar(
            select(func.count()).select_from(BookCopy).where(BookCopy.cabinet_id == cabinet.id)
        ) or 0
        event_count = session.scalar(
            select(func.count())
            .select_from(InventoryEvent)
            .where(InventoryEvent.cabinet_id == cabinet.id, InventoryEvent.created_at >= since)
        ) or 0
        turnover_rate = round((event_count / max(int(copy_count), 1)), 2)
        items.append(
            {
                "cabinet_id": cabinet.id,
                "cabinet_name": cabinet.name,
                "location": cabinet.location,
                "status": cabinet.status,
                "copy_count": int(copy_count),
                "event_count": int(event_count),
                "turnover_rate": turnover_rate,
            }
        )
    items.sort(key=lambda item: (-item["turnover_rate"], item["cabinet_id"]))
    return {"items": items, "summary": {"total_cabinets": len(items)}}


def get_robot_efficiency(session: Session) -> dict:
    robots = session.scalars(select(RobotUnit).order_by(RobotUnit.id.asc())).all()
    items: list[dict] = []
    for robot in robots:
        tasks = session.scalars(
            select(RobotTask).where(RobotTask.robot_id == robot.id).order_by(RobotTask.created_at.asc(), RobotTask.id.asc())
        ).all()
        total_tasks = len(tasks)
        completed_tasks = sum(1 for task in tasks if task.status == "completed")
        active_tasks = sum(1 for task in tasks if task.status != "completed")
        completion_rate = round((completed_tasks / total_tasks) * 100, 2) if total_tasks else 0.0
        items.append(
            {
                "robot_id": robot.id,
                "code": robot.code,
                "status": robot.status,
                "battery_level": robot.battery_level,
                "heartbeat_at": robot.heartbeat_at.isoformat() if robot.heartbeat_at else None,
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "active_tasks": active_tasks,
                "completion_rate": completion_rate,
            }
        )
    items.sort(key=lambda item: item["robot_id"])
    return {"items": items, "summary": {"total_robots": len(items)}}


def _active_reader_ids(session: Session, *, since_days: int) -> set[int]:
    since = utc_now() - timedelta(days=max(since_days, 1))
    reader_ids: set[int] = set()
    query_specs = (
        select(SearchLog.reader_id).where(SearchLog.created_at >= since),
        select(RecommendationLog.reader_id).where(RecommendationLog.created_at >= since),
        select(ReadingEvent.reader_id).where(ReadingEvent.created_at >= since),
        select(BorrowOrder.reader_id).where(BorrowOrder.created_at >= since),
    )
    for stmt in query_specs:
        for reader_id in session.scalars(stmt).all():
            if reader_id is not None:
                reader_ids.add(int(reader_id))
    return reader_ids


def get_retention_metrics(session: Session) -> dict:
    active_7d = _active_reader_ids(session, since_days=7)
    active_30d = _active_reader_ids(session, since_days=30)
    total_readers = session.scalar(select(func.count()).select_from(ReaderProfile)) or 0
    retained_7d = active_7d & active_30d
    return {
        "summary": {
            "total_readers": int(total_readers),
            "active_readers_7d": len(active_7d),
            "active_readers_30d": len(active_30d),
            "retained_readers_7d": len(retained_7d),
            "retention_rate_7d": round((len(retained_7d) / max(int(total_readers), 1)) * 100, 2),
        }
    }
