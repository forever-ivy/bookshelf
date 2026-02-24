
const getById = (id) => document.getElementById(id);
const logBox = getById("log_box");
const chatBox = getById("chat_box");

function log(msg) {
  const t = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const li = document.createElement("li");
  li.className = "log-item animate-fade-in";
  li.innerHTML = `<span class="log-time">${t}</span><span class="log-text">${msg}</span>`;
  logBox.prepend(li);
}

function chat(role, text, isAudio = false) {
  const div = document.createElement("div");
  div.className = `message-bubble ${role === "??" ? "ai" : "user"} animate-slide-in`;
  const icon = role === "??" ? '<i class="fa-solid fa-robot ai-avatar"></i>' : "";
  const audioIcon = isAudio ? '<i class="fa-solid fa-microphone-lines voice-indicator"></i> ' : "";

  div.innerHTML = `
    ${role === "??" ? icon : ""}
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
          <div class="cell-cid">${it.cid} ??</div>
        `;
        cell.onclick = () => takeBook(it.cid, it.book);
        cell.title = `?????${it.book}?`;
      } else {
        cell.innerHTML = `
          <div class="cell-icon free"><i class="fa-regular fa-square-plus"></i></div>
          <div class="cell-title">??</div>
          <div class="cell-cid">${it.cid} ??</div>
        `;
      }
      grid.appendChild(cell);
    });

    getById("stats_bar").innerHTML = `
      <span class="pill pill-total"><i class="fa-solid fa-warehouse"></i> ??: ${data.length}</span>
      <span class="pill pill-used"><i class="fa-solid fa-book"></i> ??: ${used}</span>
      <span class="pill pill-free"><i class="fa-regular fa-square"></i> ??: ${data.length - used}</span>
    `;
  } catch (e) {
    grid.innerHTML = `<div class="error-placeholder">????: ${e.message}</div>`;
  }
}

async function loadAiInsight() {
  const box = getById("ai_insight_box");
  try {
    const r = await fetch("/api/ai_insight");
    const j = await r.json();
    box.innerHTML = j.insight || "";
  } catch (e) {
    box.innerText = "????????????";
  }
}

getById("btn-store").onclick = async function () {
  const btn = this;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ??????...';
  log("????????...");

  try {
    const r = await fetch("/api/store", { method: "POST" });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || "????");

    log(j.msg);
    if (j.ai_reply) chat("??", j.ai_reply);
    await loadShelf();
    await loadAiInsight();
  } catch (err) {
    log(`????: ${err.message}`);
    Swal.fire({ icon: "error", title: "????", text: err.message, background: "#fefae0", color: "#8e735b" });
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
};

async function takeBook(cid, title) {
  const ok = await Swal.fire({
    title: "????",
    html: `????? <b>${cid}??</b> ??${title}???`,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#8e735b",
    cancelButtonColor: "#a3b18a",
    confirmButtonText: "??",
    cancelButtonText: "??",
    background: "#fefae0",
    color: "#555"
  });
  if (!ok.isConfirmed) return;

  try {
    const r = await fetch("/api/take", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cid, title })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.msg || "????");

    log(j.msg);
    if (j.ai_reply) chat("??", j.ai_reply);
    await loadShelf();
  } catch (err) {
    log(`????: ${err.message}`);
    Swal.fire({ icon: "error", title: "????", text: err.message, background: "#fefae0", color: "#8e735b" });
  }
}

