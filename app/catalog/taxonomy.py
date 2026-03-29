from __future__ import annotations

import re

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.catalog.models import Book, BookCategory


CLASSIFICATION_CATEGORY_DEFINITIONS: dict[str, tuple[str, str]] = {
    "A": ("clc-a", "马克思主义、列宁主义、毛泽东思想、邓小平理论"),
    "B": ("clc-b", "哲学、宗教"),
    "C": ("clc-c", "社会科学总论"),
    "D": ("clc-d", "政治、法律"),
    "E": ("clc-e", "军事"),
    "F": ("clc-f", "经济"),
    "G": ("clc-g", "文化、科学、教育、体育"),
    "H": ("clc-h", "语言、文字"),
    "I": ("clc-i", "文学"),
    "J": ("clc-j", "艺术"),
    "K": ("clc-k", "历史、地理"),
    "N": ("clc-n", "自然科学总论"),
    "O": ("clc-o", "数理科学和化学"),
    "P": ("clc-p", "天文学、地球科学"),
    "Q": ("clc-q", "生物科学"),
    "R": ("clc-r", "医药、卫生"),
    "S": ("clc-s", "农业科学"),
    "T": ("clc-t", "工业技术"),
    "U": ("clc-u", "交通运输"),
    "V": ("clc-v", "航空、航天"),
    "X": ("clc-x", "环境科学、安全科学"),
    "Z": ("clc-z", "综合性图书"),
}

CLASSIFICATION_ROOT_PATTERN = re.compile(r"([A-Z])")


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def extract_classification_root(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    if cleaned is None:
        return None
    match = CLASSIFICATION_ROOT_PATTERN.search(cleaned.upper())
    if match is None:
        return None
    root = match.group(1)
    return root if root in CLASSIFICATION_CATEGORY_DEFINITIONS else None


def resolve_legacy_category_payload(legacy_category: str | None) -> tuple[str, str] | None:
    root = extract_classification_root(legacy_category)
    if root is None:
        return None
    return CLASSIFICATION_CATEGORY_DEFINITIONS[root]


def ensure_book_category(session: Session, legacy_category: str | None) -> BookCategory | None:
    cleaned_category = _clean_text(legacy_category)
    if cleaned_category is None:
        return None

    category = session.scalar(select(BookCategory).where(BookCategory.name == cleaned_category))
    if category is not None:
        if category.status != "active":
            category.status = "active"
        return category

    payload = resolve_legacy_category_payload(cleaned_category)
    if payload is None:
        return None

    code, name = payload
    category = session.scalar(select(BookCategory).where(BookCategory.code == code))
    if category is not None:
        if category.name != name:
            category.name = name
        if category.status != "active":
            category.status = "active"
        return category

    category = session.scalar(select(BookCategory).where(BookCategory.name == name))
    if category is not None:
        if category.code != code:
            category.code = code
        if category.status != "active":
            category.status = "active"
        return category

    category = BookCategory(
        code=code,
        name=name,
        description=f"由中图法一级大类 {cleaned_category[:1].upper()} 自动映射生成。",
        status="active",
    )
    session.add(category)
    session.flush()
    return category


def backfill_book_taxonomy(session: Session) -> dict[str, int]:
    books = session.scalars(select(Book).order_by(Book.id.asc())).all()
    updated_books = 0

    for book in books:
        linked_category = session.get(BookCategory, book.category_id) if book.category_id is not None else None
        changed = False

        if linked_category is not None:
            if book.category != linked_category.name:
                book.category = linked_category.name
                changed = True
        else:
            category = ensure_book_category(session, book.category)
            if category is None:
                if book.category is not None:
                    book.category = None
                    changed = True
            else:
                if book.category_id != category.id:
                    book.category_id = category.id
                    changed = True
                if book.category != category.name:
                    book.category = category.name
                    changed = True

        if changed:
            updated_books += 1

    session.flush()
    return {
        "books_scanned": len(books),
        "books_updated": updated_books,
    }


def books_need_taxonomy_backfill(session: Session) -> bool:
    needs_backfill = session.scalar(
        select(func.count())
        .select_from(Book)
        .where(
            or_(
                Book.category_id.is_(None) & Book.category.is_not(None),
                Book.category_id.is_(None) & (Book.category != ""),
            )
        )
    )
    return bool(needs_backfill)
