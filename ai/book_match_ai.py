import requests
import json
from ai.voice_module import speak

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "qwen2.5:7b"

# 按用户 ID 隔离的对话历史 {user_id: [(role, content), ...]}
_CHAT_HISTORIES: dict = {}
MAX_HISTORY = 10  # 每个用户保留最近5轮（1轮 = 用户+AI）

def _get_user_id() -> str:
    """获取当前用户ID，作为历史字典的key"""
    user = _get_current_user_safe()
    return str((user or {}).get("id", "default"))

def get_chat_history() -> list:
    return _CHAT_HISTORIES.get(_get_user_id(), [])

def set_chat_history(history: list):
    _CHAT_HISTORIES[_get_user_id()] = history

def clear_chat_history(user_id=None):
    """清空指定用户（或当前用户）的对话历史"""
    key = str(user_id) if user_id is not None else _get_user_id()
    _CHAT_HISTORIES.pop(key, None)


# ══════════════════════════════════════════
# 用户画像生成
# ══════════════════════════════════════════

def _get_current_user_safe():
    """获取当前用户，失败返回 None"""
    try:
        from db.user_ops import get_current_user
        return get_current_user()
    except Exception:
        return None

def _build_user_persona() -> str:
    """
    根据当前活跃用户生成自然语言画像，注入 prompt。
    返回例：「当前用户是【爸爸】，成年男性家长，偏好温馨经典风格。」
    """
    user = _get_current_user_safe()
    if not user:
        return "当前用户信息未知。"

    name  = user.get("name", "主人")
    role  = user.get("role", "")
    color = user.get("color", "warm")

    # 角色描述
    role_desc = {"parent": "成年家长", "child": "家中的孩子"}.get(role, "家庭成员")

    # 从姓名推测性别
    gender = ""
    if any(k in name for k in ["爸", "父", "爷", "哥", "叔", "伯", "男"]):
        gender = "男性"
    elif any(k in name for k in ["妈", "母", "奶", "姐", "姑", "婶", "女"]):
        gender = "女性"

    # 色调 → 阅读偏好
    color_hint = {
        "warm":   "偏好温馨经典风格",
        "forest": "偏好自然人文类书籍",
        "ocean":  "偏好理性深度阅读",
        "rose":   "偏好情感文学类书籍",
        "golden": "偏好历史人文类书籍",
        "slate":  "偏好严肃专业类书籍",
    }.get(color, "")

    parts = [f"当前用户是【{name}】，{role_desc}"]
    if gender:
        parts.append(gender)
    if color_hint:
        parts.append(color_hint)

    return "、".join(parts) + "。"


def _get_tone_guide(user) -> str:
    """根据用户角色返回语气指导"""
    if not user:
        return "保持亲切俏皮的语气。"
    role = user.get("role", "")
    name = user.get("name", "主人")
    if role == "child":
        return f"用活泼有趣的语气和{name}说话，推荐适龄书籍，多用鼓励语气，避免太严肃。"
    else:
        return f"用亲切尊重的语气和{name}说话，可以适当分享深度内容和见解。"


# ══════════════════════════════════════════
# Ollama 调用
# ══════════════════════════════════════════

def ollama_call(prompt):
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": MODEL_NAME, "prompt": prompt, "stream": False},
            timeout=30
        )
        return resp.json()["response"]
    except Exception as e:
        return f"哎呀，脑子卡住了...({e})"


# ══════════════════════════════════════════
# 日常对话
# ══════════════════════════════════════════

