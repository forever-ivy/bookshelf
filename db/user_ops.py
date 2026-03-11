"""
db/user_ops.py
多用户管理模块：增删改查用户、切换当前用户、阅读目标管理
"""

import sqlite3
from datetime import datetime, timedelta

DB_PATH = "data/bookshelf.db"


# ══════════════════════════════════════════
#  用户 CRUD
# ══════════════════════════════════════════

def get_all_users():
    """返回所有用户列表"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id, name, role, avatar, pin, color, created_at FROM users ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    return [
        {"id": r[0], "name": r[1], "role": r[2],
         "avatar": r[3], "pin": r[4], "color": r[5], "created_at": r[6]}
        for r in rows
    ]


def get_user(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name, role, avatar, pin, color FROM users WHERE id=?",
        (user_id,)
    )
    r = cur.fetchone()
    conn.close()
    if not r:
        return None
    return {"id": r[0], "name": r[1], "role": r[2], "avatar": r[3], "pin": r[4], "color": r[5]}


def add_user(name: str, role: str = "child", avatar: str = "🧒", pin: str = "", color: str = "warm"):
    """新增家庭成员"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (name, role, avatar, pin, color) VALUES (?,?,?,?,?)",
        (name, role, avatar, pin, color)
    )
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return new_id


def update_user(user_id: int, name=None, role=None, avatar=None, pin=None, color=None):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    if name is not None:
        cur.execute("UPDATE users SET name=? WHERE id=?", (name, user_id))
    if role is not None:
        cur.execute("UPDATE users SET role=? WHERE id=?", (role, user_id))
    if avatar is not None:
        cur.execute("UPDATE users SET avatar=? WHERE id=?", (avatar, user_id))
    if pin is not None:
        cur.execute("UPDATE users SET pin=? WHERE id=?", (pin, user_id))
    if color is not None:
        cur.execute("UPDATE users SET color=? WHERE id=?", (color, user_id))
    conn.commit()
    conn.close()


def delete_user(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.commit()
    conn.close()


# ══════════════════════════════════════════
#  当前活跃用户（书柜当前是谁在用）
# ══════════════════════════════════════════

def get_current_user():
    """获取当前活跃用户，没有则返回第一个用户"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT u.id, u.name, u.role, u.avatar
        FROM user_sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = 1
    """)
    r = cur.fetchone()
    conn.close()
    if r:
        return {"id": r[0], "name": r[1], "role": r[2], "avatar": r[3]}
    # 兜底：返回第一个用户
    users = get_all_users()
    return users[0] if users else None


def switch_user(user_id: int):
    """切换当前活跃用户"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM user_sessions WHERE id=1")
    if cur.fetchone()[0] == 0:
        cur.execute("INSERT INTO user_sessions (id, user_id) VALUES (1,?)", (user_id,))
    else:
        cur.execute(
            "UPDATE user_sessions SET user_id=?, switched_at=CURRENT_TIMESTAMP WHERE id=1",
            (user_id,)
        )
    conn.commit()
    conn.close()


# ══════════════════════════════════════════
#  阅读目标
# ══════════════════════════════════════════

def set_reading_goal(user_id: int, weekly_target: int):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id FROM reading_goals WHERE user_id=?", (user_id,))
    if cur.fetchone():
        cur.execute(
            "UPDATE reading_goals SET weekly_target=? WHERE user_id=?",
            (weekly_target, user_id)
        )
    else:
        cur.execute(
            "INSERT INTO reading_goals (user_id, weekly_target) VALUES (?,?)",
            (user_id, weekly_target)
        )
    conn.commit()
    conn.close()


def get_reading_goal(user_id: int):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT weekly_target FROM reading_goals WHERE user_id=?", (user_id,))
    r = cur.fetchone()
    conn.close()
    return r[0] if r else 1


# ══════════════════════════════════════════
#  用户阅读统计
# ══════════════════════════════════════════

def get_user_stats(user_id: int):
    """获取某用户的借阅统计"""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # 总存取次数
    cur.execute(
        "SELECT action, COUNT(*) FROM borrow_logs WHERE user_id=? GROUP BY action",
        (user_id,)
    )
    action_counts = {r[0]: r[1] for r in cur.fetchall()}

    # 本周借阅次数（take = 借出）
    week_start = (datetime.now() - timedelta(days=datetime.now().weekday())).strftime("%Y-%m-%d")
    cur.execute("""
        SELECT COUNT(*) FROM borrow_logs
        WHERE user_id=? AND action='take'
        AND action_time >= ?
    """, (user_id, week_start))
    weekly_takes = cur.fetchone()[0]

    # 最近借阅的5本书
    cur.execute("""
        SELECT b.title, l.action, l.action_time
        FROM borrow_logs l JOIN books b ON l.book_id = b.id
        WHERE l.user_id=?
        ORDER BY l.action_time DESC LIMIT 5
    """, (user_id,))
    recent = [
        {"title": r[0], "action": r[1], "time": r[2]}
        for r in cur.fetchall()
    ]

    # 今日操作次数
    today = datetime.now().strftime("%Y-%m-%d")
    cur.execute("""
        SELECT COUNT(*) FROM borrow_logs
        WHERE user_id=? AND date(action_time) = ?
    """, (user_id, today))
    today_ops = cur.fetchone()[0]

    conn.close()

    goal = get_reading_goal(user_id)
    return {
        "total_store": action_counts.get("store", 0),
        "total_take":  action_counts.get("take", 0),
        "weekly_takes": weekly_takes,
        "weekly_goal":  goal,
        "goal_reached": weekly_takes >= goal,
        "today_ops":    today_ops,
        "recent":       recent,
    }


def get_family_stats():
    """获取全家所有成员的统计摘要"""
    users = get_all_users()
    result = []
    for u in users:
        stats = get_user_stats(u["id"])
        result.append({**u, **stats})
    return result