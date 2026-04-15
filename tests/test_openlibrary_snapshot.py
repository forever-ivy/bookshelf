from __future__ import annotations

import gzip
import json
from pathlib import Path

import pandas as pd

from app.seed_factory.openlibrary_snapshot import build_snapshot_records, build_snapshot_records_from_source_dir


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


def test_build_snapshot_records_from_source_dir_merges_local_book_sources(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    source_dir.mkdir()

    pd.DataFrame(
        [
            {
                "title": "Algorithms Unlocked",
                "author": "Thomas Cormen",
                "category": "Computer Science",
                "keywords": "algorithms, complexity",
                "summary": "A gentle introduction to algorithms.",
            }
        ]
    ).to_csv(source_dir / "books_openlibrary_sample.csv", index=False)

    pd.DataFrame(
        [
            {
                "书名": "活着",
                "作者": "余华",
                "出版社": "作家出版社",
                "关键词": "中国文学 命运 家庭",
                "摘要": "中文摘要版本。",
                "中国图书分类号": "I247.57",
                "出版年月": "2012-01",
            }
        ]
    ).to_excel(source_dir / "中文图书数据集关键词分词.xlsx", index=False)

    pd.DataFrame(
        [
            {
                "书名": "Algorithms Unlocked",
                "分类号": "TP301",
                "出版社": "MIT Press",
                "作者": "Thomas Cormen",
                "出版年": "2013",
            }
        ]
    ).to_excel(source_dir / "外文图书分类数据集.xlsx", index=False)

    pd.DataFrame(
        [
            {
                "书名": "活着",
                "作者": "余华",
                "出版社": "作家出版社",
                "豆瓣成员常用的标签": "文学 中国文学 经典",
                "内容简介": "豆瓣简介补充得更完整。",
                "评分": 9.4,
                "ISBN号": "9787506365437",
                "定价": "39.00",
                "5条热门短评": "很好看",
                "出版时间": "2012-08",
                "标签": "小说,经典",
            }
        ]
    ).to_excel(source_dir / "豆瓣书籍汇总.xlsx", index=False)

    records = build_snapshot_records_from_source_dir(source_dir=source_dir, limit=10)

    assert len(records) == 2
    by_title = {record["title"]: record for record in records}

    assert by_title["活着"]["author"] == "余华"
    assert by_title["活着"]["category"] == "I247.57"
    assert by_title["活着"]["isbn"] == "9787506365437"
    assert "文学" in by_title["活着"]["tags"]
    assert by_title["活着"]["summary"] == "豆瓣简介补充得更完整。"

    assert by_title["Algorithms Unlocked"]["author"] == "Thomas Cormen"
    assert by_title["Algorithms Unlocked"]["category"] == "Computer Science"
    assert "complexity" in by_title["Algorithms Unlocked"]["search_text"]
