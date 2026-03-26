from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Callable

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.orders.models import BorrowOrder
from app.recommendation.ml import ImplicitMFModel
from app.recommendation.repository import BORROW_SIGNAL_STATUSES


@dataclass(slots=True)
class TimedImplicitInteraction:
    reader_id: int
    book_id: int
    occurred_at: datetime | None


@dataclass(slots=True)
class ReaderHoldoutCase:
    reader_id: int
    history_book_ids: list[int]
    positive_book_ids: list[int]


def collect_timed_implicit_interactions(session: Session) -> list[TimedImplicitInteraction]:
    occurred_at = func.max(
        func.coalesce(
            BorrowOrder.completed_at,
            BorrowOrder.delivered_at,
            BorrowOrder.picked_at,
            BorrowOrder.updated_at,
            BorrowOrder.created_at,
        )
    ).label("occurred_at")
    rows = session.execute(
        select(
            BorrowOrder.reader_id.label("reader_id"),
            BorrowOrder.book_id.label("book_id"),
            occurred_at,
        )
        .where(BorrowOrder.status.in_(BORROW_SIGNAL_STATUSES))
        .where(BorrowOrder.reader_id.is_not(None))
        .where(BorrowOrder.book_id.is_not(None))
        .group_by(BorrowOrder.reader_id, BorrowOrder.book_id)
    ).all()
    interactions = [
        TimedImplicitInteraction(
            reader_id=int(row.reader_id),
            book_id=int(row.book_id),
            occurred_at=row.occurred_at,
        )
        for row in rows
    ]
    interactions.sort(key=lambda item: (item.reader_id, _datetime_sort_value(item.occurred_at), item.book_id))
    return interactions


def split_holdout_cases(
    interactions: list[TimedImplicitInteraction],
    *,
    holdout_per_reader: int,
) -> tuple[list[tuple[int, int]], list[ReaderHoldoutCase], dict[str, int]]:
    if holdout_per_reader <= 0:
        raise ValueError("holdout_per_reader must be greater than 0")

    reader_to_events: dict[int, list[TimedImplicitInteraction]] = {}
    for interaction in interactions:
        reader_to_events.setdefault(interaction.reader_id, []).append(interaction)

    train_interactions: list[tuple[int, int]] = []
    holdout_cases: list[ReaderHoldoutCase] = []
    skipped_reader_count = 0
    total_holdout_positives = 0

    for reader_id, events in sorted(reader_to_events.items()):
        ordered_events = sorted(
            events,
            key=lambda item: (_datetime_sort_value(item.occurred_at), item.book_id),
        )
        if len(ordered_events) <= holdout_per_reader:
            skipped_reader_count += 1
            continue

        history = ordered_events[:-holdout_per_reader]
        positives = ordered_events[-holdout_per_reader:]
        history_book_ids = [item.book_id for item in history]
        positive_book_ids = [item.book_id for item in positives]

        train_interactions.extend((reader_id, book_id) for book_id in history_book_ids)
        holdout_cases.append(
            ReaderHoldoutCase(
                reader_id=reader_id,
                history_book_ids=history_book_ids,
                positive_book_ids=positive_book_ids,
            )
        )
        total_holdout_positives += len(positive_book_ids)

    summary = {
        "raw_interaction_count": len(interactions),
        "raw_reader_count": len(reader_to_events),
        "raw_book_count": len({interaction.book_id for interaction in interactions}),
        "eligible_reader_count": len(holdout_cases),
        "skipped_reader_count": skipped_reader_count,
        "holdout_case_count": len(holdout_cases),
        "holdout_positive_count": total_holdout_positives,
        "train_interaction_count_before_filter": len(train_interactions),
        "holdout_per_reader": holdout_per_reader,
    }
    return train_interactions, holdout_cases, summary


def build_book_popularity_counts(interactions: list[tuple[int, int]]) -> dict[int, int]:
    popularity: dict[int, int] = {}
    for _reader_id, book_id in interactions:
        popularity[book_id] = popularity.get(book_id, 0) + 1
    return popularity


def evaluate_reader_book_model(
    model: ImplicitMFModel,
    holdout_cases: list[ReaderHoldoutCase],
    *,
    top_ks: list[int],
) -> dict[str, object]:
    candidate_book_ids = sorted(model.book_factors)
    metrics, summary = _evaluate_ranker(
        holdout_cases,
        candidate_book_ids=candidate_book_ids,
        top_ks=top_ks,
        scorer=lambda case, history_book_ids, candidate_book_id: model.score_reader_book(
            reader_id=case.reader_id,
            book_id=candidate_book_id,
            history_book_ids=history_book_ids,
        ),
    )
    summary["reader_factor_case_count"] = sum(
        1 for case in holdout_cases if case.reader_id in model.reader_factors
    )
    summary["history_fallback_case_count"] = max(
        0,
        int(summary["evaluated_case_count"]) - int(summary["reader_factor_case_count"]),
    )
    summary["candidate_book_count"] = len(candidate_book_ids)
    return {"metrics": metrics, "summary": summary}


def evaluate_popularity_baseline(
    holdout_cases: list[ReaderHoldoutCase],
    *,
    candidate_book_ids: list[int],
    popularity_by_book: dict[int, int],
    top_ks: list[int],
) -> dict[str, object]:
    max_popularity = max(popularity_by_book.values(), default=0)

    def score(_case: ReaderHoldoutCase, _history_book_ids: list[int], candidate_book_id: int) -> float:
        popularity = popularity_by_book.get(candidate_book_id, 0)
        if max_popularity <= 0:
            return 0.0
        return math.log1p(popularity) / math.log1p(max_popularity)

    metrics, summary = _evaluate_ranker(
        holdout_cases,
        candidate_book_ids=candidate_book_ids,
        top_ks=top_ks,
        scorer=score,
    )
    summary["candidate_book_count"] = len(candidate_book_ids)
    return {"metrics": metrics, "summary": summary}


