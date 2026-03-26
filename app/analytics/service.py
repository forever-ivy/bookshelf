from __future__ import annotations

import json
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book
from app.conversation.models import ConversationSession
from app.db.base import utc_now
from app.inventory.models import BookCopy, Cabinet, InventoryEvent
from app.orders.models import BorrowOrder
from app.readers.models import ReaderAccount, ReaderProfile
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


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _window_start(*, days: int) -> datetime:
    return datetime.now(UTC) - timedelta(days=days)


def _count_rows(session: Session, model, *, since: datetime | None = None, timestamp_column=None) -> int:
    stmt = select(func.count()).select_from(model)
    if since is not None and timestamp_column is not None:
        stmt = stmt.where(timestamp_column >= since)
    return int(session.execute(stmt).scalar_one())


def _latest_timestamp(session: Session, column) -> str | None:
    return _iso(session.execute(select(func.max(column))).scalar_one())


def _reader_ids_since(session: Session, *, reader_column, timestamp_column, since: datetime) -> set[int]:
    rows = session.execute(
        select(reader_column)
        .where(reader_column.is_not(None))
        .where(timestamp_column >= since)
    ).all()
    return {int(row[0]) for row in rows if row[0] is not None}


def _grouped_counts(session: Session, *, value_column, label: str, limit: int) -> list[dict]:
    rows = session.execute(
        select(value_column.label(label), func.count().label("count"))
        .group_by(value_column)
        .order_by(func.count().desc(), value_column.asc())
        .limit(limit)
    ).all()
    return [
        {label: row[0], "count": int(row[1] or 0)}
        for row in rows
        if row[0] not in {None, ""}
    ]


def _reader_activity_leaderboard(session: Session, *, limit: int) -> list[dict]:
    profiles = session.execute(
        select(ReaderProfile.id, ReaderProfile.display_name, ReaderAccount.username)
        .join(ReaderAccount, ReaderAccount.id == ReaderProfile.account_id)
    ).all()
    search_counts = {
        int(reader_id): int(count or 0)
        for reader_id, count in session.execute(
            select(SearchLog.reader_id, func.count())
            .where(SearchLog.reader_id.is_not(None))
            .group_by(SearchLog.reader_id)
        ).all()
        if reader_id is not None
    }
    reading_counts = {
        int(reader_id): int(count or 0)
        for reader_id, count in session.execute(
            select(ReadingEvent.reader_id, func.count())
            .where(ReadingEvent.reader_id.is_not(None))
            .group_by(ReadingEvent.reader_id)
        ).all()
        if reader_id is not None
    }
    recommendation_counts = {
        int(reader_id): int(count or 0)
        for reader_id, count in session.execute(
            select(RecommendationLog.reader_id, func.count())
            .where(RecommendationLog.reader_id.is_not(None))
            .group_by(RecommendationLog.reader_id)
        ).all()
        if reader_id is not None
    }
    borrow_counts = {
        int(reader_id): int(count or 0)
        for reader_id, count in session.execute(
            select(BorrowOrder.reader_id, func.count())
            .where(BorrowOrder.reader_id.is_not(None))
            .group_by(BorrowOrder.reader_id)
        ).all()
        if reader_id is not None
    }
    conversation_counts = {
        int(reader_id): int(count or 0)
        for reader_id, count in session.execute(
            select(ConversationSession.reader_id, func.count())
            .where(ConversationSession.reader_id.is_not(None))
            .group_by(ConversationSession.reader_id)
        ).all()
        if reader_id is not None
    }

    items = []
    for profile_id, display_name, username in profiles:
        activity = {
            "search_count": search_counts.get(int(profile_id), 0),
            "reading_event_count": reading_counts.get(int(profile_id), 0),
            "recommendation_count": recommendation_counts.get(int(profile_id), 0),
            "borrow_count": borrow_counts.get(int(profile_id), 0),
            "conversation_count": conversation_counts.get(int(profile_id), 0),
        }
        total_activity = sum(activity.values())
        if total_activity == 0:
            continue
        items.append(
            {
                "reader_id": int(profile_id),
                "display_name": display_name,
                "username": username,
                "total_activity": total_activity,
                **activity,
            }
        )

    items.sort(key=lambda item: (-item["total_activity"], item["reader_id"]))
    return items[:limit]


