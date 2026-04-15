from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import gzip
import json
import math
from pathlib import Path
import re
from typing import Any


MAX_TAGS_PER_BOOK = 12
OPENLIBRARY_COVER_TEMPLATE = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
NULL_LIKE_TEXTS = frozenset({"nan", "null", "none", "n/a", "na", "nat", "<na>", "undefined", "unknown"})
AUTHOR_PATH_PATTERN = re.compile(r"^/authors/OL[\w-]+A?$", re.IGNORECASE)
CLASSIFICATION_CODE_PATTERN = re.compile(r"^[A-Z]{1,3}(?:[\-./=:()]?\d[\dA-Z.\-()/=:]*|)$", re.IGNORECASE)
QUOTED_TITLE_PREFIXES = ('"', "'", "“", "‘")
CLASSIFICATION_CATEGORY_LABELS = {
    "A": "马克思主义",
    "B": "哲学",
    "C": "社会科学",
    "D": "政治法律",
    "E": "军事",
    "F": "经济",
    "G": "文化教育",
    "H": "语言文字",
    "I": "文学",
    "J": "艺术",
    "K": "历史地理",
    "N": "自然科学",
    "O": "数理化",
    "P": "天文地学",
    "Q": "生物科学",
    "R": "医药卫生",
    "S": "农业科学",
    "T": "工业技术",
    "U": "交通运输",
    "V": "航空航天",
    "X": "环境科学",
    "Z": "综合参考",
}
CLASSIFICATION_TRANSLATION = str.maketrans({
    "（": "(",
    "）": ")",
    "＝": "=",
    "－": "-",
    "；": ";",
    "，": ",",
    "：": ":",
})


@dataclass(slots=True)
class SnapshotBuildStats:
    total_records: int
    unique_categories: int
    unique_tags: int


def _open_maybe_gzip(path: Path):
    if path.suffix == ".gz":
        return gzip.open(path, "rt", encoding="utf-8", errors="ignore")
    return path.open("r", encoding="utf-8", errors="ignore")


def _iter_dump_payloads(path: Path, *, expected_type: str) -> tuple[str, dict[str, Any]]:
    with _open_maybe_gzip(path) as fin:
        for line in fin:
            parts = line.rstrip("\n").split("\t", 4)
            if len(parts) != 5:
                continue
            record_type, key, _revision, _modified, raw_json = parts
            if record_type != expected_type:
                continue
            try:
                payload = json.loads(raw_json)
            except json.JSONDecodeError:
                continue
            yield key, payload


def _normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and math.isnan(value):
        return ""
    if isinstance(value, dict):
        value = value.get("value") or value.get("name") or ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    if not text or text.lower() in NULL_LIKE_TEXTS:
        return ""
    return text


def _looks_like_author_placeholder(value: str) -> bool:
    return bool(AUTHOR_PATH_PATTERN.fullmatch(value))


def _contains_only_author_placeholders(value: Any) -> bool:
    text = _normalize_text(value)
    if not text:
        return False
    parts = [part.strip() for part in re.split(r"[;,]+", text) if part.strip()]
    return bool(parts) and all(_looks_like_author_placeholder(part) for part in parts)


def _is_classification_part(part: str) -> bool:
    return bool(CLASSIFICATION_CODE_PATTERN.fullmatch(part)) and (any(char.isdigit() for char in part) or len(part) == 1)


def _looks_like_classification_code(value: str) -> bool:
    compact = re.sub(r"\s+", "", value.translate(CLASSIFICATION_TRANSLATION)).upper()
    parts = [part for part in re.split(r"[;,]+", compact) if part]
    if not parts or not _is_classification_part(parts[0]):
        return False
    return all(
        _is_classification_part(part) or bool(re.fullmatch(r"[A-Z][A-Z0-9+]{1,7}", part))
        for part in parts[1:]
    )


