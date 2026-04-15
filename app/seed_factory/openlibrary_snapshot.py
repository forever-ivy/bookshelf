from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
import gzip
import json
from pathlib import Path
import re
from typing import Any


MAX_TAGS_PER_BOOK = 12
OPENLIBRARY_COVER_TEMPLATE = "https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


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
    if isinstance(value, dict):
        value = value.get("value") or value.get("name") or ""
    text = str(value).strip()
    text = re.sub(r"\s+", " ", text)
    return text


def _normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


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
    author = "; ".join(resolved_authors[:5])[:255] or None
    subjects = _extract_subjects(payload.get("subjects"))
    category = subjects[0] if subjects else None
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
    works_dump_path: Path,
    authors_dump_path: Path | None,
    editions_dump_path: Path | None,
    output_path: Path,
    limit: int = 100_000,
) -> SnapshotBuildStats:
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
