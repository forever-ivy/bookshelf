"""
services/ai_dispatch.py
AI 模型调度：prompt 构建、模型调用、命令解析与执行。
不依赖 Flask。
"""

import json
import re

from db.shelf_ops import get_all_compartments, get_book_in_compartment, take_book_by_cid
from ai.book_match_ai import (
    _build_user_persona,
    _get_current_user_safe,
    _get_tone_guide,
    ollama_call,
)
from services.shelf_service import store_from_image_bytes, take_by_text


def build_bookshelf_status_for_prompt():
    items = []
    try:
        for cid, _x, _y, status in get_all_compartments():
            if status != "occupied":
                continue
            title = get_book_in_compartment(cid)
            if title:
                items.append(f"{cid}:{title}")
    except Exception:
        pass
    if not items:
        return "书柜为空"
    return "已存书籍（cid:标题）=" + ", ".join(items[:40])


def parse_model_response(model_output):
    if isinstance(model_output, str):
        model_output = re.sub(r"```json\\s*([\\s\\S]*?)\\s*```", r"\\1", model_output).strip()
    try:
        data = json.loads(model_output)
    except Exception:
        return "", []
    response_text = data.get("response", "")
    commands = data.get("commands", [])
    if not isinstance(commands, list):
        commands = []
    return response_text, commands


def dispatch_with_model(user_text: str):
    user = _get_current_user_safe()
    uname = (user or {}).get("name", "主人")
    persona = _build_user_persona()
    tone = _get_tone_guide(user)

    prompt = f"""
你是一个智能书柜语音助手，名字是"小燕"。请根据用户指令返回 JSON：
1) response: 给用户的自然语言回复（直接称呼对方为"{uname}"）
2) commands: 设备控制指令列表

commands 格式：
{{"device":"bookshelf","action":"take|store|status","book":"书名(可选)","cid":整数(可选)}}

规则：
- 取书/拿书/借书 → action=take，尽量填 book
- 存书/还书/放回 → action=store
- 纯聊天 → commands 为空数组
- 无法确定书名但明确要取书 → 只给 action=take，不编造书名

【当前用户信息】{persona}
【语气要求】{tone}
当前书柜状态：{build_bookshelf_status_for_prompt()}

{uname}说："{user_text}"
"""
    reply = ollama_call(prompt)
    response_text, commands = parse_model_response(reply)
    return response_text, commands, reply


def execute_model_commands(commands, image_bytes=None, push_event_fn=None):
    need_image = False
    msg = ""
    ai_reply = ""
    intent = "chat"

    for cmd in commands:
        device = (cmd.get("device") or "").lower()
        action = (cmd.get("action") or "").lower()
        if device and device != "bookshelf":
            continue

        if action == "store":
            intent = "store"
            if image_bytes:
                ok, msg, ai_reply = store_from_image_bytes(image_bytes, speak_out=False)
            else:
                need_image = True
            break
        if action == "take":
            intent = "take"
            book = (cmd.get("book") or "").strip()
            cid = cmd.get("cid")
            if book:
                ok, msg, ai_reply = take_by_text(book, speak_out=False)
            elif cid is not None:
                ok = take_book_by_cid(cid)
                msg = "取出成功" if ok else "取书失败"
            else:
                msg = "请说明要取的书名"
            break
        if action == "status":
            intent = "status"
            msg = build_bookshelf_status_for_prompt()
            break

    if push_event_fn:
        if msg:
            push_event_fn("log", msg)
        if ai_reply:
            push_event_fn("assistant", ai_reply)

    return {
        "intent": intent,
        "need_image": need_image,
        "msg": msg,
        "ai_reply": ai_reply,
    }
