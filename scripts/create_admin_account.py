from __future__ import annotations

import argparse

from sqlalchemy import select

from app.auth.models import AdminAccount
from app.core.config import get_settings
from app.core.database import get_session_factory, init_engine
from app.core.security import hash_password


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create or update a development admin account.")
    parser.add_argument("--username", default="admin", help="Admin username to create or update.")
    parser.add_argument("--password", default="admin-pass", help="Admin password to set.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    username = (args.username or "").strip()
    password = args.password or ""
    if not username:
        raise ValueError("--username is required")
    if not password:
        raise ValueError("--password is required")

    settings = get_settings()
    init_engine(settings)
    session_factory = get_session_factory()

    with session_factory() as session:
        account = session.scalar(select(AdminAccount).where(AdminAccount.username == username))
        action = "updated"
        if account is None:
            account = AdminAccount(
                username=username,
                password_hash=hash_password(password),
            )
            session.add(account)
            action = "created"
        else:
            account.password_hash = hash_password(password)
            session.add(account)

        session.commit()
        session.refresh(account)

    print(f"Admin account {action}: username={username} id={account.id}")
    print("Login endpoint: POST /api/v1/auth/login")
    print(f"Suggested credentials: username={username} password={password} role=admin")


if __name__ == "__main__":
    main()
