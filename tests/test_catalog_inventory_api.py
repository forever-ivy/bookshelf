from __future__ import annotations

from sqlalchemy import event
from sqlalchemy import select


def seed_catalog_data(app):
    from app.core.database import get_session_factory
    from app.catalog.models import Book, BookCategory
    from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent

    session_factory = get_session_factory()
    session = session_factory()
    try:
        fiction_category = BookCategory(code="fiction", name="科幻文学", description="科幻题材图书")
        science_category = BookCategory(code="science", name="物理学", description="自然科学图书")
        session.add_all([fiction_category, science_category])
        session.flush()
        dune = Book(
            title="Dune",
            author="Frank Herbert",
            category_id=fiction_category.id,
            category=fiction_category.name,
            keywords="desert,politics,spice",
            summary="A desert planet epic.",
        )
        principia = Book(
            title="Principia",
            author="Isaac Newton",
            category_id=science_category.id,
            category=science_category.name,
            keywords="physics,math,gravity",
            summary="Foundations of mechanics.",
        )
        cabinet = session.get(Cabinet, "cabinet-001")
        assert cabinet is not None
        session.add_all([dune, principia])
        session.flush()
        dune_copy = BookCopy(book_id=dune.id, inventory_status="stored")
        session.add(dune_copy)
        session.flush()

        occupied_slot = CabinetSlot(cabinet_id="cabinet-001", slot_code="A01", status="occupied")
        empty_slot = CabinetSlot(cabinet_id="cabinet-001", slot_code="A02", status="empty")
        session.add_all(
            [
                BookStock(book_id=dune.id, cabinet_id="cabinet-001", total_copies=2, available_copies=1, reserved_copies=0),
                BookStock(book_id=principia.id, cabinet_id="cabinet-001", total_copies=0, available_copies=0, reserved_copies=0),
                occupied_slot,
                empty_slot,
                InventoryEvent(cabinet_id="cabinet-001", event_type="book_scanned", slot_code="A01"),
            ]
        )
        session.flush()
        dune_copy.current_slot_id = occupied_slot.id
        session.commit()
        return {"dune_id": dune.id, "principia_id": principia.id}
    finally:
        session.close()


def seed_many_safety_books(app, count: int) -> list[int]:
    from app.core.database import get_session_factory
    from app.catalog.models import Book, BookCategory

    session_factory = get_session_factory()
    session = session_factory()
    try:
        safety_category = BookCategory(code="safety", name="环境科学、安全科学", description="安全相关图书")
        session.add(safety_category)
        session.flush()
        books = [
            Book(
                title=f"安全工程案例 {index:04d}",
                author=f"作者 {index:04d}",
                category_id=safety_category.id,
                category=safety_category.name,
                keywords="安全,工程,治理",
                summary="用于验证宽词搜索分页和大批量 payload 构建。",
            )
            for index in range(count)
        ]
        session.add_all(books)
        session.commit()
        return [book.id for book in books]
    finally:
        session.close()


def seed_catalog_ranking_books(app) -> dict[str, int]:
    from app.core.database import get_session_factory
    from app.catalog.models import Book, BookCategory

    session_factory = get_session_factory()
    session = session_factory()
    try:
        safety_category = BookCategory(code="safety-rank", name="环境科学、安全科学", description="安全相关图书")
        session.add(safety_category)
        session.flush()
        exact_match = Book(
            title="安全",
            author="丁学贤",
            category_id=safety_category.id,
            category=safety_category.name,
            keywords="环境,治理",
            summary="安全学基础教材。",
        )
        title_match = Book(
            title="安全工程案例",
            author="王岭",
            category_id=safety_category.id,
            category=safety_category.name,
            keywords="工程,治理",
            summary="案例分析。",
        )
        summary_match = Book(
            title="地球社区可持续生活实用指南",
            author="英若",
            category_id=safety_category.id,
            category="可持续发展",
            keywords="社区,生活",
            summary="从环境安全与社区治理角度介绍日常实践。",
        )
        session.add_all([exact_match, title_match, summary_match])
        session.commit()
        return {
            "exact_match_id": exact_match.id,
            "summary_match_id": summary_match.id,
            "title_match_id": title_match.id,
        }
    finally:
        session.close()


