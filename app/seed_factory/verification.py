from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, is_dataclass
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.analytics.models import ReadingEvent, SearchLog
from app.catalog.models import Book, BookSourceDocument
from app.conversation.models import ConversationMessage, ConversationSession
from app.inventory.models import BookCopy
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
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotStatusEvent, RobotTask


ACTIVE_BORROW_ORDER_STATUSES = ("created", "awaiting_pick", "picked_from_cabinet", "delivering", "delivered")


def _resolve_config(config: Any) -> dict[str, Any]:
    if is_dataclass(config):
        return asdict(config)
    if isinstance(config, dict):
        return dict(config)
    raise TypeError("config must be a dataclass or dict")


def _count(session: Session, model) -> int:
    return int(session.execute(select(func.count()).select_from(model)).scalar_one())


def _ratio(numerator: int, denominator: int) -> float:
    if denominator <= 0:
        return 0.0
    return round(numerator / denominator, 4)


def _future_timestamp_count(session: Session, model, cutoff_at, columns: Iterable[str]) -> int:
    conditions = [
        getattr(model, column_name) > cutoff_at
        for column_name in columns
    ]
    return int(session.execute(select(func.count()).select_from(model).where(or_(*conditions))).scalar_one())


def _weight_map(cfg: dict[str, Any], key: str) -> dict[str, float]:
    return {name: float(weight) for name, weight in cfg.get(key, ())}


def _minimum_ratio(expected_ratio: float, *, fallback: float) -> float:
    return round(max(fallback, expected_ratio * 0.5), 4)