def build_offline_evaluation_report(
    *,
    model: ImplicitMFModel,
    holdout_cases: list[ReaderHoldoutCase],
    top_ks: list[int],
) -> dict[str, object]:
    candidate_book_ids = sorted(model.book_factors)
    popularity_by_book = {
        int(book_id): int(count)
        for book_id, count in model.book_popularity.items()
    }
    model_report = evaluate_reader_book_model(model, holdout_cases, top_ks=top_ks)
    popularity_report = evaluate_popularity_baseline(
        holdout_cases,
        candidate_book_ids=candidate_book_ids,
        popularity_by_book=popularity_by_book,
        top_ks=top_ks,
    )
    comparison = {
        key: round(
            float(model_report["metrics"].get(key, 0.0)) - float(popularity_report["metrics"].get(key, 0.0)),
            6,
        )
        for key in model_report["metrics"]
    }
    return {
        "top_ks": sorted(set(int(k) for k in top_ks)),
        "model": model_report,
        "popularity_baseline": popularity_report,
        "comparison": comparison,
    }


def _evaluate_ranker(
    holdout_cases: list[ReaderHoldoutCase],
    *,
    candidate_book_ids: list[int],
    top_ks: list[int],
    scorer: Callable[[ReaderHoldoutCase, list[int], int], float | None],
) -> tuple[dict[str, float], dict[str, int | float]]:
    unique_top_ks = sorted({int(k) for k in top_ks if int(k) > 0})
    if not unique_top_ks:
        raise ValueError("top_ks must contain at least one positive integer")

    max_k = max(unique_top_ks)
    candidate_book_set = set(candidate_book_ids)
    metric_sums = {
        f"{metric}@{k}": 0.0
        for k in unique_top_ks
        for metric in ("hit_rate", "recall", "ndcg", "mrr")
    }
    evaluated_case_count = 0
    skipped_no_history_count = 0
    skipped_no_positive_count = 0
    skipped_no_score_count = 0
    total_candidate_count = 0
    total_positive_count = 0

    for case in holdout_cases:
        history_book_ids = [
            book_id for book_id in case.history_book_ids if book_id in candidate_book_set
        ]
        if not history_book_ids:
            skipped_no_history_count += 1
            continue

        positive_book_ids = {
            book_id
            for book_id in case.positive_book_ids
            if book_id in candidate_book_set and book_id not in history_book_ids
        }
        if not positive_book_ids:
            skipped_no_positive_count += 1
            continue

        history_set = set(history_book_ids)
        ranked_pairs: list[tuple[int, float]] = []
        for candidate_book_id in candidate_book_ids:
            if candidate_book_id in history_set:
                continue
            score = scorer(case, history_book_ids, candidate_book_id)
            if score is None:
                continue
            ranked_pairs.append((candidate_book_id, float(score)))

        if not ranked_pairs:
            skipped_no_score_count += 1
            continue

        ranked_pairs.sort(key=lambda item: (-item[1], item[0]))
        ranked_book_ids = [book_id for book_id, _score in ranked_pairs]

        evaluated_case_count += 1
        total_candidate_count += len(ranked_book_ids)
        total_positive_count += len(positive_book_ids)

        for k in unique_top_ks:
            top_book_ids = ranked_book_ids[:k]
            hit_count = sum(1 for book_id in top_book_ids if book_id in positive_book_ids)
            metric_sums[f"hit_rate@{k}"] += 1.0 if hit_count > 0 else 0.0
            metric_sums[f"recall@{k}"] += hit_count / len(positive_book_ids)
            metric_sums[f"ndcg@{k}"] += _ndcg_at_k(top_book_ids, positive_book_ids, k)
            metric_sums[f"mrr@{k}"] += _mrr_at_k(top_book_ids, positive_book_ids, k)

    metrics = {
        name: round(total / max(1, evaluated_case_count), 6)
        for name, total in metric_sums.items()
    }
    summary = {
        "evaluated_case_count": evaluated_case_count,
        "skipped_no_history_count": skipped_no_history_count,
        "skipped_no_positive_count": skipped_no_positive_count,
        "skipped_no_score_count": skipped_no_score_count,
        "avg_candidate_count": round(total_candidate_count / max(1, evaluated_case_count), 2),
        "avg_positive_count": round(total_positive_count / max(1, evaluated_case_count), 2),
        "max_k": max_k,
    }
    return metrics, summary


def _ndcg_at_k(ranked_book_ids: list[int], positive_book_ids: set[int], k: int) -> float:
    dcg = 0.0
    for index, book_id in enumerate(ranked_book_ids[:k]):
        if book_id in positive_book_ids:
            dcg += 1.0 / math.log2(index + 2.0)
    ideal_hits = min(len(positive_book_ids), k)
    if ideal_hits <= 0:
        return 0.0
    ideal_dcg = sum(1.0 / math.log2(index + 2.0) for index in range(ideal_hits))
    return dcg / ideal_dcg


def _mrr_at_k(ranked_book_ids: list[int], positive_book_ids: set[int], k: int) -> float:
    for index, book_id in enumerate(ranked_book_ids[:k]):
        if book_id in positive_book_ids:
            return 1.0 / float(index + 1)
    return 0.0


def _datetime_sort_value(value: datetime | None) -> float:
    if value is None:
        return 0.0
    return float(value.timestamp())