def chat_with_librarian(user_msg):
    """处理日常连续对话"""
    from db.shelf_ops import get_real_time_status
    books, _ = get_real_time_status()
    history = get_chat_history()

    # 对话历史
    history_str = ""
    for role, msg in history:
        if role in ["用户", "小燕"]:
            history_str += f"{role}: {msg}\n"

    # 书架事实
    fact_context = f"【当前事实】书柜里有：{', '.join(books) if books else '空'}。"

    # 用户画像
    user = _get_current_user_safe()
    persona = _build_user_persona()
    tone   = _get_tone_guide(user)
    uname  = (user or {}).get("name", "主人")

    prompt = f"""
你是一个温馨、聪明且专注的家庭书柜助手"小燕"。
{fact_context}

【当前用户信息】{persona}
【语气要求】{tone}

【之前的对话记忆】
{history_str}

{uname}现在对你说："{user_msg}"

【行为准则】：
1. 专注于回答{uname}最新的一句话。
2. 如果{uname}说"想"、"好"、"聊聊"等肯定词，请查看【对话记忆】中上一条小燕的提议，并据此深入展开。
3. 严禁复读或臆造不存在的存取动作。
4. 始终称呼对方为"{uname}"，不要用"主人"代替。
"""
    reply = ollama_call(prompt)

    history = get_chat_history()
    history.append(("用户", user_msg))
    history.append(("小燕", reply))
    if len(history) > MAX_HISTORY:
        history = history[-MAX_HISTORY:]
    set_chat_history(history)

    return reply


# ══════════════════════════════════════════
# OCR 书籍解析
# ══════════════════════════════════════════

def get_or_create_book_by_ai(ocr_texts):
    from db.book_match import find_book_by_title
    from db.shelf_ops import insert_book
    info = ai_parse_book_from_ocr(ocr_texts)
    title = info.get("title")
    if not title:
        return None
    existing = find_book_by_title(title)
    if existing:
        return {"id": existing[0], "title": existing[1]}
    new_id = insert_book(title, info.get("author"), info.get("category"),
                         info.get("keywords"), info.get("description"))
    return {"id": new_id, "title": title}


def ai_parse_book_from_ocr(ocr_texts):
    ocr_text = "\n".join(ocr_texts)
    prompt = (
        f"请根据 OCR 文本识别书籍信息并返回 JSON：{ocr_text}。"
        f"格式：{{\"title\":\"\",\"author\":\"\",\"category\":\"\",\"keywords\":\"\",\"description\":\"\"}}"
    )
    text = ollama_call(prompt)
    try:
        clean_json = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except Exception:
        return {"title": ocr_texts[0] if ocr_texts else "未知书籍"}


# ══════════════════════════════════════════
# 存取动作触发对话
# ══════════════════════════════════════════

def trigger_action_chat(action_type, book_title, speak_out=True):
    """物理存取成功后调用，小燕主动发起相关话题"""

    user    = _get_current_user_safe()
    persona = _build_user_persona()
    tone    = _get_tone_guide(user)
    uname   = (user or {}).get("name", "主人")
    action_desc = "放回了" if action_type == "store" else "取走了"

    prompt = f"""
你是一个温馨的家庭书柜助手"小燕"。
【当前用户信息】{persona}
【语气要求】{tone}

刚刚发生了真实动作：{uname}把《{book_title}》{action_desc}。

请针对这个动作向{uname}发起对话：
1. 如果是【取走】：祝阅读愉快，并问是否想听背景介绍或有趣的小故事
2. 如果是【放回】：夸夸{uname}，并问是否想分享读后感
3. 只能聊这本《{book_title}》，字数在 60 字以内。
4. 直接称呼{uname}，不要用"主人"。
"""
    reply = ollama_call(prompt)

    history = get_chat_history()
    history.append(("用户动作", f"{uname}{action_desc}了《{book_title}》"))
    history.append(("小燕", reply))
    set_chat_history(history)

    if speak_out:
        try:
            speak(reply)
        except Exception as e:
            print("TTS failed:", e)
    return reply


# ══════════════════════════════════════════
# 阅读分析（兼容预留）
# ══════════════════════════════════════════

def get_ai_reading_analysis():
    user  = _get_current_user_safe()
    uname = (user or {}).get("name", "")
    prefix = f"{uname}，" if uname else ""
    return f"{prefix}今天也是充满书香的一天呢！"