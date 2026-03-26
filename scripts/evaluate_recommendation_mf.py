from __future__ import annotations

import argparse
import json
import socket
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.db.base import import_model_modules
from app.recommendation.ml import (
    ImplicitMFTrainingConfig,
    filter_implicit_mf_interactions,
    train_implicit_mf_model_from_interactions,
)
from app.recommendation.offline_eval import (
    build_offline_evaluation_report,
    collect_timed_implicit_interactions,
    split_holdout_cases,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run leave-last-out offline evaluation for the implicit MF recommendation model."
    )
    parser.add_argument(
        "--output",
        default="artifacts/recommendation_mf_eval.json",
        help="Where to save the offline evaluation report JSON.",
    )
    parser.add_argument(
        "--top-k",
        default="5,10",
        help="Comma-separated ranking cutoffs, for example 5,10.",
    )
    parser.add_argument(
        "--holdout-per-reader",
        type=int,
        default=1,
        help="How many most recent unique reader-book interactions to hold out per reader.",
    )
    parser.add_argument("--latent-dim", type=int, default=16, help="Latent factor dimension.")
    parser.add_argument("--epochs", type=int, default=32, help="Training epochs.")
    parser.add_argument("--learning-rate", type=float, default=0.045, help="SGD learning rate.")
    parser.add_argument("--regularization", type=float, default=0.01, help="L2 regularization strength.")
    parser.add_argument(
        "--negatives-per-positive",
        type=int,
        default=3,
        help="How many negative samples to draw for each positive interaction.",
    )
    parser.add_argument(
        "--min-reader-interactions",
        type=int,
        default=2,
        help="Minimum train interactions required to keep a reader in the evaluation training split.",
    )
    parser.add_argument(
        "--min-book-interactions",
        type=int,
        default=2,
        help="Minimum train interactions required to keep a book in the evaluation training split.",
    )
    parser.add_argument("--seed", type=int, default=20260326, help="Random seed.")
    return parser.parse_args()


def parse_top_ks(value: str) -> list[int]:
    top_ks = sorted({int(part.strip()) for part in str(value).split(",") if part.strip()})
    if not top_ks or any(k <= 0 for k in top_ks):
        raise ValueError("--top-k must contain positive integers, for example 5,10")
    return top_ks


def log(message: str) -> None:
    print(message, flush=True)


def check_database_reachable(database_url: str) -> None:
    url = make_url(database_url)
    backend = url.get_backend_name()
    if backend != "postgresql":
        return
    host = url.host or "127.0.0.1"
    port = int(url.port or 5432)
    try:
        with socket.create_connection((host, port), timeout=3):
            return
    except OSError as exc:
        raise RuntimeError(
            f"无法连接数据库端口 {host}:{port}，请先确认 PostgreSQL / Docker 容器已启动"
        ) from exc


def main() -> None:
    args = parse_args()
    top_ks = parse_top_ks(args.top_k)
    if args.holdout_per_reader <= 0:
        raise ValueError("--holdout-per-reader must be greater than 0")

    settings = get_settings()
    log("正在检查数据库连通性...")
    check_database_reachable(settings.database_url)
    log("数据库端口可达，正在初始化 SQLAlchemy 引擎...")
    import_model_modules()
    init_engine(settings)
    session_factory = get_session_factory()

    config = ImplicitMFTrainingConfig(
        latent_dim=args.latent_dim,
        epochs=args.epochs,
        learning_rate=args.learning_rate,
        regularization=args.regularization,
        negatives_per_positive=args.negatives_per_positive,
        min_reader_interactions=args.min_reader_interactions,
        min_book_interactions=args.min_book_interactions,
        seed=args.seed,
    )

    with session_factory() as session:
        log("正在收集带时间戳的借阅交互...")
        timed_interactions = collect_timed_implicit_interactions(session)
        if not timed_interactions:
            raise RuntimeError("Not enough borrow interactions to run offline evaluation")
        raw_reader_count = len({item.reader_id for item in timed_interactions})
        raw_book_count = len({item.book_id for item in timed_interactions})
        log(
            f"原始去重交互准备完成：读者 {raw_reader_count}，图书 {raw_book_count}，交互 {len(timed_interactions)}"
        )

        train_interactions, holdout_cases, split_summary = split_holdout_cases(
            timed_interactions,
            holdout_per_reader=args.holdout_per_reader,
        )
        if not holdout_cases:
            raise RuntimeError("No eligible readers remained after the holdout split")
        log(
            f"留出评估拆分完成：可评估读者 {split_summary['eligible_reader_count']}，"
            f"训练交互 {split_summary['train_interaction_count_before_filter']}"
        )

        filtered_train_interactions = filter_implicit_mf_interactions(
            train_interactions,
            min_reader_interactions=config.min_reader_interactions,
            min_book_interactions=config.min_book_interactions,
        )
        if not filtered_train_interactions:
            raise RuntimeError("No training interactions remained after support filtering")
        split_summary["train_interaction_count_after_filter"] = len(filtered_train_interactions)
        split_summary["train_reader_count"] = len({reader_id for reader_id, _book_id in filtered_train_interactions})
        split_summary["train_book_count"] = len({book_id for _reader_id, book_id in filtered_train_interactions})

        log("开始训练离线评估模型...")
        model = train_implicit_mf_model_from_interactions(
            filtered_train_interactions,
            config=config,
            progress=log,
        )

    split_summary["train_book_count"] = len(model.book_factors)
    report = build_offline_evaluation_report(
        model=model,
        holdout_cases=holdout_cases,
        top_ks=top_ks,
    )
    report["split_summary"] = split_summary
    report["training_summary"] = model.training_summary
    report["model_config"] = {
        "latent_dim": config.latent_dim,
        "epochs": config.epochs,
        "learning_rate": config.learning_rate,
        "regularization": config.regularization,
        "negatives_per_positive": config.negatives_per_positive,
        "min_reader_interactions": config.min_reader_interactions,
        "min_book_interactions": config.min_book_interactions,
        "seed": config.seed,
    }

    output_path = Path(args.output).expanduser()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"离线评估报告已保存到: {output_path}")
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
