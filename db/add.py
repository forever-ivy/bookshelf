"""
数据库迁移脚本：添加多用户体系
运行一次即可，已有数据不会丢失。

用法：python migrate_users.py
"""

import sqlite3
from pathlib import Path

DB_PATH = "data/bookshelf.db"


def migrate():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    print("开始迁移数据库...")

    # ── 1. 新增 users 表 ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            role        TEXT    NOT NULL DEFAULT 'child',  -- parent / child
            avatar      TEXT    DEFAULT '',                -- 头像emoji或url
            pin         TEXT    DEFAULT '',                -- 简单数字PIN，可选
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    print("✓ users 表已创建")

    # ── 2. 插入默认家庭成员（避免重复插入）──
    cur.execute("SELECT COUNT(*) FROM users")
    if cur.fetchone()[0] == 0:
        default_users = [
            ("爸爸", "parent", "👨", ""),
            ("妈妈", "parent", "👩", ""),
            ("孩子", "child",  "🧒", ""),
        ]
        cur.executemany(
            "INSERT INTO users (name, role, avatar, pin) VALUES (?,?,?,?)",
            default_users
        )
        print("✓ 默认家庭成员已添加（爸爸/妈妈/孩子）")
    else:
        print("✓ users 表已有数据，跳过默认插入")

    # ── 3. borrow_logs 加 user_id 列（如果不存在）──
    cur.execute("PRAGMA table_info(borrow_logs)")
    cols = [row[1] for row in cur.fetchall()]
    if "user_id" not in cols:
        cur.execute("ALTER TABLE borrow_logs ADD COLUMN user_id INTEGER REFERENCES users(id)")
        print("✓ borrow_logs 新增 user_id 列")
    else:
        print("✓ borrow_logs.user_id 已存在，跳过")

    # ── 4. 新增 reading_goals 表 ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS reading_goals (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id),
            weekly_target   INTEGER DEFAULT 1,   -- 每周目标借阅本数
            created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id)
        )
    """)
    print("✓ reading_goals 表已创建")

    # ── 4.5 users 表加 color 列（如果不存在）──
    cur.execute("PRAGMA table_info(users)")
    user_cols = [row[1] for row in cur.fetchall()]
    if "color" not in user_cols:
        cur.execute("ALTER TABLE users ADD COLUMN color TEXT DEFAULT 'warm'")
        print("✓ users 新增 color 列")
    else:
        print("✓ users.color 已存在，跳过")

    # ── 5. 新增 user_sessions 表（记录当前活跃用户）──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id          INTEGER PRIMARY KEY,   -- 固定只有1行
            user_id     INTEGER REFERENCES users(id),
            switched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    # 初始化默认活跃用户为第一个 parent
    cur.execute("SELECT COUNT(*) FROM user_sessions")
    if cur.fetchone()[0] == 0:
        cur.execute("SELECT id FROM users WHERE role='parent' LIMIT 1")
        first_parent = cur.fetchone()
        if first_parent:
            cur.execute(
                "INSERT INTO user_sessions (id, user_id) VALUES (1, ?)",
                (first_parent[0],)
            )
    print("✓ user_sessions 表已创建（记录当前使用者）")

    conn.commit()
    conn.close()
    print("\n迁移完成！现有书柜数据全部保留。")


if __name__ == "__main__":
    if not Path(DB_PATH).exists():
        print(f"错误：找不到数据库文件 {DB_PATH}")
    else:
        migrate()