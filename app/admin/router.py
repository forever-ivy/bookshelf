from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.admin.service import (
    apply_inventory_correction,
    acknowledge_alert,
    create_admin_book,
    create_book_category,
    create_book_tag,
    create_recommendation_placement,
    create_topic_booklist,
    dashboard_heatmap,
    dashboard_overview,
    get_admin_book,
    get_admin_reader,
    list_admin_cabinet_slots,
    list_admin_cabinets,
    list_admin_books,
    list_admin_readers,
    list_alerts,
    list_audit_logs,
    list_book_categories,
    list_book_tags,
    list_inventory_alerts,
    list_inventory_records,
    list_recommendation_placements,
    list_system_admins,
    list_system_permissions,
    list_system_roles,
    list_system_settings,
    list_topic_booklists,
    recommendation_insights,
    resolve_alert,
    set_admin_book_status,
    upsert_system_role,
    update_admin_book,
    update_admin_reader,
    upsert_system_setting,
)
from app.core.auth_context import require_admin_permission
from app.core.database import get_db
from app.core.events import broker
from app.core.security import AuthIdentity
from app.core.sse import sse_response
from app.orders.service import (
    correct_order_bundle,
    get_order_bundle,
    get_return_request_detail,
    intervene_order_bundle,
    list_order_bundles,
    list_recent_robot_events,
    list_return_requests,
    list_robot_tasks,
    list_robots,
    process_return_request,
    prioritize_order_bundle,
    reassign_robot_task,
    receive_return_request,
    retry_order_bundle,
    complete_return_request,
    serialize_order,
    serialize_return_request,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/dashboard/overview")
def dashboard_overview_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("dashboard.view")),
    session: Session = Depends(get_db),
):
    return dashboard_overview(session)


@router.get("/dashboard/heatmap")
def dashboard_heatmap_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("dashboard.view")),
    session: Session = Depends(get_db),
):
    return dashboard_heatmap(session)


@router.get("/cabinets")
def list_cabinets_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    _identity: AuthIdentity = Depends(require_admin_permission("inventory.manage")),
    session: Session = Depends(get_db),
):
    return list_admin_cabinets(session, page=page, page_size=page_size, status=status_filter)


@router.get("/cabinets/{cabinet_id}/slots")
def list_cabinet_slots_endpoint(
    cabinet_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    _identity: AuthIdentity = Depends(require_admin_permission("inventory.manage")),
    session: Session = Depends(get_db),
):
    return list_admin_cabinet_slots(
        session,
        cabinet_id=cabinet_id,
        page=page,
        page_size=page_size,
        status=status_filter,
    )


@router.get("/inventory/records")
def list_inventory_records_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    cabinet_id: str | None = None,
    event_type: str | None = None,
    _identity: AuthIdentity = Depends(require_admin_permission("inventory.manage")),
    session: Session = Depends(get_db),
):
    return list_inventory_records(
        session,
        page=page,
        page_size=page_size,
        cabinet_id=cabinet_id,
        event_type=event_type,
    )


@router.get("/inventory/alerts")
def list_inventory_alerts_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    _identity: AuthIdentity = Depends(require_admin_permission("inventory.manage")),
    session: Session = Depends(get_db),
):
    return list_inventory_alerts(session, page=page, page_size=page_size, status=status_filter)


@router.post("/inventory/corrections")
def apply_inventory_correction_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("inventory.manage")),
    session: Session = Depends(get_db),
):
    return {"correction": apply_inventory_correction(session, admin_id=identity.account_id, payload=payload)}


