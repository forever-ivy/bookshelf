from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime, timezone
import hashlib
from pathlib import Path
from typing import Any

from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.admin.models import (
    AdminPermission,
    AdminRole,
    AdminRoleAssignment,
    AdminRolePermission,
    AlertRecord,
    RecommendationPlacement,
    RecommendationStudioPublication,
    TopicBooklist,
    TopicBooklistItem,
)
from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book, BookCategory, BookSourceDocument, BookTag, BookTagLink
from app.catalog.service import build_book_payload, build_book_payloads
from app.core.config import get_settings
from app.core.errors import ApiError
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.inventory.service import adjust_stock_counts
from app.orders.models import BorrowOrder, DeliveryOrder
from app.readers.models import ReaderAccount, ReaderProfile
from app.recommendation.feed_contract import (
    build_recommendation_feed_payload,
    build_system_quick_actions,
    copy_default_explanation_card,
    copy_default_hot_lists,
    serialize_recommendation_feed_book,
    serialize_recommendation_feed_card,
)
from app.recommendation.models import RecommendationLog
from app.robot_sim.models import RobotUnit
from app.system.models import SystemSetting


DEFAULT_ADMIN_PERMISSIONS = [
    {"code": "dashboard.view", "name": "查看总览", "description": "查看总览大屏与关键运营指标"},
    {"code": "books.manage", "name": "管理图书", "description": "管理图书目录、分类、标签与上下架状态"},
    {"code": "inventory.manage", "name": "管理库存", "description": "处理库存校正、仓位与入出库记录"},
    {"code": "orders.manage", "name": "管理订单", "description": "处理借阅订单、归还流程与异常介入"},
    {"code": "robots.manage", "name": "管理机器人", "description": "查看机器人状态并重分配任务"},
    {"code": "readers.manage", "name": "管理用户", "description": "查看用户画像、限制与分群"},
    {"code": "recommendation.manage", "name": "管理推荐运营台", "description": "管理推荐草稿、发布版本与推荐预览"},
    {"code": "analytics.view", "name": "查看分析", "description": "查看借阅趋势与运营分析"},
    {"code": "alerts.manage", "name": "处理告警", "description": "确认和解决系统告警"},
    {"code": "system.audit.view", "name": "查看审计", "description": "查看管理后台审计日志"},
    {"code": "system.settings.manage", "name": "管理系统配置", "description": "更新系统配置与算法参数"},
    {"code": "system.roles.manage", "name": "管理角色权限", "description": "维护角色、权限和管理员分配"},
]


def _iso(value: Any) -> str | None:
    return value.isoformat() if value is not None else None


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _reader_last_active_at(session: Session, reader_id: int, *, fallback: datetime | None = None) -> str | None:
    timestamps = [
        _normalize_datetime(fallback),
        _normalize_datetime(
            session.execute(select(func.max(BorrowOrder.updated_at)).where(BorrowOrder.reader_id == reader_id)).scalar_one()
        ),
        _normalize_datetime(
            session.execute(select(func.max(SearchLog.created_at)).where(SearchLog.reader_id == reader_id)).scalar_one()
        ),
        _normalize_datetime(
            session.execute(
                select(func.max(RecommendationLog.created_at)).where(RecommendationLog.reader_id == reader_id)
            ).scalar_one()
        ),
        _normalize_datetime(
            session.execute(select(func.max(ReadingEvent.created_at)).where(ReadingEvent.reader_id == reader_id)).scalar_one()
        ),
    ]
    filtered = [value for value in timestamps if value is not None]
    return _iso(max(filtered)) if filtered else None


def _normalize_pagination(page: int, page_size: int) -> tuple[int, int]:
    normalized_page = max(page, 1)
    normalized_page_size = max(1, min(page_size, 100))
    return normalized_page, normalized_page_size


def _paginate(stmt, *, session: Session, page: int, page_size: int):
    normalized_page, normalized_page_size = _normalize_pagination(page, page_size)
    total = session.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = session.scalars(
        stmt.offset((normalized_page - 1) * normalized_page_size).limit(normalized_page_size)
    ).all()
    return items, {"total": int(total), "page": normalized_page, "page_size": normalized_page_size}


def _paginate_rows(stmt, *, session: Session, page: int, page_size: int):
    normalized_page, normalized_page_size = _normalize_pagination(page, page_size)
    total = session.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    rows = session.execute(
        stmt.offset((normalized_page - 1) * normalized_page_size).limit(normalized_page_size)
    ).all()
    return rows, {"total": int(total), "page": normalized_page, "page_size": normalized_page_size}


def _audit(
    session: Session,
    *,
    admin_id: int,
    target_type: str,
    target_ref: str,
    action: str,
    before_state: dict | None = None,
    after_state: dict | None = None,
    note: str | None = None,
) -> None:
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type=target_type,
            target_ref=target_ref,
            action=action,
            before_state=before_state,
            after_state=after_state,
            note=note,
        )
    )


def _ensure_default_permissions(session: Session) -> None:
    existing = {
        permission.code: permission
        for permission in session.scalars(select(AdminPermission).order_by(AdminPermission.id.asc())).all()
    }
    updated = False
    for payload in DEFAULT_ADMIN_PERMISSIONS:
        permission = existing.get(payload["code"])
        if permission is not None:
            if permission.name != payload["name"]:
                permission.name = payload["name"]
                updated = True
            if permission.description != payload["description"]:
                permission.description = payload["description"]
                updated = True
            continue
        session.add(
            AdminPermission(
                code=payload["code"],
                name=payload["name"],
                description=payload["description"],
            )
        )
        updated = True
    if updated:
        session.flush()


def _serialize_permission(permission: AdminPermission) -> dict:
    return {
        "id": permission.id,
        "code": permission.code,
        "name": permission.name,
        "description": permission.description,
        "created_at": _iso(permission.created_at),
    }


def _serialize_role(session: Session, role: AdminRole) -> dict:
    permission_codes = session.scalars(
        select(AdminPermission.code)
        .join(AdminRolePermission, AdminRolePermission.permission_id == AdminPermission.id)
        .where(AdminRolePermission.role_id == role.id)
        .order_by(AdminPermission.code.asc())
    ).all()
    assigned_admin_ids = session.scalars(
        select(AdminRoleAssignment.admin_id)
        .where(AdminRoleAssignment.role_id == role.id)
        .order_by(AdminRoleAssignment.admin_id.asc())
    ).all()
    return {
        "id": role.id,
        "code": role.code,
        "name": role.name,
        "description": role.description,
        "permission_codes": permission_codes,
        "assigned_admin_ids": assigned_admin_ids,
        "created_at": _iso(role.created_at),
        "updated_at": _iso(role.updated_at),
    }


def _serialize_admin_account(session: Session, account: AdminAccount) -> dict:
    role_codes = session.scalars(
        select(AdminRole.code)
        .join(AdminRoleAssignment, AdminRoleAssignment.role_id == AdminRole.id)
        .where(AdminRoleAssignment.admin_id == account.id)
        .order_by(AdminRole.code.asc())
    ).all()
    return {
        "id": account.id,
        "username": account.username,
        "role_codes": role_codes,
        "created_at": _iso(account.created_at),
        "updated_at": _iso(account.updated_at),
    }


def _serialize_category(category: BookCategory) -> dict:
    return {
        "id": category.id,
        "code": category.code,
        "name": category.name,
        "description": category.description,
        "status": category.status,
        "created_at": _iso(category.created_at),
        "updated_at": _iso(category.updated_at),
    }


def _serialize_tag(tag: BookTag) -> dict:
    return {
        "id": tag.id,
        "code": tag.code,
        "name": tag.name,
        "description": tag.description,
        "created_at": _iso(tag.created_at),
        "updated_at": _iso(tag.updated_at),
    }


def _serialize_book_source_document(document: BookSourceDocument) -> dict:
    return {
        "id": document.id,
        "bookId": document.book_id,
        "sourceKind": document.source_kind,
        "mimeType": document.mime_type,
        "fileName": document.file_name,
        "storagePath": document.storage_path,
        "extractedTextPath": document.extracted_text_path,
        "contentHash": document.content_hash,
        "parseStatus": document.parse_status,
        "isPrimary": bool(document.is_primary),
        "metadata": document.metadata_json or {},
        "createdAt": _iso(document.created_at),
        "updatedAt": _iso(document.updated_at),
    }


def _ensure_book_source_storage_dir(*, book_id: int) -> Path:
    root = Path(get_settings().book_source_storage_dir).expanduser()
    target = root / f"book_{book_id}"
    target.mkdir(parents=True, exist_ok=True)
    return target


def _extract_source_text_from_path(storage_path: Path) -> str:
    suffix = storage_path.suffix.lower()
    raw_bytes = storage_path.read_bytes()
    if suffix in {".md", ".markdown", ".txt"}:
        return raw_bytes.decode("utf-8")
    if suffix == ".pdf":
        from pypdf import PdfReader  # type: ignore

        reader = PdfReader(str(storage_path))
        page_texts = [(page.extract_text() or "").strip() for page in reader.pages]
        text = "\n\n".join(item for item in page_texts if item)
        if not text:
            raise ApiError(422, "book_source_parse_failed", "Could not extract text from PDF")
        return text
    raise ApiError(400, "unsupported_book_source_type", f"Unsupported file type: {suffix or 'unknown'}")


