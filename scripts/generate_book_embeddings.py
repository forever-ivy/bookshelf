from __future__ import annotations

import argparse

from sqlalchemy import func, select

from app.catalog.models import Book
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.recommendation.embeddings import build_book_embedding_text_from_model, build_embedding_provider


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate embeddings for books in the books table.")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of books to process in this run.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="How many books to send to the embeddings API per batch.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Regenerate embeddings even for books that already have one.",
    )
    parser.add_argument(
        "--book-id",
        type=int,
        default=None,
        help="Only generate an embedding for a single book id.",
    )
    return parser.parse_args()


def build_pending_books_query(*, force: bool, book_id: int | None):
    query = select(Book).order_by(Book.id.asc())
    if book_id is not None:
        return query.where(Book.id == book_id)
    if not force:
        query = query.where(Book.embedding.is_(None))
    return query


def count_books(session, *, force: bool, book_id: int | None) -> int:
    query = select(func.count()).select_from(Book)
    if book_id is not None:
        query = query.where(Book.id == book_id)
    elif not force:
        query = query.where(Book.embedding.is_(None))
    return int(session.execute(query).scalar_one())


def fetch_batch(session, *, force: bool, book_id: int | None, batch_size: int) -> list[Book]:
    query = build_pending_books_query(force=force, book_id=book_id).limit(batch_size)
    return list(session.execute(query).scalars().all())


def main() -> None:
    args = parse_args()
    settings = get_settings()
    init_engine(settings)
    session_factory = get_session_factory()
    provider = build_embedding_provider(settings)
    batch_size = args.batch_size or settings.embedding_batch_size
    if batch_size <= 0:
        raise ValueError("--batch-size must be greater than 0")

    with session_factory() as session:
        total = count_books(session, force=args.force, book_id=args.book_id)
        if args.limit is not None:
            total = min(total, args.limit)

        if total == 0:
            print("No books need embeddings.")
            return

        print(
            f"Starting embedding generation for {total} book(s). "
            f"model={settings.embedding_model}, batch_size={batch_size}"
        )

        processed = 0
        while processed < total:
            remaining = total - processed
            current_batch_size = min(batch_size, remaining)
            books = fetch_batch(
                session,
                force=args.force,
                book_id=args.book_id,
                batch_size=current_batch_size,
            )
            if not books:
                break

            texts = [build_book_embedding_text_from_model(book) for book in books]
            embeddings = provider.embed_texts(texts)

            for book, embedding in zip(books, embeddings, strict=True):
                book.embedding = embedding

            session.commit()
            processed += len(books)
            print(f"Processed {processed}/{total} books. last_book_id={books[-1].id}")

        print("Embedding generation finished.")


if __name__ == "__main__":
    main()