@router.get("/books")
def list_books_endpoint(
    query: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    shelf_status: str | None = None,
    category_id: int | None = None,
    _identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return list_admin_books(
        session,
        query=query,
        page=page,
        page_size=page_size,
        shelf_status=shelf_status,
        category_id=category_id,
    )


@router.post("/books", status_code=status.HTTP_201_CREATED)
def create_book_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {"book": create_admin_book(session, admin_id=identity.account_id, payload=payload)}


@router.get("/books/{book_id}")
def get_book_endpoint(
    book_id: int,
    _identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {"book": get_admin_book(session, book_id)}


@router.patch("/books/{book_id}")
def update_book_endpoint(
    book_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {"book": update_admin_book(session, book_id=book_id, admin_id=identity.account_id, payload=payload)}


@router.post("/books/{book_id}/status")
def set_book_status_endpoint(
    book_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {
        "book": set_admin_book_status(
            session,
            book_id=book_id,
            admin_id=identity.account_id,
            shelf_status=str(payload.get("shelf_status") or ""),
        )
    }


@router.get("/categories")
def list_categories_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return list_book_categories(session, page=page, page_size=page_size)


@router.post("/categories", status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {"category": create_book_category(session, admin_id=identity.account_id, payload=payload)}


@router.get("/tags")
def list_tags_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return list_book_tags(session, page=page, page_size=page_size)


@router.post("/tags", status_code=status.HTTP_201_CREATED)
def create_tag_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("books.manage")),
    session: Session = Depends(get_db),
):
    return {"tag": create_book_tag(session, admin_id=identity.account_id, payload=payload)}


@router.get("/alerts")
def list_alerts_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    severity: str | None = None,
    _identity: AuthIdentity = Depends(require_admin_permission("alerts.manage")),
    session: Session = Depends(get_db),
):
    return list_alerts(session, page=page, page_size=page_size, status=status_filter, severity=severity)


@router.get("/readers")
def list_admin_readers_endpoint(
    query: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    restriction_status: str | None = None,
    segment_code: str | None = None,
    _identity: AuthIdentity = Depends(require_admin_permission("readers.manage")),
    session: Session = Depends(get_db),
):
    return list_admin_readers(
        session,
        query=query,
        page=page,
        page_size=page_size,
        restriction_status=restriction_status,
        segment_code=segment_code,
    )


@router.get("/readers/{reader_id}")
def get_admin_reader_endpoint(
    reader_id: int,
    _identity: AuthIdentity = Depends(require_admin_permission("readers.manage")),
    session: Session = Depends(get_db),
):
    return {"reader": get_admin_reader(session, reader_id)}


@router.patch("/readers/{reader_id}")
def update_admin_reader_endpoint(
    reader_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("readers.manage")),
    session: Session = Depends(get_db),
):
    return {"reader": update_admin_reader(session, reader_id=reader_id, admin_id=identity.account_id, payload=payload)}


@router.get("/recommendation/placements")
def list_recommendation_placements_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("recommendation.manage")),
    session: Session = Depends(get_db),
):
    return list_recommendation_placements(session, page=page, page_size=page_size)


@router.post("/recommendation/placements", status_code=status.HTTP_201_CREATED)
def create_recommendation_placement_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("recommendation.manage")),
    session: Session = Depends(get_db),
):
    return {"placement": create_recommendation_placement(session, admin_id=identity.account_id, payload=payload)}


@router.get("/recommendation/topic-booklists")
def list_topic_booklists_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("recommendation.manage")),
    session: Session = Depends(get_db),
):
    return list_topic_booklists(session, page=page, page_size=page_size)


@router.post("/recommendation/topic-booklists", status_code=status.HTTP_201_CREATED)
def create_topic_booklists_endpoint(
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("recommendation.manage")),
    session: Session = Depends(get_db),
):
    return {"topic_booklist": create_topic_booklist(session, admin_id=identity.account_id, payload=payload)}


@router.get("/recommendation/insights")
def recommendation_insights_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("recommendation.manage")),
    session: Session = Depends(get_db),
):
    return recommendation_insights(session)


@router.get("/audit-logs")
def list_audit_logs_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin_id: int | None = None,
    target_type: str | None = None,
    action: str | None = None,
    _identity: AuthIdentity = Depends(require_admin_permission("system.audit.view")),
    session: Session = Depends(get_db),
):
    return list_audit_logs(
        session,
        page=page,
        page_size=page_size,
        admin_id=admin_id,
        target_type=target_type,
        action=action,
    )


@router.post("/alerts/{alert_id}/ack")
def acknowledge_alert_endpoint(
    alert_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("alerts.manage")),
    session: Session = Depends(get_db),
):
    return {
        "alert": acknowledge_alert(
            session,
            alert_id=alert_id,
            admin_id=identity.account_id,
            note=payload.get("note"),
        )
    }


@router.post("/alerts/{alert_id}/resolve")
def resolve_alert_endpoint(
    alert_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("alerts.manage")),
    session: Session = Depends(get_db),
):
    return {
        "alert": resolve_alert(
            session,
            alert_id=alert_id,
            admin_id=identity.account_id,
            note=payload.get("note"),
        )
    }


@router.get("/system/settings")
def list_system_settings_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("system.settings.manage")),
    session: Session = Depends(get_db),
):
    return list_system_settings(session, page=page, page_size=page_size)


@router.put("/system/settings/{setting_key}")
def upsert_system_setting_endpoint(
    setting_key: str,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("system.settings.manage")),
    session: Session = Depends(get_db),
):
    return {
        "setting": upsert_system_setting(
            session,
            setting_key=setting_key,
            admin_id=identity.account_id,
            payload=payload,
        )
    }


@router.get("/system/permissions")
def list_system_permissions_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("system.roles.manage")),
    session: Session = Depends(get_db),
):
    return list_system_permissions(session, page=page, page_size=page_size)


@router.get("/system/roles")
def list_system_roles_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("system.roles.manage")),
    session: Session = Depends(get_db),
):
    return list_system_roles(session, page=page, page_size=page_size)


@router.put("/system/roles/{role_code}")
def upsert_system_role_endpoint(
    role_code: str,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("system.roles.manage")),
    session: Session = Depends(get_db),
):
    return {
        "role": upsert_system_role(
            session,
            role_code=role_code,
            admin_id=identity.account_id,
            payload=payload,
        )
    }


