"""
services/shelf_service.py
存取书业务编排：OCR→匹配→存书 / 文本→匹配→取书。
不依赖 Flask。
"""

import os
import tempfile

from thefuzz import fuzz

from db.book_match import match_book
from db.shelf_ops import (
    find_free_compartment,
    store_book,
    get_all_compartments,
    get_book_in_compartment,
    take_book_by_cid,
)
from ai.book_match_ai import get_or_create_book_by_ai, trigger_action_chat
from ocr.video_ocr import recognize_book_from_camera
from ocr.paddle_ocr import ocr_image, stabilize_ocr_texts
from services.voice_intent import extract_title_from_take_text


def _log_ocr_texts(tag: str, texts) -> None:
    clean = [str(item).strip() for item in (texts or []) if str(item).strip()]
    if clean:
        print(f"[{tag}] " + " | ".join(clean))
    else:
        print(f"[{tag}] <empty>")


def store_from_ocr_texts(ocr_texts, speak_out=True):
    if not ocr_texts:
        return False, "no ocr text", None
    _log_ocr_texts("OCR stable", ocr_texts)

    local = match_book(ocr_texts)
    if local and isinstance(local, (list, tuple)):
        book_id, title = local[0], local[1]
        print(f"[store match] local title={title}")
    else:
        book = get_or_create_book_by_ai(ocr_texts)
        if not book:
            return False, "ai book match failed", None
        book_id, title = book.get("id"), book.get("title")
        print(f"[store match] ai title={title}")

    free = find_free_compartment()
    if not free:
        return False, "bookshelf full", None

    cid = free[0]
    store_book(book_id, cid)
    print(f"[store action] title={title} slot={cid}")
    ai_reply = trigger_action_chat("store", title, speak_out=speak_out)
    return True, f"stored: {title} -> slot {cid}", ai_reply


def store_from_image_bytes(image_bytes: bytes, speak_out=True):
    if not image_bytes:
        return False, "empty image", None
    texts = []
    ocr_texts = []
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        img_path = f.name
        f.write(image_bytes)
    try:
        texts = ocr_image(img_path)
        ocr_texts = stabilize_ocr_texts(texts, top_k=5)
    finally:
        try:
            os.remove(img_path)
        except Exception:
            pass
    _log_ocr_texts("OCR raw", texts)
    _log_ocr_texts("OCR stabilized", ocr_texts)
    if not ocr_texts:
        return False, "no text detected", None
    return store_from_ocr_texts(ocr_texts, speak_out=speak_out)


def store_via_ocr(speak_out=True):
    result = recognize_book_from_camera()
    if not result:
        return False, "未识别到书本", None

    if isinstance(result, dict) and (result.get("book_id") or result.get("id")):
        book_id = result.get("book_id") or result.get("id")
        title = result.get("title", "未知书名")
        ocr_texts = None
    else:
        ocr_texts = result.get("ocr_texts") if isinstance(result, dict) else result

    if ocr_texts is not None:
        _log_ocr_texts("OCR camera", ocr_texts)
        return store_from_ocr_texts(ocr_texts, speak_out=speak_out)

    free = find_free_compartment()
    if not free:
        return False, "书柜已满", None

    cid = free[0]
    store_book(book_id, cid)
    print(f"[store action] title={title} slot={cid}")
    ai_reply = trigger_action_chat("store", title, speak_out=speak_out)
    return True, f"存入：《{title}》 -> 隔间 {cid}", ai_reply


def pick_best_book_on_shelf(query: str, min_score: int = 68):
    query = (query or "").strip()
    if not query:
        return None

    candidates = []
    for cid, _x, _y, status in get_all_compartments():
        if status != "occupied":
            continue
        title = get_book_in_compartment(cid)
        if not title:
            continue

        score = fuzz.partial_ratio(query, title)
        score = max(score, fuzz.ratio(query, title))
        if query in title:
            score += 20

        # Character overlap gives extra robustness for ASR fragments.
        overlap = len(set(query) & set(title))
        score += overlap * 4

        candidates.append({"cid": cid, "title": title, "score": score})

    if not candidates:
        return None

    candidates.sort(key=lambda x: (-x["score"], x["cid"]))
    best = candidates[0]
    if best["score"] < min_score:
        return None
    return best


def take_by_text(text: str, speak_out=True):
    title = extract_title_from_take_text(text)
    if not title:
        return False, "请说出要取的书名，例如：帮我取《乡土中国》", None

    target = pick_best_book_on_shelf(title)
    if not target:
        return False, f"书柜里没有匹配《{title}》的书", None

    ok = take_book_by_cid(target["cid"])
    if not ok:
        return False, "取书失败", None

    ai_reply = trigger_action_chat("take", target["title"], speak_out=speak_out)
    return True, f"已为你取出《{target['title']}》（{target['cid']}号格）", ai_reply
