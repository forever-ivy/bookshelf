import requests
import json
from ai.voice_module import speak
OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
MODEL_NAME = "qwen2.5:7b"

# 在文件顶部定义一个全局变量（或在类中管理）
CHAT_HISTORY = []
MAX_HISTORY = 10  # 只保留最近5轮对话（1轮 = 用户+AI）

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

def chat_with_librarian(user_msg):
    """处理日常连续对话（比如你说“想”、“好啊”）"""
    from db.shelf_ops import get_real_time_status
    books, _ = get_real_time_status()
    global CHAT_HISTORY
    
    # 1. 提取纯净的对话历史，屏蔽系统动作干扰
    history_str = ""
    for role, content in CHAT_HISTORY:
        if role in ["用户", "小燕"]:
            history_str += f"{role}: {content}\n"
    
    # 2. 获取当前书架事实
    fact_context = f"【当前事实】书柜里有：{', '.join(books) if books else '空'}。"

    prompt = f"""
你是一个温馨、聪明且专注的家庭书柜助手“小燕”。
{fact_context}

【之前的对话记忆】
{history_str}

主人现在对你说："{user_msg}"

【行为准则】：
1. 专注于回答主人最新的一句话。
2. 如果主人说“想”、“好”、“聊聊”等肯定词，请查看【对话记忆】中上一条小燕的提议，并据此深入展开。
3. 严禁复读或臆造不存在的存取动作。
4. 保持亲切俏皮的语气。
"""
    reply = ollama_call(prompt)
    
    CHAT_HISTORY.append(("用户", user_msg))
    CHAT_HISTORY.append(("小燕", reply))
    if len(CHAT_HISTORY) > MAX_HISTORY:
        CHAT_HISTORY = CHAT_HISTORY[-MAX_HISTORY:]
        
    return reply

def get_ai_reading_analysis():
    from db.shelf_ops import get_real_time_status
    inventory, _ = get_real_time_status()
    count = len(inventory)
    
    prompt = f"我的家庭书柜目前存了 {count} 本书（分别是：{', '.join(inventory)}）。请给出一句 50 字以内非常温馨的馆长寄语。"
    return ollama_call(prompt)

def get_or_create_book_by_ai(ocr_texts):
    from db.book_match import find_book_by_title
    from db.shelf_ops import insert_book
    info = ai_parse_book_from_ocr(ocr_texts)
    title = info.get("title")
    if not title: return None
    
    existing = find_book_by_title(title)
    if existing:
        return {"id": existing[0], "title": existing[1]}
    
    new_id = insert_book(title, info.get("author"), info.get("category"), info.get("keywords"), info.get("description"))
    return {"id": new_id, "title": title}

def ai_parse_book_from_ocr(ocr_texts):
    ocr_text = "\n".join(ocr_texts)
    prompt = f"请根据 OCR 文本识别书籍信息并返回 JSON：{ocr_text}。格式：{{'title':'','author':'','category':'','keywords':'','description':''}}"
    text = ollama_call(prompt)
    try:
        # 简单清理可能的 markdown 标签
        clean_json = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)
    except:
        return {"title": ocr_texts[0] if ocr_texts else "未知书籍"}

def trigger_action_chat(action_type, book_title):
    """
    ✨ 动作感知入口：仅在物理存取成功后由 UI 调用。
    """
    global CHAT_HISTORY
    action_desc = "放回了" if action_type == 'store' else "取走了"
    
    prompt = f"""
你是一个温馨的家庭书柜助手“小燕”。
刚刚发生了真实动作：主人把《{book_title}》{action_desc}。

请针对这个动作发起对话：
1. 如果是【取走】：祝阅读愉快，并问：“想听听它的背景介绍或者有趣的小故事吗？”
2. 如果是【放回】：夸夸主人，并问：“想不想和我分享一下你的读后感？”
3. 只能聊这本《{book_title}》，字数在 60 字以内。
"""
    reply = ollama_call(prompt)
    
    # 存入历史，标记为对话，方便后续接话
    CHAT_HISTORY.append(("用户动作", f"主人{action_desc}了《{book_title}》"))
    CHAT_HISTORY.append(("小燕", reply))
    
    try:
        speak(reply)
    except Exception as e:
        print("TTS failed:", e)
    return reply

# 兼容性预留
def get_ai_reading_analysis():
    return "今天也是充满书香的一天呢！"