from __future__ import annotations

import mimetypes
from pathlib import Path
from typing import Any

import httpx

from app.core.config import Settings, get_settings


class MinerUClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def is_enabled(self) -> bool:
        return bool((self.settings.mineru_base_url or "").strip())

    def parse_path(self, file_path: str, *, backend: str = "pipeline") -> dict[str, Any]:
        if not self.is_enabled():
            raise RuntimeError("MinerU API is not configured")

        base_url = (self.settings.mineru_base_url or "").rstrip("/")
        path = Path(file_path)
        mime_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        with httpx.Client(timeout=self.settings.mineru_timeout_seconds, follow_redirects=True) as client:
            with path.open("rb") as file_handle:
                response = client.post(
                    f"{base_url}/tasks",
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
                        "lang_list": "ch",
                        "formula_enable": "true",
                        "table_enable": "true",
                    },
                    files={"files": (path.name, file_handle, mime_type)},
                )
            response.raise_for_status()
            payload = response.json()
            status_url = payload["status_url"]
            result_url = payload["result_url"]
            while True:
                status_response = client.get(status_url)
                status_response.raise_for_status()
                status_payload = status_response.json()
                status = status_payload.get("status")
                if status == "completed":
                    break
                if status == "failed":
                    raise RuntimeError(f"MinerU task failed: {status_payload}")
            result_response = client.get(result_url)
            result_response.raise_for_status()
            return result_response.json()
