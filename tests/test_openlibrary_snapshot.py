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
    assert by_title["活着"]["category"] == "文学"
    assert by_title["活着"]["isbn"] == "9787506365437"
    assert "文学" in by_title["活着"]["tags"]
    assert by_title["活着"]["summary"] == "豆瓣简介补充得更完整。"

    assert by_title["Algorithms Unlocked"]["author"] == "Thomas Cormen"
    assert by_title["Algorithms Unlocked"]["category"] == "Computer Science"
    assert "complexity" in by_title["Algorithms Unlocked"]["search_text"]


def test_build_snapshot_records_from_source_dir_filters_noisy_catalog_rows(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    source_dir.mkdir()

    pd.DataFrame(
        [
            {
                "title": "'Aqā'id al-salaf",
                "author": "/authors/OL4557427A",
                "category": "nan",
                "keywords": "nan",
                "summary": "nan",
            },
            {
                "title": "图书馆空间设计",
                "author": "王敏",
                "category": "TP301",
                "keywords": "空间设计, 图书馆",
                "summary": "面向现代图书馆的空间设计案例。",
            },
            {
                "title": "临床诊疗手册",
                "author": "李明",
                "category": "R4-54/1=43;R322-64",
                "keywords": "临床, 诊疗",
                "summary": "面向临床一线的诊疗指导。",
            },
            {
                "title": "世界名著精选",
                "author": "张华",
                "category": "H319.4;I",
                "keywords": "英文, 文学",
                "summary": "经典文学英文导读。",
            },
            {
                "title": "程序设计教程",
                "author": "赵峰",
                "category": "TP3;TP312;C++",
                "keywords": "程序设计, C++",
                "summary": "面向程序设计入门的基础教材。",
            },
        ]
    ).to_csv(source_dir / "books_openlibrary_sample.csv", index=False)

    records = build_snapshot_records_from_source_dir(source_dir=source_dir, limit=10)

    assert len(records) == 4
    by_title = {record["title"]: record for record in records}

    assert by_title["图书馆空间设计"]["author"] == "王敏"
    assert by_title["图书馆空间设计"]["category"] == "工业技术"
    assert "图书馆" in by_title["图书馆空间设计"]["tags"]
    assert by_title["临床诊疗手册"]["category"] == "医药卫生"
    assert by_title["世界名著精选"]["category"] == "语言文字"
    assert by_title["程序设计教程"]["category"] == "工业技术"


def test_build_snapshot_records_from_source_dir_drops_titles_starting_with_quotes_even_with_real_authors(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    source_dir.mkdir()

    pd.DataFrame(
        [
            {
                "title": "'Salem's lot /",
                "author": "Uelsmann, Jerry N.",
                "category": "文学",
                "keywords": "文学, 小说",
                "summary": "保留给测试的脏标题。",
            },
            {
                "title": "百年孤独",
                "author": "加西亚·马尔克斯",
                "category": "文学",
                "keywords": "文学, 小说",
                "summary": "正常书目。",
            },
        ]
    ).to_csv(source_dir / "books_openlibrary_sample.csv", index=False)

    records = build_snapshot_records_from_source_dir(source_dir=source_dir, limit=10)

    assert len(records) == 1
    assert records[0]["title"] == "百年孤独"


def test_build_snapshot_records_from_source_dir_drops_author_placeholder_lists(tmp_path: Path) -> None:
    source_dir = tmp_path / "source"
    source_dir.mkdir()

    pd.DataFrame(
        [
            {
                "title": "Meet zero",
                "author": "/authors/OL4423605A; /authors/OL220769A; /authors/OL2623136A",
                "category": "综合参考",
                "keywords": "数学, 科普",
                "summary": "来源含占位作者的脏记录。",
            },
            {
                "title": "数学之美",
                "author": "吴军",
                "category": "T",
                "keywords": "数学, 计算机",
                "summary": "正常记录。",
            },
        ]
    ).to_csv(source_dir / "books_openlibrary_sample.csv", index=False)

    records = build_snapshot_records_from_source_dir(source_dir=source_dir, limit=10)

    assert len(records) == 1
    assert records[0]["title"] == "数学之美"
