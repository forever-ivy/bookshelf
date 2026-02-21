import tkinter as tk
import threading
from tkinter import messagebox, scrolledtext
import tkinter.ttk as ttk
import time
import re

# 导入 AI 相关接口（已确保包含数据库上下文逻辑）
from ai.book_match_ai import (
    get_or_create_book_by_ai, 
    chat_with_librarian, 
    get_ai_reading_analysis,
    trigger_action_chat
)

# 业务逻辑
from db.book_match import match_book
from db.shelf_ops import (
    find_free_compartment,
    store_book,
    get_all_compartments,
    get_book_in_compartment,
    find_books_by_keyword,
    take_book_by_cid
)
from ocr.video_ocr import recognize_book_from_camera
from ai.voice_module import speak, listen

# --- 家庭温馨风格配色 ---
ACCENT = "#8E735B"          # 胡桃木色（主色）
ACCENT_DARK = "#6F5A46"     # 深木色
FREE_COLOR = "#A3B18A"      # 鼠尾草绿（空闲）
OCCUPIED_COLOR = "#BC6C25"  # 琥珀橙（占用）
BG_COLOR = "#FDFCF0"        # 奶油米白（背景）
PANEL_BG = "#FEFAE0"        # 浅色木纹（面板）
CARD_BG = "#FFFFFF"         # 纯白卡片
SHADOW = "#E9E5D5"          # 暖色阴影
FONT_MAIN = ("微软雅黑", 10)
FONT_TITLE = ("微软雅黑", 16, "bold")
FONT_SMALL = ("微软雅黑", 9)

# 主窗口
root = tk.Tk()
root.title("🏠 我们的家庭书柜")
root.geometry("1150x750")
root.configure(bg=BG_COLOR)

# ttk 样式美化
style = ttk.Style(root)
style.theme_use('clam')
style.configure('Accent.TButton',
                foreground='white',
                background=ACCENT,
                font=FONT_MAIN,
                padding=(12, 8))
style.map('Accent.TButton', background=[('active', ACCENT_DARK)])

# 状态变量
status_var = tk.StringVar(value="欢迎回家，今天想读哪本书？")

# --- 通用辅助函数 ---
def log(msg):
    t = time.strftime("%H:%M")
    log_text.configure(state='normal')
    # 温馨化语言处理
    msg = msg.replace("存入", "收纳了").replace("成功", "好啦").replace("失败", "出错了")
    log_text.insert(tk.END, f" {t}  {msg}\n", "log_style")
    log_text.see(tk.END)
    log_text.configure(state='disabled')
    status_var.set(msg)