@router.get("/system/admins")
def list_system_admins_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _identity: AuthIdentity = Depends(require_admin_permission("system.roles.manage")),
    session: Session = Depends(get_db),
):
    return list_system_admins(session, page=page, page_size=page_size)


@router.get("/orders")
def list_orders_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    return {"items": [serialize_order(bundle) for bundle in list_order_bundles(session)]}


@router.get("/return-requests")
def list_return_requests_endpoint(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: str | None = Query(default=None, alias="status"),
    borrow_order_id: int | None = None,
    reader_id: int | None = Query(default=None, ge=1),
    _identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    return list_return_requests(
        session,
        page=page,
        page_size=page_size,
        status=status_filter,
        borrow_order_id=borrow_order_id,
        reader_id=reader_id,
    )


@router.get("/return-requests/{return_request_id}")
def get_return_request_endpoint(
    return_request_id: int,
    _identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    return get_return_request_detail(session, return_request_id=return_request_id)


@router.get("/tasks")
def list_tasks_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("robots.manage")),
    session: Session = Depends(get_db),
):
    return {"items": list_robot_tasks(session)}


@router.get("/robots")
def list_robots_endpoint(
    _identity: AuthIdentity = Depends(require_admin_permission("robots.manage")),
    session: Session = Depends(get_db),
):
    return {"items": list_robots(session)}


@router.get("/events")
def list_events_endpoint(
    limit: int = 20,
    _identity: AuthIdentity = Depends(require_admin_permission("robots.manage")),
    session: Session = Depends(get_db),
):
    return {"items": list_recent_robot_events(session, limit=limit)}


@router.get("/orders/{borrow_order_id}")
def get_order_endpoint(
    borrow_order_id: int,
    _identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    return serialize_order(get_order_bundle(session, borrow_order_id))


@router.patch("/orders/{borrow_order_id}/state")
def correct_order_state_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    bundle = correct_order_bundle(
        session,
        borrow_order_id=borrow_order_id,
        admin_id=identity.account_id,
        borrow_status=payload.get("borrow_status"),
        delivery_status=payload.get("delivery_status"),
        robot_status=payload.get("robot_status"),
        task_status=payload.get("task_status"),
    )
    return serialize_order(bundle)


@router.post("/orders/{borrow_order_id}/priority")
def prioritize_order_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    bundle = prioritize_order_bundle(
        session,
        borrow_order_id=borrow_order_id,
        admin_id=identity.account_id,
        priority=str(payload.get("priority") or ""),
    )
    return serialize_order(bundle)


@router.post("/orders/{borrow_order_id}/intervene")
def intervene_order_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    bundle = intervene_order_bundle(
        session,
        borrow_order_id=borrow_order_id,
        admin_id=identity.account_id,
        intervention_status=str(payload.get("intervention_status") or ""),
        failure_reason=payload.get("failure_reason"),
    )
    return serialize_order(bundle)


@router.post("/orders/{borrow_order_id}/retry")
def retry_order_endpoint(
    borrow_order_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    bundle = retry_order_bundle(
        session,
        borrow_order_id=borrow_order_id,
        admin_id=identity.account_id,
        note=payload.get("note"),
    )
    return serialize_order(bundle)


@router.post("/tasks/{task_id}/reassign")
def reassign_robot_task_endpoint(
    task_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("robots.manage")),
    session: Session = Depends(get_db),
):
    return reassign_robot_task(
        session,
        task_id=task_id,
        admin_id=identity.account_id,
        robot_id=int(payload.get("robot_id")),
        reason=payload.get("reason"),
    )


@router.post("/return-requests/{return_request_id}/receive")
def receive_return_request_endpoint(
    return_request_id: int,
    payload: dict,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    request_row = receive_return_request(
        session,
        return_request_id=return_request_id,
        admin_id=identity.account_id,
        note=payload.get("note"),
    )
    return {"return_request": serialize_return_request(request_row)}


@router.post("/return-requests/{return_request_id}/complete")
def complete_return_request_endpoint(
    return_request_id: int,
    payload: dict | None = None,
    identity: AuthIdentity = Depends(require_admin_permission("orders.manage")),
    session: Session = Depends(get_db),
):
    payload = payload or {}
    cabinet_id = str(payload.get("cabinet_id") or "").strip()
    if not cabinet_id:
        return process_return_request(
            session,
            return_request_id=return_request_id,
            admin_id=identity.account_id,
        )
    return complete_return_request(
        session,
        return_request_id=return_request_id,
        admin_id=identity.account_id,
        cabinet_id=cabinet_id,
        slot_code=payload.get("slot_code"),
        note=payload.get("note"),
    )


@router.get("/events/stream")
async def events_stream_endpoint(_identity: AuthIdentity = Depends(require_admin_permission("robots.manage"))):
    async def event_iter():
        async for event in broker.subscribe():
            yield event

    return sse_response(event_iter())
