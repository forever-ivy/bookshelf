from __future__ import annotations

import gzip
import json
from pathlib import Path

from app.seed_factory.openlibrary_snapshot import build_snapshot_records


def _write_dump(path: Path, record_type: str, rows: list[tuple[str, dict]]) -> None:
    with gzip.open(path, "wt", encoding="utf-8") as fout:
        for key, payload in rows:
            fout.write(f"{record_type}\t{key}\t1\t2026-04-15T00:00:00.000000\t{json.dumps(payload, ensure_ascii=False)}\n")


def test_build_snapshot_records_enriches_authors_editions_and_tags(tmp_path: Path) -> None:
    works_dump = tmp_path / "works.txt.gz"
    authors_dump = tmp_path / "authors.txt.gz"
    editions_dump = tmp_path / "editions.txt.gz"

    _write_dump(
        works_dump,
        "/type/work",
        [
            (
                "/works/OL1W",
                {
                    "key": "/works/OL1W",
                    "title": "Distributed Systems Patterns",
                    "description": {"value": "Reliable distributed systems at scale."},
                    "subjects": ["Distributed systems", "Cloud computing", "Reliability engineering"],
                    "authors": [{"author": {"key": "/authors/OL1A"}}],
                    "covers": [12345],
                    "first_publish_date": "2018",
                },
            )
        ],
    )
    _write_dump(
        authors_dump,
        "/type/author",
        [
            (
                "/authors/OL1A",
                {
                    "key": "/authors/OL1A",
                    "name": "Ada Lovelace",
                },
            )
        ],
    )
    _write_dump(
        editions_dump,
        "/type/edition",
        [
            (
                "/books/OL1M",
                {
                    "key": "/books/OL1M",
                    "isbn_13": ["9787111544937"],
                    "works": [{"key": "/works/OL1W"}],
                    "covers": [998877],
                },
            )
        ],
    )

    records = build_snapshot_records(
        works_dump_path=works_dump,
        authors_dump_path=authors_dump,
        editions_dump_path=editions_dump,
        limit=10,
    )

    assert len(records) == 1
    record = records[0]
    assert record["title"] == "Distributed Systems Patterns"
    assert record["author"] == "Ada Lovelace"
    assert record["isbn"] == "9787111544937"
    assert record["cover_url"].endswith("/b/id/998877-L.jpg")
    assert record["category"] == "Distributed systems"
    assert record["tags"][:3] == ["Distributed systems", "Cloud computing", "Reliability engineering"]
    assert "Reliable distributed systems at scale." in record["search_text"]


def test_build_snapshot_records_deduplicates_and_falls_back_for_sparse_records(tmp_path: Path) -> None:
    works_dump = tmp_path / "works.txt.gz"
    _write_dump(
        works_dump,
        "/type/work",
        [
            (
                "/works/OL1W",
                {
                    "key": "/works/OL1W",
                    "title": "Noisy Data Pipelines",
                    "subjects": ["Data Engineering", "Data Engineering", ""],
                    "description": "A practical field guide.",
                },
            ),
            (
                "/works/OL2W",
                {
                    "key": "/works/OL2W",
                    "title": "Noisy Data Pipelines",
                    "subjects": ["Data Engineering"],
                },
            ),
        ],
    )

    records = build_snapshot_records(
        works_dump_path=works_dump,
        authors_dump_path=None,
        editions_dump_path=None,
        limit=10,
    )

    assert len(records) == 1
    record = records[0]
    assert record["title"] == "Noisy Data Pipelines"
    assert record["author"] is None
    assert record["category"] == "Data Engineering"
    assert record["tags"] == ["Data Engineering"]
    assert record["summary"] == "A practical field guide."
