from __future__ import annotations

import importlib
import os
import shutil
import sqlite3
import sys
import tempfile
import types
import unittest
from unittest.mock import patch


REPO_ROOT = os.path.dirname(os.path.dirname(__file__))
SOURCE_DB_PATH = os.path.join(REPO_ROOT, "data", "bookshelf.db")


def reset_auth_related_rows(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    existing_tables = {row[0] for row in cur.fetchall()}
    cur.execute("PRAGMA foreign_keys=OFF")
    for table_name in [
        "pair_codes",
        "cabinet_config",
        "account_user_rel",
        "user_sessions",
        "user_badges",
        "required_books",
        "reading_goals",
        "reading_events",
        "borrow_logs",
        "users",
        "families",
        "accounts",
    ]:
        if table_name in existing_tables:
            cur.execute(f"DELETE FROM {table_name}")
    conn.commit()
    conn.close()


def install_test_stubs():
    def stub_module(name: str, **attrs):
        module = types.ModuleType(name)
        for key, value in attrs.items():
            setattr(module, key, value)
        sys.modules[name] = module

    stub_module(
        "ai.voice_module",
        speak=lambda *_args, **_kwargs: None,
        listen=lambda *_args, **_kwargs: "",
        listen_wake_only=lambda *_args, **_kwargs: False,
        transcribe_wav_bytes=lambda *_args, **_kwargs: "",
        tts_to_mp3_bytes=lambda *_args, **_kwargs: b"",
        tts_to_wav_bytes=lambda *_args, **_kwargs: b"",
        _has_wake=lambda *_args, **_kwargs: False,
    )
    stub_module(
        "ai.book_match_ai",
        chat_with_librarian=lambda *_args, **_kwargs: "stub reply",
        get_ai_reading_analysis=lambda *_args, **_kwargs: "stub insight",
        get_chat_history=lambda *_args, **_kwargs: [],
        clear_chat_history=lambda *_args, **_kwargs: None,
        _get_current_user_safe=lambda *_args, **_kwargs: None,
        get_or_create_book_by_ai=lambda *_args, **_kwargs: {"id": 1, "title": "Stub Book"},
        trigger_action_chat=lambda *_args, **_kwargs: "stub action",
        ollama_call=lambda *_args, **_kwargs: {},
    )
    stub_module(
        "ocr.paddle_ocr",
        ocr_image=lambda *_args, **_kwargs: [],
        stabilize_ocr_texts=lambda texts, **_kwargs: texts,
    )
    stub_module(
        "ocr.video_ocr",
        recognize_book_from_camera=lambda *_args, **_kwargs: None,
    )
    stub_module(
        "services.shelf_service",
        store_via_ocr=lambda *_args, **_kwargs: (True, "stored", "stub action"),
        take_by_text=lambda *_args, **_kwargs: (True, "taken", "stub action"),
        store_from_image_bytes=lambda *_args, **_kwargs: (True, "stored", "stub action"),
    )
    stub_module(
        "services.voice_service",
        push_voice_event=lambda *_args, **_kwargs: None,
        get_voice_events=lambda *_args, **_kwargs: [],
        route_text=lambda text, **_kwargs: {"ok": True, "text": text, "reply": "stub reply"},
        build_voice_hints=lambda: [],
        wake_loop=lambda: None,
    )
    stub_module(
        "services.ai_dispatch",
        dispatch_with_model=lambda *_args, **_kwargs: ("", [], ""),
        execute_model_commands=lambda *_args, **_kwargs: {"ok": True},
    )


class AuthFlowTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.db_path = os.path.join(self.tempdir.name, "bookshelf.db")
        shutil.copyfile(SOURCE_DB_PATH, self.db_path)
        reset_auth_related_rows(self.db_path)

        self.patchers = []
        for module_name, attr_name in [
            ("config", "DB_PATH"),
            ("extensions", "DB_PATH"),
            ("db.user_ops", "DB_PATH"),
            ("db.shelf_ops", "DB_PATH"),
            ("db.book_match", "DB_PATH"),
        ]:
            module = importlib.import_module(module_name)
            patcher = patch.object(module, attr_name, self.db_path)
            patcher.start()
            self.patchers.append(patcher)

        install_test_stubs()
        for module_name in ["app", "api.shelf", "api.voice", "api.chat"]:
            sys.modules.pop(module_name, None)
        app_module = importlib.import_module("app")
        self.app = app_module.create_app()
        self.app.config.update(TESTING=True)
        self.client = self.app.test_client()

    def issue_pair_code(self):
        response = self.client.post("/api/auth/pair/issue")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["ok"])
        return payload["data"]

    def exchange_pair_code(self, pair_code: str):
        response = self.client.post("/api/auth/pair/exchange", json={"pair_code": pair_code})
        return response

    def register_account(
        self,
        *,
        pair_token: str,
        username: str,
        password: str,
        name: str,
        family_name: str | None = None,
    ):
        body = {
            "pair_token": pair_token,
            "username": username,
            "password": password,
            "name": name,
        }
        if family_name:
            body["family_name"] = family_name
        return self.client.post("/api/auth/register", json=body)

    def login(self, *, username: str, password: str):
        return self.client.post(
            "/api/auth/login",
            json={"username": username, "password": password},
        )

    def tearDown(self):
        for patcher in reversed(self.patchers):
            patcher.stop()
        self.tempdir.cleanup()

    def test_issue_and_exchange_pair_code(self):
        issue_response = self.client.post("/api/auth/pair/issue")

        self.assertEqual(issue_response.status_code, 200)
        issued_payload = issue_response.get_json()
        self.assertTrue(issued_payload["ok"])
        self.assertIn("bind_url", issued_payload["data"])
        self.assertIn("pair_code", issued_payload["data"])

        exchange_response = self.client.post(
            "/api/auth/pair/exchange",
            json={"pair_code": issued_payload["data"]["pair_code"]},
        )

        self.assertEqual(exchange_response.status_code, 200)
        exchanged_payload = exchange_response.get_json()
        self.assertTrue(exchanged_payload["ok"])
        self.assertEqual(
            exchanged_payload["data"]["pair_code"],
            issued_payload["data"]["pair_code"],
        )
        self.assertTrue(exchanged_payload["data"]["requires_setup"])

    def test_issue_pair_code_rewrites_localhost_origin_to_lan_ip(self):
        import auth_utils

        with patch.object(auth_utils, "_guess_public_ipv4", return_value="172.20.10.5"):
            issue_response = self.client.post(
                "/api/auth/pair/issue",
                base_url="http://127.0.0.1:5000",
            )

        self.assertEqual(issue_response.status_code, 200)
        payload = issue_response.get_json()
        self.assertTrue(payload["ok"])
        self.assertTrue(
            payload["data"]["bind_url"].startswith(
                "http://172.20.10.5:5000/bind?pair_code="
            )
        )

    def test_pair_code_cannot_be_reused_after_exchange(self):
        issued_payload = self.issue_pair_code()

        first_exchange = self.exchange_pair_code(issued_payload["pair_code"])
        self.assertEqual(first_exchange.status_code, 200)

        second_exchange = self.exchange_pair_code(issued_payload["pair_code"])
        self.assertEqual(second_exchange.status_code, 400)
        payload = second_exchange.get_json()
        self.assertFalse(payload["ok"])

    def test_first_registration_bootstraps_admin_parent_and_jwt_me(self):
        issued_payload = self.issue_pair_code()
        exchange_payload = self.exchange_pair_code(issued_payload["pair_code"]).get_json()["data"]

        register_response = self.register_account(
            pair_token=exchange_payload["pair_token"],
            username="ivy-admin",
            password="p@ssw0rd123",
            name="Ivy",
            family_name="Ivy Family",
        )

        self.assertEqual(register_response.status_code, 200)
        payload = register_response.get_json()
        self.assertTrue(payload["ok"])
        self.assertEqual(payload["data"]["account"]["system_role"], "admin")
        self.assertEqual(payload["data"]["user"]["role"], "parent")
        self.assertTrue(payload["data"]["cabinet"]["initialized"])
        self.assertIn("bookshelf_auth_token=", register_response.headers.get("Set-Cookie", ""))

        token = payload["data"]["token"]
        me_response = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(me_response.status_code, 200)
        me_payload = me_response.get_json()
        self.assertEqual(me_payload["data"]["account"]["username"], "ivy-admin")
        self.assertEqual(me_payload["data"]["user"]["name"], "Ivy")

    def test_second_registration_defaults_to_user_child(self):
        first_pair = self.issue_pair_code()
        first_exchange = self.exchange_pair_code(first_pair["pair_code"]).get_json()["data"]
        self.register_account(
            pair_token=first_exchange["pair_token"],
            username="ivy-admin",
            password="p@ssw0rd123",
            name="Ivy",
            family_name="Ivy Family",
        )

        second_pair = self.issue_pair_code()
        second_exchange = self.exchange_pair_code(second_pair["pair_code"]).get_json()["data"]
        second_register = self.register_account(
            pair_token=second_exchange["pair_token"],
            username="kid-reader",
            password="child-pass-1",
            name="Kid",
        )

        self.assertEqual(second_register.status_code, 200)
        payload = second_register.get_json()
        self.assertEqual(payload["data"]["account"]["system_role"], "user")
        self.assertEqual(payload["data"]["user"]["role"], "child")
        self.assertEqual(payload["data"]["user"]["family_name"], "Ivy Family")

    def test_protected_api_requires_authentication(self):
        response = self.client.get("/api/compartments")
        self.assertEqual(response.status_code, 401)
        payload = response.get_json()
        self.assertFalse(payload["ok"])

    def test_revoked_cookie_does_not_break_public_home(self):
        issued_payload = self.issue_pair_code()
        exchange_payload = self.exchange_pair_code(issued_payload["pair_code"]).get_json()["data"]
        register_payload = self.register_account(
            pair_token=exchange_payload["pair_token"],
            username="ivy-admin",
            password="p@ssw0rd123",
            name="Ivy",
            family_name="Ivy Family",
        ).get_json()["data"]

        logout_response = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {register_payload['token']}"},
        )
        self.assertEqual(logout_response.status_code, 200)

        self.client.set_cookie("bookshelf_auth_token", register_payload["token"])

        public_response = self.client.get("/")
        self.assertEqual(public_response.status_code, 200)

        me_response = self.client.get("/api/auth/me")
        self.assertEqual(me_response.status_code, 401)
        self.assertIn("bookshelf_auth_token=;", me_response.headers.get("Set-Cookie", ""))

    def test_only_admin_can_change_family_role(self):
        admin_pair = self.issue_pair_code()
        admin_exchange = self.exchange_pair_code(admin_pair["pair_code"]).get_json()["data"]
        admin_register = self.register_account(
            pair_token=admin_exchange["pair_token"],
            username="ivy-admin",
            password="p@ssw0rd123",
            name="Ivy",
            family_name="Ivy Family",
        ).get_json()["data"]

        child_pair = self.issue_pair_code()
        child_exchange = self.exchange_pair_code(child_pair["pair_code"]).get_json()["data"]
        child_register = self.register_account(
            pair_token=child_exchange["pair_token"],
            username="kid-reader",
            password="child-pass-1",
            name="Kid",
        ).get_json()["data"]

        child_attempt = self.client.put(
            f"/api/users/{child_register['user']['id']}",
            json={"role": "parent"},
            headers={"Authorization": f"Bearer {child_register['token']}"},
        )
        self.assertEqual(child_attempt.status_code, 403)

        admin_attempt = self.client.put(
            f"/api/users/{child_register['user']['id']}",
            json={"role": "parent"},
            headers={"Authorization": f"Bearer {admin_register['token']}"},
        )
        self.assertEqual(admin_attempt.status_code, 200)
        admin_payload = admin_attempt.get_json()
        self.assertEqual(admin_payload["data"]["user"]["role"], "parent")


if __name__ == "__main__":
    unittest.main()
