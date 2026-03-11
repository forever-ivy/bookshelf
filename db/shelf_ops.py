import sqlite3

DB_PATH = "data/bookshelf.db"

def find_free_compartment():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT compartment_id, x, y FROM compartments WHERE status = 'free' ORDER BY compartment_id LIMIT 1")
    row = cur.fetchone()
    conn.close()
    return row

def get_all_compartments():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT compartment_id, x, y, status FROM compartments ORDER BY compartment_id")
    rows = cur.fetchall()
    conn.close()
    return rows

def store_book(book_id, compartment_id, user_id=None):
    """存书。user_id 为当前操作用户，None 时自动取当前活跃用户。"""
    from db.user_ops import get_current_user
    if user_id is None:
        cur_user = get_current_user()
        user_id = cur_user["id"] if cur_user else None

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO stored_books (compartment_id, book_id) VALUES (?, ?)", (compartment_id, book_id))
    cur.execute("UPDATE compartments SET status = 'occupied' WHERE compartment_id = ?", (compartment_id,))
    cur.execute(
        "INSERT INTO borrow_logs (book_id, action, compartment_id, user_id) VALUES (?, 'store', ?, ?)",
        (book_id, compartment_id, user_id)
    )
    conn.commit()
    conn.close()

def take_book_by_cid(compartment_id, user_id=None):
    """取书。user_id 为当前操作用户，None 时自动取当前活跃用户。"""
    from db.user_ops import get_current_user
    if user_id is None:
        cur_user = get_current_user()
        user_id = cur_user["id"] if cur_user else None

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT book_id FROM stored_books WHERE compartment_id = ?", (compartment_id,))
    row = cur.fetchone()
    if row:
        book_id = row[0]
        cur.execute("DELETE FROM stored_books WHERE compartment_id = ?", (compartment_id,))
        cur.execute("UPDATE compartments SET status = 'free' WHERE compartment_id = ?", (compartment_id,))
        cur.execute(
            "INSERT INTO borrow_logs (book_id, action, compartment_id, user_id) VALUES (?, 'take', ?, ?)",
            (book_id, compartment_id, user_id)
        )
        conn.commit()
    conn.close()
    return True

def get_book_in_compartment(compartment_id):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT b.title FROM stored_books s JOIN books b ON s.book_id = b.id WHERE s.compartment_id = ?", (compartment_id,))
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None

def find_books_by_keyword(keyword):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("""
        SELECT b.title, c.compartment_id, c.x, c.y FROM books b
        JOIN stored_books s ON b.id = s.book_id
        JOIN compartments c ON s.compartment_id = c.compartment_id
        WHERE b.title LIKE ? ORDER BY b.title
    """, (f"%{keyword}%",))
    rows = cur.fetchall()
    conn.close()
    return rows

def insert_book(title, author, category, keywords, description):
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("INSERT INTO books (title, author, category, keywords, description) VALUES (?,?,?,?,?)",
                (title, author, category, keywords, description))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()
    return new_id

def get_real_time_status():
    """统一为 AI 提供最准确的数据库快照"""
    import sqlite3
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    # 1. 查当前所有在架的书及其详细分类
    cur.execute("""
        SELECT b.title, b.category, b.author 
        FROM stored_books s JOIN books b ON s.book_id = b.id
    """)
    inventory = [f"《{r[0]}》({r[1]}/{r[2]})" for r in cur.fetchall()]
    # 2. 查最近 5 条真实的存取记录
    cur.execute("""
        SELECT b.title, l.action, l.action_time 
        FROM borrow_logs l JOIN books b ON l.book_id = b.id 
        ORDER BY l.action_time DESC LIMIT 5
    """)
    logs = [f"{r[2]} {'存入' if r[1]=='store' else '取出'}了《{r[0]}》" for r in cur.fetchall()]
    conn.close()
    return inventory, logs