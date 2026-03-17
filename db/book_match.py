import sqlite3
from thefuzz import fuzz
import re

DB_PATH = r"C:\Users\32140\Desktop\bookshelf-ziggy-client-auth\bookshelf-ziggy-client-auth\data\bookshelf.db"


def fetch_all_books():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, title FROM books")
    rows = cur.fetchall()
    conn.close()
    return rows


def match_book(ocr_texts, threshold=60):
    books = fetch_all_books()
    if not ocr_texts:
        return None

    volume = extract_volume(ocr_texts)  # 关键
    best_score = 0
    best_book = None

    for book_id, title in books:
        # 如果识别到了卷号，但书名不包含该卷 → 直接跳过
        if volume and volume not in title:
            continue

        for text in ocr_texts:
            score = fuzz.partial_ratio(text, title)

            # 卷号命中，额外加权
            if volume and volume in text and volume in title:
                score += 30

            if score > best_score:
                best_score = score
                best_book = (book_id, title)

    if best_score >= threshold:
        return best_book

    return None

def match_book_by_name(book_name, threshold=60):
    """
    book_name: str（用户输入的书名）
    return: (book_id, title) or None
    """
    if not book_name:
        return None

    books = fetch_all_books()

    best_score = 0
    best_book = None

    for book_id, title in books:
        score = fuzz.partial_ratio(book_name, title)
        if score > best_score:
            best_score = score
            best_book = (book_id, title)

    if best_score >= threshold:
        return best_book

    return None

def extract_volume(texts):
    """
    从 OCR 文本中提取卷号，如 '第一卷' '第四卷'
    返回：'第一卷' / '第四卷' / None
    """
    for t in texts:
        m = re.search(r'第[一二三四五六七八九十]+卷', t)
        if m:
            return m.group()
    return None

def get_book_by_id(book_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT id, title, author, category, keywords, description
        FROM books
        WHERE id = ?
    """, (book_id,))
    row = cur.fetchone()
    if not row:
        return None

    return {
        "id": row[0],
        "title": row[1],
        "author": row[2],
        "category": row[3],
        "keywords": row[4],
        "description": row[5],
    }

def find_book_by_title( title, threshold=60,strict=False):
    conn = sqlite3.connect(DB_PATH)
    if not title:
        return None

    match = match_book_by_name(title, threshold)
    if not match:
        return None

    book_id, _ = match
    return get_book_by_id(book_id)


