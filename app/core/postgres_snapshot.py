from __future__ import annotations

import os
from pathlib import Path
import shutil
import subprocess
from typing import Iterable

from sqlalchemy.engine import URL, make_url


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DEMO_SNAPSHOT_PATH = REPO_ROOT / "data" / "demo" / "service-demo.dump"
COMMON_POSTGRES_BIN_DIRS = (
    "/opt/homebrew/opt/libpq/bin",
    "/opt/homebrew/bin",
    "/usr/local/opt/libpq/bin",
    "/usr/local/bin",
)
POSTGRES_APP_GLOB = "/Applications/Postgres.app/Contents/Versions/*/bin"


def _iter_postgres_bin_dirs() -> Iterable[Path]:
    env_dir = os.getenv("LIBRARY_POSTGRES_BIN_DIR", "").strip()
    if env_dir:
        yield Path(env_dir)
    for path in COMMON_POSTGRES_BIN_DIRS:
        yield Path(path)
    yield from sorted(Path("/Applications/Postgres.app/Contents/Versions").glob("*/bin"), reverse=True)


def resolve_postgres_binary(binary_name: str) -> Path:
    resolved = shutil.which(binary_name)
    if resolved:
        return Path(resolved)
    for directory in _iter_postgres_bin_dirs():
        candidate = directory / binary_name
        if candidate.exists() and os.access(candidate, os.X_OK):
            return candidate
    raise FileNotFoundError(
        f"Unable to locate `{binary_name}`. Install PostgreSQL client tools or set LIBRARY_POSTGRES_BIN_DIR."
    )


def _require_postgres_url(database_url: str) -> URL:
    url = make_url(database_url)
    if not url.drivername.startswith("postgresql"):
        raise ValueError("Database URL must point to PostgreSQL")
    if not url.database:
        raise ValueError("Database URL is missing database name")
    return url


def _cli_connection_args(url: URL) -> list[str]:
    args: list[str] = []
    if url.host:
        args.extend(["--host", url.host])
    if url.port:
        args.extend(["--port", str(url.port)])
    if url.username:
        args.extend(["--username", url.username])
    return args


def _cli_env(url: URL) -> dict[str, str]:
    env = os.environ.copy()
    if url.password:
        env["PGPASSWORD"] = url.password
    return env


def build_pg_dump_command(
    database_url: str,
    *,
    output_path: Path,
    pg_dump_bin: str | Path | None = None,
) -> tuple[list[str], dict[str, str]]:
    url = _require_postgres_url(database_url)
    binary = Path(pg_dump_bin) if pg_dump_bin is not None else resolve_postgres_binary("pg_dump")
    command = [
        str(binary),
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        *_cli_connection_args(url),
        "--file",
        str(output_path),
        str(url.database),
    ]
    return command, _cli_env(url)


def build_pg_restore_command(
    database_url: str,
    *,
    snapshot_path: Path,
    pg_restore_bin: str | Path | None = None,
    clean: bool = False,
) -> tuple[list[str], dict[str, str]]:
    url = _require_postgres_url(database_url)
    binary = Path(pg_restore_bin) if pg_restore_bin is not None else resolve_postgres_binary("pg_restore")
    command = [str(binary)]
    if clean:
        command.extend(["--clean", "--if-exists"])
    command.extend(
        [
            "--no-owner",
            "--no-privileges",
            *_cli_connection_args(url),
            "--dbname",
            str(url.database),
            str(snapshot_path),
        ]
    )
    return command, _cli_env(url)


def export_snapshot(
    *,
    database_url: str,
    output_path: Path,
    pg_dump_bin: str | Path | None = None,
) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command, env = build_pg_dump_command(database_url, output_path=output_path, pg_dump_bin=pg_dump_bin)
    subprocess.run(command, check=True, env=env)
    return output_path


def restore_snapshot(
    *,
    database_url: str,
    snapshot_path: Path,
    clean: bool = False,
    pg_restore_bin: str | Path | None = None,
) -> None:
    if not snapshot_path.exists():
        raise FileNotFoundError(f"Snapshot file not found: {snapshot_path}")
    command, env = build_pg_restore_command(
        database_url,
        snapshot_path=snapshot_path,
        pg_restore_bin=pg_restore_bin,
        clean=clean,
    )
    subprocess.run(command, check=True, env=env)
