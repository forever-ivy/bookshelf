from __future__ import annotations

from io import BytesIO

from app.auth.models import AdminAccount
from app.catalog.models import Book
from app.core.database import get_session_factory
from app.core.security import AuthIdentity, create_token, hash_password
from app.readers.models import ReaderAccount, ReaderProfile


def auth_headers(role: str, account_id: int, profile_id: int | None = None):
    token = create_token(
        AuthIdentity(account_id=account_id, role=role, profile_id=profile_id),
        ttl_minutes=30,
        token_type="access",
    )
    return {"Authorization": f"Bearer {token}"}


def seed_state() -> dict[str, int]:
    session = get_session_factory()()
    try:
        admin = AdminAccount(username="admin", password_hash=hash_password("admin-password"))
        reader = ReaderAccount(username="reader", password_hash=hash_password("reader-password"))
        session.add_all([admin, reader])
        session.flush()

        profile = ReaderProfile(account_id=reader.id, display_name="Alice")
        book = Book(
            title="计算机网络实验导学",
            author="王老师",
            category="计算机",
            keywords="网络,协议,实验",
            summary="围绕网络协议抓包、延迟分析和实验报告撰写展开。",
        )
        session.add_all([profile, book])
        session.commit()
        return {
            "admin_account_id": admin.id,
            "reader_account_id": reader.id,
            "reader_profile_id": profile.id,
            "book_id": book.id,
        }
    finally:
        session.close()

def test_admin_can_upload_book_source_document_and_learning_uses_primary_asset(client):
    state = seed_state()
    admin_headers = auth_headers("admin", state["admin_account_id"])
    reader_headers = auth_headers("reader", state["reader_account_id"], state["reader_profile_id"])

    upload_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents",
        headers=admin_headers,
        data={"source_kind": "pdf"},
        files={
            "file": (
                "network-lab.md",
                BytesIO(
                    "# 网络实验\n\n抓包可以帮助观察报文结构，延迟分析可以帮助理解网络抖动和拥塞。".encode("utf-8")
                ),
                "text/markdown",
            )
        },
    )

    assert upload_response.status_code == 201
    upload_payload = upload_response.json()
    source_document_id = upload_payload["sourceDocument"]["id"]
    assert upload_payload["sourceDocument"]["bookId"] == state["book_id"]
    assert upload_payload["sourceDocument"]["isPrimary"] is True

    profile_response = client.post(
        "/api/v2/learning/profiles",
        headers=reader_headers,
        json={
            "title": "网络实验导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )

    assert profile_response.status_code == 201
    profile_id = profile_response.json()["profile"]["id"]
    generate_response = client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=reader_headers)
    assert generate_response.status_code == 202

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=reader_headers)
    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["profile"]["status"] == "ready"
    assert detail_payload["assets"][0]["assetKind"] == "book"
    assert detail_payload["assets"][0]["bookSourceDocumentId"] == source_document_id


def test_learning_profile_can_explicitly_target_specific_book_source_document(client):
    state = seed_state()
    admin_headers = auth_headers("admin", state["admin_account_id"])
    reader_headers = auth_headers("reader", state["reader_account_id"], state["reader_profile_id"])

    primary_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents",
        headers=admin_headers,
        data={"source_kind": "pdf"},
        files={"file": ("primary.md", BytesIO("# 资料 A".encode("utf-8")), "text/markdown")},
    )
    secondary_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents",
        headers=admin_headers,
        data={"source_kind": "pdf"},
        files={"file": ("secondary.md", BytesIO("# 资料 B".encode("utf-8")), "text/markdown")},
    )
    assert primary_response.status_code == 201
    assert secondary_response.status_code == 201
    secondary_id = secondary_response.json()["sourceDocument"]["id"]

    profile_response = client.post(
        "/api/v2/learning/profiles",
        headers=reader_headers,
        json={
            "title": "指定资料导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [
                {
                    "kind": "book",
                    "bookId": state["book_id"],
                    "bookSourceDocumentId": secondary_id,
                }
            ],
        },
    )

    assert profile_response.status_code == 201
    profile_id = profile_response.json()["profile"]["id"]
    generate_response = client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=reader_headers)
    assert generate_response.status_code == 202

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=reader_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["assets"][0]["bookSourceDocumentId"] == secondary_id


def test_admin_can_promote_existing_book_source_document_to_primary_and_learning_uses_it(client):
    state = seed_state()
    admin_headers = auth_headers("admin", state["admin_account_id"])
    reader_headers = auth_headers("reader", state["reader_account_id"], state["reader_profile_id"])

    first_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents",
        headers=admin_headers,
        data={"source_kind": "pdf"},
        files={"file": ("primary.md", BytesIO("# 资料 A".encode("utf-8")), "text/markdown")},
    )
    second_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents",
        headers=admin_headers,
        data={"source_kind": "pdf"},
        files={"file": ("secondary.md", BytesIO("# 资料 B".encode("utf-8")), "text/markdown")},
    )
    assert first_response.status_code == 201
    assert second_response.status_code == 201
    first_id = first_response.json()["sourceDocument"]["id"]
    second_id = second_response.json()["sourceDocument"]["id"]
    assert first_response.json()["sourceDocument"]["isPrimary"] is True
    assert second_response.json()["sourceDocument"]["isPrimary"] is False

    promote_response = client.post(
        f"/api/v1/admin/books/{state['book_id']}/source-documents/{second_id}/primary",
        headers=admin_headers,
    )

    assert promote_response.status_code == 200
    payload = promote_response.json()
    assert payload["sourceDocument"]["id"] == second_id
    assert payload["sourceDocument"]["isPrimary"] is True

    books_response = client.get("/api/v1/admin/books", headers=admin_headers)
    assert books_response.status_code == 200
    listed_book = books_response.json()["items"][0]
    listed_documents = {item["id"]: item for item in listed_book["source_documents"]}
    assert listed_documents[first_id]["isPrimary"] is False
    assert listed_documents[second_id]["isPrimary"] is True

    profile_response = client.post(
        "/api/v2/learning/profiles",
        headers=reader_headers,
        json={
            "title": "跟随主资源导学空间",
            "goalMode": "preview",
            "difficultyMode": "guided",
            "sources": [{"kind": "book", "bookId": state["book_id"]}],
        },
    )

    assert profile_response.status_code == 201
    profile_id = profile_response.json()["profile"]["id"]
    generate_response = client.post(f"/api/v2/learning/profiles/{profile_id}/generate", headers=reader_headers)
    assert generate_response.status_code == 202

    detail_response = client.get(f"/api/v2/learning/profiles/{profile_id}", headers=reader_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["assets"][0]["bookSourceDocumentId"] == second_id