def _tags_for_book(session: Session, book_id: int) -> list[dict]:
    tags = session.scalars(
        select(BookTag)
        .join(BookTagLink, BookTagLink.tag_id == BookTag.id)
        .where(BookTagLink.book_id == book_id)
        .order_by(BookTag.name.asc(), BookTag.id.asc())
    ).all()
    return [_serialize_tag(tag) for tag in tags]


def _stock_summary(session: Session, book_id: int) -> dict:
    row = session.execute(
        select(
            func.coalesce(func.sum(BookStock.total_copies), 0),
            func.coalesce(func.sum(BookStock.available_copies), 0),
            func.coalesce(func.sum(BookStock.reserved_copies), 0),
        ).where(BookStock.book_id == book_id)
    ).one()
    return {
        "total_copies": int(row[0] or 0),
        "available_copies": int(row[1] or 0),
        "reserved_copies": int(row[2] or 0),
    }


def _copies_for_book(session: Session, book_id: int) -> list[dict]:
    rows = session.execute(
        select(BookCopy, Cabinet, CabinetSlot)
        .join(Cabinet, Cabinet.id == BookCopy.cabinet_id, isouter=True)
        .join(CabinetSlot, CabinetSlot.id == BookCopy.current_slot_id, isouter=True)
        .where(BookCopy.book_id == book_id)
        .order_by(Cabinet.id.asc(), CabinetSlot.slot_code.asc(), BookCopy.id.asc())
    ).all()
    return [
        {
            "id": copy.id,
            "cabinet_id": copy.cabinet_id,
            "cabinet_name": None if cabinet is None else cabinet.name,
            "cabinet_location": None if cabinet is None else cabinet.location,
            "slot_code": None if slot is None else slot.slot_code,
            "inventory_status": copy.inventory_status,
            "available_for_borrow": copy.inventory_status == "stored",
            "created_at": _iso(copy.created_at),
            "updated_at": _iso(copy.updated_at),
        }
        for copy, cabinet, slot in rows
    ]


def _effective_book_shelf_status(raw_shelf_status: str | None, *, total_copies: int) -> str:
    normalized_shelf_status = (raw_shelf_status or "").strip()
    return normalized_shelf_status or ("on_shelf" if total_copies > 0 else "draft")


def _book_total_copies_expr():
    return (
        select(func.coalesce(func.sum(BookStock.total_copies), 0))
        .where(BookStock.book_id == Book.id)
        .scalar_subquery()
    )


def serialize_book_admin(session: Session, book: Book) -> dict:
    payload = build_book_payload(session, book)
    category = session.get(BookCategory, book.category_id) if book.category_id is not None else None
    stock_summary = _stock_summary(session, book.id)
    copies = _copies_for_book(session, book.id)
    effective_shelf_status = _effective_book_shelf_status(book.shelf_status, total_copies=stock_summary["total_copies"])
    payload.update(
        {
            "category_id": book.category_id,
            "isbn": book.isbn,
            "barcode": book.barcode,
            "cover_url": book.cover_url,
            "shelf_status": effective_shelf_status,
            "created_at": _iso(book.created_at),
            "updated_at": _iso(book.updated_at),
            "category_detail": _serialize_category(category) if category is not None else None,
            "tags": _tags_for_book(session, book.id),
            "stock_summary": stock_summary,
            "copies": copies,
            "source_documents": [
                _serialize_book_source_document(item)
                for item in session.scalars(
                    select(BookSourceDocument)
                    .where(BookSourceDocument.book_id == book.id)
                    .order_by(BookSourceDocument.is_primary.desc(), BookSourceDocument.id.asc())
                ).all()
            ],
        }
    )
    return payload


def _require_category(session: Session, category_id: int | None) -> BookCategory | None:
    if category_id is None:
        return None
    category = session.get(BookCategory, category_id)
    if category is None:
        raise ApiError(404, "book_category_not_found", "Book category not found")
    return category


def _require_tags(session: Session, tag_ids: Iterable[int]) -> list[BookTag]:
    normalized_ids = [int(tag_id) for tag_id in tag_ids]
    if not normalized_ids:
        return []
    tags = session.scalars(select(BookTag).where(BookTag.id.in_(normalized_ids)).order_by(BookTag.id.asc())).all()
    if len(tags) != len(set(normalized_ids)):
        raise ApiError(404, "book_tag_not_found", "One or more book tags were not found")
    return tags


def _book_state(session: Session, book: Book) -> dict:
    return serialize_book_admin(session, book)


def _sync_book_tags(session: Session, *, book_id: int, tag_ids: Iterable[int]) -> None:
    target_ids = {int(tag_id) for tag_id in tag_ids}
    current_links = session.scalars(select(BookTagLink).where(BookTagLink.book_id == book_id)).all()
    current_ids = {link.tag_id for link in current_links}

    for link in current_links:
        if link.tag_id not in target_ids:
            session.delete(link)

    for tag_id in target_ids - current_ids:
        session.add(BookTagLink(book_id=book_id, tag_id=tag_id))


def list_admin_books(
    session: Session,
    *,
    query: str | None,
    page: int,
    page_size: int,
    shelf_status: str | None = None,
    category_id: int | None = None,
) -> dict:
    stmt = select(Book)
    clean_query = (query or "").strip().lower()
    if clean_query:
        pattern = f"%{clean_query}%"
        stmt = stmt.where(
            or_(
                func.lower(Book.title).like(pattern),
                func.lower(func.coalesce(Book.author, "")).like(pattern),
                func.lower(func.coalesce(Book.category, "")).like(pattern),
                func.lower(func.coalesce(Book.keywords, "")).like(pattern),
                func.lower(func.coalesce(Book.summary, "")).like(pattern),
                func.lower(func.coalesce(Book.isbn, "")).like(pattern),
                func.lower(func.coalesce(Book.barcode, "")).like(pattern),
            )
        )
        stmt = stmt.order_by(_admin_book_search_rank_expr(clean_query).desc(), Book.updated_at.desc(), Book.id.desc())
    else:
        stmt = stmt.order_by(Book.updated_at.desc(), Book.id.desc())
    if shelf_status:
        normalized_shelf_status = shelf_status.strip()
        blank_shelf_status_clause = func.nullif(func.trim(func.coalesce(Book.shelf_status, "")), "").is_(None)
        total_copies_expr = _book_total_copies_expr()
        if normalized_shelf_status == "on_shelf":
            stmt = stmt.where(
                or_(
                    Book.shelf_status == normalized_shelf_status,
                    blank_shelf_status_clause & (total_copies_expr > 0),
                )
            )
        elif normalized_shelf_status == "draft":
            stmt = stmt.where(
                or_(
                    Book.shelf_status == normalized_shelf_status,
                    blank_shelf_status_clause & (total_copies_expr <= 0),
                )
            )
        else:
            stmt = stmt.where(Book.shelf_status == normalized_shelf_status)
    if category_id is not None:
        stmt = stmt.where(Book.category_id == category_id)
    books, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [serialize_book_admin(session, book) for book in books]}


def _admin_book_search_rank_expr(clean_query: str):
    title = func.lower(func.coalesce(Book.title, ""))
    author = func.lower(func.coalesce(Book.author, ""))
    category = func.lower(func.coalesce(Book.category, ""))
    keywords = func.lower(func.coalesce(Book.keywords, ""))
    summary = func.lower(func.coalesce(Book.summary, ""))
    isbn = func.lower(func.coalesce(Book.isbn, ""))
    barcode = func.lower(func.coalesce(Book.barcode, ""))
    contains_pattern = f"%{clean_query}%"
    prefix_pattern = f"{clean_query}%"

    return (
        case((title == clean_query, 120), else_=0)
        + case((title.like(prefix_pattern), 80), else_=0)
        + case((title.like(contains_pattern), 50), else_=0)
        + case((keywords.like(contains_pattern), 30), else_=0)
        + case((category.like(contains_pattern), 20), else_=0)
        + case((author.like(contains_pattern), 18), else_=0)
        + case((isbn.like(contains_pattern), 12), else_=0)
        + case((barcode.like(contains_pattern), 12), else_=0)
        + case((summary.like(contains_pattern), 6), else_=0)
    )


def get_admin_book(session: Session, book_id: int) -> dict:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    return serialize_book_admin(session, book)


def create_admin_book(session: Session, *, admin_id: int, payload: dict) -> dict:
    title = (payload.get("title") or "").strip()
    if not title:
        raise ApiError(400, "book_title_required", "Book title is required")

    category = _require_category(session, payload.get("category_id"))
    tag_ids = payload.get("tag_ids") or []
    _require_tags(session, tag_ids)

    book = Book(
        title=title,
        author=payload.get("author"),
        category_id=category.id if category is not None else None,
        category=category.name if category is not None else payload.get("category"),
        isbn=payload.get("isbn"),
        barcode=payload.get("barcode"),
        cover_url=payload.get("cover_url"),
        keywords=payload.get("keywords"),
        summary=payload.get("summary"),
        shelf_status=payload.get("shelf_status") or "draft",
    )
    session.add(book)
    session.flush()
    _sync_book_tags(session, book_id=book.id, tag_ids=tag_ids)
    session.flush()
    after_state = _book_state(session, book)
    _audit(
        session,
        admin_id=admin_id,
        target_type="book",
        target_ref=str(book.id),
        action="create_book",
        after_state=after_state,
    )
    session.commit()
    session.refresh(book)
    return after_state


