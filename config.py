"""
config.py
集中管理配置常量、关键词表、唤醒词表等。
"""

import os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
VOICE_MODE = os.getenv("VOICE_MODE", "auto").strip().lower()
VOICE_MODEL_DISPATCH = os.getenv("VOICE_MODEL_DISPATCH", "0").strip().lower() in ("1", "true", "yes", "on")
JWT_SECRET = os.getenv("JWT_SECRET", "bookshelf-dev-secret-change-me-2026")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").strip()
JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", "30"))
PAIR_CODE_EXPIRES_MINUTES = int(os.getenv("PAIR_CODE_EXPIRES_MINUTES", "5"))
PAIR_TOKEN_EXPIRES_MINUTES = int(os.getenv("PAIR_TOKEN_EXPIRES_MINUTES", "10"))
AUTH_COOKIE_NAME = os.getenv("AUTH_COOKIE_NAME", "bookshelf_auth_token").strip()
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "0").strip().lower() in ("1", "true", "yes", "on")
CABINET_NAME_DEFAULT = os.getenv("CABINET_NAME_DEFAULT", "智慧书架").strip() or "智慧书架"
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/")

_WAKE_DEBUG_LOG = os.getenv("WAKE_DEBUG_LOG", "0").strip() in ("1", "true", "yes", "on")
_WAKE_LOCK_PATH = os.path.join(os.getcwd(), ".wake.lock")


# ── 数据库字段白名单 ──────────────────────────────────────

USER_PROFILE_FIELDS = (
    "gender",
    "birth_date",
    "age",
    "grade_level",
    "reading_level",
    "interests",
    "family_id",
    "updated_at",
)
BOOK_FIELDS = (
    "title",
    "author",
    "category",
    "keywords",
    "description",
    "isbn",
    "publisher",
    "publish_year",
    "age_min",
    "age_max",
    "difficulty_level",
    "tags",
    "cover_url",
    "updated_at",
)
ACCOUNT_FIELDS = (
    "username",
    "phone",
    "password_hash",
    "status",
    "last_login_at",
    "created_at",
    "updated_at",
)
FAMILY_FIELDS = (
    "family_name",
    "owner_account_id",
    "created_at",
)


# ── 语音关键词 & 唤醒词 ──────────────────────────────────

STORE_KEYWORDS = [
    "存书",
    "放回",
    "归还",
    "还书",
    "上架",
    "放入书柜",
    "存一下",
    "放回去",
]
TAKE_KEYWORDS = [
    "取书",
    "拿书",
    "借书",
    "找书",
    "取出",
    "拿出",
    "帮我拿",
    "帮我取",
]

STORE_SAMPLES = [
    "帮我存书",
    "我要存书",
    "请帮我存书",
    "把书放回去",
    "帮我归还这本书",
]
TAKE_SAMPLES = [
    "帮我取书",
    "我要取书",
    "请帮我拿书",
    "帮我取乡土中国",
    "我要拿图灵传",
]

WAKE_WORDS = [
    "\u5c0f\u71d5\u5c0f\u71d5",
    "\u5c0f\u71d5",
    "\u6653\u71d5",
    "\u6653\u71d5\u6653\u71d5",
    "\u5c0f\u96c1",
    "\u5c0f\u8273",
    "\u5c0f\u71d5\u513f",
    "\u5c0f\u71d5\u554a",
]
