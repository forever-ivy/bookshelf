from __future__ import annotations

from collections.abc import Iterable
from dataclasses import asdict, is_dataclass
from typing import Any

from sqlalchemy import func, select
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
    }

    return {
        "counts": counts,
        "thresholds": thresholds,
        "noise": {
            "search_logs": {
                "empty_query_ratio": _ratio(empty_queries, counts["search_logs"]),
            },
            "recommendation_logs": {
                "low_score_ratio": _ratio(low_score_recommendations, counts["recommendation_logs"]),
            },
            "borrow_orders": {
                "cancelled_ratio": _ratio(cancelled_orders, counts["borrow_orders"]),
                "robot_delivery_ratio": _ratio(robot_delivery_orders, counts["borrow_orders"]),
            },
        },
    }
