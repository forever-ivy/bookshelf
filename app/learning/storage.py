from __future__ import annotations

from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from app.core.config import Settings, get_settings

try:
    import boto3  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    boto3 = None  # type: ignore[assignment]


class LearningBlobStore:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.provider = (self.settings.object_store_provider or "filesystem").strip().lower()
        self.bucket = self.settings.object_store_bucket

    def write_bytes(self, *, key: str, data: bytes, content_type: str | None = None) -> str:
        if self.provider in {"filesystem", "local", "file"}:
            root = Path(self.settings.learning_storage_dir).expanduser()
            target = root / key
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
            return str(target)

        if boto3 is None:
            raise RuntimeError("boto3 is required for object storage provider")
        client = boto3.client(
            "s3",
            endpoint_url=self.settings.object_store_endpoint,
            aws_access_key_id=self.settings.object_store_access_key,
            aws_secret_access_key=self.settings.object_store_secret_key,
            region_name=self.settings.object_store_region,
            use_ssl=bool(self.settings.object_store_secure),
        )
        extra_args: dict[str, Any] = {}
        if content_type:
            extra_args["ContentType"] = content_type
        client.put_object(Bucket=self.bucket, Key=key, Body=data, **extra_args)
        return f"s3://{self.bucket}/{key}"

    def write_text(self, *, key: str, text: str, content_type: str = "text/plain; charset=utf-8") -> str:
        return self.write_bytes(key=key, data=text.encode("utf-8"), content_type=content_type)

    def read_bytes(self, uri: str) -> bytes:
        if uri.startswith("s3://"):
            if boto3 is None:
                raise RuntimeError("boto3 is required for object storage provider")
            parsed = urlparse(uri)
            bucket = parsed.netloc
            key = parsed.path.lstrip("/")
            client = boto3.client(
                "s3",
                endpoint_url=self.settings.object_store_endpoint,
                aws_access_key_id=self.settings.object_store_access_key,
                aws_secret_access_key=self.settings.object_store_secret_key,
                region_name=self.settings.object_store_region,
                use_ssl=bool(self.settings.object_store_secure),
            )
            response = client.get_object(Bucket=bucket, Key=key)
            return response["Body"].read()
        return Path(uri).read_bytes()

    def read_text(self, uri: str) -> str:
        return self.read_bytes(uri).decode("utf-8")
