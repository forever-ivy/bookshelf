from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from app.core import postgres_snapshot as snapshot_module
from scripts import bootstrap_demo_database as bootstrap_script
from scripts import export_demo_snapshot as export_script
from scripts import restore_demo_snapshot as restore_script


def test_build_pg_dump_command_uses_custom_format_and_password_env(tmp_path: Path):
    output_path = tmp_path / "service-demo.dump"

    command, env = snapshot_module.build_pg_dump_command(
        "postgresql+psycopg://library:secret@localhost:55432/service",
        output_path=output_path,
        pg_dump_bin="/usr/local/bin/pg_dump",
    )

    assert command == [
        "/usr/local/bin/pg_dump",
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--host",
        "localhost",
        "--port",
        "55432",
        "--username",
        "library",
        "--file",
        str(output_path),
        "service",
    ]
    assert env["PGPASSWORD"] == "secret"


def test_build_pg_restore_command_uses_clean_restore_flags(tmp_path: Path):
    snapshot_path = tmp_path / "service-demo.dump"

    command, env = snapshot_module.build_pg_restore_command(
        "postgresql+psycopg://library:secret@localhost:55432/service",
        snapshot_path=snapshot_path,
        pg_restore_bin="/usr/local/bin/pg_restore",
        clean=True,
    )

    assert command == [
        "/usr/local/bin/pg_restore",
        "--clean",
        "--if-exists",
        "--no-owner",
        "--no-privileges",
        "--host",
        "localhost",
        "--port",
        "55432",
        "--username",
        "library",
        "--dbname",
        "service",
        str(snapshot_path),
    ]
    assert env["PGPASSWORD"] == "secret"


def test_resolve_postgres_binary_prefers_library_postgres_bin_dir(tmp_path: Path, monkeypatch):
    fake_binary = tmp_path / "pg_dump"
    fake_binary.write_text("#!/bin/sh\n", encoding="utf-8")
    fake_binary.chmod(0o755)
    monkeypatch.setenv("LIBRARY_POSTGRES_BIN_DIR", str(tmp_path))

    resolved = snapshot_module.resolve_postgres_binary("pg_dump")

    assert resolved == fake_binary


def test_export_demo_snapshot_defaults_to_repo_demo_dump(monkeypatch, tmp_path: Path):
    target_path = tmp_path / "data" / "demo" / "service-demo.dump"
    calls: list[tuple[str, str]] = []

    monkeypatch.setattr(export_script, "DEFAULT_DEMO_SNAPSHOT_PATH", target_path)
    monkeypatch.setattr(
        export_script,
        "get_settings",
        lambda: SimpleNamespace(database_url="postgresql+psycopg://library:library@localhost:55432/service"),
    )
    monkeypatch.setattr(
        export_script,
        "export_snapshot",
        lambda *, database_url, output_path: calls.append((database_url, str(output_path))),
    )

    export_script.main([])

    assert calls == [("postgresql+psycopg://library:library@localhost:55432/service", str(target_path))]


def test_restore_demo_snapshot_ensures_database_exists_before_restore(monkeypatch, tmp_path: Path):
    snapshot_path = tmp_path / "service-demo.dump"
    snapshot_path.write_bytes(b"demo")
    calls: list[tuple] = []

    monkeypatch.setattr(
        restore_script,
        "get_settings",
        lambda: SimpleNamespace(database_url="postgresql+psycopg://library:library@localhost:55432/service"),
    )
    monkeypatch.setattr(restore_script, "ensure_database_exists", lambda url: calls.append(("ensure", url)))
    monkeypatch.setattr(
        restore_script,
        "restore_snapshot",
        lambda *, database_url, snapshot_path, clean: calls.append(("restore", database_url, str(snapshot_path), clean)),
    )

    restore_script.main(["--snapshot", str(snapshot_path), "--reset"])

    assert calls == [
        ("ensure", "postgresql+psycopg://library:library@localhost:55432/service"),
        ("restore", "postgresql+psycopg://library:library@localhost:55432/service", str(snapshot_path), True),
    ]


def test_bootstrap_demo_database_uses_default_snapshot_and_reset(monkeypatch, tmp_path: Path):
    target_path = tmp_path / "data" / "demo" / "service-demo.dump"
    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(b"demo")
    calls: list[tuple] = []

    monkeypatch.setattr(bootstrap_script, "DEFAULT_DEMO_SNAPSHOT_PATH", target_path)
    monkeypatch.setattr(
        bootstrap_script,
        "get_settings",
        lambda: SimpleNamespace(database_url="postgresql+psycopg://library:library@localhost:55432/service"),
    )
    monkeypatch.setattr(bootstrap_script, "ensure_database_exists", lambda url: calls.append(("ensure", url)))
    monkeypatch.setattr(
        bootstrap_script,
        "restore_snapshot",
        lambda *, database_url, snapshot_path, clean: calls.append(("restore", database_url, str(snapshot_path), clean)),
    )

    bootstrap_script.main(["--reset"])

    assert calls == [
        ("ensure", "postgresql+psycopg://library:library@localhost:55432/service"),
        ("restore", "postgresql+psycopg://library:library@localhost:55432/service", str(target_path), True),
    ]
