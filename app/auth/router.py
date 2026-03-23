from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import crud
from app.auth.models import AdminAccount
from app.auth.schemas import (
    AuthResponse,
    IdentityResponse,
    LoginRequest,
    RefreshRequest,
)
from app.core.auth_context import get_admin_access_snapshot, get_identity, require_admin, require_reader
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity, decode_token
from app.readers.models import ReaderAccount, ReaderProfile

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


def _account_out(session: Session, identity: AuthIdentity):
    if identity.role == "admin":
        account = session.scalar(select(AdminAccount).where(AdminAccount.id == identity.account_id))
        if account is None:
            raise ApiError(404, "account_not_found", "Account not found")
        snapshot = get_admin_access_snapshot(session, account.id)
        return {
            "id": account.id,
            "username": account.username,
            "role": "admin",
            "role_codes": list(snapshot["role_codes"]),
            "permission_codes": list(snapshot["permission_codes"]),
        }, None

    account = session.scalar(select(ReaderAccount).where(ReaderAccount.id == identity.account_id))
    if account is None:
        raise ApiError(404, "account_not_found", "Account not found")
    profile = session.scalar(select(ReaderProfile).where(ReaderProfile.account_id == identity.account_id))
    profile_out = None
    if profile is not None:
        profile_out = {
            "id": profile.id,
            "display_name": profile.display_name,
            "affiliation_type": profile.affiliation_type,
            "college": profile.college,
            "major": profile.major,
            "grade_year": profile.grade_year,
        }
    return {"id": account.id, "username": account.username, "role": "reader"}, profile_out


def _build_identity_response(session: Session, identity: AuthIdentity) -> IdentityResponse:
    account, profile = _account_out(session, identity)
    return IdentityResponse(
        account_id=identity.account_id,
        role=identity.role,
        profile_id=identity.profile_id,
        account=account,
        profile=profile,
    )


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, session: Session = Depends(get_db)):
    auth_result = crud.authenticate(session, payload.username, payload.password, payload.role)
    if auth_result is None:
        raise ApiError(401, "invalid_credentials", "Invalid credentials")

    identity = AuthIdentity(
        account_id=auth_result["account_id"],
        role=auth_result["role"],
        profile_id=auth_result["profile_id"],
    )
    tokens = crud.build_auth_tokens(identity.account_id, identity.role, identity.profile_id)
    account, profile = _account_out(session, identity)
    return {**tokens, "account": account, "profile": profile}


@router.post("/refresh", response_model=AuthResponse)
def refresh(payload: RefreshRequest, session: Session = Depends(get_db)):
    identity = decode_token(payload.refresh_token, token_type="refresh")
    tokens = crud.build_auth_tokens(identity.account_id, identity.role, identity.profile_id)
    account, profile = _account_out(session, identity)
    return {**tokens, "account": account, "profile": profile}


@router.get("/me", response_model=IdentityResponse)
def me(identity: AuthIdentity = Depends(get_identity), session: Session = Depends(get_db)):
    return _build_identity_response(session, identity)


@router.get("/admin/me", response_model=IdentityResponse)
def admin_me(identity: AuthIdentity = Depends(require_admin), session: Session = Depends(get_db)):
    return _build_identity_response(session, identity)


@router.get("/reader/me", response_model=IdentityResponse)
def reader_me(identity: AuthIdentity = Depends(require_reader), session: Session = Depends(get_db)):
    return _build_identity_response(session, identity)
