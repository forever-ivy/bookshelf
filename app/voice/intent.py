from __future__ import annotations

import re

STORE_KEYWORDS = ("上架", "存书", "放回", "归位", "入柜", "store")
TAKE_KEYWORDS = ("取书", "拿书", "借书", "帮我拿", "帮我取", "帮我借", "take", "get")
UNCLEAR_STORE_TERMS = {"上架", "存书", "放回", "归位", "store"}
UNCLEAR_TAKE_TERMS = {"取书", "拿书", "借书", "帮我拿", "帮我取", "帮我借", "take", "get"}


def normalize_voice_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").strip())


def detect_voice_intent(text: str) -> str:
    normalized = normalize_voice_text(text)
    normalized_lower = normalized.lower()
    if not normalized:
        return "unknown"
    if any(keyword in normalized_lower for keyword in STORE_KEYWORDS):
        return "store"
    if any(keyword in normalized_lower for keyword in TAKE_KEYWORDS):
        return "take"
    return "chat"


def looks_unclear_action(text: str) -> bool:
    normalized = normalize_voice_text(text)
    normalized_lower = normalized.lower()
    if not normalized:
        return False
    if normalized_lower in UNCLEAR_STORE_TERMS:
        return True
    if normalized_lower in UNCLEAR_TAKE_TERMS:
        return True
    return False