def update_admin_book(session: Session, *, book_id: int, admin_id: int, payload: dict) -> dict:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")

    before_state = _book_state(session, book)
    category_id = payload.get("category_id", book.category_id)
    category = _require_category(session, category_id) if category_id is not None else None

    for field in ("title", "author", "isbn", "barcode", "cover_url", "keywords", "summary", "shelf_status"):
        if field in payload:
            setattr(book, field, payload.get(field))

    if "category_id" in payload or "category" in payload:
        book.category_id = category.id if category is not None else payload.get("category_id")
        book.category = category.name if category is not None else payload.get("category")

    if "tag_ids" in payload:
        _require_tags(session, payload.get("tag_ids") or [])
        _sync_book_tags(session, book_id=book.id, tag_ids=payload.get("tag_ids") or [])

    session.flush()
    after_state = _book_state(session, book)
    _audit(
        session,
        admin_id=admin_id,
        target_type="book",
        target_ref=str(book.id),
        action="update_book",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    session.refresh(book)
    return after_state


def set_admin_book_status(session: Session, *, book_id: int, admin_id: int, shelf_status: str) -> dict:
    if not shelf_status:
        raise ApiError(400, "book_status_required", "Book shelf status is required")
    return update_admin_book(
        session,
        book_id=book_id,
        admin_id=admin_id,
        payload={"shelf_status": shelf_status},
    )


def upload_book_source_document(
    session: Session,
    *,
    book_id: int,
    admin_id: int,
    source_kind: str,
    file_name: str,
    mime_type: str | None,
    raw_bytes: bytes,
    is_primary: bool | None = None,
) -> dict:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")
    if not raw_bytes:
        raise ApiError(400, "book_source_empty", "Uploaded source document is empty")

    source_dir = _ensure_book_source_storage_dir(book_id=book_id)
    safe_name = Path(file_name or "source.txt").name or "source.txt"
    storage_path = source_dir / safe_name
    storage_path.write_bytes(raw_bytes)
    extracted_text = _extract_source_text_from_path(storage_path)
    extracted_path = source_dir / f"extracted_{safe_name}.md"
    extracted_path.write_text(extracted_text, encoding="utf-8")

    should_be_primary = bool(is_primary) or session.scalar(
        select(func.count()).select_from(BookSourceDocument).where(BookSourceDocument.book_id == book_id)
    ) in {0, None}
    if should_be_primary:
        for existing in session.scalars(
            select(BookSourceDocument).where(BookSourceDocument.book_id == book_id, BookSourceDocument.is_primary.is_(True))
        ).all():
            existing.is_primary = False

    document = BookSourceDocument(
        book_id=book_id,
        source_kind=source_kind or "pdf",
        mime_type=mime_type,
        file_name=safe_name,
        storage_path=str(storage_path),
        extracted_text_path=str(extracted_path),
        content_hash=hashlib.sha256(raw_bytes).hexdigest(),
        parse_status="parsed",
        is_primary=should_be_primary,
        metadata_json={"textLength": len(extracted_text)},
    )
    session.add(document)
    session.flush()
    _audit(
        session,
        admin_id=admin_id,
        target_type="book_source_document",
        target_ref=str(document.id),
        action="upload_book_source_document",
        after_state=_serialize_book_source_document(document),
    )
    session.commit()
    return {"sourceDocument": _serialize_book_source_document(document)}


def set_primary_book_source_document(
    session: Session,
    *,
    book_id: int,
    document_id: int,
    admin_id: int,
) -> dict:
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")

    document = session.scalar(
        select(BookSourceDocument).where(
            BookSourceDocument.id == document_id,
            BookSourceDocument.book_id == book_id,
        )
    )
    if document is None:
        raise ApiError(404, "book_source_document_not_found", "Book source document not found")

    if document.is_primary:
        return {"sourceDocument": _serialize_book_source_document(document)}

    previous_primary = session.scalars(
        select(BookSourceDocument).where(
            BookSourceDocument.book_id == book_id,
            BookSourceDocument.is_primary.is_(True),
        )
    ).all()
    before_state = {
        "bookId": book_id,
        "previousPrimaryIds": [item.id for item in previous_primary],
        "nextPrimaryId": document.id,
    }
    for item in previous_primary:
        item.is_primary = False
    document.is_primary = True
    session.flush()
    after_state = _serialize_book_source_document(document)
    _audit(
        session,
        admin_id=admin_id,
        target_type="book_source_document",
        target_ref=str(document.id),
        action="set_primary_book_source_document",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    return {"sourceDocument": after_state}


def list_book_categories(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(BookCategory).order_by(BookCategory.name.asc(), BookCategory.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_category(row) for row in rows]}


def create_book_category(session: Session, *, admin_id: int, payload: dict) -> dict:
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    if not code or not name:
        raise ApiError(400, "book_category_invalid", "Category code and name are required")
    existing = session.scalar(select(BookCategory).where(or_(BookCategory.code == code, BookCategory.name == name)))
    if existing is not None:
        raise ApiError(409, "book_category_exists", "Category code or name already exists")
    category = BookCategory(
        code=code,
        name=name,
        description=payload.get("description"),
        status=payload.get("status") or "active",
    )
    session.add(category)
    session.flush()
    after_state = _serialize_category(category)
    _audit(
        session,
        admin_id=admin_id,
        target_type="book_category",
        target_ref=str(category.id),
        action="create_book_category",
        after_state=after_state,
    )
    session.commit()
    return after_state


def list_book_tags(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(BookTag).order_by(BookTag.name.asc(), BookTag.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_tag(row) for row in rows]}


def create_book_tag(session: Session, *, admin_id: int, payload: dict) -> dict:
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    if not code or not name:
        raise ApiError(400, "book_tag_invalid", "Tag code and name are required")
    existing = session.scalar(select(BookTag).where(or_(BookTag.code == code, BookTag.name == name)))
    if existing is not None:
        raise ApiError(409, "book_tag_exists", "Tag code or name already exists")
    tag = BookTag(code=code, name=name, description=payload.get("description"))
    session.add(tag)
    session.flush()
    after_state = _serialize_tag(tag)
    _audit(
        session,
        admin_id=admin_id,
        target_type="book_tag",
        target_ref=str(tag.id),
        action="create_book_tag",
        after_state=after_state,
    )
    session.commit()
    return after_state


def _serialize_alert(alert: AlertRecord) -> dict:
    return {
        "id": alert.id,
        "source_type": alert.source_type,
        "source_id": alert.source_id,
        "alert_type": alert.alert_type,
        "severity": alert.severity,
        "status": alert.status,
        "title": alert.title,
        "message": alert.message,
        "metadata_json": alert.metadata_json or {},
        "acknowledged_by": alert.acknowledged_by,
        "acknowledged_at": _iso(alert.acknowledged_at),
        "resolved_by": alert.resolved_by,
        "resolved_at": _iso(alert.resolved_at),
        "created_at": _iso(alert.created_at),
        "updated_at": _iso(alert.updated_at),
    }


def list_alerts(
    session: Session,
    *,
    page: int,
    page_size: int,
    status: str | None = None,
    severity: str | None = None,
) -> dict:
    stmt = select(AlertRecord)
    if status:
        stmt = stmt.where(AlertRecord.status == status)
    if severity:
        stmt = stmt.where(AlertRecord.severity == severity)
    stmt = stmt.order_by(AlertRecord.created_at.desc(), AlertRecord.id.desc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_alert(row) for row in rows]}


def acknowledge_alert(session: Session, *, alert_id: int, admin_id: int, note: str | None = None) -> dict:
    alert = session.get(AlertRecord, alert_id)
    if alert is None:
        raise ApiError(404, "alert_not_found", "Alert not found")
    before_state = _serialize_alert(alert)
    if alert.status == "open":
        alert.status = "acknowledged"
    alert.acknowledged_by = admin_id
    alert.acknowledged_at = utc_now()
    session.flush()
    after_state = _serialize_alert(alert)
    _audit(
        session,
        admin_id=admin_id,
        target_type="alert",
        target_ref=str(alert.id),
        action="acknowledge_alert",
        before_state=before_state,
        after_state=after_state,
        note=note,
    )
    session.commit()
    return after_state


def resolve_alert(session: Session, *, alert_id: int, admin_id: int, note: str | None = None) -> dict:
    alert = session.get(AlertRecord, alert_id)
    if alert is None:
        raise ApiError(404, "alert_not_found", "Alert not found")
    before_state = _serialize_alert(alert)
    if alert.acknowledged_by is None:
        alert.acknowledged_by = admin_id
        alert.acknowledged_at = utc_now()
    alert.status = "resolved"
    alert.resolved_by = admin_id
    alert.resolved_at = utc_now()
    session.flush()
    after_state = _serialize_alert(alert)
    _audit(
        session,
        admin_id=admin_id,
        target_type="alert",
        target_ref=str(alert.id),
        action="resolve_alert",
        before_state=before_state,
        after_state=after_state,
        note=note,
    )
    session.commit()
    return after_state


def _serialize_setting(setting: SystemSetting) -> dict:
    return {
        "id": setting.id,
        "setting_key": setting.setting_key,
        "value_type": setting.value_type,
        "value_json": setting.value_json or {},
        "description": setting.description,
        "created_by": setting.created_by,
        "updated_by": setting.updated_by,
        "created_at": _iso(setting.created_at),
        "updated_at": _iso(setting.updated_at),
    }


def _serialize_audit_log(log: AdminActionLog) -> dict:
    return {
        "id": log.id,
        "admin_id": log.admin_id,
        "target_type": log.target_type,
        "targetRef": log.target_ref,
        "action": log.action,
        "before_state": log.before_state or {},
        "after_state": log.after_state or {},
        "note": log.note,
        "created_at": _iso(log.created_at),
    }


def list_audit_logs(
    session: Session,
    *,
    page: int,
    page_size: int,
    admin_id: int | None = None,
    target_type: str | None = None,
    action: str | None = None,
) -> dict:
    stmt = select(AdminActionLog).order_by(AdminActionLog.created_at.desc(), AdminActionLog.id.desc())
    if admin_id is not None:
        stmt = stmt.where(AdminActionLog.admin_id == admin_id)
    if target_type:
        stmt = stmt.where(AdminActionLog.target_type == target_type)
    if action:
        stmt = stmt.where(AdminActionLog.action == action)
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_audit_log(row) for row in rows]}