def build_overview_snapshot(
    session: Session,
    *,
    recent_days: int = 7,
    active_reader_days: int = 30,
) -> dict:
    recent_since = _window_start(days=recent_days)
    active_since = _window_start(days=active_reader_days)

    totals = {
        "search_count": _count_rows(session, SearchLog),
        "reading_event_count": _count_rows(session, ReadingEvent),
        "recommendation_count": _count_rows(session, RecommendationLog),
        "conversation_session_count": _count_rows(session, ConversationSession),
        "borrow_order_count": _count_rows(session, BorrowOrder),
        "reader_count": _count_rows(session, ReaderProfile),
    }
    recent = {
        "search_count": _count_rows(session, SearchLog, since=recent_since, timestamp_column=SearchLog.created_at),
        "reading_event_count": _count_rows(
            session,
            ReadingEvent,
            since=recent_since,
            timestamp_column=ReadingEvent.created_at,
        ),
        "recommendation_count": _count_rows(
            session,
            RecommendationLog,
            since=recent_since,
            timestamp_column=RecommendationLog.created_at,
        ),
        "conversation_session_count": _count_rows(
            session,
            ConversationSession,
            since=recent_since,
            timestamp_column=ConversationSession.updated_at,
        ),
        "borrow_order_count": _count_rows(
            session,
            BorrowOrder,
            since=recent_since,
            timestamp_column=BorrowOrder.updated_at,
        ),
    }

    active_reader_ids = set()
    active_reader_ids |= _reader_ids_since(
        session,
        reader_column=SearchLog.reader_id,
        timestamp_column=SearchLog.created_at,
        since=active_since,
    )
    active_reader_ids |= _reader_ids_since(
        session,
        reader_column=ReadingEvent.reader_id,
        timestamp_column=ReadingEvent.created_at,
        since=active_since,
    )
    active_reader_ids |= _reader_ids_since(
        session,
        reader_column=RecommendationLog.reader_id,
        timestamp_column=RecommendationLog.created_at,
        since=active_since,
    )
    active_reader_ids |= _reader_ids_since(
        session,
        reader_column=ConversationSession.reader_id,
        timestamp_column=ConversationSession.updated_at,
        since=active_since,
    )
    active_reader_ids |= _reader_ids_since(
        session,
        reader_column=BorrowOrder.reader_id,
        timestamp_column=BorrowOrder.updated_at,
        since=active_since,
    )

    return {
        "totals": totals,
        "recent_window_days": recent_days,
        "recent_activity": recent,
        "active_reader_window_days": active_reader_days,
        "active_reader_count": len(active_reader_ids),
        "data_freshness": {
            "latest_search_at": _latest_timestamp(session, SearchLog.created_at),
            "latest_reading_event_at": _latest_timestamp(session, ReadingEvent.created_at),
            "latest_recommendation_at": _latest_timestamp(session, RecommendationLog.created_at),
            "latest_conversation_at": _latest_timestamp(session, ConversationSession.updated_at),
            "latest_borrow_order_at": _latest_timestamp(session, BorrowOrder.updated_at),
        },
    }


def build_trends_snapshot(session: Session, *, limit: int = 10) -> dict:
    return {
        "top_queries": _grouped_counts(session, value_column=SearchLog.query_text, label="query_text", limit=limit),
        "query_modes": _grouped_counts(session, value_column=SearchLog.query_mode, label="query_mode", limit=limit),
        "recommendation_providers": _grouped_counts(
            session,
            value_column=RecommendationLog.provider_note,
            label="provider_note",
            limit=limit,
        ),
        "reading_event_types": _grouped_counts(
            session,
            value_column=ReadingEvent.event_type,
            label="event_type",
            limit=limit,
        ),
        "most_active_readers": _reader_activity_leaderboard(session, limit=limit),
    }


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
        copy_count = session.scalar(select(func.count()).select_from(BookCopy).where(BookCopy.cabinet_id == cabinet.id)) or 0
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
