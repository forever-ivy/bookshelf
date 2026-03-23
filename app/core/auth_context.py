from __future__ import annotations

from fastapi import Depends, Header
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.admin.models import AdminPermission, AdminRole, AdminRoleAssignment, AdminRolePermission
from app.core.database import get_db
from app.core.errors import ApiError
from app.core.security import AuthIdentity, decode_token


def get_identity(authorization: str | None = Header(default=None)) -> AuthIdentity:
    if not authorization or not authorization.startswith("Bearer "):
        raise ApiError(401, "auth_required", "Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise ApiError(401, "auth_required", "Missing bearer token")
    return decode_token(token, token_type="access")


def require_admin(identity: AuthIdentity = Depends(get_identity)) -> AuthIdentity:
    if identity.role != "admin":
        raise ApiError(403, "admin_required", "Admin access required")
    return identity


def get_admin_access_snapshot(session: Session, admin_id: int) -> dict[str, object]:
    role_codes = session.scalars(
        select(AdminRole.code)
        .join(AdminRoleAssignment, AdminRoleAssignment.role_id == AdminRole.id)
        .where(AdminRoleAssignment.admin_id == admin_id)
        .order_by(AdminRole.code.asc())
    ).all()
    if not role_codes:
        return {
            "role_codes": [],
            "permission_codes": [],
            "is_full_access": True,
        }

    permission_codes = session.scalars(
        select(AdminPermission.code)
        .join(AdminRolePermission, AdminRolePermission.permission_id == AdminPermission.id)
        .join(AdminRoleAssignment, AdminRoleAssignment.role_id == AdminRolePermission.role_id)
        .where(AdminRoleAssignment.admin_id == admin_id)
        .distinct()
        .order_by(AdminPermission.code.asc())
    ).all()
    return {
        "role_codes": role_codes,
        "permission_codes": permission_codes,
        "is_full_access": False,
    }


def require_admin_permission(permission_code: str):
    def dependency(
        identity: AuthIdentity = Depends(require_admin),
        session: Session = Depends(get_db),
    ) -> AuthIdentity:
        snapshot = get_admin_access_snapshot(session, identity.account_id)
        if bool(snapshot["is_full_access"]) or permission_code in set(snapshot["permission_codes"]):
            return identity
        raise ApiError(403, "admin_permission_required", f"Admin permission required: {permission_code}")

    return dependency


def require_reader(identity: AuthIdentity = Depends(get_identity)) -> AuthIdentity:
    if identity.role != "reader":
        raise ApiError(403, "reader_required", "Reader access required")
    return identity
