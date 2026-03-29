from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.service import (
    build_overview_snapshot,
    build_trends_snapshot,
    get_borrow_trends,
    get_cabinet_turnover,
    get_college_preferences,
    get_popular_books,
    get_retention_metrics,
    get_robot_efficiency,
    get_time_peaks,
)
from app.core.auth_context import require_admin
from app.core.database import get_db
from app.core.security import AuthIdentity

router = APIRouter(tags=["analytics"])


@router.get("/api/v1/analytics/overview")
def analytics_overview(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
) -> dict:
    return {"overview": build_overview_snapshot(session)}


@router.get("/api/v1/analytics/trends")
def analytics_trends(
    limit: int = Query(default=10, ge=1, le=50),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
) -> dict:
    return {"trends": build_trends_snapshot(session, limit=limit)}


@router.get("/api/v1/admin/analytics/borrow-trends")
def borrow_trends_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_borrow_trends(session, days=days, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/college-preferences")
def college_preferences_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_college_preferences(session, days=days, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/time-peaks")
def time_peaks_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_time_peaks(session, days=days, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/popular-books")
def popular_books_endpoint(
    limit: int = Query(default=10, ge=1, le=50),
    days: int = Query(default=7, ge=1, le=365),
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_popular_books(session, limit=limit, days=days, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/cabinet-turnover")
def cabinet_turnover_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_cabinet_turnover(session, days=days, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/robot-efficiency")
def robot_efficiency_endpoint(
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_robot_efficiency(session, anchor_date=anchor_date)


@router.get("/api/v1/admin/analytics/retention")
def retention_endpoint(
    anchor_date: date | None = Query(default=None),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_retention_metrics(session, anchor_date=anchor_date)