def test_books_endpoint_returns_stock_and_delivery_fields(client, app):
    ids = seed_catalog_data(app)

    response = client.get("/api/v1/catalog/books")

    assert response.status_code == 200
    books = response.json()["items"]
    dune = next(item for item in books if item["id"] == ids["dune_id"])
    principia = next(item for item in books if item["id"] == ids["principia_id"])

    assert dune["total_copies"] == 2
    assert dune["available_copies"] == 1
    assert dune["delivery_available"] is True
    assert dune["stock_status"] == "available"
    assert dune["storage_slots"] == ["A01"]
    assert principia["total_copies"] == 0
    assert principia["delivery_available"] is False
    assert principia["stock_status"] == "out_of_stock"


def test_books_endpoint_searches_title_author_category_and_keywords(client, app):
    ids = seed_catalog_data(app)

    response = client.get("/api/v1/catalog/books", params={"query": "gravity"})

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [ids["principia_id"]]


def test_books_endpoint_supports_exact_category_filtering(client, app):
    ids = seed_catalog_data(app)

    response = client.get("/api/v1/catalog/books", params={"category": "科幻文学"})

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [ids["dune_id"]]


def test_books_endpoint_exposes_official_category_without_classification_code(client, app):
    ids = seed_catalog_data(app)

    response = client.get("/api/v1/catalog/books", params={"query": "物理学"})

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [ids["principia_id"]]
    assert items[0]["category"] == "物理学"
    assert "classification_code" not in items[0]


def test_categories_endpoint_lists_active_reader_categories_without_admin_fields(client, app):
    from app.catalog.models import Book, BookCategory
    from app.core.database import get_session_factory

    session = get_session_factory()()
    try:
        active_category = BookCategory(code="ai", name="人工智能", description="AI 相关图书", status="active")
        disabled_category = BookCategory(code="legacy", name="旧分类", description="不再对读者展示", status="disabled")
        empty_category = BookCategory(code="empty", name="空分类", description="没有图书", status="active")
        session.add_all([active_category, disabled_category, empty_category])
        session.flush()
        session.add_all(
            [
                Book(
                    title="机器学习导论",
                    author="周志华",
                    category_id=active_category.id,
                    category=active_category.name,
                    keywords="machine learning,ai",
                    summary="适合课程导读。",
                ),
                Book(
                    title="旧系统维护手册",
                    author="历史作者",
                    category_id=disabled_category.id,
                    category=disabled_category.name,
                    keywords="legacy",
                    summary="用于验证禁用分类不会对读者暴露。",
                ),
            ]
        )
        session.commit()
    finally:
        session.close()

    response = client.get("/api/v1/catalog/categories")

    assert response.status_code == 200
    payload = response.json()
    names = [item["name"] for item in payload["items"]]
    assert "人工智能" in names
    assert "旧分类" not in names
    assert "空分类" not in names
    assert "code" not in payload["items"][0]
    assert payload["total"] == 1


def test_book_detail_uses_inventory_projection_without_exposing_cabinet_semantics(client, app):
    ids = seed_catalog_data(app)

    response = client.get(f"/api/v1/catalog/books/{ids['dune_id']}")

    assert response.status_code == 200
    book = response.json()
    assert book["title"] == "Dune"
    assert "cabinet_id" not in book
    assert book["storage_slots"] == ["A01"]
    assert book["delivery_available"] is True


def test_inventory_status_lists_slots_and_events(client, app):
    seed_catalog_data(app)

    response = client.get("/api/v1/inventory/status")

    assert response.status_code == 200
    payload = response.json()
    assert payload["occupied_slots"] == 1
    assert payload["free_slots"] == 1
    assert payload["slots"][0]["slot_code"] == "A01"
    assert "cabinet_id" not in payload["slots"][0]
    assert payload["events"][0]["event_type"] == "book_scanned"


