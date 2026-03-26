from __future__ import annotations

from textwrap import dedent


def build_recommendation_demo_html() -> str:
    return dedent(
        """\
        <!doctype html>
        <html lang="zh-CN">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>智能书柜推荐系统演示</title>
          <style>
            :root {
              --bg: #f4efe4;
              --panel: rgba(255, 250, 242, 0.92);
              --ink: #18242b;
              --muted: #5d6b70;
              --line: rgba(24, 36, 43, 0.12);
              --brand: #15616d;
              --accent: #c96d38;
              --accent-soft: #f3d7c4;
              --shadow: 0 18px 45px rgba(21, 30, 34, 0.12);
              --radius: 24px;
            }

            * { box-sizing: border-box; }

            body {
              margin: 0;
              color: var(--ink);
              background:
                radial-gradient(circle at top left, rgba(201, 109, 56, 0.18), transparent 30%),
                radial-gradient(circle at top right, rgba(21, 97, 109, 0.16), transparent 32%),
                linear-gradient(180deg, #fbf7ef 0%, #efe8da 100%);
              font-family: "Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", serif;
            }

            .shell {
              max-width: 1400px;
              margin: 0 auto;
              padding: 28px 20px 56px;
            }

            .hero {
              position: relative;
              overflow: hidden;
              background:
                linear-gradient(135deg, rgba(24, 36, 43, 0.95), rgba(21, 97, 109, 0.92)),
                linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
              color: #f8f2e8;
              border-radius: 30px;
              padding: 30px;
              box-shadow: var(--shadow);
            }

            .hero::after {
              content: "";
              position: absolute;
              inset: auto -10% -60% auto;
              width: 320px;
              height: 320px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 206, 166, 0.28), transparent 70%);
            }

            .eyebrow {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 14px;
              border-radius: 999px;
              background: rgba(255, 255, 255, 0.12);
              font-size: 13px;
              letter-spacing: 0.08em;
            }

            h1 {
              margin: 18px 0 10px;
              font-size: clamp(30px, 5vw, 52px);
              line-height: 1.06;
            }

            .hero p {
              margin: 0;
              max-width: 760px;
              color: rgba(248, 242, 232, 0.84);
              font-size: 16px;
              line-height: 1.7;
            }

            .layout {
              display: grid;
              grid-template-columns: 360px minmax(0, 1fr);
              gap: 20px;
              margin-top: 22px;
            }

            .panel {
              background: var(--panel);
              border: 1px solid var(--line);
              border-radius: var(--radius);
              box-shadow: var(--shadow);
              backdrop-filter: blur(8px);
            }

            .controls {
              padding: 22px;
              position: sticky;
              top: 16px;
              align-self: start;
            }

            .section-title {
              margin: 0 0 10px;
              font-size: 20px;
            }

            .section-copy {
              margin: 0 0 16px;
              color: var(--muted);
              line-height: 1.65;
              font-size: 14px;
            }

            .field {
              display: grid;
              gap: 8px;
              margin-bottom: 14px;
            }

            .field label {
              font-size: 13px;
              color: var(--muted);
            }

            select, input, button, textarea {
              width: 100%;
              border: 1px solid rgba(24, 36, 43, 0.15);
              border-radius: 16px;
              padding: 12px 14px;
              background: rgba(255,255,255,0.92);
              color: var(--ink);
              font: inherit;
            }

            button {
              cursor: pointer;
              font-weight: 700;
              transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
            }

            button:hover {
              transform: translateY(-1px);
              box-shadow: 0 10px 18px rgba(24, 36, 43, 0.12);
            }

            .primary {
              background: linear-gradient(135deg, var(--accent), #e28d56);
              border-color: transparent;
              color: white;
            }

            .secondary {
              background: linear-gradient(135deg, var(--brand), #1c8190);
              border-color: transparent;
              color: white;
            }

            .status {
              margin-top: 10px;
              padding: 12px 14px;
              border-radius: 16px;
              background: rgba(21, 97, 109, 0.08);
              color: var(--muted);
              font-size: 14px;
              line-height: 1.6;
            }

            .main {
              display: grid;
              gap: 18px;
            }

            .strip {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
            }

            .card {
              padding: 22px;
            }

            .chips {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }

            .chip {
              padding: 10px 14px;
              border-radius: 999px;
              background: var(--accent-soft);
              color: #7b3d1d;
              font-size: 13px;
            }

            .grid-3 {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
            }

            .module-head {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              margin-bottom: 12px;
            }

            .badge {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              padding: 8px 12px;
              border-radius: 999px;
              background: rgba(21, 97, 109, 0.1);
              color: var(--brand);
              font-size: 12px;
              font-weight: 700;
            }

            .list {
              display: grid;
              gap: 12px;
            }

            .item {
              border: 1px solid rgba(24, 36, 43, 0.08);
              border-radius: 18px;
              padding: 14px 15px;
              background: rgba(255,255,255,0.75);
            }

            .item h3 {
              margin: 0 0 8px;
              font-size: 16px;
            }

            .meta {
              font-size: 12px;
              color: var(--muted);
              margin-bottom: 8px;
            }

            .explanation {
              margin: 0;
              color: #334247;
              font-size: 13px;
              line-height: 1.65;
            }

            .signals {
              margin-top: 10px;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }

            .signal {
              padding: 6px 10px;
              border-radius: 999px;
              background: rgba(24, 36, 43, 0.08);
              color: var(--ink);
              font-size: 12px;
            }

            .empty {
              padding: 16px;
              border-radius: 18px;
              background: rgba(24, 36, 43, 0.04);
              color: var(--muted);
              font-size: 14px;
            }

            .query-row {
              display: flex;
              gap: 10px;
            }

            .query-row input {
              flex: 1;
            }

            .search-box {
              padding: 22px;
            }

            .query-suggestions {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
              margin-top: 14px;
            }

            .query-suggestions button {
              width: auto;
              padding: 9px 12px;
              border-radius: 999px;
              background: rgba(21, 97, 109, 0.08);
              color: var(--brand);
            }

            .focus-book {
              margin-top: 10px;
              padding: 15px 16px;
              border-radius: 18px;
              background: linear-gradient(135deg, rgba(201,109,56,0.12), rgba(21,97,109,0.08));
            }

            .focus-book strong {
              display: block;
              margin-bottom: 6px;
              font-size: 16px;
            }

            @media (max-width: 1080px) {
              .layout { grid-template-columns: 1fr; }
              .controls { position: static; }
              .grid-3, .strip { grid-template-columns: 1fr; }
            }

            @media (prefers-reduced-motion: no-preference) {
              .panel { animation: rise 360ms ease both; }
              @keyframes rise {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
              }
            }
          </style>
        </head>
        <body>
          <div class="shell">
            <section class="hero">
              <div class="eyebrow">SMART BOOKSHELF / RECOMMENDATION DEMO</div>
              <h1>智能书柜图书推荐系统演示台</h1>
              <p>这个页面会把自然语言找书、相似推荐、协同过滤、混合推荐和个性化推荐串成一套可直接演示的流程。页面默认使用开发环境里的演示读者，不影响你现有的推荐接口。</p>
            </section>

            <div class="layout">
              <aside class="panel controls">
                <h2 class="section-title">演示控制台</h2>
                <p class="section-copy">先选择一个演示读者，页面会自动创建临时访问令牌，再拉取这个读者的推荐总览。</p>

                <div class="field">
                  <label for="readerSelect">演示读者</label>
                  <select id="readerSelect"></select>
                </div>

                <div class="field">
                  <button id="sessionBtn" class="primary">连接演示读者</button>
                </div>

                <div class="field">
                  <label for="dashboardLimit">每个模块返回数量</label>
                  <input id="dashboardLimit" type="number" min="1" max="10" value="3">
                </div>

                <div class="field">
                  <label for="historyLimit">参考最近借阅本数</label>
                  <input id="historyLimit" type="number" min="1" max="10" value="2">
                </div>

                <div class="field">
                  <button id="dashboardBtn" class="secondary">刷新推荐总览</button>
                </div>

                <div id="statusBox" class="status">等待加载演示读者...</div>
              </aside>

              <main class="main">
                <section class="panel search-box">
                  <h2 class="section-title">自然语言找书</h2>
                  <p class="section-copy">这里直接调用你已经完成的 <code>/api/v1/recommendation/search</code>，适合现场演示“用户一句话找书”。</p>
                  <div class="query-row">
                    <input id="searchInput" value="我想找一本和大自然有关的科普书" placeholder="输入一句自然语言需求">
                    <button id="searchBtn" class="primary">开始搜索</button>
                  </div>
                  <div id="querySuggestions" class="query-suggestions"></div>
                </section>

                <section class="strip">
                  <section class="panel card">
                    <h2 class="section-title">最近借阅</h2>
                    <div id="historyBooks" class="chips"></div>
                  </section>
                  <section class="panel card">
                    <h2 class="section-title">当前聚焦图书</h2>
                    <div id="focusBook" class="focus-book empty">还没有加载推荐总览。</div>
                  </section>
                </section>

                <section class="panel card">
                  <div class="module-head">
                    <h2 class="section-title">个性化推荐</h2>
                    <span class="badge">基于读者历史</span>
                  </div>
                  <div id="personalizedList" class="list"></div>
                </section>

                <section class="grid-3">
                  <section class="panel card">
                    <div class="module-head">
                      <h2 class="section-title">相似推荐</h2>
                      <span class="badge">Embedding</span>
                    </div>
                    <div id="similarList" class="list"></div>
                  </section>
                  <section class="panel card">
                    <div class="module-head">
                      <h2 class="section-title">协同过滤</h2>
                      <span class="badge">Borrow Orders</span>
                    </div>
                    <div id="collaborativeList" class="list"></div>
                  </section>
                  <section class="panel card">
                    <div class="module-head">
                      <h2 class="section-title">混合推荐</h2>
                      <span class="badge">Hybrid</span>
                    </div>
                    <div id="hybridList" class="list"></div>
                  </section>
                </section>

                <section class="panel card">
                  <div class="module-head">
                    <h2 class="section-title">搜索结果</h2>
                    <span class="badge">Natural Language</span>
                  </div>
                  <div id="searchResults" class="list"></div>
                </section>
              </main>
            </div>
          </div>

          <script>
            const state = {
              token: null,
              reader: null,
              dashboard: null,
            };

            const readerSelect = document.getElementById('readerSelect');
            const sessionBtn = document.getElementById('sessionBtn');
            const dashboardBtn = document.getElementById('dashboardBtn');
            const statusBox = document.getElementById('statusBox');
            const searchBtn = document.getElementById('searchBtn');
            const searchInput = document.getElementById('searchInput');
            const dashboardLimit = document.getElementById('dashboardLimit');
            const historyLimit = document.getElementById('historyLimit');
            const querySuggestions = document.getElementById('querySuggestions');

            function setStatus(text) {
              statusBox.textContent = text;
            }

            function renderEmpty(elementId, text) {
              document.getElementById(elementId).innerHTML = `<div class="empty">${text}</div>`;
            }

            function renderList(elementId, items) {
              const host = document.getElementById(elementId);
              if (!items || items.length === 0) {
                host.innerHTML = '<div class="empty">当前没有可展示的数据。</div>';
                return;
              }
              host.innerHTML = items.map((item) => {
                const signals = Array.isArray(item.evidence?.signal_sources) ? item.evidence.signal_sources : [];
                const metaParts = [
                  item.author || null,
                  item.category || null,
                  typeof item.score === 'number' ? `score ${item.score.toFixed(3)}` : null,
                ].filter(Boolean);
                return `
                  <article class="item">
                    <h3>${item.title}</h3>
                    <div class="meta">${metaParts.join(' / ') || '暂无元数据'}</div>
                    <p class="explanation">${item.explanation || '暂无说明'}</p>
                    <div class="signals">
                      ${signals.map((signal) => `<span class="signal">${signal}</span>`).join('')}
                    </div>
                  </article>
                `;
              }).join('');
            }

            function renderHistory(historyBooks) {
              const host = document.getElementById('historyBooks');
              if (!historyBooks || historyBooks.length === 0) {
                host.innerHTML = '<div class="empty">当前读者还没有借阅历史。</div>';
                return;
              }
              host.innerHTML = historyBooks.map((book) => `<span class="chip">${book.title}</span>`).join('');
            }

            function renderFocusBook(book) {
              const host = document.getElementById('focusBook');
              if (!book) {
                host.className = 'focus-book empty';
                host.textContent = '还没有加载推荐总览。';
                return;
              }
              host.className = 'focus-book';
              host.innerHTML = `
                <strong>${book.title}</strong>
                <div class="meta">${[book.author, book.category].filter(Boolean).join(' / ') || '暂无元数据'}</div>
                <div>借阅时间：${book.borrowed_at || '未知'}</div>
              `;
            }

            function renderQuerySuggestions(items) {
              if (!items || items.length === 0) {
                querySuggestions.innerHTML = '';
                return;
              }
              querySuggestions.innerHTML = items.map((query) => (
                `<button type="button" data-query="${query}">${query}</button>`
              )).join('');
              Array.from(querySuggestions.querySelectorAll('button')).forEach((button) => {
                button.addEventListener('click', () => {
                  searchInput.value = button.dataset.query;
                  runSearch();
                });
              });
            }

            async function api(path, options = {}) {
              const headers = { ...(options.headers || {}) };
              if (state.token) {
                headers.Authorization = `Bearer ${state.token}`;
              }
              const response = await fetch(path, { ...options, headers });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok) {
                const message = payload?.error?.message || payload?.detail || `请求失败：${response.status}`;
                throw new Error(message);
              }
              return payload;
            }

            async function loadReaders() {
              setStatus('正在加载演示读者...');
              const payload = await api('/api/v1/recommendation/demo/readers');
              const items = payload.items || [];
              readerSelect.innerHTML = items.map((item) => (
                `<option value="${item.profile_id}">${item.display_name} / ${item.username} / 借阅 ${item.borrow_count} 本</option>`
              )).join('');
              if (items.length === 0) {
                setStatus('没有找到演示读者。你可以先运行 scripts/seed_demo_borrow_orders.py');
                return;
              }
              await createDemoSession();
            }

            async function createDemoSession() {
              const profileId = Number(readerSelect.value);
              setStatus(`正在连接演示读者 ${profileId} ...`);
              const payload = await api('/api/v1/recommendation/demo/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_id: profileId }),
              });
              state.token = payload.access_token;
              state.reader = payload.reader;
              setStatus(`已连接 ${payload.reader.display_name}，现在可以直接演示推荐系统。`);
              await loadDashboard();
            }

            async function loadDashboard() {
              if (!state.token) {
                setStatus('请先连接一个演示读者。');
                return;
              }
              setStatus('正在刷新推荐总览...');
              const payload = await api(
                `/api/v1/recommendation/me/dashboard?limit=${dashboardLimit.value}&history_limit=${historyLimit.value}`
              );
              state.dashboard = payload;
              renderHistory(payload.history_books || []);
              renderFocusBook(payload.focus_book);
              renderList('personalizedList', payload.personalized || []);
              renderList('similarList', payload.modules?.similar?.results || []);
              renderList('collaborativeList', payload.modules?.collaborative?.results || []);
              renderList('hybridList', payload.modules?.hybrid?.results || []);
              renderQuerySuggestions(payload.suggested_queries || []);
              setStatus(`推荐总览已刷新，当前读者：${state.reader.display_name}`);
            }

            async function runSearch() {
              if (!state.token) {
                setStatus('请先连接一个演示读者。');
                return;
              }
              const query = searchInput.value.trim();
              if (!query) {
                setStatus('请输入一句自然语言需求。');
                return;
              }
              setStatus(`正在搜索：${query}`);
              const payload = await api('/api/v1/recommendation/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: Number(dashboardLimit.value) || 3 }),
              });
              renderList('searchResults', payload.results || []);
              setStatus(`搜索完成：${query}`);
            }

            sessionBtn.addEventListener('click', createDemoSession);
            dashboardBtn.addEventListener('click', loadDashboard);
            searchBtn.addEventListener('click', runSearch);

            renderEmpty('personalizedList', '等待加载推荐总览。');
            renderEmpty('similarList', '等待加载推荐总览。');
            renderEmpty('collaborativeList', '等待加载推荐总览。');
            renderEmpty('hybridList', '等待加载推荐总览。');
            renderEmpty('searchResults', '等待执行自然语言搜索。');

            loadReaders().catch((error) => {
              setStatus(error.message || '加载失败');
            });
          </script>
        </body>
        </html>
        """
    )