def _normalize_author(value: Any) -> str | None:
    text = _normalize_text(value)[:255] or None
    if not text:
        return None
    parts = [part.strip() for part in re.split(r"[;,]+", text) if part.strip()]
    normalized_parts = [part for part in parts if not _looks_like_author_placeholder(part)]
    if not normalized_parts:
        return None
    normalized = "; ".join(normalized_parts)
    if _looks_like_author_placeholder(normalized):
        return None
    return normalized[:255]


def _normalize_category(value: Any) -> str | None:
    text = _normalize_text(value)[:128]
    if not text:
        return None
    if _looks_like_classification_code(text):
        compact = re.sub(r"\s+", "", text.translate(CLASSIFICATION_TRANSLATION)).upper()
        prefix = next((part[0] for part in re.split(r"[;,]+", compact) if part), compact[0])
        return CLASSIFICATION_CATEGORY_LABELS.get(prefix.upper(), "综合参考")
    return text


def _should_drop_record(
    *,
    title: str,
    author: str | None,
    category: str | None,
    tags: list[str],
    summary: str | None,
) -> bool:
    if title.startswith(QUOTED_TITLE_PREFIXES):
        return True
    return not author and not category and not tags and not summary


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", "", value.lower())


def _normalize_summary(value: Any) -> str | None:
    text = _normalize_text(value)
    return text or None


