from pathlib import Path
from datetime import datetime
import math
import pandas as pd
import psycopg

# ===== 1. 改成你的文件实际路径 =====
EXCEL_PATH = Path(r"C:/Users/32140/Desktop/smart_bookshelf/books/中文图书数据集关键词分词.xlsx")
# Windows 本机运行时可改成类似：
# EXCEL_PATH = Path(r"C:\Users\32140\Desktop\smart_bookshelf\中文图书数据集关键词分词.xlsx")

# ===== 2. 数据库连接配置 =====
DB_CONFIG = {
    "host": "localhost",
    "port": 55432,
    "dbname": "service",
    "user": "library",
    "password": "library",
}

# ===== 3. 导入控制 =====
BATCH_SIZE = 1000
MAX_ROWS = None   # 先测试可改成 5000；全部导入就保持 None


def clean_text(value):
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    text = text.replace("\u3000", " ").replace("\xa0", " ")
    return text


def truncate_text(value, max_len):
    value = clean_text(value)
    if value is None:
        return None
    return value[:max_len]


def find_category_column(columns):
    normalized = [str(column).strip() for column in columns]
    if "分类" in normalized:
        return "分类"
    candidates = [column for column in normalized if "分类" in column]
    if candidates:
        return sorted(candidates, key=len)[0]
    return None


def normalize_category(value):
    """
    兼容旧表里的分类编码或分类名称，统一写入 books.category。
    """
    value = clean_text(value)
    if not value:
        return None
    return value


def normalize_keywords(value):
    """
    原表里的关键词通常是空格分隔，如：
    道家 文化 研究 中医学 医学史 研究
    这里统一转成逗号分隔。
    """
    value = clean_text(value)
    if not value:
        return None
    parts = [x.strip() for x in value.replace("，", " ").replace(",", " ").split() if x.strip()]
    # 去重并保序
    seen = set()
    result = []
    for p in parts:
        if p not in seen:
            seen.add(p)
            result.append(p)
    return ",".join(result) if result else None


def load_excel(path: Path) -> pd.DataFrame:
    df = pd.read_excel(path, engine="openpyxl")
    category_column = find_category_column(df.columns)

    # 只保留需要的列
    expected_cols = ["书名", "作者", "出版社", "关键词", "摘要", "出版年月"]
    missing = [c for c in expected_cols if c not in df.columns]
    if missing:
        raise ValueError(f"Excel 缺少这些列: {missing}")
    if category_column is None:
        raise ValueError("Excel 缺少分类列，请确认表头中包含“分类”字样。")

    df = df[expected_cols + [category_column]].copy()

    # 映射到 books 表结构
    mapped = pd.DataFrame()
    mapped["title"] = df["书名"].map(clean_text)
    mapped["author"] = df["作者"].map(clean_text)
    mapped["category"] = df[category_column].map(normalize_category)
    mapped["keywords"] = df["关键词"].map(normalize_keywords)
    mapped["summary"] = df["摘要"].map(clean_text)

    # 清理长度，避免 varchar 超长
    mapped["title"] = mapped["title"].map(lambda x: truncate_text(x, 255))
    mapped["author"] = mapped["author"].map(lambda x: truncate_text(x, 255))
    mapped["category"] = mapped["category"].map(lambda x: truncate_text(x, 128))

    # title 不能为空
    mapped = mapped[mapped["title"].notna()].copy()

    # 去重：同书名+作者保留第一条
    mapped = mapped.drop_duplicates(subset=["title", "author"], keep="first")

    if MAX_ROWS is not None:
        mapped = mapped.head(MAX_ROWS).copy()

    return mapped


def ensure_unique_index(conn):
    """
    为了支持 ON CONFLICT 去重，给 books(title, author) 建唯一索引。
    注意 author 可能为空，所以这里用 coalesce。
    """
    sql = """
    CREATE UNIQUE INDEX IF NOT EXISTS ux_books_title_author
    ON books (title, COALESCE(author, ''));
    """
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()


def insert_books(conn, df: pd.DataFrame):
    now = datetime.now()

    rows = []
    for _, row in df.iterrows():
        rows.append((
            row["title"],
            row["author"],
            row["category"],
            row["keywords"],
            row["summary"],
            "draft",
            now,
            now,
        ))

    insert_sql = """
    INSERT INTO books (title, author, category, keywords, summary, shelf_status, created_at, updated_at)
    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    ON CONFLICT (title, COALESCE(author, '')) DO NOTHING
    """

    total = len(rows)
    inserted_batches = 0

    with conn.cursor() as cur:
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i:i + BATCH_SIZE]
            cur.executemany(insert_sql, batch)
            inserted_batches += 1
            print(f"已处理 {min(i + BATCH_SIZE, total)}/{total}")

    conn.commit()
    print(f"批次导入完成，共 {inserted_batches} 批。")


def main():
    if not EXCEL_PATH.exists():
        raise FileNotFoundError(f"找不到文件: {EXCEL_PATH}")

    print("开始读取 Excel ...")
    df = load_excel(EXCEL_PATH)
    print(f"清洗后可导入记录数: {len(df)}")

    print("连接数据库 ...")
    with psycopg.connect(**DB_CONFIG) as conn:
        ensure_unique_index(conn)
        insert_books(conn, df)

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM books;")
            total = cur.fetchone()[0]
            print(f"当前 books 总数: {total}")

            cur.execute("""
                SELECT id, title, author, category
                FROM books
                ORDER BY id DESC
                LIMIT 10;
            """)
            rows = cur.fetchall()
            print("最近 10 条：")
            for r in rows:
                print(r)

    print("导入完成。")


if __name__ == "__main__":
    main()
