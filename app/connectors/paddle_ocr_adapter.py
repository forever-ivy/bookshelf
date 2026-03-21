from __future__ import annotations

import os
from collections import Counter
from functools import lru_cache
from typing import Any


def stabilize_ocr_texts(all_texts: list[str], top_k: int = 6) -> list[str]:
    clean = [text for text in all_texts if len(text) >= 2]
    return [text for text, _count in Counter(clean).most_common(top_k)]


@lru_cache
def _get_ocr_model():
    from paddleocr import PaddleOCR  # type: ignore

    return PaddleOCR(
        lang="ch",
        use_textline_orientation=True,
        show_log=os.getenv("PADDLEOCR_SHOW_LOG", "0").strip().lower() in ("1", "true", "yes", "on"),
    )


def _bbox_height(box: list[list[float]]) -> float:
    try:
        left_height = abs(box[3][1] - box[0][1])
        right_height = abs(box[2][1] - box[1][1])
        return (left_height + right_height) / 2.0
    except Exception:
        return 1.0


def ocr_image(image: str | Any) -> list[str]:
    return [item["text"] for item in ocr_image_with_weights(image)]


def ocr_image_with_weights(image: str | Any) -> list[dict]:
    model = _get_ocr_model()
    result = model.ocr(image, cls=False)
    raw: list[dict] = []
    if not result:
        return raw

    if isinstance(result, list) and len(result) == 1 and isinstance(result[0], list):
        result = result[0]

    for line in result:
        if isinstance(line, list) and len(line) == 2:
            box = line[0]
            text = line[1][0]
            confidence = float(line[1][1])
            raw.append(
                {
                    "text": text,
                    "height": _bbox_height(box),
                    "conf": confidence,
                }
            )
        elif isinstance(line, tuple):
            raw.append(
                {
                    "text": line[0],
                    "height": 1.0,
                    "conf": 1.0,
                }
            )

    if not raw:
        return raw

    max_height = max(item["height"] for item in raw) or 1.0
    for item in raw:
        item["weight"] = round(item["height"] / max_height, 4)
    raw.sort(key=lambda item: item["weight"], reverse=True)
    return raw


def extract_texts_from_image_bytes(image_path: str) -> list[str]:
    return stabilize_ocr_texts(ocr_image(image_path), top_k=5)
