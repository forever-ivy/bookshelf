from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.analytics.service import (
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

router = APIRouter(prefix="/api/v1/admin/analytics", tags=["analytics"])


@router.get("/borrow-trends")
def borrow_trends_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_borrow_trends(session, days=days)


@router.get("/college-preferences")
def college_preferences_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_college_preferences(session)


@router.get("/time-peaks")
def time_peaks_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_time_peaks(session, days=days)


@router.get("/popular-books")
def popular_books_endpoint(
    limit: int = Query(default=10, ge=1, le=50),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_popular_books(session, limit=limit)


@router.get("/cabinet-turnover")
def cabinet_turnover_endpoint(
    days: int = Query(default=7, ge=1, le=365),
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_cabinet_turnover(session, days=days)


@router.get("/robot-efficiency")
def robot_efficiency_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_robot_efficiency(session)


@router.get("/retention")
def retention_endpoint(
    _identity: AuthIdentity = Depends(require_admin),
    session: Session = Depends(get_db),
):
    return get_retention_metrics(session)
