from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path

import psycopg

from app.core.config import get_settings
from app.seed_factory.tabular_sources import load_tabular_source_data


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMPORT_PATH = REPO_ROOT / "data" / "中文图书数据集关键词分词.xlsx"
DEFAULT_BATCH_SIZE = 1000


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import Chinese book metadata into the books table.")
    parser.add_argument(
        "--path",
        type=Path,
        default=DEFAULT_IMPORT_PATH,
        help=f"Source file path (.csv, .xlsx). Defaults to {DEFAULT_IMPORT_PATH}",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace existing books by truncating books and cascading dependent tables before import.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=DEFAULT_BATCH_SIZE,
        help="How many rows to write per batch.",
    )
    parser.add_argument(
        "--max-rows",
        type=int,
        default=None,
        help="Limit imported rows after cleaning, useful for smoke tests.",
    )
    return parser.parse_args(argv)

def load_tabular_data(path: Path, *, max_rows: int | None = None) -> pd.DataFrame:
    return load_tabular_source_data(path, max_rows=max_rows)


def ensure_unique_index(conn) -> None:
    sql = """
    CREATE UNIQUE INDEX IF NOT EXISTS ux_books_title_author
    ON books (title, COALESCE(author, ''));
    """
    with conn.cursor() as cur:
        cur.execute(sql)


def replace_existing_books(conn) -> None:
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE books RESTART IDENTITY CASCADE")


def insert_books(conn, df: pd.DataFrame, *, batch_size: int = DEFAULT_BATCH_SIZE) -> None:
    now = datetime.now()
    rows = [
        (
            row["title"],
            row["author"],
            row["category"],
            row["isbn"],
            row["keywords"],
            row["summary"],
            row["search_text"],
            row["search_text"],
            "draft",
            now,
            now,
        )
        for _, row in df.iterrows()
    ]

    insert_sql = """
    INSERT INTO books (
        title,
        author,
        category,
        isbn,
        keywords,
        summary,
        search_document,
        search_vector,
        shelf_status,
        created_at,
        updated_at
    )
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (title, COALESCE(author, '')) DO UPDATE
    SET
        category = EXCLUDED.category,
        isbn = EXCLUDED.isbn,
        keywords = EXCLUDED.keywords,
        summary = EXCLUDED.summary,
        search_document = EXCLUDED.search_document,
        search_vector = EXCLUDED.search_vector,
        updated_at = EXCLUDED.updated_at
    """

    total = len(rows)
    with conn.cursor() as cur:
        for index in range(0, total, batch_size):
            batch = rows[index : index + batch_size]
            cur.executemany(insert_sql, batch)
            print(f"已处理 {min(index + batch_size, total)}/{total}")


def _psycopg_connection_url(database_url: str) -> str:
    return database_url.replace("+psycopg", "", 1)


def _count_books(conn) -> int:
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM books")
        return int(cur.fetchone()[0])


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    if args.batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0")

    source_path = args.path.expanduser().resolve()
    if not source_path.exists():
        raise FileNotFoundError(f"Source file not found: {source_path}")

    print(f"读取文件: {source_path}")
    df = load_tabular_data(source_path, max_rows=args.max_rows)
    print(f"清洗后可导入记录数: {len(df)}")

    settings = get_settings()
    with psycopg.connect(_psycopg_connection_url(settings.database_url)) as conn:
        ensure_unique_index(conn)
        print(f"导入前 books 总数: {_count_books(conn)}")
        if args.replace:
            print("替换模式已开启，将执行 TRUNCATE TABLE books RESTART IDENTITY CASCADE")
            replace_existing_books(conn)
        insert_books(conn, df, batch_size=args.batch_size)
        print(f"导入后 books 总数: {_count_books(conn)}")

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, author, category
                FROM books
                ORDER BY id ASC
                LIMIT 5
                """
            )
            print("前 5 条：")
            for row in cur.fetchall():
                print(row)


if __name__ == "__main__":
    main()
