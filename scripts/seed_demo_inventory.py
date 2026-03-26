from __future__ import annotations

import argparse

from sqlalchemy import select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.inventory.models import BookCopy, CabinetSlot, InventoryEvent
from app.inventory.service import adjust_stock_counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed demo inventory copies and slots for existing books.")
    parser.add_argument("--cabinet-id", default=None, help="Target cabinet id. Defaults to configured cabinet.")
    parser.add_argument("--limit", type=int, default=20, help="How many books to seed into inventory.")
    parser.add_argument(
        "--start-book-id",
        type=int,
        default=1,
        help="Start selecting books from this book id.",
    )
    parser.add_argument(
        "--slot-prefix",
        default="A",
        help="Slot code prefix to use, for example A or B.",
    )
    return parser.parse_args()


def ensure_slots(session, *, cabinet_id: str, slot_prefix: str, required: int) -> list[CabinetSlot]:
    existing = list(
        session.execute(
            select(CabinetSlot)
            .where(CabinetSlot.cabinet_id == cabinet_id)
            .order_by(CabinetSlot.slot_code.asc())
        ).scalars()
    )
    existing_codes = {slot.slot_code for slot in existing}

    for index in range(1, required + 1):
        slot_code = f"{slot_prefix}{index:02d}"
        if slot_code in existing_codes:
            continue
        slot = CabinetSlot(
            cabinet_id=cabinet_id,
            slot_code=slot_code,
            status="empty",
            current_copy_id=None,
        )
        session.add(slot)
        existing.append(slot)

    session.flush()
    existing.sort(key=lambda item: item.slot_code)
    return existing


def main() -> None:
    args = parse_args()
    if args.limit <= 0:
        raise ValueError("--limit must be greater than 0")

    settings = get_settings()
    init_engine(settings)
    session_factory = get_session_factory()
    cabinet_id = args.cabinet_id or settings.cabinet_id

    with session_factory() as session:
        books = list(
            session.execute(
                select(Book)
                .where(Book.id >= args.start_book_id)
                .order_by(Book.id.asc())
                .limit(args.limit)
            ).scalars()
        )
        if not books:
            raise RuntimeError("No books found for demo inventory seeding.")

        slots = ensure_slots(
            session,
            cabinet_id=cabinet_id,
            slot_prefix=args.slot_prefix,
            required=len(books),
        )

        created_copies = 0
        occupied_slots = 0
        seeded_books: list[dict] = []

        for slot, book in zip(slots, books, strict=False):
            if slot.current_copy_id is not None or slot.status == "occupied":
                continue

            copy = BookCopy(
                book_id=book.id,
                cabinet_id=cabinet_id,
                inventory_status="stored",
            )
            session.add(copy)
            session.flush()

            slot.status = "occupied"
            slot.current_copy_id = copy.id
            adjust_stock_counts(
                session,
                book_id=book.id,
                cabinet_id=cabinet_id,
                total_delta=1,
                available_delta=1,
            )
            session.add(
                InventoryEvent(
                    cabinet_id=cabinet_id,
                    event_type="demo_inventory_seeded",
                    slot_code=slot.slot_code,
                    book_id=book.id,
                    copy_id=copy.id,
                    payload_json={"title": book.title},
                )
            )
            created_copies += 1
            occupied_slots += 1
            seeded_books.append(
                {
                    "book_id": book.id,
                    "title": book.title,
                    "slot_code": slot.slot_code,
                    "copy_id": copy.id,
                }
            )

        session.commit()

    print("Demo inventory seeded successfully.")
    print(f"Cabinet: {cabinet_id}")
    print(f"Requested books: {len(books)}")
    print(f"Created copies: {created_copies}")
    print(f"Occupied slots in this run: {occupied_slots}")
    print("Seeded books:")
    for item in seeded_books[:10]:
        print(f"  - book_id={item['book_id']} slot={item['slot_code']} title={item['title']}")


if __name__ == "__main__":
    main()
