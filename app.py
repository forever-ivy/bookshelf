"""
app.py
Flask 应用工厂 + 蓝图注册入口。
"""

import os
import subprocess
import threading

from flask import Flask

from auth_utils import ensure_auth_schema, guard_request
from middleware import register_middleware
from config import WAKE_WORDS, _WAKE_LOCK_PATH

from api.auth import auth_bp
from api.shelf import shelf_bp
from api.voice import voice_bp
from api.books import books_bp
from api.users import users_bp
from api.families import families_bp
from api.accounts import accounts_bp
from api.reports import reports_bp
from api.chat import chat_bp


def create_app():
    application = Flask(__name__)
    ensure_auth_schema()

    # 注册 JSON 响应包装中间件
    register_middleware(application)
    application.before_request(guard_request)

    # 注册蓝图
    application.register_blueprint(auth_bp)
    application.register_blueprint(chat_bp)
    application.register_blueprint(shelf_bp)
    application.register_blueprint(voice_bp)
    application.register_blueprint(books_bp)
    application.register_blueprint(users_bp)
    application.register_blueprint(families_bp)
    application.register_blueprint(accounts_bp)
    application.register_blueprint(reports_bp)

    return application


app = create_app()


# ── 唤醒线程启动 ──────────────────────────────────────────

def _is_python_pid_alive(pid: int) -> bool:
    try:
        out = subprocess.check_output(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            encoding="utf-8",
            errors="ignore",
        ).strip()
        if not out or "No tasks are running" in out:
            return False
        return "python" in out.lower()
    except Exception:
        return False


_wake_thread_started = False
_wake_lock = threading.Lock()

def _should_enable_wake_listen() -> bool:
    raw = os.environ.get("ENABLE_WAKE_LISTEN")
    return raw is not None and raw.strip().lower() in ("1", "true", "yes", "on")


if _should_enable_wake_listen():
    print(f"[wake] ENABLE_WAKE_LISTEN=1 lock={_WAKE_LOCK_PATH}")
    with _wake_lock:
        if not _wake_thread_started:
            lock_held = False
            if os.path.exists(_WAKE_LOCK_PATH):
                try:
                    with open(_WAKE_LOCK_PATH, "r", encoding="utf-8") as fp:
                        old_pid = int(fp.read().strip())
                    if _is_python_pid_alive(old_pid):
                        print(f"[wake] lock held by pid {old_pid}, skip")
                        lock_held = True
                    else:
                        print(f"[wake] removing stale lock from pid {old_pid}")
                        os.remove(_WAKE_LOCK_PATH)
                except Exception:
                    try:
                        print("[wake] removing unreadable wake lock")
                        os.remove(_WAKE_LOCK_PATH)
                    except Exception:
                        pass

            if not lock_held:
                try:
                    fd = os.open(_WAKE_LOCK_PATH, os.O_CREAT | os.O_EXCL | os.O_RDWR)
                    os.write(fd, str(os.getpid()).encode("utf-8"))
                    os.close(fd)
                    from services.voice_service import wake_loop
                    print(f"[wake] starting wake thread pid={os.getpid()} words={WAKE_WORDS}")
                    threading.Thread(target=wake_loop, daemon=True).start()
                    _wake_thread_started = True
                except FileExistsError:
                    print("[wake] lock exists, skip")
else:
    print("[wake] disabled because ENABLE_WAKE_LISTEN is not set to 1")


if __name__ == "__main__":
    app.run(debug=True, use_reloader=False, host="0.0.0.0", port=5000)
