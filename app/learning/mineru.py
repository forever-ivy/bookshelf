from __future__ import annotations

import hashlib
import io
import mimetypes
from pathlib import Path
import re
import time
from typing import Any
import zipfile

import httpx

from app.core.config import Settings, get_settings


DATA_ID_SANITIZER = re.compile(r"[^A-Za-z0-9._-]+")


class MinerUClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def is_enabled(self) -> bool:
        return bool(self._local_base_url() or self._cloud_base_url())

    def parse_path(self, file_path: str, *, backend: str = "pipeline") -> dict[str, Any]:
        if not self.is_enabled():
            raise RuntimeError("MinerU API is not configured")

        path = Path(file_path)
        local_error: Exception | None = None
        local_base_url = self._local_base_url()
        if local_base_url:
            if self._local_is_available(local_base_url):
                try:
                    return self._parse_path_via_local_api(path, base_url=local_base_url, backend=backend)
                except Exception as exc:
                    local_error = exc
            else:
                local_error = RuntimeError(f"Local MinerU API is unavailable: {local_base_url}")

        cloud_base_url = self._cloud_base_url()
        if cloud_base_url:
            try:
                return self._parse_path_via_cloud_api(path, base_url=cloud_base_url)
            except Exception as exc:
                if local_error is not None:
                    raise RuntimeError(f"Local MinerU failed: {local_error}; cloud MinerU failed: {exc}") from exc
                raise

        if local_error is not None:
            raise local_error
        raise RuntimeError("MinerU API is not configured")

    def _local_base_url(self) -> str | None:
        explicit = (self.settings.mineru_local_base_url or "").strip()
        if explicit:
            return explicit.rstrip("/")
        legacy = (self.settings.mineru_base_url or "").strip()
        if legacy and not (self.settings.mineru_api_token or "").strip() and not (self.settings.mineru_cloud_base_url or "").strip():
            return legacy.rstrip("/")
        return None

    def _cloud_base_url(self) -> str | None:
        explicit = (self.settings.mineru_cloud_base_url or "").strip()
        if explicit:
            return explicit.rstrip("/")
        legacy = (self.settings.mineru_base_url or "").strip()
        if legacy and (self.settings.mineru_api_token or "").strip():
            return legacy.rstrip("/")
        return None

    def _local_is_available(self, base_url: str) -> bool:
        try:
            with httpx.Client(timeout=min(self.settings.mineru_timeout_seconds, 5.0), follow_redirects=True) as client:
                response = client.get(f"{base_url}/health")
            return response.status_code < 400
        except Exception:
            return False

    def _parse_path_via_local_api(self, path: Path, *, base_url: str, backend: str) -> dict[str, Any]:
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        with httpx.Client(timeout=self.settings.mineru_timeout_seconds, follow_redirects=True) as client:
            with path.open("rb") as file_handle:
                response = client.post(
                    f"{base_url}/file_parse",
                    data={
                        "backend": backend,
                        "parse_method": "auto",
                        "return_md": "true",
                        "return_middle_json": "false",
                        "return_model_output": "false",
                        "return_content_list": "false",
                        "return_images": "false",
                        "response_format_zip": "false",
                        "return_original_file": "false",
                        "start_page_id": "0",
                        "end_page_id": "99999",
                        **({"lang_list": (self.settings.mineru_language or "").strip()} if (self.settings.mineru_language or "").strip() else {}),
                        "formula_enable": "true",
                        "table_enable": "true",
                    },
                    files={"files": (path.name, file_handle, mime_type)},
                )
                response.raise_for_status()
                try:
                    raw_payload = response.json()
                except Exception:
                    raw_payload = None
                if isinstance(raw_payload, dict):
                    md_content = self._extract_local_markdown(raw_payload)
                    if md_content:
                        return {
                            "md_content": md_content,
                            "provider": "mineru-local",
                            "raw": raw_payload,
                        }
                if response.content:
                    return {
                        "md_content": self._extract_markdown_from_zip(response.content),
                        "provider": "mineru-local",
                        "raw": {"response_format": "zip"},
                    }
        raise RuntimeError("Local MinerU did not return markdown content")

    def _parse_path_via_cloud_api(self, path: Path, *, base_url: str) -> dict[str, Any]:
        base_url = self._cloud_api_base_url(base_url)
        headers = {
            "Authorization": f"Bearer {(self.settings.mineru_api_token or '').strip()}",
            "Content-Type": "application/json",
        }
        request_body: dict[str, Any] = {
            "files": [{"name": path.name, "data_id": self._build_cloud_data_id(path)}],
            "model_version": self.settings.mineru_model_version,
            "enable_formula": bool(self.settings.mineru_enable_formula),
            "enable_table": bool(self.settings.mineru_enable_table),
            "is_ocr": bool(self.settings.mineru_ocr),
        }
        if (self.settings.mineru_language or "").strip():
            request_body["language"] = (self.settings.mineru_language or "").strip()

        with httpx.Client(timeout=self.settings.mineru_timeout_seconds, follow_redirects=True) as client:
            create_response = client.post(
                f"{base_url}/file-urls/batch",
                headers=headers,
                json=request_body,
            )
            create_response.raise_for_status()
            create_payload = self._unwrap_cloud_payload(create_response.json(), context="create upload url")
            upload_urls = list(create_payload.get("file_urls") or [])
            batch_id = str(create_payload.get("batch_id") or "").strip()
            if not upload_urls or not batch_id:
                raise RuntimeError(f"MinerU batch upload response missing file_urls or batch_id: {create_payload}")

            with path.open("rb") as file_handle:
                upload_response = client.put(upload_urls[0], data=file_handle.read())
            upload_response.raise_for_status()

            deadline = time.monotonic() + max(float(self.settings.mineru_max_wait_seconds), 1.0)
            while True:
                result_response = client.get(
                    f"{base_url}/extract-results/batch/{batch_id}",
                    headers={"Authorization": headers["Authorization"]},
                )
                result_response.raise_for_status()
                result_payload = self._unwrap_cloud_payload(result_response.json(), context="poll batch result")
                extract_results = list(result_payload.get("extract_result") or [])
                first_result = extract_results[0] if extract_results else {}
                state = str(first_result.get("state") or "").strip().lower()
                if state == "done":
                    full_zip_url = str(first_result.get("full_zip_url") or "").strip()
                    if not full_zip_url:
                        raise RuntimeError(f"MinerU batch result missing full_zip_url: {first_result}")
                    zip_response = client.get(full_zip_url)
                    zip_response.raise_for_status()
                    return {
                        "md_content": self._extract_markdown_from_zip(zip_response.content),
                        "provider": "mineru-cloud",
                        "raw": result_payload,
                    }
                if state in {"failed", "error"}:
                    raise RuntimeError(f"MinerU batch failed: {first_result}")
                if time.monotonic() >= deadline:
                    raise RuntimeError(f"MinerU batch timed out after {self.settings.mineru_max_wait_seconds} seconds")
                time.sleep(max(float(self.settings.mineru_poll_interval_seconds), 0.0))

    def _cloud_api_base_url(self, base_url: str) -> str:
        if base_url.endswith("/api/v4"):
            return base_url
        return f"{base_url}/api/v4"

    @staticmethod
    def _build_cloud_data_id(path: Path) -> str:
        suffix = path.suffix.lower()
        sanitized = DATA_ID_SANITIZER.sub("-", path.name).strip("-") or f"document{suffix}"
        if len(sanitized) <= 128:
            return sanitized
        digest = hashlib.sha1(path.name.encode("utf-8")).hexdigest()[:12]
        trimmed_suffix = suffix if len(suffix) < 24 else suffix[:24]
        budget = 128 - len(trimmed_suffix) - len(digest) - 1
        stem = path.stem[: max(budget, 8)].strip("-") or "document"
        return f"{stem}-{digest}{trimmed_suffix}"

    @staticmethod
    def _unwrap_cloud_payload(payload: dict[str, Any], *, context: str) -> dict[str, Any]:
        if int(payload.get("code") or 0) != 0:
            raise RuntimeError(f"MinerU {context} failed: {payload}")
        data = payload.get("data")
        if not isinstance(data, dict):
            raise RuntimeError(f"MinerU {context} returned invalid data payload: {payload}")
        return data

    @staticmethod
    def _extract_local_markdown(payload: dict[str, Any]) -> str | None:
        direct = payload.get("md_content")
        if direct:
            return str(direct)
        results = payload.get("results") or {}
        first_payload = next(iter(results.values()), {})
        md_content = first_payload.get("md_content")
        if not md_content:
            return None
        return str(md_content)

    @staticmethod
    def _extract_markdown_from_zip(zip_bytes: bytes) -> str:
        with zipfile.ZipFile(io.BytesIO(zip_bytes)) as archive:
            candidates = [name for name in archive.namelist() if name.endswith("full.md")]
            if not candidates:
                candidates = [name for name in archive.namelist() if name.endswith(".md")]
            if not candidates:
                raise RuntimeError(f"MinerU zip does not contain markdown output: {archive.namelist()}")
            with archive.open(candidates[0]) as handle:
                return handle.read().decode("utf-8").strip()
