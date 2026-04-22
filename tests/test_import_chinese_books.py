from __future__ import annotations

from pathlib import Path

from scripts import import_chinese_books as import_script


def test_load_tabular_data_supports_douban_csv_schema(tmp_path: Path):
    csv_path = tmp_path / "books.csv"
    csv_path.write_text(
        "\n".join(
            [
                "书名,作者,出版社,豆瓣成员常用的标签,内容简介,评分,ISBN号,定价,5条热门短评,出版时间,标签",
                "许三观卖血记,余华,作家出版社,余华 人性 中国文学 小说,一部关于活着的小说,9,9.78751E+12,24,[],2005/4/1,小说",
                "许三观卖血记,余华,作家出版社,余华 人性 中国文学 小说,重复记录,9,9.78751E+12,24,[],2005/4/1,小说",
                "三体全集,刘慈欣,重庆出版社,刘慈欣 科幻 三体 科幻小说,文明与宇宙的故事,9.4,9787536692930,168,[],2012/5/1,科幻",
            ]
        ),
        encoding="utf-8",
    )

    loaded = import_script.load_tabular_data(csv_path)

    assert list(loaded.columns) == [
        "title",
        "author",
        "category",
        "keywords",
        "summary",
        "isbn",
        "search_text",
        "first_publish_year",
    ]
    assert loaded.to_dict(orient="records") == [
        {
            "title": "许三观卖血记",
            "author": "余华",
            "category": "小说",
            "keywords": "余华,人性,中国文学,小说",
            "summary": "一部关于活着的小说",
            "isbn": "9.78751E+12",
            "search_text": "许三观卖血记 余华 小说 余华,人性,中国文学,小说 一部关于活着的小说",
            "first_publish_year": 2005,
        },
        {
            "title": "三体全集",
            "author": "刘慈欣",
            "category": "科幻",
            "keywords": "刘慈欣,科幻,三体,科幻小说",
            "summary": "文明与宇宙的故事",
            "isbn": "9787536692930",
            "search_text": "三体全集 刘慈欣 科幻 刘慈欣,科幻,三体,科幻小说 文明与宇宙的故事",
            "first_publish_year": 2012,
        },
    ]


def test_replace_existing_books_truncates_books_with_restart_identity_and_cascade():
    calls: list[str] = []

    class FakeCursor:
        def execute(self, sql: str) -> None:
            calls.append(sql.strip())

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeConnection:
        def cursor(self):
            return FakeCursor()

    import_script.replace_existing_books(FakeConnection())

    assert calls == ["TRUNCATE TABLE books RESTART IDENTITY CASCADE"]
