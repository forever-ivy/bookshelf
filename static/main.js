const getById = (id) => document.getElementById(id);
const logBox = getById("log_box");
const chatBox = getById("chat_box");

const TXT = {
  user: "\u4f60",
  userVoice: "\u4f60\uff08\u8bed\u97f3\u6307\u4ee4\uff09",
  bot: "\u5c0f\u71d5",
  sys: "\u7cfb\u7edf",
  welcome: "\u6b22\u8fce\u56de\u5bb6\uff01\u4eca\u5929\u60f3\u8bfb\u70b9\u4ec0\u4e48\u4e66\u5462\uff1f"
};

function log(msg) {
  const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const li = document.createElement("li");
  li.className = "log-item animate-fade-in";
  li.innerHTML = `<span class="log-time">${t}</span><span class="log-text">${msg}</span>`;
  logBox.prepend(li);
}

function chat(role, text, isAudio = false) {
  const div = document.createElement("div");
  div.className = `message-bubble ${role === TXT.bot ? "ai" : "user"} animate-slide-in`;
  const icon = role === TXT.bot ? '<i class="fa-solid fa-robot ai-avatar"></i>' : "";
  const audioIcon = isAudio ? '<i class="fa-solid fa-microphone-lines voice-indicator"></i> ' : "";

  div.innerHTML = `
    ${role === TXT.bot ? icon : ""}
    <div class="message-content">
      <div class="message-sender">${role}</div>
      <div class="message-text">${audioIcon}${String(text || "").replace(/\n/g, "<br>")}</div>
    </div>
  `;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function loadShelf() {
  const grid = getById("shelf_grid");
  try {
    const r = await fetch("/api/compartments");
    const data = await r.json();
    grid.innerHTML = "";
    let used = 0;

    data.forEach((it) => {
      const cell = document.createElement("div");
      cell.className = `shelf-cell animate-scale-in ${it.book ? "occupied" : "free"}`;
      if (it.book) {
        used++;
        cell.innerHTML = `
          <div class="cell-icon"><i class="fa-solid fa-book"></i></div>
          <div class="cell-title">${it.book}</div>
          <div class="cell-cid">${it.cid} \u53f7\u683c</div>
        `;
        cell.onclick = () => takeBook(it.cid, it.book);
        cell.title = `\u70b9\u51fb\u53d6\u51fa\u300a${it.book}\u300b`;
      } else {
        cell.innerHTML = `
          <div class="cell-icon free"><i class="fa-regular fa-square-plus"></i></div>
          <div class="cell-title">\u7a7a\u95f2</div>
          <div class="cell-cid">${it.cid} \u53f7\u683c</div>
        `;
      }
      grid.appendChild(cell);
    });

    getById("stats_bar").innerHTML = `
      <span class="pill pill-total"><i class="fa-solid fa-warehouse"></i> \u603b\u8ba1: ${data.length}</span>
      <span class="pill pill-used"><i class="fa-solid fa-book"></i> \u5df2\u5b58: ${used}</span>
      <span class="pill pill-free"><i class="fa-regular fa-square"></i> \u7a7a\u95f2: ${data.length - used}</span>
    `;
  } catch (e) {
    grid.innerHTML = `<div class="error-placeholder">\u52a0\u8f7d\u5931\u8d25: ${e.message}</div>`;
  }
}

async function loadAiInsight() {
  const box = getById("ai_insight_box");
  try {
    const r = await fetch("/api/ai_insight");
    const j = await r.json();
    box.innerHTML = j.insight || "";
  } catch (_) {
    box.innerText = "\u9986\u957f\u6682\u65f6\u65e0\u6cd5\u8fde\u63a5\u5230\u5927\u8111\u3002";
  }
}

async function storeByOcr(fromText, isAudio = false) {
  chat(isAudio ? TXT.userVoice : TXT.user, fromText, isAudio);
  log("\u6536\u5230\u5b58\u4e66\u6307\u4ee4\uff0c\u6b63\u5728\u8c03\u7528OCR\u626b\u63cf...");

  const btnStore = getById("btn-store");
  const oldBtn = btnStore ? btnStore.innerHTML : "";
  if (btnStore) {
    btnStore.disabled = true;
    btnStore.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> \u6b63\u5728\u626b\u63cf\u4e66\u7c4d...';
  }

  try {
    const r = await fetch("/api/store", { method: "POST" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || "\u5b58\u4e66\u5931\u8d25");

    log(j.msg || "\u5b58\u4e66\u5b8c\u6210");
    chat(TXT.bot, j.ai_reply || "\u597d\u7684\uff0c\u5df2\u5b8c\u6210\u5b58\u4e66\u3002");
    await loadShelf();
    await loadAiInsight();
  } catch (e) {
    log(`\u5b58\u4e66\u5931\u8d25: ${e.message}`);
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "error",
      title: e.message || "\u5b58\u4e66\u5931\u8d25",
      showConfirmButton: false,
      timer: 2200,
      background: "#fefae0"
    });
  } finally {
    if (btnStore) {
      btnStore.disabled = false;
      btnStore.innerHTML = oldBtn;
    }
  }
}

