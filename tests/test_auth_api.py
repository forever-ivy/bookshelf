from __future__ import annotations

from app.auth.models import AdminAccount
from app.core.database import get_session_factory
from app.core.security import hash_password
from app.readers.models import ReaderAccount, ReaderProfile


def seed_accounts() -> dict[str, int]:
    session = get_session_factory()()
    try:
        admin = AdminAccount(username="admin", password_hash=hash_password("admin-pass"))
        reader = ReaderAccount(username="reader", password_hash=hash_password("reader-pass"))
        session.add_all([admin, reader])
        session.flush()
        profile = ReaderProfile(
            account_id=reader.id,
            display_name="Reader One",
            affiliation_type="student",
            college="Library Arts",
            major="Information Science",
            grade_year="2026",
        )
        session.add(profile)
        session.commit()
        return {"admin_id": admin.id, "reader_id": reader.id, "profile_id": profile.id}
    finally:
        session.close()


def login(client, username: str, password: str, role: str):
    return client.post(
        "/api/v1/auth/login",
        json={"username": username, "password": password, "role": role},
    )


def test_login_role_is_schema_constrained(client):
    response = login(client, "admin", "admin-pass", "guest")

    assert response.status_code == 422


def test_admin_login_refresh_and_me(client):
    ids = seed_accounts()

    login_response = login(client, "admin", "admin-pass", "admin")
    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload["account"]["id"] == ids["admin_id"]
    assert payload["account"]["role"] == "admin"
    assert "access_token" in payload
    assert "refresh_token" in payload

    me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {payload['access_token']}"})
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "admin"
    assert me_response.json()["account_id"] == ids["admin_id"]

    refresh_response = client.post("/api/v1/auth/refresh", json={"refresh_token": payload["refresh_token"]})
    assert refresh_response.status_code == 200
    assert refresh_response.json()["account"]["id"] == ids["admin_id"]
    assert refresh_response.json()["account"]["role"] == "admin"
    assert refresh_response.json()["access_token"] != payload["access_token"]


def test_invalid_credentials_and_refresh_token_are_rejected(client):
    seed_accounts()

    bad_login = login(client, "admin", "wrong-pass", "admin")
    assert bad_login.status_code == 401

    bad_refresh = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-token"})
    assert bad_refresh.status_code == 401


def test_reader_login_and_role_gates(client):
    ids = seed_accounts()

    login_response = login(client, "reader", "reader-pass", "reader")
    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload["account"]["id"] == ids["reader_id"]
    assert payload["profile"]["id"] == ids["profile_id"]

    admin_gate = client.get("/api/v1/auth/admin/me", headers={"Authorization": f"Bearer {payload['access_token']}"})
    assert admin_gate.status_code == 403

    reader_gate = client.get("/api/v1/auth/reader/me", headers={"Authorization": f"Bearer {payload['access_token']}"})
    assert reader_gate.status_code == 200
    assert reader_gate.json()["profile_id"] == ids["profile_id"]


def test_pair_init_routes_are_removed_for_single_library_backend(client):
    seed_accounts()
    admin_login = login(client, "admin", "admin-pass", "admin").json()

    issue = client.post(
        "/api/v1/auth/init/pair/issue",
        headers={"Authorization": f"Bearer {admin_login['access_token']}"},
    )
    exchange = client.post(
        "/api/v1/auth/init/pair/exchange",
        headers={"Authorization": f"Bearer {admin_login['access_token']}"},
        json={"pair_code": "deadbeef"},
    )

    assert issue.status_code == 404
    assert exchange.status_code == 404