getById("btn-search").onclick = async function () {
  const input = getById("search_input");
  const kw = input.value.trim();
  if (!kw) {
    input.focus();
    return;
  }

  const btn = this;
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    const r = await fetch("/api/compartments");
    const data = await r.json();
    const hits = data.filter((i) => i.book && i.book.includes(kw));

    if (hits.length === 0) {
      Swal.fire({ icon: "info", title: "???", text: `????????${kw}????`, background: "#fefae0", color: "#8e735b" });
    } else if (hits.length === 1) {
      takeBook(hits[0].cid, hits[0].book);
    } else {
      const options = {};
      hits.forEach((h, i) => {
        options[i] = `?${h.book}??${h.cid}???`;
      });
      const { value: idx } = await Swal.fire({
        title: "???????",
        text: "?????????",
        input: "select",
        inputOptions: options,
        showCancelButton: true,
        confirmButtonColor: "#8e735b",
        background: "#fefae0",
        color: "#555"
      });
      if (idx !== undefined && hits[idx]) takeBook(hits[idx].cid, hits[idx].book);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = "???";
    input.value = "";
  }
};

async function sendVoiceCommandText(text) {
  const r = await fetch("/api/voice_assistant_proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, device_id: "device-001" })
  });

  if (!r.ok) {
    let msg = "????????";
    try {
      const j = await r.json();
      msg = j.msg || j.detail || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  if ((r.headers.get("content-type") || "").includes("audio/mpeg")) {
    const commandId = r.headers.get("x-command-id");
    const blob = await r.blob();
    const audioUrl = URL.createObjectURL(blob);
    const player = new Audio(audioUrl);
    player.onended = () => URL.revokeObjectURL(audioUrl);
    player.play().catch(() => {});
    chat("??", "??????????????", true);

    if (commandId) {
      setTimeout(async () => {
        try {
          const sr = await fetch(`/api/voice_command_status/${commandId}`);
          const sj = await sr.json();
          if (sj.ok && sj.state) {
            if (sj.state.status === "done") {
              log("??????");
              await loadShelf();
              await loadAiInsight();
            } else if (sj.state.status === "failed") {
              const detail = sj.state.detail || "??????";
              log(detail);
              Swal.fire({ toast: true, position: "top-end", icon: "warning", title: detail, showConfirmButton: false, timer: 2500, background: "#fefae0" });
            }
          }
        } catch (_) {}
      }, 2500);
    }
  }
}

function isActionCommand(text) {
  return /(??|??|??|??|??|??|??)/.test(text || "");
}

async function sendTextMessage() {
  const input = getById("chat_input");
  const t = input.value.trim();
  if (!t) return;

  chat("?", t);
  input.value = "";

  if (isActionCommand(t)) {
    try {
      await sendVoiceCommandText(t);
    } catch (e) {
      log(e.message || "??????");
      Swal.fire({ toast: true, position: "top-end", icon: "warning", title: e.message || "??????", showConfirmButton: false, timer: 2200, background: "#fefae0" });
    }
    return;
  }

  try {
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t })
    });
    const j = await r.json();
    if (j.ok) chat("??", j.reply);
  } catch (e) {
    chat("??", "?? AI ???????????");
  }
}

getById("chat_input").onkeydown = (e) => {
  if (e.key === "Enter") sendTextMessage();
};
getById("btn-send-text").onclick = sendTextMessage;

getById("btn-voice").onclick = async function () {
  const btn = this;
  const input = getById("chat_input");
  const text = input.value.trim();
  if (!text) {
    Swal.fire({ toast: true, position: "top-end", icon: "info", title: "????????", showConfirmButton: false, timer: 1800, background: "#fefae0" });
    input.focus();
    return;
  }

  const originalHtml = btn.innerHTML;
  btn.classList.add("listening");
  btn.innerHTML = '<i class="fa-solid fa-microphone-lines fa-fade"></i> ????????...';
  chat("???????", text, true);
  log("???????");
  input.value = "";

  try {
    await sendVoiceCommandText(text);
  } catch (err) {
    log(err.message || "??????");
    Swal.fire({ toast: true, position: "top-end", icon: "error", title: err.message || "?????????", showConfirmButton: false, timer: 2200, background: "#fefae0" });
  } finally {
    btn.classList.remove("listening");
    btn.innerHTML = originalHtml;
  }
};

loadShelf();
loadAiInsight();
setTimeout(() => chat("??", "???????????????"), 500);