def test_inventory_events_total_is_not_just_page_size(client, app):
    seed_catalog_data(app)
    from app.core.database import get_session_factory
    from app.inventory.models import InventoryEvent

    session = get_session_factory()()
    try:
        session.add_all(
            [
                InventoryEvent(cabinet_id="cabinet-001", event_type="slot_opened", slot_code="A02"),
                InventoryEvent(cabinet_id="cabinet-001", event_type="slot_closed", slot_code="A02"),
            ]
        )
        session.commit()
    finally:
        session.close()

    response = client.get("/api/v1/inventory/events", params={"limit": 1})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total"] == 3
    assert len(payload["items"]) == 1


def test_books_list_avoids_n_plus_one_queries(client, app):
    seed_catalog_data(app)
    from app.core.database import get_engine

    statements: list[str] = []

    def before_cursor_execute(_conn, _cursor, statement, _params, _context, _many):
        if not statement.lstrip().upper().startswith("PRAGMA"):
            statements.append(statement)

    engine = get_engine()
    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        response = client.get("/api/v1/catalog/books")
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)

    assert response.status_code == 200
    assert len(statements) <= 4


def test_explicit_books_search_is_paginated_for_broad_queries(client, app):
    seed_many_safety_books(app, 35)

    response = client.get("/api/v1/catalog/books/search", params={"query": "安全"})

    assert response.status_code == 200
    payload = response.json()

    assert payload["query"] == "安全"
    assert payload["limit"] == 20
    assert payload["offset"] == 0
    assert payload["total"] == 35
    assert payload["has_more"] is True
    assert len(payload["items"]) == 20

    next_page = client.get(
        "/api/v1/catalog/books/search",
        params={"query": "安全", "limit": 20, "offset": 20},
    )

    assert next_page.status_code == 200
    next_payload = next_page.json()
    assert next_payload["total"] == 35
    assert next_payload["has_more"] is False
    assert len(next_payload["items"]) == 15


def test_explicit_books_search_respects_category_filter(client, app):
    ids = seed_catalog_data(app)

    response = client.get(
        "/api/v1/catalog/books/search",
        params={"query": "physics", "category": "科幻文学"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["items"] == []
    assert payload["total"] == 0


def test_explicit_books_search_ranks_title_matches_ahead_of_summary_only_matches(client, app):
    ids = seed_catalog_ranking_books(app)

    response = client.get("/api/v1/catalog/books/search", params={"query": "安全"})

    assert response.status_code == 200
    payload = response.json()
    ranked_ids = [item["id"] for item in payload["items"][:3]]

    assert ranked_ids[:2] == [ids["exact_match_id"], ids["title_match_id"]]
    assert ranked_ids[2] == ids["summary_match_id"]


def test_build_book_payloads_chunks_large_book_id_batches(client, app):
    seed_many_safety_books(app, 1001)
    from app.catalog.models import Book
    from app.catalog.service import build_book_payloads
    from app.core.database import get_engine, get_session_factory

    session = get_session_factory()()
    stock_queries: list[str] = []
    slot_queries: list[str] = []

    def before_cursor_execute(_conn, _cursor, statement, _params, _context, _many):
        normalized = statement.lower()
        if "from book_stock" in normalized:
            stock_queries.append(statement)
        if "from cabinet_slots" in normalized:
            slot_queries.append(statement)

    engine = get_engine()
    event.listen(engine, "before_cursor_execute", before_cursor_execute)
    try:
        books = session.scalars(select(Book).order_by(Book.id.asc())).all()
        payloads = build_book_payloads(session, books)
    finally:
        event.remove(engine, "before_cursor_execute", before_cursor_execute)
        session.close()

    assert len(payloads) == 1001
    assert len(stock_queries) == 3
    assert len(slot_queries) == 3
