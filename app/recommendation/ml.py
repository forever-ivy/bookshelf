from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable, Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.orders.models import BorrowOrder
from app.recommendation.repository import BORROW_SIGNAL_STATUSES


MODEL_TYPE = "implicit_matrix_factorization"
MODEL_VERSION = 1

SEARCH_BLEND = (0.78, 0.18, 0.04)
SIMILAR_BLEND = (0.68, 0.27, 0.05)
COLLABORATIVE_BLEND = (0.68, 0.27, 0.05)
HYBRID_BLEND = (0.64, 0.31, 0.05)
PERSONALIZED_BLEND = (0.52, 0.43, 0.05)


class RankableCandidate(Protocol):
    book_id: int
    score: float
    evidence: dict | None
    provider_note: str


@dataclass(slots=True)
class ImplicitMFTrainingConfig:
    latent_dim: int = 16
    epochs: int = 32
    learning_rate: float = 0.045
    regularization: float = 0.01
    negatives_per_positive: int = 3
    min_reader_interactions: int = 2
    min_book_interactions: int = 2
    seed: int = 20260326


@dataclass(slots=True)
class ImplicitMFModel:
    latent_dim: int
    global_bias: float
    reader_factors: dict[int, list[float]]
    book_factors: dict[int, list[float]]
    book_biases: dict[int, float]
    book_popularity: dict[int, int]
    trained_at: str | None
    training_summary: dict[str, Any]
    model_type: str = MODEL_TYPE
    version: int = MODEL_VERSION

    def to_payload(self) -> dict[str, Any]:
        return {
            "model_type": self.model_type,
            "version": self.version,
            "latent_dim": self.latent_dim,
            "global_bias": self.global_bias,
            "reader_factors": {str(key): value for key, value in self.reader_factors.items()},
            "book_factors": {str(key): value for key, value in self.book_factors.items()},
            "book_biases": {str(key): value for key, value in self.book_biases.items()},
            "book_popularity": {str(key): value for key, value in self.book_popularity.items()},
            "trained_at": self.trained_at,
            "training_summary": self.training_summary,
        }

    @classmethod
    def from_payload(cls, payload: dict[str, Any]) -> "ImplicitMFModel":
        return cls(
            latent_dim=int(payload.get("latent_dim", 0) or 0),
            global_bias=float(payload.get("global_bias", 0.0) or 0.0),
            reader_factors={
                int(key): [float(value) for value in values]
                for key, values in dict(payload.get("reader_factors") or {}).items()
            },
            book_factors={
                int(key): [float(value) for value in values]
                for key, values in dict(payload.get("book_factors") or {}).items()
            },
            book_biases={
                int(key): float(value)
                for key, value in dict(payload.get("book_biases") or {}).items()
            },
            book_popularity={
                int(key): int(value)
                for key, value in dict(payload.get("book_popularity") or {}).items()
            },
            trained_at=payload.get("trained_at"),
            training_summary=dict(payload.get("training_summary") or {}),
            model_type=str(payload.get("model_type") or MODEL_TYPE),
            version=int(payload.get("version", MODEL_VERSION) or MODEL_VERSION),
        )

    def build_reader_vector(
        self,
        *,
        reader_id: int | None,
        history_book_ids: list[int] | None = None,
    ) -> list[float] | None:
        if reader_id is not None:
            stored = self.reader_factors.get(int(reader_id))
            if stored is not None:
                return list(stored)

        history_vectors = [
            self.book_factors[book_id]
            for book_id in (history_book_ids or [])
            if book_id in self.book_factors
        ]
        if history_vectors:
            return _mean_vector(history_vectors)
        return None

    def score_reader_book(
        self,
        *,
        reader_id: int | None,
        book_id: int,
        history_book_ids: list[int] | None = None,
    ) -> float | None:
        reader_vector = self.build_reader_vector(
            reader_id=reader_id,
            history_book_ids=history_book_ids,
        )
        book_vector = self.book_factors.get(int(book_id))
        if reader_vector is None or book_vector is None:
            return None
        raw_score = (
            self.global_bias
            + self.book_biases.get(int(book_id), 0.0)
            + _dot(reader_vector, book_vector)
        )
        return _sigmoid(raw_score)

    def score_book_pair(self, *, source_book_id: int, candidate_book_id: int) -> float | None:
        left = self.book_factors.get(int(source_book_id))
        right = self.book_factors.get(int(candidate_book_id))
        if left is None or right is None:
            return None
        return (_cosine(left, right) + 1.0) / 2.0

    def popularity_score(self, *, book_id: int) -> float | None:
        popularity = self.book_popularity.get(int(book_id))
        if popularity is None:
            return None
        max_popularity = max(self.book_popularity.values(), default=0)
        if max_popularity <= 0:
            return None
        return math.log1p(popularity) / math.log1p(max_popularity)


