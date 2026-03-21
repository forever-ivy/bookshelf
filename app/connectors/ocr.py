from __future__ import annotations

import os
import tempfile

from app.connectors import paddle_ocr_adapter


class PaddleOCRConnector:
    def extract_texts_from_image_bytes(self, image_bytes: bytes) -> list[str]:
        if not image_bytes:
            return []

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as handle:
            image_path = handle.name
            handle.write(image_bytes)

        try:
            return paddle_ocr_adapter.extract_texts_from_image_bytes(image_path)
        finally:
            try:
                os.remove(image_path)
            except OSError:
                pass
