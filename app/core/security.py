from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from hashlib import sha256

import jwt

from app.core.config import get_settings
from app.core.errors import ApiError


@dataclass
class AuthIdentity:
    account_id: int
    role: str
    profile_id: int | None = None


def hash_password(password: str) -> str:
    settings = get_settings()
    digest = sha256(f"{settings.jwt_secret}:{password}".encode("utf-8")).hexdigest()
    return digest


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def create_token(identity: AuthIdentity, *, ttl_minutes: int, token_type: str) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(identity.account_id),
        "role": identity.role,
        "profile_id": identity.profile_id,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=ttl_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, token_type: str) -> AuthIdentity:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError as exc:
        raise ApiError(401, "token_invalid", "Invalid token") from exc
    if payload.get("type") != token_type:
        raise ApiError(401, "token_type_invalid", "Invalid token type")
    return AuthIdentity(
        account_id=int(payload["sub"]),
        role=str(payload["role"]),
        profile_id=payload.get("profile_id"),
    )