class RecommendationMLReranker:
    def __init__(self, model: ImplicitMFModel | None) -> None:
        self.model = model

    @property
    def enabled(self) -> bool:
        return self.model is not None

    def rerank(
        self,
        *,
        mode: str,
        candidates: list[RankableCandidate],
        reader_id: int | None = None,
        history_book_ids: list[int] | None = None,
        source_book_id: int | None = None,
    ) -> dict[str, Any]:
        if self.model is None or len(candidates) <= 1:
            return self._metadata(enabled=False, mode=mode, ranking_mode=None)

        ranking_mode = "reader_book" if mode in {"search", "personalized"} else "book_pair"
        weights = _blend_for_mode(mode)
        base_scores = _normalize_values([float(candidate.score) for candidate in candidates])
        ml_scores: list[float | None] = []
        popularity_scores: list[float | None] = []

        for candidate in candidates:
            if ranking_mode == "reader_book":
                ml_score = self.model.score_reader_book(
                    reader_id=reader_id,
                    book_id=int(candidate.book_id),
                    history_book_ids=history_book_ids,
                )
            elif source_book_id is not None:
                ml_score = self.model.score_book_pair(
                    source_book_id=int(source_book_id),
                    candidate_book_id=int(candidate.book_id),
                )
            else:
                ml_score = None

            ml_scores.append(ml_score)
            popularity_scores.append(
                self.model.popularity_score(book_id=int(candidate.book_id))
            )

        if not any(score is not None for score in ml_scores):
            return self._metadata(enabled=False, mode=mode, ranking_mode=ranking_mode)

        ranked_items: list[RankableCandidate] = []
        for candidate, base_score, ml_score, popularity_score in zip(
            candidates,
            base_scores,
            ml_scores,
            popularity_scores,
            strict=True,
        ):
            final_score = (
                (weights[0] * base_score)
                + (weights[1] * (ml_score if ml_score is not None else 0.0))
                + (weights[2] * (popularity_score if popularity_score is not None else 0.0))
            )
            evidence = dict(candidate.evidence or {})
            evidence["ranking_model"] = {
                "enabled": True,
                "model_type": self.model.model_type,
                "version": self.model.version,
                "ranking_mode": ranking_mode,
                "base_score": round(base_score, 6),
                "ml_score": None if ml_score is None else round(ml_score, 6),
                "popularity_score": None if popularity_score is None else round(popularity_score, 6),
                "blended_score": round(final_score, 6),
                "trained_at": self.model.trained_at,
            }
            candidate.score = float(round(final_score, 6))
            candidate.evidence = evidence
            ranked_items.append(candidate)

        ranked_items.sort(key=lambda item: (-float(item.score), item.book_id))
        candidates[:] = ranked_items
        return self._metadata(enabled=True, mode=mode, ranking_mode=ranking_mode)

    def _metadata(
        self,
        *,
        enabled: bool,
        mode: str,
        ranking_mode: str | None,
    ) -> dict[str, Any]:
        return {
            "enabled": enabled,
            "mode": mode,
            "ranking_mode": ranking_mode,
            "model_type": None if self.model is None else self.model.model_type,
            "trained_at": None if self.model is None else self.model.trained_at,
            "latent_dim": None if self.model is None else self.model.latent_dim,
        }


def build_recommendation_ml_reranker() -> RecommendationMLReranker:
    settings = get_settings()
    if not settings.recommendation_ml_enabled:
        return RecommendationMLReranker(None)

    model_path = Path(settings.recommendation_ml_model_path).expanduser()
    if not model_path.exists():
        return RecommendationMLReranker(None)
    resolved = model_path.resolve()
    model = _load_model_cached(str(resolved), resolved.stat().st_mtime_ns)
    return RecommendationMLReranker(model)


