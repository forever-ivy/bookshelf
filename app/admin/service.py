from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterable
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.admin.models import (
    AdminPermission,
    AdminRole,
    AdminRoleAssignment,
    AdminRolePermission,
    AlertRecord,
    RecommendationPlacement,
    TopicBooklist,
    TopicBooklistItem,
)
from app.analytics.models import ReadingEvent, SearchLog
from app.auth.models import AdminAccount, AdminActionLog
from app.catalog.models import Book, BookCategory, BookTag, BookTagLink
from app.catalog.service import build_book_payload
from app.core.errors import ApiError
from app.db.base import utc_now
from app.inventory.models import BookCopy, BookStock, Cabinet, CabinetSlot, InventoryEvent
from app.inventory.service import adjust_stock_counts
from app.orders.models import BorrowOrder, DeliveryOrder
from app.readers.models import ReaderAccount, ReaderProfile
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
    {"code": "recommendation.manage", "name": "管理推荐运营", "description": "配置推荐位、专题书单与策略参数"},
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
    target_id: int,
    action: str,
    before_state: dict | None = None,
    after_state: dict | None = None,
    note: str | None = None,
) -> None:
    session.add(
        AdminActionLog(
            admin_id=admin_id,
            target_type=target_type,
            target_id=target_id,
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
    created = False
    for payload in DEFAULT_ADMIN_PERMISSIONS:
        if payload["code"] in existing:
            continue
        session.add(
            AdminPermission(
                code=payload["code"],
                name=payload["name"],
                description=payload["description"],
            )
        )
        created = True
    if created:
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


def serialize_book_admin(session: Session, book: Book) -> dict:
    payload = build_book_payload(session, book)
    category = session.get(BookCategory, book.category_id) if book.category_id is not None else None
    payload.update(
        {
            "category_id": book.category_id,
            "isbn": book.isbn,
            "barcode": book.barcode,
            "cover_url": book.cover_url,
            "shelf_status": book.shelf_status,
            "created_at": _iso(book.created_at),
            "updated_at": _iso(book.updated_at),
            "category_detail": _serialize_category(category) if category is not None else None,
            "tags": _tags_for_book(session, book.id),
            "stock_summary": _stock_summary(session, book.id),
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
    if shelf_status:
        stmt = stmt.where(Book.shelf_status == shelf_status)
    if category_id is not None:
        stmt = stmt.where(Book.category_id == category_id)
    stmt = stmt.order_by(Book.updated_at.desc(), Book.id.desc())
    books, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [serialize_book_admin(session, book) for book in books]}


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
        target_id=book.id,
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
        target_id=book.id,
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
        target_id=category.id,
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
        target_id=tag.id,
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
        target_id=alert.id,
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
        target_id=alert.id,
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
        "target_id": log.target_id,
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
        target_id=setting.id,
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
        target_id=role.id,
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
        .outerjoin(BookCopy, CabinetSlot.current_copy_id == BookCopy.id)
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
) -> dict:
    stmt = select(AlertRecord).where(AlertRecord.source_type.in_(["inventory", "cabinet"]))
    if status:
        stmt = stmt.where(AlertRecord.status == status)
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
        target_id=stock.id,
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
        target_id=profile.id,
        action="update_reader_profile",
        before_state=before_state,
        after_state=after_state,
    )
    session.commit()
    return after_state


def _serialize_recommendation_placement(placement: RecommendationPlacement) -> dict:
    return {
        "id": placement.id,
        "code": placement.code,
        "name": placement.name,
        "status": placement.status,
        "placement_type": placement.placement_type,
        "config_json": placement.config_json or {},
        "created_at": _iso(placement.created_at),
        "updated_at": _iso(placement.updated_at),
    }


def list_recommendation_placements(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(RecommendationPlacement).order_by(RecommendationPlacement.code.asc(), RecommendationPlacement.id.asc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_recommendation_placement(row) for row in rows]}


def create_recommendation_placement(session: Session, *, admin_id: int, payload: dict) -> dict:
    code = (payload.get("code") or "").strip()
    name = (payload.get("name") or "").strip()
    if not code or not name:
        raise ApiError(400, "placement_invalid", "Placement code and name are required")
    existing = session.scalar(select(RecommendationPlacement).where(RecommendationPlacement.code == code))
    if existing is not None:
        raise ApiError(409, "placement_exists", "Recommendation placement already exists")
    placement = RecommendationPlacement(
        code=code,
        name=name,
        status=payload.get("status") or "active",
        placement_type=payload.get("placement_type") or "homepage",
        config_json=payload.get("config_json") or {},
    )
    session.add(placement)
    session.flush()
    after_state = _serialize_recommendation_placement(placement)
    _audit(
        session,
        admin_id=admin_id,
        target_type="recommendation_placement",
        target_id=placement.id,
        action="create_recommendation_placement",
        after_state=after_state,
    )
    session.commit()
    return after_state


def _serialize_topic_booklist(session: Session, topic: TopicBooklist) -> dict:
    rows = session.execute(
        select(TopicBooklistItem, Book.title)
        .join(Book, TopicBooklistItem.book_id == Book.id, isouter=True)
        .where(TopicBooklistItem.topic_booklist_id == topic.id)
        .order_by(TopicBooklistItem.rank_position.asc(), TopicBooklistItem.id.asc())
    ).all()
    return {
        "id": topic.id,
        "slug": topic.slug,
        "title": topic.title,
        "description": topic.description,
        "status": topic.status,
        "audience_segment": topic.audience_segment,
        "item_count": len(rows),
        "books": [
            {
                "book_id": item.book_id,
                "title": book_title,
                "rank_position": item.rank_position,
                "note": item.note,
            }
            for item, book_title in rows
        ],
        "created_at": _iso(topic.created_at),
        "updated_at": _iso(topic.updated_at),
    }


def list_topic_booklists(session: Session, *, page: int, page_size: int) -> dict:
    stmt = select(TopicBooklist).order_by(TopicBooklist.updated_at.desc(), TopicBooklist.id.desc())
    rows, meta = _paginate(stmt, session=session, page=page, page_size=page_size)
    return {**meta, "items": [_serialize_topic_booklist(session, row) for row in rows]}


def create_topic_booklist(session: Session, *, admin_id: int, payload: dict) -> dict:
    slug = (payload.get("slug") or "").strip()
    title = (payload.get("title") or "").strip()
    if not slug or not title:
        raise ApiError(400, "topic_booklist_invalid", "Topic slug and title are required")
    existing = session.scalar(select(TopicBooklist).where(TopicBooklist.slug == slug))
    if existing is not None:
        raise ApiError(409, "topic_booklist_exists", "Topic booklist already exists")
    book_ids = [int(book_id) for book_id in (payload.get("book_ids") or [])]
    if book_ids:
        found_ids = set(session.scalars(select(Book.id).where(Book.id.in_(book_ids))).all())
        if found_ids != set(book_ids):
            raise ApiError(404, "topic_booklist_book_not_found", "One or more books were not found")
    topic = TopicBooklist(
        slug=slug,
        title=title,
        description=payload.get("description"),
        status=payload.get("status") or "draft",
        audience_segment=payload.get("audience_segment"),
    )
    session.add(topic)
    session.flush()
    for index, book_id in enumerate(book_ids, start=1):
        session.add(TopicBooklistItem(topic_booklist_id=topic.id, book_id=book_id, rank_position=index))
    session.flush()
    after_state = _serialize_topic_booklist(session, topic)
    _audit(
        session,
        admin_id=admin_id,
        target_type="topic_booklist",
        target_id=topic.id,
        action="create_topic_booklist",
        after_state=after_state,
    )
    session.commit()
    return after_state


def recommendation_insights(session: Session) -> dict:
    total_recommendations = session.scalar(select(func.count()).select_from(RecommendationLog)) or 0
    view_count = (
        session.scalar(
            select(func.count())
            .select_from(ReadingEvent)
            .where(ReadingEvent.event_type.in_(["recommendation_viewed", "recommendation_click"]))
        )
        or 0
    )
    conversion_count = (
        session.scalar(
            select(func.count())
            .select_from(ReadingEvent)
            .where(ReadingEvent.event_type.in_(["borrow_order_created", "borrow_order_completed"]))
        )
        or 0
    )
    click_through_rate = round((view_count / total_recommendations) * 100, 2) if total_recommendations else 0.0
    conversion_rate = round((conversion_count / max(view_count, 1)) * 100, 2) if view_count else 0.0
    hot_tag_rows = session.execute(
        select(BookTag.id, BookTag.name, func.count(RecommendationLog.id))
        .join(BookTagLink, BookTagLink.tag_id == BookTag.id)
        .join(RecommendationLog, RecommendationLog.book_id == BookTagLink.book_id)
        .group_by(BookTag.id, BookTag.name)
        .order_by(func.count(RecommendationLog.id).desc(), BookTag.id.asc())
        .limit(5)
    ).all()
    top_query_rows = session.execute(
        select(SearchLog.query_text, func.count())
        .group_by(SearchLog.query_text)
        .order_by(func.count().desc(), SearchLog.query_text.asc())
        .limit(5)
    ).all()
    strategy_setting = session.scalar(select(SystemSetting).where(SystemSetting.setting_key == "recommendation.weights"))
    return {
        "summary": {
            "total_recommendations": int(total_recommendations),
            "view_count": int(view_count),
            "conversion_count": int(conversion_count),
            "click_through_rate": click_through_rate,
            "conversion_rate": conversion_rate,
            "placement_count": int(session.scalar(select(func.count()).select_from(RecommendationPlacement)) or 0),
            "topic_count": int(session.scalar(select(func.count()).select_from(TopicBooklist)) or 0),
        },
        "hot_tags": [
            {"tag_id": int(tag_id), "tag_name": tag_name, "recommendation_count": int(count)}
            for tag_id, tag_name, count in hot_tag_rows
        ],
        "top_queries": [
            {"query_text": query_text, "count": int(count)}
            for query_text, count in top_query_rows
        ],
        "strategy_weights": (strategy_setting.value_json or {}) if strategy_setting is not None else {"content": 0.5, "behavior": 0.3, "freshness": 0.2},
    }