def _extract_subjects(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    seen: set[str] = set()
    for item in value:
        text = _normalize_text(item)
        if not text:
            continue
        if _looks_like_classification_code(text) or _looks_like_author_placeholder(text):
            continue
        dedupe_key = _normalize_key(text)
        if not dedupe_key or dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        result.append(text[:128])
        if len(result) >= MAX_TAGS_PER_BOOK:
            break
    return result


def _extract_language(payload: dict[str, Any]) -> str | None:
    languages = payload.get("languages")
    if not isinstance(languages, list):
        return None
    for item in languages:
        if isinstance(item, dict):
            key = item.get("key")
            if isinstance(key, str) and key:
                return key.rsplit("/", 1)[-1]
    return None


def _extract_first_publish_year(payload: dict[str, Any]) -> int | None:
    candidates = [
        payload.get("first_publish_year"),
        payload.get("publish_date"),
        payload.get("first_publish_date"),
    ]
    for candidate in candidates:
        text = _normalize_text(candidate)
        match = re.search(r"(19|20)\d{2}", text)
        if match:
            return int(match.group(0))
    return None


def _extract_author_keys(payload: dict[str, Any]) -> list[str]:
    result: list[str] = []
    for item in payload.get("authors", []) or []:
        if not isinstance(item, dict):
            continue
        author = item.get("author")
        if isinstance(author, dict) and isinstance(author.get("key"), str):
            result.append(author["key"])
    return result


def _collect_author_names(authors_dump_path: Path | None, target_keys: set[str]) -> dict[str, str]:
    if authors_dump_path is None or not target_keys:
        return {}
    names: dict[str, str] = {}
    for key, payload in _iter_dump_payloads(authors_dump_path, expected_type="/type/author"):
        if key not in target_keys:
            continue
        name = _normalize_text(payload.get("name"))
        if name:
            names[key] = name[:255]
        if len(names) == len(target_keys):
            break
    return names


def _extract_work_keys_from_edition(payload: dict[str, Any]) -> list[str]:
    result: list[str] = []
    for item in payload.get("works", []) or []:
        if isinstance(item, dict) and isinstance(item.get("key"), str):
            result.append(item["key"])
    return result


def _collect_edition_enrichment(editions_dump_path: Path | None, target_work_keys: set[str]) -> dict[str, dict[str, Any]]:
    if editions_dump_path is None or not target_work_keys:
        return {}
    enrichment: dict[str, dict[str, Any]] = {}
    for _key, payload in _iter_dump_payloads(editions_dump_path, expected_type="/type/edition"):
        for work_key in _extract_work_keys_from_edition(payload):
            if work_key not in target_work_keys or work_key in enrichment:
                continue
            isbns = payload.get("isbn_13") or payload.get("isbn_10") or []
            isbn = None
            if isinstance(isbns, list) and isbns:
                isbn = _normalize_text(isbns[0])[:32] or None
            cover_id = None
            covers = payload.get("covers") or []
            if isinstance(covers, list) and covers:
                cover_id = covers[0]
            enrichment[work_key] = {
                "isbn": isbn,
                "cover_url": OPENLIBRARY_COVER_TEMPLATE.format(cover_id=cover_id) if cover_id else None,
            }
        if len(enrichment) == len(target_work_keys):
            break
    return enrichment


def _build_search_text(title: str, author: str | None, category: str | None, tags: list[str], summary: str | None) -> str:
    parts = [title]
    if author:
        parts.append(author)
    if category:
        parts.append(category)
    if tags:
        parts.append(" ".join(tags))
    if summary:
        parts.append(summary)
    return " ".join(part for part in parts if part).strip()


def _split_keywords(value: Any) -> list[str]:
    text = _normalize_text(value)
    if not text:
        return []
    tokens = re.split(r"[\s,，;；/|]+", text)
    result: list[str] = []
    seen: set[str] = set()
    for token in tokens:
        normalized = _normalize_text(token)
        if not normalized:
            continue
        if _looks_like_classification_code(normalized) or _looks_like_author_placeholder(normalized):
            continue
        dedupe_key = _normalize_key(normalized)
        if not dedupe_key or dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        result.append(normalized[:128])
        if len(result) >= MAX_TAGS_PER_BOOK:
            break
    return result


def _normalize_source_record(
    *,
    title: Any,
    author: Any,
    category: Any = None,
    keywords: Any = None,
    summary: Any = None,
    isbn: Any = None,
    first_publish_year: Any = None,
) -> dict[str, Any] | None:
    normalized_title = _normalize_text(title)[:255]
    if not normalized_title:
        return None
    normalized_author = _normalize_author(author)
    if normalized_author is None and _contains_only_author_placeholders(author):
        return None
    work_key = f"/local/{_normalize_key(normalized_title)}|{_normalize_key(normalized_author or '')}"
    normalized_category = _normalize_category(category)
    normalized_summary = _normalize_summary(summary)
    normalized_isbn = _normalize_text(isbn)[:32] or None
    tags = _split_keywords(keywords)
    if _should_drop_record(
        title=normalized_title,
        author=normalized_author,
        category=normalized_category,
        tags=tags,
        summary=normalized_summary,
    ):
        return None
    publish_year = _extract_first_publish_year({"first_publish_year": first_publish_year})
    return {
        "work_key": work_key,
        "title": normalized_title,
        "author": normalized_author,
        "author_keys": [],
        "category": normalized_category,
        "tags": tags,
        "summary": normalized_summary,
        "isbn": normalized_isbn,
        "cover_url": None,
        "subjects": tags,
        "search_text": _build_search_text(normalized_title, normalized_author, normalized_category, tags, normalized_summary),
        "first_publish_year": publish_year,
        "language": None,
    }


def _merge_snapshot_record(existing: dict[str, Any], candidate: dict[str, Any]) -> dict[str, Any]:
    merged = dict(existing)
    if not merged.get("author") and candidate.get("author"):
        merged["author"] = candidate["author"]
    if not merged.get("category") and candidate.get("category"):
        merged["category"] = candidate["category"]
    if not merged.get("isbn") and candidate.get("isbn"):
        merged["isbn"] = candidate["isbn"]
    if not merged.get("cover_url") and candidate.get("cover_url"):
        merged["cover_url"] = candidate["cover_url"]
    existing_summary = merged.get("summary") or ""
    candidate_summary = candidate.get("summary") or ""
    if len(candidate_summary) > len(existing_summary):
        merged["summary"] = candidate_summary or None

    merged_tags = _extract_subjects(list(merged.get("tags") or []) + list(candidate.get("tags") or []))
    merged["tags"] = merged_tags
    merged["subjects"] = merged_tags
    merged["search_text"] = _build_search_text(
        merged["title"],
        merged.get("author"),
        merged.get("category"),
        merged_tags,
        merged.get("summary"),
    )
    if merged.get("first_publish_year") is None and candidate.get("first_publish_year") is not None:
        merged["first_publish_year"] = candidate["first_publish_year"]
    if merged.get("language") is None and candidate.get("language") is not None:
        merged["language"] = candidate["language"]
    return merged


def build_snapshot_records_from_source_dir(*, source_dir: Path, limit: int | None = None) -> list[dict[str, Any]]:
    import pandas as pd

    if not source_dir.exists():
        raise FileNotFoundError(f"source dir not found: {source_dir}")

    csv_path = source_dir / "books_openlibrary_sample.csv"
    chinese_path = source_dir / "中文图书数据集关键词分词.xlsx"
    foreign_path = source_dir / "外文图书分类数据集.xlsx"
    douban_path = source_dir / "豆瓣书籍汇总.xlsx"

    records_by_key: dict[str, dict[str, Any]] = {}

    def upsert(candidate: dict[str, Any] | None) -> None:
        if candidate is None:
            return
        key = f"{_normalize_key(candidate['title'])}|{_normalize_key(candidate.get('author') or '')}"
        current = records_by_key.get(key)
        records_by_key[key] = candidate if current is None else _merge_snapshot_record(current, candidate)

    if csv_path.exists():
        df = pd.read_csv(csv_path)
        for row in df.to_dict(orient="records"):
            upsert(
                _normalize_source_record(
                    title=row.get("title"),
                    author=row.get("author"),
                    category=row.get("category"),
                    keywords=row.get("keywords"),
                    summary=row.get("summary"),
                )
            )

    if chinese_path.exists():
        df = pd.read_excel(chinese_path, sheet_name=0)
        for row in df.to_dict(orient="records"):
            upsert(
                _normalize_source_record(
                    title=row.get("书名"),
                    author=row.get("作者"),
                    category=row.get("中国图书分类号"),
                    keywords=row.get("关键词"),
                    summary=row.get("摘要"),
                    first_publish_year=row.get("出版年月"),
                )
            )

    if foreign_path.exists():
        xls = pd.ExcelFile(foreign_path)
        for sheet_name in xls.sheet_names:
            df = pd.read_excel(foreign_path, sheet_name=sheet_name)
            if df.empty:
                continue
            for row in df.to_dict(orient="records"):
                upsert(
                    _normalize_source_record(
                        title=row.get("书名"),
                        author=row.get("作者"),
                        category=row.get("分类号"),
                        summary=row.get("出版社"),
                        first_publish_year=row.get("出版年"),
                    )
                )

    if douban_path.exists():
        df = pd.read_excel(douban_path, sheet_name=0)
        for row in df.to_dict(orient="records"):
            keyword_parts = [row.get("豆瓣成员常用的标签"), row.get("标签")]
            upsert(
                _normalize_source_record(
                    title=row.get("书名"),
                    author=row.get("作者"),
                    keywords=" ".join(_normalize_text(part) for part in keyword_parts if _normalize_text(part)),
                    summary=row.get("内容简介"),
                    isbn=row.get("ISBN号"),
                    first_publish_year=row.get("出版时间"),
                )
            )

    records = list(records_by_key.values())
    records.sort(key=lambda item: (_normalize_key(item["title"]), _normalize_key(item.get("author") or "")))
    return records if limit is None else records[:limit]


def _finalize_record(
    payload: dict[str, Any],
    *,
    author_names: dict[str, str],
    edition_enrichment: dict[str, dict[str, Any]],
) -> dict[str, Any] | None:
    title = _normalize_text(payload.get("title"))[:255]
    if not title:
        return None
    author_keys = _extract_author_keys(payload)
    resolved_authors = [author_names[key] for key in author_keys if key in author_names]
    author = _normalize_author("; ".join(resolved_authors[:5]))
    subjects = _extract_subjects(payload.get("subjects"))
    category = _normalize_category(subjects[0]) if subjects else None
    summary = _normalize_summary(payload.get("description"))
    cover_url = None
    covers = payload.get("covers") or []
    if isinstance(covers, list) and covers:
        cover_url = OPENLIBRARY_COVER_TEMPLATE.format(cover_id=covers[0])

    enrichment = edition_enrichment.get(payload["key"], {})
    record = {
        "work_key": payload["key"],
        "title": title,
        "author": author,
        "author_keys": author_keys,
        "category": category,
        "tags": subjects,
        "summary": summary,
        "isbn": enrichment.get("isbn"),
        "cover_url": enrichment.get("cover_url") or cover_url,
        "subjects": subjects,
        "search_text": _build_search_text(title, author, category, subjects, summary),
        "first_publish_year": _extract_first_publish_year(payload),
        "language": _extract_language(payload),
    }
    if _should_drop_record(title=title, author=author, category=category, tags=subjects, summary=summary):
        return None
    return record


def build_snapshot_records(
    *,
    works_dump_path: Path,
    authors_dump_path: Path | None = None,
    editions_dump_path: Path | None = None,
    limit: int = 100_000,
) -> list[dict[str, Any]]:
    candidate_payloads: list[dict[str, Any]] = []
    author_keys: set[str] = set()
    slack_limit = max(limit + 1_000, int(limit * 1.2))

    for _key, payload in _iter_dump_payloads(works_dump_path, expected_type="/type/work"):
        payload = dict(payload)
        payload["key"] = payload.get("key") or _key
        if not _normalize_text(payload.get("title")):
            continue
        candidate_payloads.append(payload)
        author_keys.update(_extract_author_keys(payload))
        if len(candidate_payloads) >= slack_limit:
            break

    author_names = _collect_author_names(authors_dump_path, author_keys)
    edition_enrichment = _collect_edition_enrichment(
        editions_dump_path,
        {payload["key"] for payload in candidate_payloads},
    )

    records: list[dict[str, Any]] = []
    seen: set[str] = set()
    for payload in candidate_payloads:
        record = _finalize_record(
            payload,
            author_names=author_names,
            edition_enrichment=edition_enrichment,
        )
        if record is None:
            continue
        dedupe_key = f"{_normalize_key(record['title'])}|{_normalize_key(record['author'] or '')}"
        if dedupe_key in seen:
            continue
        seen.add(dedupe_key)
        records.append(record)
        if len(records) >= limit:
            break
    return records


def build_snapshot_file(
    *,
    works_dump_path: Path | None,
    authors_dump_path: Path | None,
    editions_dump_path: Path | None,
    source_dir: Path | None,
    output_path: Path,
    limit: int | None = 100_000,
) -> SnapshotBuildStats:
    if source_dir is not None:
        records = build_snapshot_records_from_source_dir(source_dir=source_dir, limit=limit)
    else:
        if works_dump_path is None:
            raise ValueError("works_dump_path is required when source_dir is not provided")
        records = build_snapshot_records(
            works_dump_path=works_dump_path,
            authors_dump_path=authors_dump_path,
            editions_dump_path=editions_dump_path,
            limit=limit,
        )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as fout:
        for record in records:
            fout.write(json.dumps(record, ensure_ascii=False) + "\n")

    category_counter = Counter(record["category"] for record in records if record["category"])
    tag_counter = Counter(tag for record in records for tag in record["tags"])
    return SnapshotBuildStats(
        total_records=len(records),
        unique_categories=len(category_counter),
        unique_tags=len(tag_counter),
    )