def list_system_settings(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(SystemSetting).order_by(SystemSetting.setting_key.asc(), SystemSetting.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_setting(row) for row in rows]}


def upsert_system_setting(session: Session, *, setting_key: str, admin_id: int, payload: dict) -> dict:
    normalized_key = (setting_key or "").strip()
    if not normalized_key:
        raise ApiError(400, "setting_key_required", "Setting key is required")

    setting = session.scalar(select(SystemSetting).where(SystemSetting.setting_key == normalized_key))
    before_state = _serialize_setting(setting) if setting is not None else None
    if setting is None:
        setting = SystemSetting(setting_key=normalized_key, created_by=admin_id)
        session.add(setting)
        session.flush()

    setting.value_type = payload.get("value_type") or setting.value_type or "json"
    setting.value_json = payload.get("value_json") or {}
    setting.description = payload.get("description")
    setting.updated_by = admin_id
    session.flush()
    after_state = _serialize_setting(setting)
    _audit(
        session,
        admin_id=admin_id,
        target_type="system_setting",
        target_ref=str(setting.id),
        action="upsert_system_setting",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    return after_state


def list_system_permissions(session: Session, *, page: int, page_size: int) -> dict:
    _ensure_default_permissions(session)
    session.commit()
    stmt = select(AdminPermission).order_by(AdminPermission.code.asc(), AdminPermission.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_permission(row) for row in rows]}


def list_system_roles(session: Session, *, page: int, page_size: int) -> dict:
    _ensure_default_permissions(session)
    stmt = select(AdminRole).order_by(AdminRole.code.asc(), AdminRole.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_role(session, row) for row in rows]}


def list_system_admins(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(AdminAccount).order_by(AdminAccount.username.asc(), AdminAccount.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_admin_account(session, row) for row in rows]}


def _resolve_permissions_by_code(session: Session, permission_codes: Iterable[str]) -> list[AdminPermission]:
    _ensure_default_permissions(session)
    normalized_codes = sorted({str(code).strip() for code in permission_codes if str(code).strip()})
    if not normalized_codes:
        return []
    existing = {
        permission.code: permission
        for permission in session.scalars(
            select(AdminPermission).where(AdminPermission.code.in_(normalized_codes)).order_by(AdminPermission.code.asc())
        ).all()
    }
    for code in normalized_codes:
        if code in existing:
            continue
        permission = AdminPermission(code=code, name=code, description=f"Auto-created permission for {code}")
        session.add(permission)
        session.flush()
        existing[code] = permission
    return [existing[code] for code in normalized_codes]


def upsert_system_role(session: Session, *, role_code: str, admin_id: int, payload: dict) -> dict:
    normalized_role_code = (role_code or "").strip()
    if not normalized_role_code:
        raise ApiError(400, "role_code_required", "Role code is required")

    role = session.scalar(select(AdminRole).where(AdminRole.code == normalized_role_code))
    before_state = _serialize_role(session, role) if role is not None else None
    if role is None:
        role = AdminRole(code=normalized_role_code, name=payload.get("name") or normalized_role_code)
        session.add(role)
        session.flush()

    role.name = payload.get("name") or role.name or normalized_role_code
    role.description = payload.get("description")

    if "permission_codes" in payload:
        permissions = _resolve_permissions_by_code(session, payload.get("permission_codes") or [])
        current_links = session.scalars(select(AdminRolePermission).where(AdminRolePermission.role_id == role.id)).all()
        current_permission_ids = {link.permission_id for link in current_links}
        target_permission_ids = {permission.id for permission in permissions}
        for link in current_links:
            if link.permission_id not in target_permission_ids:
                session.delete(link)
        for permission in permissions:
            if permission.id not in current_permission_ids:
                session.add(AdminRolePermission(role_id=role.id, permission_id=permission.id))

    if "admin_ids" in payload:
        admin_ids = sorted({int(item) for item in (payload.get("admin_ids") or [])})
        existing_admin_ids = set(
            session.scalars(select(AdminAccount.id).where(AdminAccount.id.in_(admin_ids))).all()
        )
        if existing_admin_ids != set(admin_ids):
            raise ApiError(404, "admin_account_not_found", "One or more admin accounts were not found")
        current_assignments = session.scalars(
            select(AdminRoleAssignment).where(AdminRoleAssignment.role_id == role.id)
        ).all()
        current_admin_ids = {assignment.admin_id for assignment in current_assignments}
        for assignment in current_assignments:
            if assignment.admin_id not in existing_admin_ids:
                session.delete(assignment)
        for target_admin_id in existing_admin_ids - current_admin_ids:
            session.add(AdminRoleAssignment(admin_id=target_admin_id, role_id=role.id))

    session.flush()
    after_state = _serialize_role(session, role)
    _audit(
        session,
        admin_id=admin_id,
        target_type="system_role",
        target_ref=str(role.id),
        action="upsert_admin_role",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    return after_state


def dashboard_overview(session: Session) -> dict:
    now = utc_now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    today_borrow_count = (
        session.scalar(
            select(func.count()).select_from(BorrowOrder).where(BorrowOrder.created_at >= start_of_day)
        )
        or 0
    )
    active_delivery_task_count = (
        session.scalar(
            select(func.count())
            .select_from(DeliveryOrder)
            .where(DeliveryOrder.status.not_in(["completed", "cancelled"]))
        )
        or 0
    )
    robot_total = session.scalar(select(func.count()).select_from(RobotUnit)) or 0
    robot_online = (
        session.scalar(
            select(func.count()).select_from(RobotUnit).where(RobotUnit.status != "offline")
        )
        or 0
    )
    robot_offline = (
        session.scalar(select(func.count()).select_from(RobotUnit).where(RobotUnit.status == "offline")) or 0
    )
    cabinet_rows = session.execute(
        select(Cabinet.status, func.count()).group_by(Cabinet.status).order_by(Cabinet.status.asc())
    ).all()
    cabinet_status_breakdown = {status: int(count) for status, count in cabinet_rows}
    top_books_rows = session.execute(
        select(Book.id, Book.title, Book.author, func.count(BorrowOrder.id).label("borrow_count"))
        .join(BorrowOrder, BorrowOrder.book_id == Book.id)
        .group_by(Book.id, Book.title, Book.author)
        .order_by(func.count(BorrowOrder.id).desc(), Book.id.asc())
        .limit(5)
    ).all()
    open_alert_count = (
        session.scalar(select(func.count()).select_from(AlertRecord).where(AlertRecord.status == "open")) or 0
    )
    total_alert_count = session.scalar(select(func.count()).select_from(AlertRecord)) or 0

    return {
        "today_borrow_count": int(today_borrow_count),
        "active_delivery_task_count": int(active_delivery_task_count),
        "robots": {
            "online": int(robot_online),
            "offline": int(robot_offline),
            "total": int(robot_total),
        },
        "cabinets": {
            "total": sum(cabinet_status_breakdown.values()),
            "status_breakdown": cabinet_status_breakdown,
        },
        "top_books": [
            {
                "book_id": int(book_id),
                "title": title,
                "author": author,
                "borrow_count": int(borrow_count),
            }
            for book_id, title, author, borrow_count in top_books_rows
        ],
        "alerts": {
            "open": int(open_alert_count),
            "total": int(total_alert_count),
        },
    }


def _area_bucket(location: str | None) -> str:
    if not location:
        return "未分区"
    return location.replace("-", " ").split()[0]


def dashboard_heatmap(session: Session) -> dict:
    now = utc_now()
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    rows = session.execute(
        select(Cabinet.id, Cabinet.location, BorrowOrder.id)
        .join(BookCopy, BookCopy.cabinet_id == Cabinet.id)
        .join(BorrowOrder, BorrowOrder.assigned_copy_id == BookCopy.id)
        .where(BorrowOrder.created_at >= start_of_day)
        .order_by(Cabinet.id.asc(), BorrowOrder.id.asc())
    ).all()
    grouped: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"area": "", "demand_count": 0, "cabinet_ids": set(), "locations": set()}
    )
    for cabinet_id, location, _borrow_order_id in rows:
        area = _area_bucket(location)
        item = grouped[area]
        item["area"] = area
        item["demand_count"] += 1
        item["cabinet_ids"].add(cabinet_id)
        if location:
            item["locations"].add(location)

    items = [
        {
            "area": area,
            "demand_count": data["demand_count"],
            "cabinet_count": len(data["cabinet_ids"]),
            "locations": sorted(data["locations"]),
        }
        for area, data in grouped.items()
    ]
    items.sort(key=lambda item: (-item["demand_count"], item["area"]))
    return {"items": items}