def show_family_msg(title, message, is_confirm=False, on_confirm=None):
    """自定义家庭风格弹窗"""
    dialog = tk.Toplevel(root)
    dialog.title(title)
    dialog.geometry("360x220")
    dialog.configure(bg=BG_COLOR)
    dialog.resizable(False, False)
    dialog.transient(root)
    dialog.grab_set()

    root.update_idletasks()
    x = root.winfo_x() + (root.winfo_width() // 2) - 180
    y = root.winfo_y() + (root.winfo_height() // 2) - 110
    dialog.geometry(f"+{x}+{y}")

    content = tk.Frame(dialog, bg=BG_COLOR, padx=20, pady=20)
    content.pack(fill=tk.BOTH, expand=True)

    tk.Label(content, text="💡 提示", font=FONT_SMALL, bg=BG_COLOR, fg=ACCENT).pack(anchor='w')
    tk.Label(content, text=message, font=FONT_MAIN, bg=BG_COLOR, fg="#444", wraplength=300, justify="left").pack(pady=15)

    btn_frame = tk.Frame(dialog, bg=PANEL_BG, height=50)
    btn_frame.pack(fill=tk.X, side=tk.BOTTOM)

    if is_confirm:
        ttk.Button(btn_frame, text="取消", command=dialog.destroy).pack(side=tk.RIGHT, padx=10, pady=10)
        ttk.Button(btn_frame, text="确认", style='Accent.TButton', 
                   command=lambda: (dialog.destroy(), on_confirm() if on_confirm else None)).pack(side=tk.RIGHT, pady=10)
    else:
        ttk.Button(btn_frame, text="好哒", style='Accent.TButton', command=dialog.destroy).pack(pady=10)

def show_multi_choice(books):
    """当搜索到多本相似书籍时的温馨选择列表"""
    win = tk.Toplevel(root)
    win.title("找找哪一本是你的？")
    win.geometry("400x450")
    win.configure(bg=BG_COLOR)

    tk.Label(win, text="🔍 帮您找到了以下书籍", font=FONT_TITLE, bg=BG_COLOR, fg=ACCENT, pady=20).pack()
    container_sub = tk.Frame(win, bg=BG_COLOR)
    container_sub.pack(fill=tk.BOTH, expand=True, padx=20)

    for b in books:
        btn = tk.Button(container_sub, text=f"📖 {b['title']}\n(位于 {b['cid']} 号格)", 
                        font=FONT_MAIN, bg=CARD_BG, fg="#555", relief='flat',
                        padx=10, pady=10, anchor='w', justify='left',
                        highlightthickness=1, highlightbackground=SHADOW,
                        command=lambda book=b: (win.destroy(), do_take_book(book)))
        btn.pack(fill=tk.X, pady=5)
        btn.bind("<Enter>", lambda e, b=btn: b.config(bg=PANEL_BG))
        btn.bind("<Leave>", lambda e, b=btn: b.config(bg=CARD_BG))

    ttk.Button(win, text="先不取了", command=win.destroy).pack(pady=20)

# --- AI 数据与分析逻辑 ---
def refresh_ai_insight():
    """异步获取AI馆藏分析（寄语）"""
    def worker():
        try:
            insight = get_ai_reading_analysis()
            root.after(0, lambda: ai_insight_label.config(text=insight))
        except:
            root.after(0, lambda: ai_insight_label.config(text="馆长正在整理书架，稍后再聊~"))
    threading.Thread(target=worker, daemon=True).start()

def voice_chat_ui():
    """语音输入 = 聊天输入"""
    def worker():
        log("我在听你说话...")
        text = listen()
        if not text:
            log("没听清，再说一次吧")
            return
        root.after(0, lambda: update_chat_display("你（语音）", text))
        reply = chat_with_librarian(text)
        root.after(0, lambda: update_chat_display("小燕", reply))
        speak(reply)
    threading.Thread(target=worker, daemon=True).start()


def send_chat(event=None):
    """处理AI聊天发送：整合数据库上下文"""
    user_input = chat_entry.get().strip()
    if not user_input: return
    
    update_chat_display("你", user_input)
    chat_entry.delete(0, tk.END)
    
    def worker():
        # 调用优化后的对话接口
        reply = chat_with_librarian(user_input)
        root.after(0, lambda: update_chat_display("小燕", reply))
        speak(reply) # AI 语音播报
    
    threading.Thread(target=worker, daemon=True).start()

def update_chat_display(sender, text):
    """统一更新聊天框的辅助函数"""
    chat_display.configure(state='normal')
    chat_display.insert(tk.END, f"{sender}: {text}\n\n")
    chat_display.see(tk.END)
    chat_display.configure(state='disabled')

# --- 统一的 AI 主动发言接口 ---
def ai_speak_actively(action, title):
    """物理动作后的 AI 触发器"""
    from ai.book_match_ai import trigger_action_chat
    def worker():
        reply = trigger_action_chat(action, title)
        root.after(0, lambda: update_chat_display("小燕", reply))
        speak(reply)
    threading.Thread(target=worker, daemon=True).start()

# --- 业务逻辑函数 ---
def do_take_book(book):
    title = book["title"]
    cid = book["cid"]
    # 1. 只有数据库执行成功
    if take_book_by_cid(cid):
        log(f"取出成功：《{title}》")
        render_shelf_grid() 
        # 2. 才触发 AI 主动对话
        ai_speak_actively('take', title)

def take_book_by_click(cid, title):
    def confirm_action():
        if take_book_by_cid(cid):
            log(f"取出成功：《{title}》")
            render_shelf_grid()
            # 📣 物理动作确认后触发
            ai_speak_actively('take', title)

    show_family_msg("取书确认", f"取出第 {cid} 格的《{title}》吗？", 
                    is_confirm=True, on_confirm=confirm_action)

def store_book_ai_worker(ocr_texts):
    try:
        local = match_book(ocr_texts)
        book_id, title = None, None
        if local and isinstance(local, (list, tuple)):
            book_id, title = local[0], local[1]
        
        if not book_id:
            root.after(0, lambda: log("正在翻阅云端资料..."))
            book = get_or_create_book_by_ai(ocr_texts)
            if not book: return
            book_id, title = book.get("id"), book.get("title")

        free = find_free_compartment()
        if not free:
            root.after(0, lambda: log("书柜满了，整理一下再存吧"))
            return
        
        cid, _, _ = free
        store_book(book_id, cid)
        root.after(0, lambda: (log(f"存入：《{title}》 → 隔间 {cid}"), render_shelf_grid(), refresh_ai_insight()))
        ai_speak_actively('store', title)
    except Exception as err:
        root.after(0, lambda: log(f"处理失败: {err}"))

def store_book_ui():
    log("开启摄像头识字中...")
    result = recognize_book_from_camera()
    if not result: return
    
    if isinstance(result, dict) and (result.get("book_id") or result.get("id")):
        book_id = result.get("book_id") or result.get("id")
        title = result.get("title")
        free = find_free_compartment()
        if not free: return
        store_book(book_id, free[0])
        log(f"存入：《{title}》")
        render_shelf_grid()
        refresh_ai_insight()
        ai_speak_actively('store', title)
    else:
        ocr_texts = result.get("ocr_texts") if isinstance(result, dict) else result
        if ocr_texts:
            threading.Thread(target=store_book_ai_worker, args=(ocr_texts,), daemon=True).start()

def take_book_ui():
    keyword = entry_take.get().strip()
    if not keyword: return
    results = find_books_by_keyword(keyword)
    if not results:
        messagebox.showwarning("提示", "家里好像没找着这本书~")
        return
    books = [{"title": r[0], "cid": r[1], "x": r[2], "y": r[3]} for r in results]
    if len(books) == 1:
        do_take_book(books[0])
    else:
        show_multi_choice(books)

# --- UI 布局 ---
container = tk.Frame(root, bg=BG_COLOR)
container.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

# [1. 左侧：操作栏]
left = tk.Frame(container, bg=PANEL_BG, highlightbackground=SHADOW, highlightthickness=1)
left.place(relx=0, rely=0, relwidth=0.28, relheight=1)

header = tk.Frame(left, bg=ACCENT, height=70)
header.pack(fill=tk.X)
tk.Label(header, text="🏮 家庭智慧书柜", font=FONT_TITLE, bg=ACCENT, fg='white').pack(pady=15)

ops = tk.Frame(left, bg=PANEL_BG)
ops.pack(fill=tk.X, padx=20, pady=20)
ttk.Button(ops, text="✨ 扫码存书", style='Accent.TButton', command=store_book_ui).pack(fill=tk.X, pady=10)

tk.Label(ops, text="想找哪本书？", bg=PANEL_BG, font=FONT_SMALL, fg=ACCENT_DARK).pack(anchor='w', pady=(15,2))
entry_take = tk.Entry(ops, font=FONT_MAIN, relief='flat', highlightthickness=1, highlightbackground=SHADOW)
entry_take.pack(fill=tk.X, ipady=5)
ttk.Button(ops, text="🔍 帮我找找", style='Accent.TButton', command=take_book_ui).pack(fill=tk.X, pady=10)



log_card = tk.Frame(left, bg=CARD_BG, highlightbackground=SHADOW, highlightthickness=1)
log_card.pack(fill=tk.BOTH, expand=True, padx=20, pady=(10,20))
tk.Label(log_card, text="📖 阅览点滴", bg=CARD_BG, font=FONT_SMALL, fg=ACCENT).pack(anchor='w', padx=10, pady=8)
log_text = scrolledtext.ScrolledText(log_card, state='disabled', font=("微软雅黑", 9), bg=CARD_BG, bd=0)
log_text.tag_configure("log_style", foreground="#555555")
log_text.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

# [2. 中间：书架状态]
right = tk.Frame(container, bg=BG_COLOR)
right.place(relx=0.3, rely=0, relwidth=0.45, relheight=1)

tk.Label(right, text="我的藏书架", font=FONT_TITLE, bg=BG_COLOR, fg=ACCENT_DARK).pack(anchor='nw', pady=(0,15))
shelf_frame = tk.Frame(right, bg=BG_COLOR)
shelf_frame.pack(fill=tk.BOTH, expand=True)

stats_bar_ui = tk.Frame(right, bg=PANEL_BG, highlightbackground=SHADOW, highlightthickness=1)
stats_bar_ui.pack(fill=tk.X, pady=10)
lbl_total = tk.Label(stats_bar_ui, text="容量 -", bg=PANEL_BG, font=FONT_SMALL)
lbl_free = tk.Label(stats_bar_ui, text="空位 -", bg=PANEL_BG, font=FONT_SMALL, fg=FREE_COLOR)
lbl_books = tk.Label(stats_bar_ui, text="已存 -", bg=PANEL_BG, font=FONT_SMALL, fg=OCCUPIED_COLOR)
lbl_total.pack(side=tk.LEFT, padx=20, pady=10)
lbl_free.pack(side=tk.LEFT, padx=20)
lbl_books.pack(side=tk.LEFT, padx=20)

# [3. 右侧：AI 助手面板]
ai_panel = tk.Frame(container, bg=PANEL_BG, highlightbackground=SHADOW, highlightthickness=1)
ai_panel.place(relx=0.77, rely=0, relwidth=0.23, relheight=1)

tk.Label(ai_panel, text="✨ AI 馆长寄语", font=FONT_SMALL, bg=PANEL_BG, fg=ACCENT).pack(pady=10)
ai_insight_label = tk.Label(ai_panel, text="正在观察书柜动态...", font=FONT_SMALL, 
                            bg=CARD_BG, fg="#666", wraplength=200, justify="left", padx=10, pady=15)
ai_insight_label.pack(fill=tk.X, padx=10)

tk.Label(ai_panel, text="💬 聊聊书", font=FONT_SMALL, bg=PANEL_BG, fg=ACCENT).pack(pady=(20, 5))
chat_display = scrolledtext.ScrolledText(ai_panel, state='disabled', font=FONT_SMALL, bg=BG_COLOR, height=18)
chat_display.pack(fill=tk.BOTH, expand=True, padx=10)

chat_entry = tk.Entry(ai_panel, font=FONT_SMALL)
chat_entry.pack(fill=tk.X, padx=10, pady=10)
chat_entry.bind("<Return>", send_chat)

ttk.Button(
    ai_panel,
    text="🎤 语音对话",
    style='Accent.TButton',
    command=voice_chat_ui
).pack(pady=(0, 10))

# --- 渲染逻辑 ---
def update_stats():
    data = get_all_compartments()
    total = len(data)
    free = sum(1 for (_,_,_,s) in data if s == 'free')
    lbl_total.config(text=f"书柜容量 {total}")
    lbl_free.config(text=f"还有 {free} 个空位")
    lbl_books.config(text=f"已存 {total-free} 本书")

def render_shelf_grid():
    for w in shelf_frame.winfo_children(): w.destroy()
    data = get_all_compartments()
    COLS = 3
    for i, (cid, x, y, status) in enumerate(data):
        r, c = divmod(i, COLS)
        book = get_book_in_compartment(cid)
        card = tk.Frame(shelf_frame, bg=CARD_BG, highlightbackground=SHADOW, highlightthickness=1)
        card.grid(row=r, column=c, padx=10, pady=10, sticky='nsew')

        base_color = OCCUPIED_COLOR if book else FREE_COLOR
        btn_text = book if book else f"格间 {cid}\n(空闲)"
        btn = tk.Button(card, text=btn_text, bg=base_color, fg='white',
                        width=15, height=4, wraplength=110, font=("微软雅黑", 10, "bold"),
                        relief='flat', cursor='hand2' if book else 'arrow',
                        command=(lambda cid=cid, title=book: take_book_by_click(cid, title)) if book else None)
        btn.pack(padx=8, pady=8)
    for c in range(COLS): shelf_frame.grid_columnconfigure(c, weight=1)
    update_stats()

# 状态栏
status_bar = tk.Frame(root, bg="#F0EDE4", height=30)
status_bar.pack(fill=tk.X, side=tk.BOTTOM)
tk.Label(status_bar, textvariable=status_var, bg="#F0EDE4", font=FONT_SMALL, fg="#777").pack(side=tk.LEFT, padx=15)

# 初始化
render_shelf_grid()
refresh_ai_insight()
root.mainloop()