from __future__ import annotations

import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

# Allow direct execution via `python app/main.py` from the project root or IDEs.
if __package__ in {None, ""}:
    project_root = Path(__file__).resolve().parents[1]
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

from app.api.router import api_router
from app.core.config import get_settings
from app.core.database import init_engine, init_schema
from app.core.errors import register_exception_handlers
from app.core.module_catalog import MODULE_TAGS


def build_home_page_html(*, app_name: str, version: str) -> str:
    return f"""<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{app_name}</title>
  <style>
    :root {{
      --bg: #f7f1e7;
      --panel: rgba(255, 250, 244, 0.94);
      --ink: #1b2a2f;
      --muted: #5e6c71;
      --line: rgba(27, 42, 47, 0.12);
      --brand: #155f6d;
      --accent: #bf6a37;
      --shadow: 0 20px 45px rgba(27, 42, 47, 0.12);
      --radius: 28px;
    }}

    * {{ box-sizing: border-box; }}

    body {{
      margin: 0;
      min-height: 100vh;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(191, 106, 55, 0.18), transparent 30%),
        radial-gradient(circle at top right, rgba(21, 95, 109, 0.16), transparent 32%),
        linear-gradient(180deg, #fbf7ef 0%, #efe6d8 100%);
      font-family: "Noto Serif SC", "Source Han Serif SC", "STSong", "SimSun", serif;
    }}

    .shell {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 32px 20px 56px;
    }}

    .hero {{
      position: relative;
      overflow: hidden;
      border-radius: 32px;
      padding: 32px;
      color: #f8f2e9;
      background:
        linear-gradient(135deg, rgba(23, 34, 39, 0.96), rgba(21, 95, 109, 0.92)),
        linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
      box-shadow: var(--shadow);
    }}

    .hero::after {{
      content: "";
      position: absolute;
      inset: auto -10% -70% auto;
      width: 360px;
      height: 360px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 208, 173, 0.24), transparent 70%);
    }}

    .eyebrow {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.12);
      font-size: 13px;
      letter-spacing: 0.08em;
    }}

    h1 {{
      margin: 18px 0 10px;
      font-size: clamp(30px, 5vw, 52px);
      line-height: 1.06;
    }}

    .hero p {{
      margin: 0;
      max-width: 760px;
      color: rgba(248, 242, 233, 0.86);
      font-size: 16px;
      line-height: 1.75;
    }}

    .grid {{
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
      margin-top: 22px;
    }}

    .card {{
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 22px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(8px);
    }}

    .card h2 {{
      margin: 0 0 10px;
      font-size: 22px;
    }}

    .card p {{
      margin: 0 0 16px;
      color: var(--muted);
      line-height: 1.7;
      font-size: 14px;
    }}

    .cta {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 132px;
      padding: 12px 16px;
      border-radius: 999px;
      color: white;
      text-decoration: none;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent), #df8d57);
    }}

    .secondary {{
      background: linear-gradient(135deg, var(--brand), #1e7d8b);
    }}

    .muted-link {{
      color: var(--brand);
      text-decoration: none;
      font-weight: 700;
    }}

    .meta {{
      margin-top: 22px;
      padding: 16px 18px;
      border-radius: 22px;
      background: rgba(255, 250, 244, 0.82);
      border: 1px solid var(--line);
      color: var(--muted);
      line-height: 1.7;
      box-shadow: var(--shadow);
    }}

    code {{
      padding: 2px 8px;
      border-radius: 999px;
      background: rgba(27, 42, 47, 0.08);
      color: var(--ink);
    }}

    @media (max-width: 980px) {{
      .grid {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="eyebrow">SMART BOOKSHELF / BACKEND</div>
      <h1>{app_name}</h1>
      <p>服务已经正常启动。你可以直接从这里进入接口文档和健康检查，继续联调管理后台与读者端能力。</p>
    </section>

    <section class="grid">
      <article class="card">
        <h2>接口文档</h2>
        <p>适合先确认服务是否可用，也方便直接试接口。</p>
        <a class="cta" href="/docs">打开 /docs</a>
      </article>

      <article class="card">
        <h2>健康检查</h2>
        <p>用于确认 API 和数据库初始化是否正常。</p>
        <a class="muted-link" href="/api/v1/health">查看 /api/v1/health</a>
      </article>
    </section>

    <section class="meta">
      <div>当前版本：<code>{version}</code></div>
      <div>如果你是直接在浏览器输入地址，优先访问 <code>http://127.0.0.1:8000/docs</code> 或 <code>http://127.0.0.1:8000/api/v1/health</code>。</div>
    </section>
  </div>
</body>
</html>
"""


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    init_engine(settings)
    if settings.auto_create_schema:
        init_schema()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
        openapi_tags=MODULE_TAGS,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_allow_origins(),
        allow_origin_regex=settings.get_cors_allow_origin_regex(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(app)
    app.include_router(api_router)

    @app.get("/", include_in_schema=False, response_class=HTMLResponse)
    def home_page() -> str:
        return build_home_page_html(app_name=settings.app_name, version=settings.app_version)

    @app.get("/favicon.ico", include_in_schema=False)
    def favicon() -> Response:
        return Response(status_code=204)

    return app


app = create_app()


def main() -> None:
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