def build_large_dataset_report(session: Session, config: Any) -> dict[str, Any]:
    cfg = _resolve_config(config)

    counts = {
        "books": _count(session, Book),
        "book_source_documents": _count(session, BookSourceDocument),
        "book_copies": _count(session, BookCopy),
        "reader_accounts": _count(session, ReaderAccount),
        "reader_profiles": _count(session, ReaderProfile),
        "borrow_orders": _count(session, BorrowOrder),
        "order_fulfillments": _count(session, OrderFulfillment),
        "return_requests": _count(session, ReturnRequest),
        "search_logs": _count(session, SearchLog),
        "recommendation_logs": _count(session, RecommendationLog),
        "reading_events": _count(session, ReadingEvent),
        "conversation_sessions": _count(session, ConversationSession),
        "conversation_messages": _count(session, ConversationMessage),
        "robot_tasks": _count(session, RobotTask),
        "robot_status_events": _count(session, RobotStatusEvent),
        "learning_source_bundles": _count(session, LearningSourceBundle),
        "learning_profiles": _count(session, LearningProfile),
        "learning_source_assets": _count(session, LearningSourceAsset),
        "learning_fragments": _count(session, LearningFragment),
        "learning_path_versions": _count(session, LearningPathVersion),
        "learning_path_steps": _count(session, LearningPathStep),
        "learning_sessions": _count(session, LearningSession),
        "learning_turns": _count(session, LearningTurn),
        "learning_step_context_items": _count(session, LearningStepContextItem),
        "learning_bridge_actions": _count(session, LearningBridgeAction),
        "learning_agent_runs": _count(session, LearningAgentRun),
        "learning_checkpoints": _count(session, LearningCheckpoint),
        "learning_remediation_plans": _count(session, LearningRemediationPlan),
        "learning_reports": _count(session, LearningReport),
        "learning_jobs": _count(session, LearningJob),
    }

    empty_queries = int(session.execute(select(func.count()).select_from(SearchLog).where(SearchLog.query_text == "")).scalar_one())
    low_score_recommendations = int(
        session.execute(
            select(func.count()).select_from(RecommendationLog).where(RecommendationLog.score < 0.25)
        ).scalar_one()
    )
    cancelled_orders = int(
        session.execute(select(func.count()).select_from(BorrowOrder).where(BorrowOrder.status == "cancelled")).scalar_one()
    )
    robot_delivery_orders = int(
        session.execute(
            select(func.count()).select_from(BorrowOrder).where(BorrowOrder.fulfillment_mode == "robot_delivery")
        ).scalar_one()
    )
    active_orders = int(
        session.execute(
            select(func.count()).select_from(BorrowOrder).where(BorrowOrder.status.in_(ACTIVE_BORROW_ORDER_STATUSES))
        ).scalar_one()
    )
    blocked_watch_readers = int(
        session.execute(
            select(func.count()).select_from(ReaderProfile).where(ReaderProfile.restriction_status.in_(["watch", "blocked"]))
        ).scalar_one()
    )
    damaged_returns = int(
        session.execute(
            select(func.count()).select_from(ReturnRequest).where(ReturnRequest.condition_code == "damaged")
        ).scalar_one()
    )

    cutoff_at = cfg.get("cutoff_at")
    borrow_related_future_timestamps = 0
    if cutoff_at is not None:
        borrow_related_future_timestamps = sum(
            [
                _future_timestamp_count(
                    session,
                    BorrowOrder,
                    cutoff_at,
                    ["created_at", "updated_at", "picked_at", "delivered_at", "completed_at", "due_at"],
                ),
                _future_timestamp_count(
                    session,
                    OrderFulfillment,
                    cutoff_at,
                    ["created_at", "updated_at", "picked_at", "delivered_at", "completed_at"],
                ),
                _future_timestamp_count(
                    session,
                    ReturnRequest,
                    cutoff_at,
                    ["created_at", "updated_at", "received_at", "processed_at"],
                ),
            ]
        )

    borrow_weights = _weight_map(cfg, "borrow_status_weights")
    reader_restriction_weights = _weight_map(cfg, "reader_restriction_status_weights")
    return_condition_weights = _weight_map(cfg, "return_condition_weights")

    cancelled_ratio = _ratio(cancelled_orders, counts["borrow_orders"])
    active_ratio = _ratio(active_orders, counts["borrow_orders"])
    blocked_watch_ratio = _ratio(blocked_watch_readers, counts["reader_profiles"])
    damaged_ratio = _ratio(damaged_returns, counts["return_requests"])

    thresholds = {
        "books": {
            "actual": counts["books"],
            "target": cfg["target_books"],
            "ok": counts["books"] == cfg["target_books"],
        },
        "reader_accounts": {
            "actual": counts["reader_accounts"],
            "target": cfg["target_readers"],
            "ok": counts["reader_accounts"] == cfg["target_readers"],
        },
        "borrow_orders": {
            "actual": counts["borrow_orders"],
            "target": cfg["target_borrow_orders"],
            "ok": counts["borrow_orders"] >= cfg["target_borrow_orders"],
        },
        "search_logs": {
            "actual": counts["search_logs"],
            "target": cfg["target_search_logs"],
            "ok": counts["search_logs"] >= cfg["target_search_logs"],
        },
        "recommendation_logs": {
            "actual": counts["recommendation_logs"],
            "target": cfg["target_recommendation_logs"],
            "ok": counts["recommendation_logs"] >= cfg["target_recommendation_logs"],
        },
        "conversation_sessions": {
            "actual": counts["conversation_sessions"],
            "target": cfg["target_conversation_sessions"],
            "ok": counts["conversation_sessions"] >= cfg["target_conversation_sessions"],
        },
        "conversation_messages": {
            "actual": counts["conversation_messages"],
            "target": cfg["target_conversation_messages"],
            "ok": counts["conversation_messages"] >= cfg["target_conversation_messages"],
        },
        "learning_profiles": {
            "actual": counts["learning_profiles"],
            "target": cfg["target_learning_profiles"],
            "ok": counts["learning_profiles"] >= cfg["target_learning_profiles"],
        },
        "learning_fragments": {
            "actual": counts["learning_fragments"],
            "target": cfg["target_learning_fragments"],
            "ok": counts["learning_fragments"] >= cfg["target_learning_fragments"],
        },
        "learning_sessions": {
            "actual": counts["learning_sessions"],
            "target": cfg["target_learning_sessions"],
            "ok": counts["learning_sessions"] >= cfg["target_learning_sessions"],
        },
        "future_timestamps": {
            "actual": borrow_related_future_timestamps,
            "target": 0,
            "ok": borrow_related_future_timestamps == 0,
        },
        "cancelled_ratio": {
            "actual": cancelled_ratio,
            "target": _minimum_ratio(borrow_weights.get("cancelled", 0.0), fallback=0.02),
            "ok": cancelled_ratio >= _minimum_ratio(borrow_weights.get("cancelled", 0.0), fallback=0.02),
        },
        "active_ratio": {
            "actual": active_ratio,
            "target": _minimum_ratio(
                sum(weight for status, weight in borrow_weights.items() if status in ACTIVE_BORROW_ORDER_STATUSES),
                fallback=0.1,
            ),
            "ok": active_ratio >= _minimum_ratio(
                sum(weight for status, weight in borrow_weights.items() if status in ACTIVE_BORROW_ORDER_STATUSES),
                fallback=0.1,
            ),
        },
        "blocked_watch_ratio": {
            "actual": blocked_watch_ratio,
            "target": _minimum_ratio(
                reader_restriction_weights.get("watch", 0.0) + reader_restriction_weights.get("blocked", 0.0),
                fallback=0.03,
            ),
            "ok": blocked_watch_ratio >= _minimum_ratio(
                reader_restriction_weights.get("watch", 0.0) + reader_restriction_weights.get("blocked", 0.0),
                fallback=0.03,
            ),
        },
        "damaged_ratio": {
            "actual": damaged_ratio,
            "target": _minimum_ratio(return_condition_weights.get("damaged", 0.0), fallback=0.03),
            "ok": damaged_ratio >= _minimum_ratio(return_condition_weights.get("damaged", 0.0), fallback=0.03),
        },
    }

    return {
        "counts": counts,
        "thresholds": thresholds,
        "timelines": {
            "borrow_related": {
                "cutoff_at": cutoff_at.isoformat() if cutoff_at is not None else None,
                "future_timestamp_count": borrow_related_future_timestamps,
            }
        },
        "noise": {
            "search_logs": {
                "empty_query_ratio": _ratio(empty_queries, counts["search_logs"]),
            },
            "recommendation_logs": {
                "low_score_ratio": _ratio(low_score_recommendations, counts["recommendation_logs"]),
            },
            "borrow_orders": {
                "cancelled_ratio": cancelled_ratio,
                "active_ratio": active_ratio,
                "robot_delivery_ratio": _ratio(robot_delivery_orders, counts["borrow_orders"]),
            },
            "reader_profiles": {
                "blocked_watch_ratio": blocked_watch_ratio,
            },
            "return_requests": {
                "damaged_ratio": damaged_ratio,
            },
        },
    }
