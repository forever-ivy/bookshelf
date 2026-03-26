from __future__ import annotations

import argparse
import json
import socket

from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.recommendation.ml import (
    ImplicitMFTrainingConfig,
    train_and_save_implicit_mf_model,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Train an implicit matrix-factorization model for recommendation reranking."
    )
    parser.add_argument(
        "--output",
        default="artifacts/recommendation_mf_model.json",
        help="Where to save the trained model JSON.",
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
        help="Minimum interactions required to keep a reader in training.",
    )
    parser.add_argument(
        "--min-book-interactions",
        type=int,
        default=2,
        help="Minimum interactions required to keep a book in training.",
    )
    parser.add_argument("--seed", type=int, default=20260326, help="Random seed.")
    return parser.parse_args()


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
    settings = get_settings()
    log("正在检查数据库连通性...")
    check_database_reachable(settings.database_url)
    log("数据库端口可达，正在初始化 SQLAlchemy 引擎...")
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

    log(
        "开始训练推荐模型："
        f" latent_dim={config.latent_dim}, epochs={config.epochs}, "
        f"lr={config.learning_rate}, reg={config.regularization}"
    )
    with session_factory() as session:
        log("正在建立数据库会话并检查连接...")
        session.execute(text("SELECT 1"))
        log("数据库连接成功，进入训练阶段。")
        model, output_path = train_and_save_implicit_mf_model(
            session,
            output_path=args.output,
            config=config,
            progress=log,
        )

    log(f"模型已保存到: {output_path}")
    print(json.dumps(model.training_summary, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
