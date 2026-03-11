"""
运行一次：python migrate_miniprogram.py
新增小程序所需的数据库表
"""
import sqlite3, os

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "bookshelf.db")
conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 1. 用户成就徽章
cur.execute("""
CREATE TABLE IF NOT EXISTS user_badges (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    badge_key   TEXT    NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, badge_key)
)
""")
print("✓ user_badges 表就绪")

# 2. 家长给孩子的必读书目
cur.execute("""
CREATE TABLE IF NOT EXISTS required_books (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL,
    title      TEXT    NOT NULL,
    note       TEXT    DEFAULT '',
    done       INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")
print("✓ required_books 表就绪")

# 3. 书籍留言（存书时附言）
cur.execute("""
CREATE TABLE IF NOT EXISTS book_messages (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user_id INTEGER NOT NULL,
    to_user_id   INTEGER NOT NULL,
    book_title   TEXT    NOT NULL,
    message      TEXT    NOT NULL,
    read         INTEGER DEFAULT 0,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")
print("✓ book_messages 表就绪")

conn.commit()
conn.close()
print("\n✅ 迁移完成！")