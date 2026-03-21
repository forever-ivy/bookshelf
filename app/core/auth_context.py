from __future__ import annotations

from fastapi import Depends, Header

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


def require_reader(identity: AuthIdentity = Depends(get_identity)) -> AuthIdentity:
    if identity.role != "reader":
        raise ApiError(403, "reader_required", "Reader access required")
    return identity