def _require_cabinet(session: Session, cabinet_id: str) -> Cabinet:
    cabinet = session.get(Cabinet, cabinet_id)
    if cabinet is None:
        raise ApiError(404, "cabinet_not_found", "Cabinet not found")
    return cabinet


def _serialize_cabinet(session: Session, cabinet: Cabinet) -> dict:
    slot_rows = session.execute(
        select(CabinetSlot.status, func.count())
        .where(CabinetSlot.cabinet_id == cabinet.id)
        .group_by(CabinetSlot.status)
    ).all()
    slot_breakdown = {status: int(count) for status, count in slot_rows}
    stock_row = session.execute(
        select(
            func.coalesce(func.sum(BookStock.total_copies), 0),
            func.coalesce(func.sum(BookStock.available_copies), 0),
            func.coalesce(func.sum(BookStock.reserved_copies), 0),
        ).where(BookStock.cabinet_id == cabinet.id)
    ).one()
    open_alert_count = (
        session.scalar(
            select(func.count())
            .select_from(AlertRecord)
            .where(AlertRecord.source_type.in_(["inventory", "cabinet"]))
            .where(AlertRecord.source_id == cabinet.id)
            .where(AlertRecord.status != "resolved")
        )
        or 0
    )
    return {
        "id": cabinet.id,
        "name": cabinet.name,
        "location": cabinet.location,
        "status": cabinet.status,
        "slot_total": sum(slot_breakdown.values()),
        "occupied_slots": int(slot_breakdown.get("occupied", 0)),
        "free_slots": int(slot_breakdown.get("free", 0) + slot_breakdown.get("empty", 0)),
        "slot_status_breakdown": slot_breakdown,
        "total_copies": int(stock_row[0] or 0),
        "available_copies": int(stock_row[1] or 0),
        "reserved_copies": int(stock_row[2] or 0),
        "open_alert_count": int(open_alert_count),
        "created_at": _iso(cabinet.created_at),
        "updated_at": _iso(cabinet.updated_at),
    }


def list_admin_cabinets(session: Session, *, page: int, page_size: int, status: str | None = None) -> dict:
    stmt = select(Cabinet)
    if status:
        stmt = stmt.where(Cabinet.status == status)
    stmt = stmt.order_by(Cabinet.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_cabinet(session, row) for row in rows]}


def list_admin_cabinet_slots(
    session: Session,
    *,
    cabinet_id: str,
    page: int,
    page_size: int,
    status: str | None = None,
) -> dict:
    _require_cabinet(session, cabinet_id)
    stmt = (
        select(CabinetSlot, BookCopy, Book)
        .outerjoin(BookCopy, BookCopy.current_slot_id == CabinetSlot.id)
        .outerjoin(Book, BookCopy.book_id == Book.id)
        .where(CabinetSlot.cabinet_id == cabinet_id)
    )
    if status:
        stmt = stmt.where(CabinetSlot.status == status)
    stmt = stmt.order_by(CabinetSlot.slot_code.asc(), CabinetSlot.id.asc())
    rows, meta = _paginate_rows(stmt, session=session, page=page, page_size=page_size)
    items = []
    for slot, copy, book in rows:
        items.append(
            {
                "id": slot.id,
                "cabinet_id": slot.cabinet_id,
                "slot_code": slot.slot_code,
                "status": slot.status,
                "current_copy_id": slot.current_copy_id,
                "copy_inventory_status": None if copy is None else copy.inventory_status,
                "book_id": None if book is None else book.id,
                "book_title": None if book is None else book.title,
                "book_author": None if book is None else book.author,
                "created_at": _iso(slot.created_at),
                "updated_at": _iso(slot.updated_at),
            }
        )
    return {**meta, "items": items}


def list_inventory_records(
    session: Session,
    *,
    page: int,
    page_size: int,
    cabinet_id: str | None = None,
    event_type: str | None = None,
) -> dict:
    stmt = (
        select(InventoryEvent, Cabinet.name, Book.title)
        .join(Cabinet, InventoryEvent.cabinet_id == Cabinet.id, isouter=True)
        .join(Book, InventoryEvent.book_id == Book.id, isouter=True)
    )
    if cabinet_id:
        stmt = stmt.where(InventoryEvent.cabinet_id == cabinet_id)
    if event_type:
        stmt = stmt.where(InventoryEvent.event_type == event_type)
    stmt = stmt.order_by(InventoryEvent.created_at.desc(), InventoryEvent.id.desc())
    rows, meta = _paginate_rows(stmt, session=session, page=page, page_size=page_size)
    return {
        **meta,
        "items": [
            {
                "id": event.id,
                "cabinet_id": event.cabinet_id,
                "cabinet_name": cabinet_name,
                "event_type": event.event_type,
                "slot_code": event.slot_code,
                "book_id": event.book_id,
                "book_title": book_title,
                "copy_id": event.copy_id,
                "payload_json": event.payload_json or {},
                "created_at": _iso(event.created_at),
            }
            for event, cabinet_name, book_title in rows
        ],
    }


def list_inventory_alerts(
    session: Session,
    *,
    page: int,
    page_size: int,
    status: str | None = None,
    source_id: str | None = None,
) -> dict:
    stmt = select(AlertRecord).where(AlertRecord.source_type.in_(["inventory", "cabinet"]))
    if status:
        stmt = stmt.where(AlertRecord.status == status)
    if source_id:
        stmt = stmt.where(AlertRecord.source_id == source_id)
    stmt = stmt.order_by(AlertRecord.created_at.desc(), AlertRecord.id.desc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_alert(row) for row in rows]}


def apply_inventory_correction(session: Session, *, admin_id: int, payload: dict) -> dict:
    cabinet_id = str(payload.get("cabinet_id") or "").strip()
    if not cabinet_id:
        raise ApiError(400, "cabinet_id_required", "Cabinet id is required")
    book_id = int(payload.get("book_id") or 0)
    if book_id <= 0:
        raise ApiError(400, "book_id_required", "Book id is required")

    _require_cabinet(session, cabinet_id)
    book = session.get(Book, book_id)
    if book is None:
        raise ApiError(404, "book_not_found", "Book not found")

    total_delta = int(payload.get("total_delta") or 0)
    available_delta = int(payload.get("available_delta") or 0)
    reserved_delta = int(payload.get("reserved_delta") or 0)
    reason = (payload.get("reason") or "").strip() or None
    before_state = _stock_summary(session, book_id)
    stock = adjust_stock_counts(
        session,
        book_id=book_id,
        cabinet_id=cabinet_id,
        total_delta=total_delta,
        available_delta=available_delta,
        reserved_delta=reserved_delta,
    )
    session.flush()
    event = InventoryEvent(
        cabinet_id=cabinet_id,
        event_type="manual_correction",
        slot_code=payload.get("slot_code"),
        book_id=book_id,
        payload_json={
            "reason": reason,
            "total_delta": total_delta,
            "available_delta": available_delta,
            "reserved_delta": reserved_delta,
        },
    )
    session.add(event)
    session.flush()
    after_state = {
        "cabinet_id": cabinet_id,
        "book_id": book_id,
        "stock": {
            "total_copies": stock.total_copies,
            "available_copies": stock.available_copies,
            "reserved_copies": stock.reserved_copies,
        },
    }
    _audit(
        session,
        admin_id=admin_id,
        target_type="inventory_stock",
        target_ref=str(stock.id),
        action="manual_inventory_correction",
        before_state={"stock": before_state},
        after_state=after_state,
        note=reason,
    )
    session.commit()
    return {
        "cabinet_id": cabinet_id,
        "book_id": book_id,
        "stock": after_state["stock"],
        "event": {
            "id": event.id,
            "event_type": event.event_type,
            "slot_code": event.slot_code,
            "created_at": _iso(event.created_at),
        },
    }


def _serialize_admin_reader(session: Session, profile: ReaderProfile, account: ReaderAccount) -> dict:
    active_orders_count = (
        session.scalar(
            select(func.count())
            .select_from(BorrowOrder)
            .where(BorrowOrder.reader_id == profile.id)
            .where(BorrowOrder.status != "completed")
        )
        or 0
    )
    return {
        "id": profile.id,
        "account_id": account.id,
        "username": account.username,
        "display_name": profile.display_name,
        "affiliation_type": profile.affiliation_type,
        "college": profile.college,
        "major": profile.major,
        "grade_year": profile.grade_year,
        "restriction_status": profile.restriction_status,
        "restriction_until": _iso(profile.restriction_until),
        "risk_flags": profile.risk_flags or [],
        "preference_profile_json": profile.preference_profile_json or {},
        "segment_code": profile.segment_code,
        "active_orders_count": int(active_orders_count),
        "last_active_at": _reader_last_active_at(session, profile.id, fallback=profile.updated_at),
        "created_at": _iso(profile.created_at),
        "updated_at": _iso(profile.updated_at),
    }


def list_admin_readers(
    session: Session,
    *,
    query: str | None,
    page: int,
    page_size: int,
    restriction_status: str | None = None,
    segment_code: str | None = None,
) -> dict:
    stmt = select(ReaderProfile, ReaderAccount).join(ReaderAccount, ReaderProfile.account_id == ReaderAccount.id)
    clean_query = (query or "").strip()
    if clean_query:
        pattern = f"%{clean_query}%"
        stmt = stmt.where(
            or_(
                ReaderAccount.username.ilike(pattern),
                ReaderProfile.display_name.ilike(pattern),
                ReaderProfile.college.ilike(pattern),
                ReaderProfile.major.ilike(pattern),
                ReaderProfile.segment_code.ilike(pattern),
            )
        )
    if restriction_status:
        stmt = stmt.where(ReaderProfile.restriction_status == restriction_status)
    if segment_code:
        stmt = stmt.where(ReaderProfile.segment_code == segment_code)
    stmt = stmt.order_by(ReaderProfile.updated_at.desc(), ReaderProfile.id.desc())
    rows, meta = _paginate_rows(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_admin_reader(session, profile, account) for profile, account in rows]}