def filter_implicit_mf_interactions(
    interactions: list[tuple[int, int]],
    *,
    min_reader_interactions: int,
    min_book_interactions: int,
) -> list[tuple[int, int]]:
    filtered = {
        (int(reader_id), int(book_id))
        for reader_id, book_id in interactions
        if reader_id is not None and book_id is not None
    }
    if not filtered:
        return []

    while True:
        reader_counts: dict[int, int] = {}
        book_counts: dict[int, int] = {}
        for reader_id, book_id in filtered:
            reader_counts[reader_id] = reader_counts.get(reader_id, 0) + 1
            book_counts[book_id] = book_counts.get(book_id, 0) + 1
        next_filtered = {
            (reader_id, book_id)
            for reader_id, book_id in filtered
            if reader_counts.get(reader_id, 0) >= min_reader_interactions
            and book_counts.get(book_id, 0) >= min_book_interactions
        }
        if next_filtered == filtered:
            break
        filtered = next_filtered
        if not filtered:
            break

    return sorted(filtered)


def train_implicit_mf_model_from_interactions(
    interactions: list[tuple[int, int]],
    *,
    config: ImplicitMFTrainingConfig | None = None,
    progress: Callable[[str], None] | None = None,
) -> ImplicitMFModel:
    config = config or ImplicitMFTrainingConfig()
    if not interactions:
        raise RuntimeError("Not enough borrow interactions to train the recommendation model")

    reader_ids = sorted({reader_id for reader_id, _book_id in interactions})
    book_ids = sorted({book_id for _reader_id, book_id in interactions})
    if progress is not None:
        progress(
            f"训练样本准备完成：读者 {len(reader_ids)}，图书 {len(book_ids)}，交互 {len(interactions)}"
        )

    rng = random.Random(config.seed)
    reader_to_books = _build_reader_to_books(interactions)
    negative_pool = {
        reader_id: [book_id for book_id in book_ids if book_id not in reader_to_books[reader_id]]
        for reader_id in reader_ids
    }

    reader_factors = {
        reader_id: [_initial_factor(rng, config.latent_dim) for _ in range(config.latent_dim)]
        for reader_id in reader_ids
    }
    book_factors = {
        book_id: [_initial_factor(rng, config.latent_dim) for _ in range(config.latent_dim)]
        for book_id in book_ids
    }
    book_biases = {book_id: 0.0 for book_id in book_ids}
    book_popularity = {book_id: 0 for book_id in book_ids}
    for _reader_id, book_id in interactions:
        book_popularity[book_id] = book_popularity.get(book_id, 0) + 1

    density = len(interactions) / max(1, (len(reader_ids) * len(book_ids)))
    global_bias_ref = [math.log((density + 1e-6) / max(1e-6, 1.0 - density))]
    epoch_losses: list[float] = []
    training_pairs = list(interactions)

    for epoch_index in range(config.epochs):
        rng.shuffle(training_pairs)
        total_loss = 0.0
        total_updates = 0
        for reader_id, positive_book_id in training_pairs:
            total_loss += _sgd_update(
                reader_vector=reader_factors[reader_id],
                book_vector=book_factors[positive_book_id],
                book_biases=book_biases,
                book_id=positive_book_id,
                global_bias_ref=global_bias_ref,
                label=1.0,
                learning_rate=config.learning_rate,
                regularization=config.regularization,
            )
            total_updates += 1

            negatives = negative_pool.get(reader_id) or []
            if not negatives:
                continue
            sampled_negatives = rng.sample(
                negatives,
                k=min(config.negatives_per_positive, len(negatives)),
            )
            for negative_book_id in sampled_negatives:
                total_loss += _sgd_update(
                    reader_vector=reader_factors[reader_id],
                    book_vector=book_factors[negative_book_id],
                    book_biases=book_biases,
                    book_id=negative_book_id,
                    global_bias_ref=global_bias_ref,
                    label=0.0,
                    learning_rate=config.learning_rate,
                    regularization=config.regularization,
                )
                total_updates += 1

        epoch_losses.append(total_loss / max(1, total_updates))
        if progress is not None and (
            epoch_index == 0
            or epoch_index == config.epochs - 1
            or (epoch_index + 1) % max(1, config.epochs // 4) == 0
        ):
            progress(
                f"训练中：epoch {epoch_index + 1}/{config.epochs}，平均损失 {epoch_losses[-1]:.6f}"
            )

    global_bias = float(global_bias_ref[0])
    if progress is not None:
        progress("正在整理训练结果...")

    return ImplicitMFModel(
        latent_dim=config.latent_dim,
        global_bias=global_bias,
        reader_factors=reader_factors,
        book_factors=book_factors,
        book_biases=book_biases,
        book_popularity=book_popularity,
        trained_at=datetime.now(timezone.utc).isoformat(),
        training_summary={
            "reader_count": len(reader_ids),
            "book_count": len(book_ids),
            "interaction_count": len(interactions),
            "epochs": config.epochs,
            "learning_rate": config.learning_rate,
            "regularization": config.regularization,
            "negatives_per_positive": config.negatives_per_positive,
            "min_reader_interactions": config.min_reader_interactions,
            "min_book_interactions": config.min_book_interactions,
            "seed": config.seed,
            "mean_training_loss": round(sum(epoch_losses) / max(1, len(epoch_losses)), 6),
            "last_epoch_loss": round(epoch_losses[-1], 6) if epoch_losses else None,
            "pairwise_accuracy": round(
                _estimate_pairwise_accuracy(
                    model_inputs=(reader_factors, book_factors, book_biases, global_bias),
                    interactions=interactions,
                    negative_pool=negative_pool,
                    sample_size=min(500, len(interactions)),
                    seed=config.seed + 1,
                ),
                6,
            ),
        },
    )


def train_implicit_mf_model(
    session: Session,
    *,
    config: ImplicitMFTrainingConfig | None = None,
    progress: Callable[[str], None] | None = None,
) -> ImplicitMFModel:
    config = config or ImplicitMFTrainingConfig()
    if progress is not None:
        progress("正在收集借阅交互数据...")
    interactions = _collect_interactions(
        session,
        min_reader_interactions=config.min_reader_interactions,
        min_book_interactions=config.min_book_interactions,
    )
    return train_implicit_mf_model_from_interactions(
        interactions,
        config=config,
        progress=progress,
    )


def save_implicit_mf_model(model: ImplicitMFModel, output_path: str | Path) -> Path:
    path = Path(output_path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(model.to_payload(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return path


def train_and_save_implicit_mf_model(
    session: Session,
    *,
    output_path: str | Path,
    config: ImplicitMFTrainingConfig | None = None,
    progress: Callable[[str], None] | None = None,
) -> tuple[ImplicitMFModel, Path]:
    model = train_implicit_mf_model(session, config=config, progress=progress)
    path = save_implicit_mf_model(model, output_path)
    return model, path


@lru_cache(maxsize=4)
def _load_model_cached(resolved_path: str, modified_time_ns: int) -> ImplicitMFModel:
    _ = modified_time_ns
    payload = json.loads(Path(resolved_path).read_text(encoding="utf-8"))
    return ImplicitMFModel.from_payload(payload)


def _blend_for_mode(mode: str) -> tuple[float, float, float]:
    if mode == "search":
        return SEARCH_BLEND
    if mode == "similar":
        return SIMILAR_BLEND
    if mode == "collaborative":
        return COLLABORATIVE_BLEND
    if mode == "personalized":
        return PERSONALIZED_BLEND
    return HYBRID_BLEND


def _initial_factor(rng: random.Random, latent_dim: int) -> float:
    scale = 1.0 / max(4, latent_dim)
    return rng.uniform(-scale, scale)


def _collect_interactions(
    session: Session,
    *,
    min_reader_interactions: int,
    min_book_interactions: int,
) -> list[tuple[int, int]]:
    rows = session.execute(
        select(BorrowOrder.reader_id, BorrowOrder.book_id)
        .where(BorrowOrder.status.in_(BORROW_SIGNAL_STATUSES))
        .group_by(BorrowOrder.reader_id, BorrowOrder.book_id)
    ).all()
    return filter_implicit_mf_interactions(
        [
            (int(row.reader_id), int(row.book_id))
            for row in rows
            if row.reader_id is not None and row.book_id is not None
        ],
        min_reader_interactions=min_reader_interactions,
        min_book_interactions=min_book_interactions,
    )


def _build_reader_to_books(interactions: list[tuple[int, int]]) -> dict[int, set[int]]:
    reader_to_books: dict[int, set[int]] = {}
    for reader_id, book_id in interactions:
        reader_to_books.setdefault(reader_id, set()).add(book_id)
    return reader_to_books


def _dot(left: list[float], right: list[float]) -> float:
    return float(sum(a * b for a, b in zip(left, right, strict=True)))


def _cosine(left: list[float], right: list[float]) -> float:
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0.0 or right_norm == 0.0:
        return 0.0
    return _dot(left, right) / (left_norm * right_norm)


def _sigmoid(value: float) -> float:
    if value >= 0:
        exp_value = math.exp(-value)
        return 1.0 / (1.0 + exp_value)
    exp_value = math.exp(value)
    return exp_value / (1.0 + exp_value)


def _mean_vector(vectors: list[list[float]]) -> list[float]:
    if not vectors:
        return []
    vector_length = len(vectors[0])
    sums = [0.0] * vector_length
    for vector in vectors:
        for index, value in enumerate(vector):
            sums[index] += value
    return [value / len(vectors) for value in sums]


def _normalize_values(values: list[float]) -> list[float]:
    if not values:
        return []
    minimum = min(values)
    maximum = max(values)
    if math.isclose(minimum, maximum):
        return [0.5 for _ in values]
    scale = maximum - minimum
    return [(value - minimum) / scale for value in values]


def _sgd_update(
    *,
    reader_vector: list[float],
    book_vector: list[float],
    book_biases: dict[int, float],
    book_id: int,
    global_bias_ref: list[float],
    label: float,
    learning_rate: float,
    regularization: float,
) -> float:
    global_bias = global_bias_ref[0]
    bias = book_biases.get(book_id, 0.0)
    raw_score = global_bias + bias + _dot(reader_vector, book_vector)
    prediction = _sigmoid(raw_score)
    error = label - prediction

    previous_reader = list(reader_vector)
    previous_book = list(book_vector)
    global_bias_ref[0] = global_bias + learning_rate * (error - regularization * global_bias)
    book_biases[book_id] = bias + learning_rate * (error - regularization * bias)

    for index in range(len(reader_vector)):
        reader_vector[index] += learning_rate * (
            (error * previous_book[index]) - (regularization * previous_reader[index])
        )
        book_vector[index] += learning_rate * (
            (error * previous_reader[index]) - (regularization * previous_book[index])
        )

    clipped_prediction = min(max(prediction, 1e-7), 1.0 - 1e-7)
    return -(
        (label * math.log(clipped_prediction))
        + ((1.0 - label) * math.log(1.0 - clipped_prediction))
    )


def _estimate_pairwise_accuracy(
    *,
    model_inputs: tuple[dict[int, list[float]], dict[int, list[float]], dict[int, float], float],
    interactions: list[tuple[int, int]],
    negative_pool: dict[int, list[int]],
    sample_size: int,
    seed: int,
) -> float:
    reader_factors, book_factors, book_biases, global_bias = model_inputs
    if not interactions:
        return 0.0

    rng = random.Random(seed)
    samples = interactions if len(interactions) <= sample_size else rng.sample(interactions, sample_size)
    wins = 0
    total = 0
    for reader_id, positive_book_id in samples:
        negatives = negative_pool.get(reader_id) or []
        if not negatives:
            continue
        negative_book_id = rng.choice(negatives)
        positive_score = _sigmoid(
            global_bias
            + book_biases.get(positive_book_id, 0.0)
            + _dot(reader_factors[reader_id], book_factors[positive_book_id])
        )
        negative_score = _sigmoid(
            global_bias
            + book_biases.get(negative_book_id, 0.0)
            + _dot(reader_factors[reader_id], book_factors[negative_book_id])
        )
        wins += int(positive_score > negative_score)
        total += 1
    return wins / max(1, total)
