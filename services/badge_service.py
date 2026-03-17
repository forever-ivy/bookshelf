"""
services/badge_service.py
徽章检查与颁发。
"""

from extensions import db_conn


def check_and_award_badges(user_id: int):
    """在 take_book 成功后调用，检查并颁发徽章"""
    try:
        conn = db_conn()
        cur = conn.cursor()

        # 已有徽章
        cur.execute("SELECT badge_key FROM user_badges WHERE user_id=?", (user_id,))
        owned = {r["badge_key"] for r in cur.fetchall()}

        # 总借阅次数
        cur.execute("SELECT COUNT(*) as cnt FROM borrow_logs WHERE user_id=? AND action='take'", (user_id,))
        total = cur.fetchone()["cnt"]

        # 取书时间
        cur.execute("SELECT action_time FROM borrow_logs WHERE user_id=? AND action='take' ORDER BY action_time DESC LIMIT 1", (user_id,))
        last_row = cur.fetchone()

        new_badges = []
        def award(key):
            if key not in owned:
                cur.execute("INSERT INTO user_badges (user_id, badge_key) VALUES (?,?)", (user_id, key))
                new_badges.append(key)

        if total >= 1:  award("first_book")
        if total >= 5:  award("book_5")
        if total >= 10: award("book_10")
        if total >= 30: award("book_30")

        if last_row:
            from datetime import datetime
            t = datetime.fromisoformat(last_row["action_time"])
            if t.hour < 8:  award("early_bird")
            if t.hour >= 21: award("night_owl")

        # 分类多样性
        cur.execute("""
            SELECT COUNT(DISTINCT b.category) as cnt FROM borrow_logs bl
            JOIN books b ON bl.book_id=b.id
            WHERE bl.user_id=? AND b.category IS NOT NULL
        """, (user_id,))
        cats = cur.fetchone()["cnt"]
        if cats >= 5: award("variety_5")

        conn.commit()
        conn.close()
        return new_badges
    except Exception as e:
        print(f"[badge] 检查失败: {e}")
        return []