def get_admin_reader(session: Session, reader_id: int) -> dict:
    row = session.execute(
        select(ReaderProfile, ReaderAccount)
        .join(ReaderAccount, ReaderProfile.account_id == ReaderAccount.id)
        .where(ReaderProfile.id == reader_id)
    ).first()
    if row is None:
        raise ApiError(404, "reader_not_found", "Reader not found")
    profile, account = row
    return _serialize_admin_reader(session, profile, account)


def update_admin_reader(session: Session, *, reader_id: int, admin_id: int, payload: dict) -> dict:
    profile = session.get(ReaderProfile, reader_id)
    if profile is None:
        raise ApiError(404, "reader_not_found", "Reader not found")

    row = session.execute(
        select(ReaderAccount).where(ReaderAccount.id == profile.account_id)
    ).first()
    if row is None:
        raise ApiError(404, "reader_account_not_found", "Reader account not found")
    account = row[0]
    before_state = _serialize_admin_reader(session, profile, account)

    for field in ("restriction_status", "risk_flags", "preference_profile_json", "segment_code"):
        if field in payload:
            setattr(profile, field, payload.get(field))
    if "restriction_until" in payload:
        raw_value = payload.get("restriction_until")
        if raw_value:
            profile.restriction_until = datetime.fromisoformat(str(raw_value).replace("Z", "+00:00"))
        else:
            profile.restriction_until = None

    session.flush()
    after_state = _serialize_admin_reader(session, profile, account)
    _audit(
        session,
        admin_id=admin_id,
        target_type="reader_profile",
        target_ref=str(profile.id),
        action="update_reader_profile",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    return after_state


def _recommendation_error(code: str, message: str) -> dict:
    return {
        "code": code,
        "message": message,
    }


RECOMMENDATION_STUDIO_SLOT_COUNT = 3
RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS = (
    {"code": "today_recommendations", "name": "今日推荐", "placement_type": "home_feed", "rank": 1},
    {"code": "exam_zone", "name": "考试专区", "placement_type": "home_feed", "rank": 2},
    {"code": "hot_lists", "name": "热门榜单", "placement_type": "home_feed", "rank": 3},
    {"code": "system_booklists", "name": "系统书单", "placement_type": "home_feed", "rank": 4},
)
RECOMMENDATION_STUDIO_DEFAULT_WEIGHTS = {
    "content": 0.45,
    "behavior": 0.4,
    "freshness": 0.15,
}
RECOMMENDATION_STUDIO_STRATEGY_SETTING_KEY = "recommendation.weights"


def _studio_slot_count() -> int:
    return RECOMMENDATION_STUDIO_SLOT_COUNT


def _copy_hot_lists() -> list[dict]:
    return copy_default_hot_lists()


def _copy_explanation_card() -> dict:
    return copy_default_explanation_card()


def _copy_recommendation_studio_default_placements() -> list[dict]:
    return [dict(item, status="active") for item in RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS]


def _copy_recommendation_studio_default_weights() -> dict[str, float]:
    return dict(RECOMMENDATION_STUDIO_DEFAULT_WEIGHTS)


def _normalize_strategy_weight_value(value: Any, *, fallback: float) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = fallback
    return round(max(parsed, 0.0), 4)


def _normalize_studio_strategy_weights(payload: dict | None) -> dict[str, float]:
    raw = payload or {}
    normalized = {
        key: _normalize_strategy_weight_value(raw.get(key), fallback=default)
        for key, default in RECOMMENDATION_STUDIO_DEFAULT_WEIGHTS.items()
    }
    if sum(normalized.values()) <= 0:
        return _copy_recommendation_studio_default_weights()
    return normalized


def _serialize_studio_placement(row: RecommendationPlacement) -> dict:
    config = dict(row.config_json or {})
    return {
        "code": row.code,
        "name": row.name,
        "status": row.status or "active",
        "placement_type": row.placement_type or "home_feed",
        "rank": int(config.get("rank") or 0),
    }


def _list_recommendation_studio_placement_rows(session: Session) -> list[RecommendationPlacement]:
    expected_codes = [item["code"] for item in RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS]
    rows = session.scalars(
        select(RecommendationPlacement).where(RecommendationPlacement.code.in_(expected_codes))
    ).all()
    row_map = {row.code: row for row in rows}

    for default in RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS:
        row = row_map.get(default["code"])
        if row is None:
            row = RecommendationPlacement(
                code=default["code"],
                name=default["name"],
                status="active",
                placement_type=default["placement_type"],
                config_json={"rank": default["rank"]},
            )
            session.add(row)
            session.flush()
            row_map[default["code"]] = row
            continue

        changed = False
        if not row.name:
            row.name = default["name"]
            changed = True
        if not row.placement_type:
            row.placement_type = default["placement_type"]
            changed = True
        config = dict(row.config_json or {})
        if int(config.get("rank") or 0) <= 0:
            config["rank"] = default["rank"]
            row.config_json = config
            changed = True
        if not row.status:
            row.status = "active"
            changed = True
        if changed:
            session.flush()

    ordered_rows = [row_map[item["code"]] for item in RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS]
    ordered_rows.sort(key=lambda row: (int((row.config_json or {}).get("rank") or 0), row.id))
    return ordered_rows


def _list_recommendation_studio_placements(session: Session) -> list[dict]:
    return [_serialize_studio_placement(row) for row in _list_recommendation_studio_placement_rows(session)]


def _get_recommendation_strategy_weights(session: Session) -> dict[str, float]:
    setting = session.scalar(
        select(SystemSetting).where(SystemSetting.setting_key == RECOMMENDATION_STUDIO_STRATEGY_SETTING_KEY)
    )
    return _normalize_studio_strategy_weights(setting.value_json if setting is not None else None)


def _set_recommendation_strategy_weights(session: Session, *, admin_id: int, weights: dict[str, float]) -> None:
    setting = session.scalar(
        select(SystemSetting).where(SystemSetting.setting_key == RECOMMENDATION_STUDIO_STRATEGY_SETTING_KEY)
    )
    if setting is None:
        setting = SystemSetting(
            setting_key=RECOMMENDATION_STUDIO_STRATEGY_SETTING_KEY,
            created_by=admin_id,
        )
        session.add(setting)
        session.flush()
    setting.value_type = "json"
    setting.value_json = dict(weights)
    setting.description = "推荐运营台策略权重"
    setting.updated_by = admin_id
    session.flush()


def _list_popular_books_for_studio(session: Session, *, limit: int) -> list[Book]:
    rows = session.execute(
        select(Book, func.count(BorrowOrder.id).label("borrow_count"))
        .join(BorrowOrder, BorrowOrder.book_id == Book.id, isouter=True)
        .group_by(Book.id)
        .order_by(func.count(BorrowOrder.id).desc(), Book.id.asc())
        .limit(limit)
    ).all()
    return [row[0] for row in rows]


def _list_unique_books_for_studio(session: Session, *, limit: int) -> list[Book]:
    books = _list_popular_books_for_studio(session, limit=limit * 2)
    seen = {book.id for book in books}
    if len(books) < limit:
        extras = session.scalars(select(Book).order_by(Book.id.asc())).all()
        for book in extras:
            if book.id in seen:
                continue
            books.append(book)
            seen.add(book.id)
            if len(books) >= limit:
                break
    return books[:limit]


def _book_default_explanation(book: Book, *, tone: str) -> str:
    if tone == "exam":
        return f"适合作为{book.title}相关主题的考试冲刺阅读。"
    return f"适合作为《{book.title}》方向的本周重点推荐。"


def _candidate_signal_score(signals: dict[str, float], weights: dict[str, float]) -> float:
    total_weight = sum(max(float(value), 0.0) for value in weights.values())
    if total_weight <= 0:
        return 0.0
    blended = sum(signals[key] * max(float(weights[key]), 0.0) for key in RECOMMENDATION_STUDIO_DEFAULT_WEIGHTS)
    return round(blended / total_weight, 4)


def _build_studio_candidate_signals(
    session: Session,
    book: Book,
    *,
    borrow_count: int,
    max_borrow_count: int,
) -> tuple[dict, dict[str, float]]:
    payload = build_book_payload(session, book)
    content_factors = [
        1.0 if book.category else 0.0,
        1.0 if book.keywords else 0.0,
        1.0 if book.summary else 0.0,
        min(float(payload["available_copies"]), 3.0) / 3.0,
        1.0 if payload["delivery_available"] else (0.4 if payload["available_copies"] > 0 else 0.0),
    ]
    content_score = round(sum(content_factors) / len(content_factors), 4)
    behavior_score = round((borrow_count / max_borrow_count) if max_borrow_count > 0 else 0.0, 4)
    timestamp = _normalize_datetime(book.updated_at or book.created_at)
    if timestamp is None:
        freshness_score = 0.5
    else:
        current_time = _normalize_datetime(utc_now()) or utc_now().replace(tzinfo=None)
        age_days = max((current_time - timestamp).days, 0)
        freshness_score = round(max(0.05, 1.0 - (min(age_days, 180) / 180.0)), 4)
    signals = {
        "content": content_score,
        "behavior": behavior_score,
        "freshness": freshness_score,
    }
    return payload, signals


def _tone_bonus(book: Book, *, tone: str) -> float:
    text = " ".join(
        [
            str(book.title or ""),
            str(book.category or ""),
            str(book.keywords or ""),
            str(book.summary or ""),
        ]
    ).lower()
    if tone == "exam" and any(token in text for token in ("exam", "考试", "复习", "冲刺")):
        return 0.08
    if tone == "today" and any(token in text for token in ("system", "推荐", "智能")):
        return 0.04
    return 0.0


def _serialize_studio_candidate_book(
    session: Session,
    book: Book,
    *,
    tone: str,
    weights: dict[str, float],
    borrow_count: int,
    max_borrow_count: int,
) -> dict:
    payload, signals = _build_studio_candidate_signals(
        session,
        book,
        borrow_count=borrow_count,
        max_borrow_count=max_borrow_count,
    )
    blended = min(1.0, _candidate_signal_score(signals, weights) + _tone_bonus(book, tone=tone))
    return {
        "book_id": book.id,
        "title": book.title,
        "author": book.author,
        "category": book.category,
        "available_copies": payload["available_copies"],
        "deliverable": payload["delivery_available"],
        "eta_minutes": payload["eta_minutes"],
        "default_explanation": _book_default_explanation(book, tone=tone),
        "signals": {
            **signals,
            "blended": round(blended, 4),
        },
    }


def _serialize_studio_candidate_booklist(topic: TopicBooklist, *, item_count: int) -> dict:
    return {
        "booklist_id": topic.id,
        "title": topic.title,
        "description": topic.description,
        "book_count": item_count,
    }


def _list_studio_booklist_candidates(session: Session, *, limit: int) -> list[dict]:
    topics = session.scalars(
        select(TopicBooklist)
        .where(TopicBooklist.status == "active")
        .order_by(TopicBooklist.updated_at.desc(), TopicBooklist.id.desc())
        .limit(limit)
    ).all()
    if not topics:
        return []

    counts = dict(
        session.execute(
            select(TopicBooklistItem.topic_booklist_id, func.count())
            .where(TopicBooklistItem.topic_booklist_id.in_([topic.id for topic in topics]))
            .group_by(TopicBooklistItem.topic_booklist_id)
        ).all()
    )
    return [_serialize_studio_candidate_booklist(topic, item_count=int(counts.get(topic.id, 0))) for topic in topics]


def _build_recommendation_studio_candidates(session: Session, *, strategy_weights: dict[str, float]) -> dict:
    books = _list_unique_books_for_studio(session, limit=_studio_slot_count() * 3 + 4)
    borrow_counts = dict(
        session.execute(
            select(BorrowOrder.book_id, func.count())
            .where(BorrowOrder.book_id.in_([book.id for book in books]))
            .group_by(BorrowOrder.book_id)
        ).all()
    )
    max_borrow_count = max((int(value) for value in borrow_counts.values()), default=0)

    def rank_books(tone: str) -> list[dict]:
        ranked = [
            _serialize_studio_candidate_book(
                session,
                book,
                tone=tone,
                weights=strategy_weights,
                borrow_count=int(borrow_counts.get(book.id, 0)),
                max_borrow_count=max_borrow_count,
            )
            for book in books
        ]
        ranked.sort(key=lambda item: (-float(item["signals"]["blended"]), item["book_id"]))
        return ranked

    today_books = rank_books("today")[: max(_studio_slot_count(), 4)]
    exam_books = rank_books("exam")[: max(_studio_slot_count(), 3)]

    return {
        "today_recommendations": today_books,
        "exam_zone": exam_books,
        "system_booklists": _list_studio_booklist_candidates(session, limit=_studio_slot_count() + 2),
    }


def _build_recommendation_studio_default_draft(session: Session) -> dict:
    strategy_weights = _get_recommendation_strategy_weights(session)
    candidates = _build_recommendation_studio_candidates(session, strategy_weights=strategy_weights)
    today_candidates = candidates["today_recommendations"][: _studio_slot_count()]
    exam_candidates = candidates["exam_zone"][: _studio_slot_count()]
    booklist_candidates = candidates["system_booklists"][: _studio_slot_count()]
    return {
        "today_recommendations": [
            {
                "book_id": item["book_id"],
                "custom_explanation": item["default_explanation"],
                "source": "candidate_pool",
                "rank": index,
            }
            for index, item in enumerate(today_candidates, start=1)
        ],
        "exam_zone": [
            {
                "book_id": item["book_id"],
                "custom_explanation": item["default_explanation"],
                "source": "candidate_pool",
                "rank": index,
            }
            for index, item in enumerate(exam_candidates, start=1)
        ],
        "hot_lists": _copy_hot_lists(),
        "system_booklists": [
            {
                "booklist_id": item["booklist_id"],
                "rank": index,
            }
            for index, item in enumerate(booklist_candidates, start=1)
        ],
        "explanation_card": _copy_explanation_card(),
        "placements": _list_recommendation_studio_placements(session),
        "strategy_weights": strategy_weights,
    }


def _normalize_studio_hot_lists(payload: list[dict] | None) -> list[dict]:
    items = payload or []
    if len(items) != _studio_slot_count():
        raise ApiError(400, "recommendation_studio_invalid", "Hot list slots must be filled")
    normalized: list[dict] = []
    for index, item in enumerate(items, start=1):
        title = str(item.get("title") or "").strip()
        description = str(item.get("description") or "").strip()
        if not title or not description:
            raise ApiError(400, "recommendation_studio_invalid", "Hot list title and description are required")
        normalized.append(
            {
                "id": str(item.get("id") or f"hot-list-{index}"),
                "title": title,
                "description": description,
            }
        )
    return normalized


def _normalize_studio_book_slots(
    session: Session,
    payload: list[dict] | None,
    *,
    field_name: str,
) -> list[dict]:
    items = payload or []
    if len(items) != _studio_slot_count():
        raise ApiError(400, "recommendation_studio_invalid", f"{field_name} slots must be filled")
    normalized: list[dict] = []
    book_ids: list[int] = []
    for index, item in enumerate(items, start=1):
        raw_book_id = item.get("book_id")
        try:
            book_id = int(raw_book_id)
        except (TypeError, ValueError) as exc:
            raise ApiError(400, "recommendation_studio_invalid", f"{field_name} requires a valid book id") from exc
        custom_explanation = str(item.get("custom_explanation") or "").strip()
        if not custom_explanation:
            raise ApiError(400, "recommendation_studio_invalid", f"{field_name} requires recommendation copy")
        normalized.append(
            {
                "book_id": book_id,
                "custom_explanation": custom_explanation,
                "source": str(item.get("source") or "manual_review"),
                "rank": index,
            }
        )
        book_ids.append(book_id)

    existing_ids = set(session.scalars(select(Book.id).where(Book.id.in_(book_ids))).all())
    if existing_ids != set(book_ids):
        raise ApiError(400, "recommendation_studio_invalid", f"{field_name} contains a missing book")
    return normalized


def _normalize_studio_booklists(session: Session, payload: list[dict] | None) -> list[dict]:
    items = payload or []
    if len(items) != _studio_slot_count():
        raise ApiError(400, "recommendation_studio_invalid", "System booklist slots must be filled")
    normalized: list[dict] = []
    booklist_ids: list[int] = []
    for index, item in enumerate(items, start=1):
        raw_booklist_id = item.get("booklist_id")
        try:
            booklist_id = int(raw_booklist_id)
        except (TypeError, ValueError) as exc:
            raise ApiError(400, "recommendation_studio_invalid", "System booklists require a valid booklist id") from exc
        normalized.append({"booklist_id": booklist_id, "rank": index})
        booklist_ids.append(booklist_id)

    existing_ids = set(session.scalars(select(TopicBooklist.id).where(TopicBooklist.id.in_(booklist_ids))).all())
    if existing_ids != set(booklist_ids):
        raise ApiError(400, "recommendation_studio_invalid", "System booklists contain a missing topic")
    return normalized


def _normalize_studio_explanation_card(payload: dict | None) -> dict:
    card = payload or {}
    title = str(card.get("title") or "").strip()
    body = str(card.get("body") or "").strip()
    if not title or not body:
        raise ApiError(400, "recommendation_studio_invalid", "Explanation card title and body are required")
    return {"title": title, "body": body}


def _normalize_studio_placements(session: Session, payload: list[dict] | None) -> list[dict]:
    existing_rows = _list_recommendation_studio_placement_rows(session)
    existing_map = {row.code: row for row in existing_rows}
    raw_items = payload or [_serialize_studio_placement(row) for row in existing_rows]
    normalized: list[dict] = []
    seen_codes: set[str] = set()

    for item in raw_items:
        code = str(item.get("code") or "").strip()
        if not code or code in seen_codes:
            raise ApiError(400, "recommendation_studio_invalid", "Placements require unique codes")
        row = existing_map.get(code)
        if row is None:
            raise ApiError(400, "recommendation_studio_invalid", f"Unknown placement code: {code}")
        status = str(item.get("status") or "active").strip().lower()
        if status not in {"active", "paused"}:
            raise ApiError(400, "recommendation_studio_invalid", f"Unsupported placement status: {status}")
        try:
            rank = int(item.get("rank") or 0)
        except (TypeError, ValueError) as exc:
            raise ApiError(400, "recommendation_studio_invalid", f"Placement {code} requires a valid rank") from exc
        if rank <= 0:
            raise ApiError(400, "recommendation_studio_invalid", f"Placement {code} requires a positive rank")
        normalized.append(
            {
                "code": code,
                "name": str(item.get("name") or row.name or code),
                "status": status,
                "placement_type": str(item.get("placement_type") or row.placement_type or "home_feed"),
                "rank": rank,
            }
        )
        seen_codes.add(code)

    missing = [default["code"] for default in RECOMMENDATION_STUDIO_DEFAULT_PLACEMENTS if default["code"] not in seen_codes]
    if missing:
        raise ApiError(400, "recommendation_studio_invalid", "Placements must cover all recommendation modules")

    normalized.sort(key=lambda item: (item["rank"], item["code"]))
    return [{**item, "rank": index} for index, item in enumerate(normalized, start=1)]


def _placement_status_map(draft: dict) -> dict[str, str]:
    placements = draft.get("placements") or []
    return {
        item["code"]: str(item.get("status") or "active")
        for item in placements
        if str(item.get("code") or "").strip()
    }


def _normalize_recommendation_studio_draft(session: Session, payload: dict | None) -> dict:
    raw = payload or {}
    today = _normalize_studio_book_slots(session, raw.get("today_recommendations"), field_name="today_recommendations")
    exam = _normalize_studio_book_slots(session, raw.get("exam_zone"), field_name="exam_zone")
    overlap = {item["book_id"] for item in today} & {item["book_id"] for item in exam}
    if overlap:
        raise ApiError(400, "recommendation_studio_invalid", "Today recommendations and exam zone cannot share the same book")
    return {
        "today_recommendations": today,
        "exam_zone": exam,
        "hot_lists": _normalize_studio_hot_lists(raw.get("hot_lists")),
        "system_booklists": _normalize_studio_booklists(session, raw.get("system_booklists")),
        "explanation_card": _normalize_studio_explanation_card(raw.get("explanation_card")),
        "placements": _normalize_studio_placements(session, raw.get("placements")),
        "strategy_weights": _normalize_studio_strategy_weights(raw.get("strategy_weights")),
    }


def _serialize_recommendation_studio_publication(
    session: Session,
    publication: RecommendationStudioPublication,
) -> dict:
    username = None
    if publication.published_by is not None:
        admin = session.get(AdminAccount, publication.published_by)
        username = admin.username if admin is not None else None
    return {
        "id": publication.id,
        "version": publication.version,
        "status": publication.status,
        "published_by_username": username,
        "published_at": _iso(publication.published_at),
        "updated_at": _iso(publication.updated_at),
        "payload": publication.payload_json or None,
    }


def _book_payload_map(session: Session, book_ids: list[int]) -> dict[int, dict]:
    if not book_ids:
        return {}
    books = session.scalars(select(Book).where(Book.id.in_(book_ids))).all()
    payloads = build_book_payloads(session, books)
    return {payload["id"]: payload for payload in payloads}


def build_recommendation_studio_preview_feed(session: Session, draft: dict) -> dict:
    placement_status = _placement_status_map(draft)
    today_slots = draft.get("today_recommendations") or []
    exam_slots = draft.get("exam_zone") or []
    book_ids = [int(item["book_id"]) for item in [*today_slots, *exam_slots]]
    payload_map = _book_payload_map(session, book_ids)

    system_booklist_ids = [int(item["booklist_id"]) for item in draft.get("system_booklists") or []]
    booklists = session.scalars(select(TopicBooklist).where(TopicBooklist.id.in_(system_booklist_ids))).all()
    booklist_map = {booklist.id: booklist for booklist in booklists}

    def feed_items(slots: list[dict]) -> list[dict]:
        items: list[dict] = []
        for slot in slots:
            payload = payload_map.get(int(slot["book_id"]))
            if payload is None:
                continue
            items.append(
                serialize_recommendation_feed_book(
                    payload,
                    explanation=str(slot.get("custom_explanation") or "").strip() or None,
                )
            )
        return items

    today_items = feed_items(today_slots) if placement_status.get("today_recommendations", "active") == "active" else []
    exam_items = feed_items(exam_slots) if placement_status.get("exam_zone", "active") == "active" else []
    return build_recommendation_feed_payload(
        today_recommendations=today_items,
        exam_zone=exam_items,
        explanation_card=draft.get("explanation_card") or _copy_explanation_card(),
        quick_actions=build_system_quick_actions(
            len(today_items),
            delivery_meta="系统自动生成，不在运营台内编辑",
        ),
        hot_lists=(draft.get("hot_lists") or _copy_hot_lists()) if placement_status.get("hot_lists", "active") == "active" else [],
        system_booklists=[
            serialize_recommendation_feed_card(
                card_id=str(booklist.id),
                title=str(booklist.title),
                description=str(booklist.description or "系统精选主题阅读清单。"),
            )
            for item in draft.get("system_booklists") or []
            for booklist in [booklist_map.get(int(item["booklist_id"]))]
            if booklist is not None
        ]
        if placement_status.get("system_booklists", "active") == "active"
        else [],
    )


def _latest_recommendation_studio_publication(
    session: Session,
    *,
    status: str,
) -> RecommendationStudioPublication | None:
    return session.scalar(
        select(RecommendationStudioPublication)
        .where(RecommendationStudioPublication.status == status)
        .order_by(RecommendationStudioPublication.version.desc(), RecommendationStudioPublication.updated_at.desc(), RecommendationStudioPublication.id.desc())
    )


def _get_recommendation_studio_draft_payload(session: Session) -> dict:
    draft = _latest_recommendation_studio_publication(session, status="draft")
    if draft is not None and draft.payload_json:
        return _normalize_recommendation_studio_draft(session, draft.payload_json)
    return _build_recommendation_studio_default_draft(session)


def get_recommendation_studio_live_feed(session: Session) -> dict | None:
    publication = _latest_recommendation_studio_publication(session, status="published")
    if publication is None or not publication.payload_json:
        return None
    return build_recommendation_studio_preview_feed(session, publication.payload_json)


def get_recommendation_studio(session: Session) -> dict:
    draft_payload = _get_recommendation_studio_draft_payload(session)
    live_publication = _latest_recommendation_studio_publication(session, status="published")
    return {
        "live_publication": _serialize_recommendation_studio_publication(session, live_publication) if live_publication else None,
        "draft": draft_payload,
        "candidates": _build_recommendation_studio_candidates(
            session,
            strategy_weights=draft_payload.get("strategy_weights") or _copy_recommendation_studio_default_weights(),
        ),
        "preview_feed": build_recommendation_studio_preview_feed(session, draft_payload),
    }


def save_recommendation_studio_draft(session: Session, *, admin_id: int, payload: dict) -> dict:
    normalized = _normalize_recommendation_studio_draft(session, payload)
    draft = _latest_recommendation_studio_publication(session, status="draft")
    before_state = draft.payload_json if draft is not None else None
    if draft is None:
        draft = RecommendationStudioPublication(status="draft", version=None, payload_json=normalized)
        session.add(draft)
        session.flush()
    else:
        draft.payload_json = normalized
    _audit(
        session,
        admin_id=admin_id,
        target_type="recommendation_studio",
        target_ref=str(draft.id),
        action="save_recommendation_studio_draft",
        before_state=before_state,
        after_state=normalized,
    )
    session.commit()
    session.refresh(draft)
    return {
        "draft": normalized,
        "preview_feed": build_recommendation_studio_preview_feed(session, normalized),
    }


def publish_recommendation_studio(session: Session, *, admin_id: int) -> dict:
    draft_payload = _get_recommendation_studio_draft_payload(session)
    normalized = _normalize_recommendation_studio_draft(session, draft_payload)
    existing_rows = {row.code: row for row in _list_recommendation_studio_placement_rows(session)}
    for placement in normalized["placements"]:
        row = existing_rows[placement["code"]]
        row.name = placement["name"]
        row.status = placement["status"]
        row.placement_type = placement["placement_type"]
        row.config_json = {"rank": placement["rank"]}
    _set_recommendation_strategy_weights(session, admin_id=admin_id, weights=normalized["strategy_weights"])
    latest = _latest_recommendation_studio_publication(session, status="published")
    next_version = int((latest.version if latest is not None and latest.version is not None else 0) + 1)
    publication = RecommendationStudioPublication(
        version=next_version,
        status="published",
        payload_json=normalized,
        published_by=admin_id,
        published_at=utc_now(),
    )
    session.add(publication)
    session.flush()
    _audit(
        session,
        admin_id=admin_id,
        target_type="recommendation_studio_publication",
        target_ref=str(publication.id),
        action="publish_recommendation_studio",
        after_state=normalized,
    )
    session.commit()
    session.refresh(publication)
    return {
        "publication": _serialize_recommendation_studio_publication(session, publication),
        "preview_feed": build_recommendation_studio_preview_feed(session, normalized),
    }


def list_recommendation_studio_publications(session: Session, *, limit: int = 10) -> dict:
    rows = session.scalars(
        select(RecommendationStudioPublication)
        .where(RecommendationStudioPublication.status == "published")
        .order_by(RecommendationStudioPublication.version.desc(), RecommendationStudioPublication.id.desc())
        .limit(limit)
    ).all()
    return {
        "items": [_serialize_recommendation_studio_publication(session, row) for row in rows],
    }
