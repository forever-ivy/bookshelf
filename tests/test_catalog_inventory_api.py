from __future__ import annotations

from sqlalchemy import event


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
        dune_copy = BookCopy(book_id=dune.id, cabinet_id=cabinet.id, inventory_status="stored")
        session.add(dune_copy)
        session.flush()

        session.add_all(
            [
                BookStock(book_id=dune.id, cabinet_id="cabinet-001", total_copies=2, available_copies=1, reserved_copies=0),
                BookStock(book_id=principia.id, cabinet_id="cabinet-001", total_copies=0, available_copies=0, reserved_copies=0),
                CabinetSlot(cabinet_id="cabinet-001", slot_code="A01", status="occupied", current_copy_id=dune_copy.id),
                CabinetSlot(cabinet_id="cabinet-001", slot_code="A02", status="empty", current_copy_id=None),
                InventoryEvent(cabinet_id="cabinet-001", event_type="book_scanned", slot_code="A01"),
            ]
        )
        session.commit()
        return {"dune_id": dune.id, "principia_id": principia.id}
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


def test_books_endpoint_exposes_official_category_without_classification_code(client, app):
    ids = seed_catalog_data(app)

    response = client.get("/api/v1/catalog/books", params={"query": "物理学"})

    assert response.status_code == 200
    items = response.json()["items"]
    assert [item["id"] for item in items] == [ids["principia_id"]]
    assert items[0]["category"] == "物理学"
    assert "classification_code" not in items[0]


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
    assert len(statements) <= 3
