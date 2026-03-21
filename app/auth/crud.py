from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import AdminAccount
from app.core.config import get_settings
from app.core.security import AuthIdentity, verify_password
from app.readers.models import ReaderAccount, ReaderProfile


def fetch_admin_by_id(session: Session, account_id: int) -> AdminAccount | None:
    return session.scalar(select(AdminAccount).where(AdminAccount.id == account_id))


def fetch_admin_by_username(session: Session, username: str) -> AdminAccount | None:
    return session.scalar(select(AdminAccount).where(AdminAccount.username == username))


def fetch_reader_by_id(session: Session, account_id: int) -> ReaderAccount | None:
    return session.scalar(select(ReaderAccount).where(ReaderAccount.id == account_id))


def fetch_reader_by_username(session: Session, username: str) -> ReaderAccount | None:
    return session.scalar(select(ReaderAccount).where(ReaderAccount.username == username))


def fetch_reader_profile_by_account_id(session: Session, account_id: int) -> ReaderProfile | None:
    return session.scalar(select(ReaderProfile).where(ReaderProfile.account_id == account_id))


def build_auth_tokens(account_id: int, role: str, profile_id: int | None) -> dict[str, str]:
    settings = get_settings()
    now = datetime.now(UTC)
    base_payload = {
        "sub": str(account_id),
        "role": role,
        "profile_id": profile_id,
        "iat": int(now.timestamp()),
    }
    return {
        "access_token": jwt.encode(
            {
                **base_payload,
                "type": "access",
                "exp": int((now + timedelta(minutes=settings.access_token_ttl_minutes)).timestamp()),
                "jti": secrets.token_hex(8),
            },
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        ),
        "refresh_token": jwt.encode(
            {
                **base_payload,
                "type": "refresh",
                "exp": int((now + timedelta(minutes=settings.refresh_token_ttl_minutes)).timestamp()),
                "jti": secrets.token_hex(8),
            },
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        ),
    }


def authenticate(session: Session, username: str, password: str, role: str):
    role = role.strip().lower()
    if role == "admin":
        account = fetch_admin_by_username(session, username)
        if account and verify_password(password, account.password_hash):
            return {"account_id": account.id, "role": "admin", "profile_id": None}
        return None
    if role == "reader":
        account = fetch_reader_by_username(session, username)
        if account and verify_password(password, account.password_hash):
            profile = fetch_reader_profile_by_account_id(session, account.id)
            return {"account_id": account.id, "role": "reader", "profile_id": profile.id if profile else None}
        return None
    return None
