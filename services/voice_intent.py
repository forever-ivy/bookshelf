"""
services/voice_intent.py
语音意图识别：唤醒词检测、ASR 纠错、意图分类、书名提取。
不依赖 Flask。
"""

import re

from thefuzz import fuzz

from ai.voice_module import _has_wake as _vosk_has_wake
from config import (
    STORE_KEYWORDS,
    TAKE_KEYWORDS,
    STORE_SAMPLES,
    TAKE_SAMPLES,
    WAKE_WORDS,
    _WAKE_DEBUG_LOG,
)


def normalize_voice_text(text: str) -> str:
    s = re.sub(r"\s+", "", (text or "").strip())
    if not s:
        return ""

    # Common ASR confusions and homophones.
    replacements = {
        "帮我成书": "帮我存书",
        "帮我层书": "帮我存书",
        "帮我乘书": "帮我存书",
        "帮我存储": "帮我存书",
        "帮我存书储": "帮我存书",
        "帮我存书书": "帮我存书",
        "帮我擦书": "帮我存书",
        "帮我叉书": "帮我存书",
        "我要成书": "我要存书",
        "我要层书": "我要存书",
        "我要乘书": "我要存书",
        "我要存储": "我要存书",
        "我要存书储": "我要存书",
        "我要存书书": "我要存书",
        "我要擦书": "我要存书",
        "存储": "存书",
        "存书储": "存书",
        "存书书": "存书",
        "请帮我存": "帮我存书",
        "帮我存": "帮我存书",
        "我要存": "我要存书",
        "我来存": "我要存书",
        "我要去": "我要取",
        "帮我去": "帮我取",
        "请帮我去": "帮我取",
        "我要娶": "我要取",
        "帮我娶": "帮我取",
        "我想去": "我想取",
        "拿一下书": "拿书",
        "取一下书": "取书",
        "借一下书": "借书",
        "晓燕": "小燕",
        "小艳": "小燕",
        "小雁": "小燕",
    }
    for src, dst in replacements.items():
        s = s.replace(src, dst)

    return s


def has_wake_word(text: str, push_event_fn=None) -> bool:
    try:
        return _vosk_has_wake(text, wake_words=WAKE_WORDS)
    except Exception:
        pass

    t = normalize_voice_text(text)
    if not t:
        return False

    if _WAKE_DEBUG_LOG and push_event_fn:
        push_event_fn("log", f"[wake-asr] {t}")

    # Homophone normalization for wake words.
    for src in ("\u6653", "\u5b5d", "\u6d88", "\u6821", "\u8096"):
        t = t.replace(src, "\u5c0f")
    for src in ("\u71d5", "\u96c1", "\u8273", "\u5ef6", "\u989c", "\u8a00", "\u6f14", "\u5ca9", "\u773c", "\u708e", "\u70df", "\u59cd"):
        t = t.replace(src, "\u71d5")

    if "\u5c0f\u71d5" in t:
        return True

    # Fuzzy fallback (short wake phrases).
    for w in WAKE_WORDS:
        target = normalize_voice_text(w)
        score = max(fuzz.ratio(t, target), fuzz.partial_ratio(t, target))
        if score >= 80:
            return True

    return False


def strip_wake_words(text: str) -> str:
    s = normalize_voice_text(text)
    if not s:
        return ""
    for w in WAKE_WORDS:
        s = s.replace(normalize_voice_text(w), "")
    s = re.sub(
        r"^(\u6211\u5728|\u5728\u5417|\u5728\u4e48|\u5728\u561b|\u4f60\u597d|hi|hello)+",
        "",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        r"(\u6211\u5728|\u5728\u5417|\u5728\u4e48|\u5728\u561b|\u4f60\u597d|hi|hello)+$",
        "",
        s,
        flags=re.IGNORECASE,
    )
    return s.strip()


def _intent_score(text: str, samples) -> int:
    t = (text or "").strip()
    if not t:
        return 0
    best = 0
    for sample in samples:
        best = max(best, fuzz.ratio(t, sample), fuzz.partial_ratio(t, sample))
    return best


def detect_voice_intent(text: str) -> str:
    t = normalize_voice_text(text)
    if not t:
        return "unknown"

    store_hit = any(k in t for k in STORE_KEYWORDS)
    take_hit = any(k in t for k in TAKE_KEYWORDS)

    if re.search(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我).{0,2}(存|放回|归还|还)", t):
        store_hit = True
    if re.search(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我).{0,2}(取|拿|借|找)", t):
        take_hit = True

    # Homophone case: "我要去乡土中国" means "我要取乡土中国".
    if ("我要去" in t or "帮我去" in t or "我想去" in t) and ("书" in t or len(t) <= 12):
        take_hit = True

    store_score = _intent_score(t, STORE_SAMPLES)
    take_score = _intent_score(t, TAKE_SAMPLES)

    if store_hit and not take_hit:
        return "store"
    if take_hit and not store_hit:
        return "take"
    if store_hit and take_hit:
        return "store" if store_score >= take_score else "take"

    if store_score >= 70 and store_score >= take_score + 5:
        return "store"
    if take_score >= 70 and take_score >= store_score + 5:
        return "take"
    return "unknown"


def looks_unclear_action(text: str) -> bool:
    t = normalize_voice_text(text)
    if not t:
        return False

    if len(t) <= 4 and any(k in t for k in ("帮我", "我要", "我想", "请")):
        return True
    if any(k in t for k in ("存", "取", "拿", "借", "找")) and "书" in t:
        return True
    if re.search(r"(帮我|我要|我想|请).{0,3}$", t):
        return True
    return False


def extract_title_from_take_text(text: str) -> str:
    s = normalize_voice_text(text)
    if not s:
        return ""

    # 《书名》 form.
    m = re.search(r"《([^》]{1,80})》", s)
    if m:
        return m.group(1).strip()

    # Remove wake words and command words.
    s = re.sub(r"(小燕){1,2}", "", s)
    s = re.sub(r"(帮我|请|请你|麻烦|麻烦你|我要|我想|给我|想要)", "", s)
    s = re.sub(r"(取书|拿书|借书|找书|取出|拿出|取|拿|借|找)+", "", s)
    s = re.sub(r"(这本书|那本书|一本书|这本|那本|本书)", "", s)
    s = re.sub(r"[，。！？,.!?\s]+", "", s)

    return s.strip()