async function takeBook(cid, title) {
  try {
    const result = await Swal.fire({
      title: "\u786e\u8ba4\u53d6\u4e66",
      html: `\u786e\u5b9a\u53d6\u51fa <b>${cid}\u53f7\u683c</b> \u7684\u300a${title}\u300b\u5417\uff1f`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#8e735b",
      cancelButtonColor: "#a3b18a",
      confirmButtonText: "\u786e\u8ba4",
      cancelButtonText: "\u53d6\u6d88",
      background: "#fefae0",
      color: "#555"
    });

    if (!result.isConfirmed) return;

    const r = await fetch("/api/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cid, title })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || "\u53d6\u4e66\u5931\u8d25");

    log(j.msg || "\u53d6\u4e66\u5b8c\u6210");
    if (j.ai_reply) chat(TXT.bot, j.ai_reply);
    await loadShelf();
    await loadAiInsight();
  } catch (e) {
    log(`\u53d6\u4e66\u5931\u8d25: ${e.message}`);
  }
}

async function takeByTextIntent(text, isAudio = false) {
  chat(isAudio ? TXT.userVoice : TXT.user, text, isAudio);
  try {
    const r = await fetch("/api/take_by_text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || "\u53d6\u4e66\u5931\u8d25");

    log(j.msg || "\u53d6\u4e66\u5b8c\u6210");
    chat(TXT.bot, j.ai_reply || (j.picked ? `\u5df2\u4e3a\u4f60\u53d6\u51fa\u300a${j.picked.title}\u300b` : "\u5df2\u6267\u884c\u53d6\u4e66\u6307\u4ee4"));
    await loadShelf();
    await loadAiInsight();
  } catch (e) {
    log(e.message || "\u53d6\u4e66\u6307\u4ee4\u6267\u884c\u5931\u8d25");
  }
}

getById("btn-store").onclick = () => storeByOcr("\u5e2e\u6211\u5b58\u4e66");

getById("btn-search").onclick = async function () {
  const input = getById("search_input");
  const kw = input.value.trim();
  if (!kw) return;

  const r = await fetch("/api/compartments");
  const data = await r.json();
  const hit = data.find((i) => i.book && i.book.includes(kw));
  if (hit) takeBook(hit.cid, hit.book);
  input.value = "";
};

function isStoreIntent(text) {
  const t = String(text || "");
  const keywords = ["\u5b58\u4e66", "\u653e\u56de", "\u5f52\u8fd8", "\u8fd8\u4e66", "\u6211\u8981\u5b58\u4e66", "\u5e2e\u6211\u5b58\u4e66"];
  return keywords.some((k) => t.includes(k));
}

function isTakeIntent(text) {
  const t = String(text || "");
  const keywords = ["\u53d6\u4e66", "\u62ff\u4e66", "\u501f\u4e66", "\u6211\u8981\u53d6", "\u5e2e\u6211\u53d6"];
  return keywords.some((k) => t.includes(k));
}

async function sendTextMessage() {
  const input = getById("chat_input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";

  if (isStoreIntent(text)) {
    await storeByOcr(text, false);
    return;
  }

  if (isTakeIntent(text)) {
    await takeByTextIntent(text, false);
    return;
  }

  chat(TXT.user, text);
  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });
    const j = await r.json();
    if (j.ok) chat(TXT.bot, j.reply);
  } catch (_) {
    chat(TXT.sys, "\u8fde\u63a5 AI \u670d\u52a1\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002");
  }
}

getById("chat_input").onkeydown = (e) => {
  if (e.key === "Enter") sendTextMessage();
};
getById("btn-send-text").onclick = sendTextMessage;

// Voice wake is handled on backend; no click-to-talk button here.

loadShelf();
loadAiInsight();
setTimeout(() => chat(TXT.bot, TXT.welcome), 500);

// Poll wake-voice events from backend and reflect in chat
setInterval(async () => {
  try {
    const r = await fetch("/api/voice_events");
    const j = await r.json();
    if (!j.events || j.events.length === 0) return;
    const seenKey = "__voice_event_ts";
    const last = Number(sessionStorage.getItem(seenKey) || "0");
    let maxTs = last;
    j.events.forEach((e) => {
      if (!e.ts || e.ts <= last) return;
      const role = e.role === "assistant" ? TXT.bot : TXT.user;
      chat(role, e.text, e.role === "user");
      if (e.role === "assistant" && (e.text.includes("存入") || e.text.includes("取出"))) {
        loadShelf();
      }
      if (e.ts > maxTs) maxTs = e.ts;
    });
    if (maxTs > last) sessionStorage.setItem(seenKey, String(maxTs));
  } catch (_) {}
}, 1000);
