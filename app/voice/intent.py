from __future__ import annotations

import re


def normalize_voice_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").strip())


def detect_voice_intent(text: str) -> str:
    normalized = normalize_voice_text(text)
    if not normalized:
        return "unknown"
    if any(keyword in normalized for keyword in ("存书", "放回", "归还", "还书")):
        return "store"
    if any(keyword in normalized for keyword in ("取", "拿", "借", "找")):
        return "take"
    return "chat"


def looks_unclear_action(text: str) -> bool:
    normalized = normalize_voice_text(text)
    if not normalized:
        return False
    if detect_voice_intent(normalized) in {"store", "take"}:
        return False
    if len(normalized) <= 4 and any(prefix in normalized for prefix in ("帮我", "我要", "我想", "请")):
        return True
    return bool(re.search(r"(帮我|我要|我想|请).{0,3}$", normalized))
