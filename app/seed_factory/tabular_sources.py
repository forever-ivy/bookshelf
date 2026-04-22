from __future__ import annotations

import re
from pathlib import Path
from typing import Any

import pandas as pd


SEARCH_TEXT_MAX_LENGTH = 8_000
TABULAR_SOURCE_COLUMNS = [
    "title",
    "author",
    "category",
    "keywords",
    "summary",
    "isbn",
    "search_text",
    "first_publish_year",
]


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    if pd.isna(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    return text.replace("\u3000", " ").replace("\xa0", " ")


def truncate_text(value: Any, max_len: int) -> str | None:
    text = clean_text(value)
    if text is None:
        return None
    return text[:max_len]


def normalize_keywords(value: Any) -> str | None:
    text = clean_text(value)
    if not text:
        return None
    parts = [item.strip() for item in text.replace("，", " ").replace(",", " ").split() if item.strip()]
    deduped = list(dict.fromkeys(parts))
    return ",".join(deduped) if deduped else None


def combine_keywords(*values: Any) -> str | None:
    parts = [normalize_keywords(value) for value in values]
    joined = ",".join(part for part in parts if part)
    return normalize_keywords(joined)


def build_search_text(*parts: Any) -> str | None:
    items = [clean_text(part) for part in parts]
    joined = " ".join(item for item in items if item)
    return truncate_text(joined, SEARCH_TEXT_MAX_LENGTH)


def find_category_column(columns) -> str | None:
    normalized = [str(column).strip() for column in columns]
    if "分类" in normalized:
        return "分类"
    candidates = [column for column in normalized if "分类" in column]
    if candidates:
        return sorted(candidates, key=len)[0]
    return None


def extract_first_publish_year(value: Any) -> int | None:
    text = clean_text(value)
    if not text:
        return None
    match = re.search(r"(19|20)\d{2}", text)
    if match:
        return int(match.group(0))
    return None


def _finalize_dataframe(mapped: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame:
    normalized = mapped.copy()
    normalized["title"] = normalized["title"].map(lambda value: truncate_text(value, 255))
    normalized["author"] = normalized["author"].map(lambda value: truncate_text(value, 255))
    normalized["category"] = normalized["category"].map(lambda value: truncate_text(value, 128))
    normalized["isbn"] = normalized["isbn"].map(lambda value: truncate_text(value, 32))
    normalized["summary"] = normalized["summary"].map(clean_text)
    normalized["first_publish_year"] = normalized["first_publish_year"].map(extract_first_publish_year)
    normalized["search_text"] = normalized.apply(
        lambda row: build_search_text(
            row["title"],
            row["author"],
            row["category"],
            row["keywords"],
            row["summary"],
        ),
        axis=1,
    )
    normalized = normalized[normalized["title"].notna()].copy()
    normalized = normalized.drop_duplicates(subset=["title", "author"], keep="first")
    if max_rows is not None:
        normalized = normalized.head(max_rows).copy()
    return normalized[TABULAR_SOURCE_COLUMNS]


def _normalize_generic_table(df: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame:
    mapped = pd.DataFrame()
    mapped["title"] = df["title"]
    mapped["author"] = df.get("author")
    mapped["category"] = df.get("category")
    mapped["keywords"] = df.get("keywords").map(normalize_keywords) if "keywords" in df.columns else None
    mapped["summary"] = df.get("summary")
    mapped["isbn"] = df.get("isbn")
    mapped["first_publish_year"] = (
        df.get("first_publish_year")
        if "first_publish_year" in df.columns
        else (df.get("publish_year") if "publish_year" in df.columns else None)
    )
    return _finalize_dataframe(mapped, max_rows=max_rows)


def _normalize_legacy_chinese_table(df: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame:
    category_column = find_category_column(df.columns)
    required = ["书名", "作者", "关键词", "摘要"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Source file is missing required columns: {missing}")
    if category_column is None:
        raise ValueError("Source file is missing a 分类 column.")

    mapped = pd.DataFrame()
    mapped["title"] = df["书名"]
    mapped["author"] = df["作者"]
    mapped["category"] = df[category_column]
    mapped["keywords"] = df["关键词"].map(normalize_keywords)
    mapped["summary"] = df["摘要"]
    mapped["isbn"] = None
    mapped["first_publish_year"] = df["出版年月"] if "出版年月" in df.columns else None
    return _finalize_dataframe(mapped, max_rows=max_rows)


def _normalize_foreign_table(df: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame:
    required = ["书名", "作者", "分类号"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Source file is missing required columns: {missing}")

    mapped = pd.DataFrame()
    mapped["title"] = df["书名"]
    mapped["author"] = df["作者"]
    mapped["category"] = df["分类号"]
    mapped["keywords"] = None
    mapped["summary"] = df["出版社"] if "出版社" in df.columns else None
    mapped["isbn"] = None
    mapped["first_publish_year"] = df["出版年"] if "出版年" in df.columns else None
    return _finalize_dataframe(mapped, max_rows=max_rows)


def _normalize_douban_table(df: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame:
    required = ["书名", "作者", "豆瓣成员常用的标签", "内容简介", "ISBN号", "标签"]
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"Source file is missing required columns: {missing}")

    mapped = pd.DataFrame()
    mapped["title"] = df["书名"]
    mapped["author"] = df["作者"]
    mapped["category"] = df["标签"]
    mapped["keywords"] = [combine_keywords(tag_text, category_text) for tag_text, category_text in zip(df["豆瓣成员常用的标签"], df["标签"], strict=False)]
    mapped["summary"] = df["内容简介"]
    mapped["isbn"] = df["ISBN号"]
    mapped["first_publish_year"] = df["出版时间"]
    return _finalize_dataframe(mapped, max_rows=max_rows)


def _normalize_table(df: pd.DataFrame, *, max_rows: int | None = None) -> pd.DataFrame | None:
    columns = {str(column).strip() for column in df.columns}

    if {"title", "author"}.issubset(columns):
        return _normalize_generic_table(df, max_rows=max_rows)
    if {"书名", "作者", "豆瓣成员常用的标签", "内容简介", "ISBN号", "标签"}.issubset(columns):
        return _normalize_douban_table(df, max_rows=max_rows)
    if {"书名", "作者", "关键词", "摘要"}.issubset(columns) and find_category_column(df.columns):
        return _normalize_legacy_chinese_table(df, max_rows=max_rows)
    if {"书名", "作者", "分类号"}.issubset(columns):
        return _normalize_foreign_table(df, max_rows=max_rows)
    return None


def load_tabular_source_data(path: Path, *, max_rows: int | None = None) -> pd.DataFrame:
    resolved_path = path.expanduser().resolve()
    if not resolved_path.exists():
        raise FileNotFoundError(f"Source file not found: {resolved_path}")

    suffix = resolved_path.suffix.lower()
    normalized_frames: list[pd.DataFrame] = []

    if suffix == ".csv":
        table = pd.read_csv(resolved_path, dtype=str, encoding="utf-8-sig")
        normalized = _normalize_table(table, max_rows=max_rows)
        if normalized is not None:
            normalized_frames.append(normalized)
    elif suffix in {".xlsx", ".xls"}:
        workbook = pd.ExcelFile(resolved_path)
        for sheet_name in workbook.sheet_names:
            table = pd.read_excel(resolved_path, sheet_name=sheet_name, dtype=str)
            if table.empty:
                continue
            normalized = _normalize_table(table, max_rows=None)
            if normalized is not None:
                normalized_frames.append(normalized)
    else:
        raise ValueError(f"Unsupported file type: {resolved_path.suffix}")

    if not normalized_frames:
        raise ValueError(f"Unsupported source columns in file: {resolved_path}")

    combined = pd.concat(normalized_frames, ignore_index=True)
    return _finalize_dataframe(combined, max_rows=max_rows)
