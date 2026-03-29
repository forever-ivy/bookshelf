# Smart Bookshelf Backend

`bookshelf` 是智能书柜项目的后端服务，基于 FastAPI、PostgreSQL 和 pgvector，覆盖认证、读者、图书目录、库存、借阅/归还、机器人配送模拟、推荐系统、会话、语音入口、统计分析与管理员运维接口。

## 当前能力

- `auth`
  - 管理员 / 读者登录
  - token 刷新
  - `me` 身份查询
- `readers`
  - 读者个人资料
  - 我的总览
  - 我的订单 / 会话 / 推荐历史
  - 管理员查看读者信息
- `catalog`
  - 图书列表
  - 按标题 / 作者 / 分类 / 关键词搜索
  - 单书详情与库存投影
- `inventory`
  - 书柜槽位、事件、状态
  - OCR 入库
  - 文本取书
- `orders`
  - 创建借阅单
  - 查看我的借阅单列表 / 详情
  - 取消可取消的借阅单
  - 创建归还请求
  - 查看我的归还请求列表 / 详情
  - 已归还状态 `returned`
- `robot_sim`
  - 查看机器人状态
  - 全局推进 `tick`
  - 单订单推进 `tick`
- `recommendation`
  - 自然语言找书
  - 相似图书推荐
  - 协同过滤推荐
  - 混合推荐
  - 个性化推荐
  - dashboard
- `conversation`
  - 创建会话
  - 列出当前读者的 sessions
  - 发消息
  - 自动回复
  - 查看消息历史
- `voice`
  - 文本 / 音频 / 图片统一入口
  - 上架 / 取书 / 闲聊意图分流
  - 事件列表与 SSE 流
- `analytics`
  - overview
  - trends
- `admin`
  - 订单 / 任务 / 机器人 / 事件查看
  - 订单状态纠正
  - 归还请求列表 / 详情 / 完成处理

## 技术栈

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL + pgvector
- Uvicorn
- PaddleOCR
- OpenAI Python SDK
- Pytest

## 项目结构

```text
bookshelf/
├─ app/
│  ├─ admin/
│  ├─ analytics/
│  ├─ api/
│  ├─ auth/
│  ├─ catalog/
│  ├─ connectors/
│  ├─ context/
│  ├─ conversation/
│  ├─ core/
│  ├─ db/
│  ├─ inventory/
│  ├─ llm/
│  ├─ orders/
│  ├─ readers/
│  ├─ recommendation/
│  ├─ robot_sim/
│  ├─ system/
│  ├─ voice/
│  └─ workers/
├─ alembic/
├─ artifacts/                   # 本地训练出的推荐模型
├─ data/                        # 本地样本数据 / 原始数据
├─ docs/                        # 设计说明和升级文档
├─ scripts/                     # 初始化、导入、训练、演示数据脚本
├─ tests/
├─ docker-compose.pgvector.yml
├─ pyproject.toml
├─ uv.lock
└─ README.md
```

## 环境要求

推荐开发环境：

- Windows PowerShell
- Docker Desktop
- Python 虚拟环境 `.venv`

数据库默认配置：

- host: `127.0.0.1`
- port: `55432`
- dbname: `service`
- user: `library`
- password: `library`

默认 SQLAlchemy URL：

```text
postgresql+psycopg://library:library@localhost:55432/service
```

## 关键环境变量

项目使用 `LIBRARY_` 前缀读取配置，常用项如下：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `LIBRARY_DATABASE_URL` | PostgreSQL 连接串 | `postgresql+psycopg://library:library@localhost:55432/service` |
| `LIBRARY_AUTO_CREATE_SCHEMA` | 服务启动时是否自动建表 | `true` |
| `LIBRARY_JWT_SECRET` | JWT 签名密钥 | `library-service-dev-secret-2026-change-me` |
| `LIBRARY_CABINET_ID` | 默认书柜 ID | `cabinet-001` |
| `LIBRARY_LLM_PROVIDER` | LLM 提供方，支持 `null` / `openai` / `openai-compatible` | `null` |
| `LIBRARY_LLM_MODEL` | 对话 / OCR 解析模型 | `gpt-4.1-mini` |
| `LIBRARY_LLM_API_KEY` | OpenAI 兼容接口密钥 | 空 |
| `LIBRARY_LLM_BASE_URL` | OpenAI 兼容接口 base URL | 空 |
| `LIBRARY_EMBEDDING_PROVIDER` | embedding 提供方，默认本地 hash | `hash` |
| `LIBRARY_EMBEDDING_MODEL` | embedding 模型名 | `text-embedding-3-small` |
| `LIBRARY_EMBEDDING_API_KEY` | embedding API key | 空 |
| `LIBRARY_EMBEDDING_BASE_URL` | embedding base URL | 空 |
| `LIBRARY_EMBEDDING_DIMENSIONS` | 向量维度 | `1536` |
| `LIBRARY_EMBEDDING_BATCH_SIZE` | embedding 批量大小 | `20` |
| `LIBRARY_RECOMMENDATION_ML_ENABLED` | 是否开启 ML 重排 | `true` |
| `LIBRARY_RECOMMENDATION_ML_MODEL_PATH` | ML 模型文件路径 | `artifacts/recommendation_mf_model.json` |
| `LIBRARY_SPEECH_TRANSCRIPTION_MODEL` | 语音转写模型 | `gpt-4o-mini-transcribe` |
| `LIBRARY_SPEECH_TTS_MODEL` | TTS 模型 | `gpt-4o-mini-tts` |
| `LIBRARY_SPEECH_TTS_VOICE` | TTS 音色 | `alloy` |

说明：

- 没有配置 `LIBRARY_LLM_API_KEY` 时，聊天与语音会退化到本地空实现或禁用状态。
- 没有配置 embedding API 时，推荐模块默认使用本地 deterministic hash embedding。
- `LIBRARY_LLM_*` 和 `LIBRARY_EMBEDDING_*` 是两套独立配置，LLM 可以接 DeepSeek 之类的 OpenAI 兼容接口，而 embedding 继续保留本地 hash 降级。
- `artifacts/recommendation_mf_model.json` 不存在时，推荐接口会自动回退到原有排序逻辑。

DeepSeek 接入示例：

```env
LIBRARY_LLM_PROVIDER=openai-compatible
LIBRARY_LLM_BASE_URL=https://api.deepseek.com
LIBRARY_LLM_API_KEY=sk-...
LIBRARY_LLM_MODEL=deepseek-chat

# embedding 可继续使用本地 hash；如果后续切到兼容接口，再单独配置下面这组
# LIBRARY_EMBEDDING_PROVIDER=openai-compatible
# LIBRARY_EMBEDDING_BASE_URL=https://your-compatible-embedding-endpoint
# LIBRARY_EMBEDDING_API_KEY=sk-...
# LIBRARY_EMBEDDING_MODEL=text-embedding-3-small
```

## 快速开始

### 1. 安装依赖

```powershell
cd c:\Users\32140\Desktop\smart_bookshelf\serve\bookshelf
uv sync
```

如果本机 `uv` 不稳定，也可以优先用虚拟环境里的 Python 执行命令：

```powershell
.\.venv\Scripts\python.exe -m py_compile app\main.py
```

### 2. 启动 PostgreSQL + pgvector

如果已经创建过容器：

```powershell
docker start bookshelf
```

首次启动也可以直接：

```powershell
docker compose -f docker-compose.pgvector.yml up -d
```

验证端口：

```powershell
Test-NetConnection 127.0.0.1 -Port 55432
```

### 3. 初始化数据库

```powershell
uv run python scripts/init_postgres.py
```

默认会自动创建基础表，并插入默认书柜：

- `cabinet_id = cabinet-001`
- `name = 主书柜`

### 4. 启动服务

推荐命令：

```powershell
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果 `uv run` 遇到本机权限问题：

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 验证服务

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/api/v1/health"
```

常用入口：

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## 推荐的初始化顺序

如果你想一次把推荐能力初始化完整，建议按下面顺序执行：

1. `uv sync`
2. `docker compose -f docker-compose.pgvector.yml up -d`
3. `uv run python scripts/init_postgres.py`
4. 准备图书数据后运行 `scripts/import_chinese_books.py`
5. 运行 `scripts/seed_demo_inventory.py`
6. 运行 `scripts/seed_demo_borrow_orders.py`
7. 运行 `scripts/generate_book_embeddings.py`
8. 如需 ML 重排，再运行 `scripts/seed_recommendation_ml_borrow_orders.py`
9. 运行 `scripts/train_recommendation_mf.py`
10. 启动服务并通过 `/docs` 或推荐接口联调

## 数据与脚本说明

### 数据目录

- `data/books_openlibrary_sample.csv`
  - 从 OpenLibrary dump 抽取出来的样本数据。
- `data/ol_dump_works_2026-02-28.txt.gz`
  - 本地原始 OpenLibrary dump，只在抽样脚本里使用，不参与服务运行。
- `artifacts/recommendation_mf_model.json`
  - 推荐 ML 重排模型的本地产物。

### 常用脚本

#### 1. 初始化 PostgreSQL

```powershell
uv run python scripts/init_postgres.py
```

要求：

- `LIBRARY_DATABASE_URL` 必须指向 PostgreSQL。

#### 2. 导入中文图书

```powershell
uv run python scripts/import_chinese_books.py
```

注意：

- 该脚本当前使用 `scripts/import_chinese_books.py` 内部写死的 `EXCEL_PATH`。
- 运行前需要把 `EXCEL_PATH` 改成你本机的中文图书 Excel 文件路径。
- 预期 Excel 列包括：`书名`、`作者`、`出版社`、`关键词`、`摘要`、`分类`、`出版年月`。
- 脚本会自动识别表头里带“分类”的那一列，兼容旧导入表。

#### 3. 从 OpenLibrary 原始 dump 抽样

```powershell
uv run python scripts/extract_openlibrary_works.py
```

注意：

- 该脚本当前读取 `data/ol_dump_works_2026-02-28.txt.gz`。
- 输出文件为 `data/books_openlibrary_sample.csv`。

#### 4. 生成图书 embedding

```powershell
uv run python scripts/generate_book_embeddings.py
```

常用参数：

- `--limit`
- `--batch-size`
- `--force`
- `--book-id`

说明：

- 默认使用本地 deterministic hash embedding。
- 如果切换到真实 embedding 服务，需要单独配置 `LIBRARY_EMBEDDING_PROVIDER`、`LIBRARY_EMBEDDING_API_KEY` 等环境变量，不会自动复用 LLM 配置。

#### 5. 重建 demo 借阅数据

```powershell
.\.venv\Scripts\python.exe scripts\seed_demo_borrow_orders.py --clusters 8 --readers-per-cluster 6 --books-per-reader 8 --min-category-books 30 --seed 20260324
```

说明：

- 该脚本会先清理 `demo_cf_reader_*` 的旧借阅记录。
- 适合做协同过滤、dashboard 和演示数据准备。

#### 6. 生成 demo 库存

```powershell
.\.venv\Scripts\python.exe scripts\seed_demo_inventory.py --limit 20 --start-book-id 1 --slot-prefix A
```

常用参数：

- `--cabinet-id`
- `--limit`
- `--start-book-id`
- `--slot-prefix`

#### 7. 生成 ML 推荐训练借阅数据

```powershell
.\.venv\Scripts\python.exe scripts\seed_recommendation_ml_borrow_orders.py
```

说明：

- 默认会从 `C:/Users/32140/Desktop/smart_bookshelf/books` 搜索两份 Excel。
- 需要同时找到中文图书表和豆瓣图书表。
- 该脚本会生成一批 `demo_ml_reader_*` 读者及其借阅历史。

#### 8. 训练推荐 ML 模型

```powershell
.\.venv\Scripts\python.exe scripts\train_recommendation_mf.py
```

推荐命令：

```powershell
.\.venv\Scripts\python.exe scripts\train_recommendation_mf.py `
  --output artifacts\recommendation_mf_model.json `
  --latent-dim 16 `
  --epochs 32 `
  --learning-rate 0.045 `
  --regularization 0.01 `
  --negatives-per-positive 3 `
  --min-reader-interactions 2 `
  --min-book-interactions 2 `
  --seed 20260326
```

#### 9. 创建开发管理员

```powershell
.\.venv\Scripts\python.exe scripts\create_admin_account.py --username admin --password admin-pass
```

## token 获取方式

### 1. 管理员 token

```powershell
$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/auth/login" `
  -ContentType "application/json; charset=utf-8" `
  -Body '{"username":"admin","password":"admin-pass","role":"admin"}'

$adminToken = $login.access_token
```

## 常用接口

### 系统

- `GET /api/v1/health`

### Auth

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/admin/me`
- `GET /api/v1/auth/reader/me`

### Readers

- `GET /api/v1/readers/me/profile`
- `PATCH /api/v1/readers/me/profile`
- `GET /api/v1/readers/me/overview`
- `GET /api/v1/readers/me/orders`
- `GET /api/v1/readers`
- `GET /api/v1/readers/{reader_id}`
- `GET /api/v1/readers/{reader_id}/overview`
- `GET /api/v1/readers/{reader_id}/orders`
- `GET /api/v1/readers/{reader_id}/conversations`
- `GET /api/v1/readers/{reader_id}/recommendations`

### Catalog

- `GET /api/v1/catalog/books`
- `GET /api/v1/catalog/books/search`
- `GET /api/v1/catalog/books/{book_id}`

### Inventory

- `GET /api/v1/inventory/slots`
- `GET /api/v1/inventory/events`
- `GET /api/v1/inventory/status`
- `POST /api/v1/inventory/ocr/ingest`
- `POST /api/v1/inventory/take-by-text`

### Orders

- `GET /api/v1/orders/borrow-orders`
- `POST /api/v1/orders/borrow-orders`
- `GET /api/v1/orders/borrow-orders/{borrow_order_id}`
- `POST /api/v1/orders/borrow-orders/{borrow_order_id}/cancel`
- `POST /api/v1/orders/borrow-orders/{borrow_order_id}/return-requests`
- `GET /api/v1/orders/return-requests`
- `GET /api/v1/orders/return-requests/{return_request_id}`

### Robot Sim

- `GET /api/v1/robot-sim/state`
- `POST /api/v1/robot-sim/tick`
- `POST /api/v1/robot-sim/orders/{borrow_order_id}/tick`

### Recommendation

- `POST /api/v1/recommendation/search`
- `GET /api/v1/recommendation/books/{book_id}/similar`
- `GET /api/v1/recommendation/books/{book_id}/collaborative`
- `GET /api/v1/recommendation/books/{book_id}/hybrid`
- `GET /api/v1/recommendation/me/personalized`
- `GET /api/v1/recommendation/me/dashboard`

### Conversation

- `POST /api/v1/conversation/sessions`
- `GET /api/v1/conversation/sessions`
- `POST /api/v1/conversation/sessions/{session_id}/messages`
- `POST /api/v1/conversation/sessions/{session_id}/reply`
- `GET /api/v1/conversation/sessions/{session_id}/messages`

### Voice

- `POST /api/v1/voice/ingest`
- `GET /api/v1/voice/events`
- `GET /api/v1/voice/stream`

### Analytics

- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/trends`

### Admin

- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/{borrow_order_id}`
- `PATCH /api/v1/admin/orders/{borrow_order_id}/state`
- `GET /api/v1/admin/tasks`
- `GET /api/v1/admin/robots`
- `GET /api/v1/admin/events`
- `GET /api/v1/admin/events/stream`
- `GET /api/v1/admin/return-requests`
- `GET /api/v1/admin/return-requests/{return_request_id}`
- `POST /api/v1/admin/return-requests/{return_request_id}/complete`

## 典型联调流程

### 1. 推荐系统

- 先准备真实 reader token
- 调 `POST /api/v1/recommendation/search`
- 调 `GET /api/v1/recommendation/me/dashboard`

### 2. 机器人借阅

- 读者创建借阅单 `POST /api/v1/orders/borrow-orders`
- 管理员推进机器人 `POST /api/v1/robot-sim/orders/{id}/tick`
- 读者查看订单详情 `GET /api/v1/orders/borrow-orders/{id}`

### 3. 归还闭环

- 读者发起归还 `POST /api/v1/orders/borrow-orders/{id}/return-requests`
- 读者查看自己的归还请求 `GET /api/v1/orders/return-requests`
- 管理员查看归还请求 `GET /api/v1/admin/return-requests`
- 管理员完成归还 `POST /api/v1/admin/return-requests/{id}/complete`

### 4. 会话与语音

- 读者创建 session
- 调 `/conversation/sessions/{id}/reply`
- 调 `/voice/ingest` 测文本、音频或图片输入

## 测试与验证

### 1. 语法检查

```powershell
python -m py_compile app\main.py
```

也可以按模块检查：

```powershell
python -m py_compile app\orders\router.py app\orders\service.py
python -m py_compile app\conversation\router.py app\conversation\repository.py app\conversation\service.py
python -m py_compile app\voice\router.py app\voice\intent.py app\inventory\service.py
```

### 2. 单测

```powershell
uv run pytest -q
```

Windows 上如果 `pytest` 被临时目录权限卡住，可以优先：

- 用 `py_compile` 做语法检查
- 用 `TestClient` 做针对性验证
- 用真库 + HTTP 接口做联调

## 清理与生成物说明

以下目录或文件属于缓存、临时验证产物或本地运行残留，可以安全删除：

- `.pytest_cache/`
- `.pytest-tmp*/`
- `.pytest_tmp*/`
- `.tmp/`
- `.uv-cache/`
- 项目源码目录下的 `__pycache__/`
- `tmp_*.db`

以下内容不是运行源码，但通常代表本地数据资产或训练产物，是否保留取决于你后续是否还要继续该流程：

- `artifacts/recommendation_mf_model.json`
- `data/books_openlibrary_sample.csv`
- `data/ol_dump_works_2026-02-28.txt.gz`

## 关键实现说明

### Recommendation

- 支持 pgvector 语义召回
- 支持 metadata fallback
- 支持协同过滤 / 混合推荐 / 个性化推荐
- 默认 embedding provider 为本地 hash embedding
- 可选启用基于隐式反馈矩阵分解的 ML 二阶段重排

### Orders

- `completed` 和 `returned` 都是 final 状态
- `returned` 专门表示图书已回柜
- 取消订单会恢复库存和槽位
- 完成归还会恢复库存并推进借阅单语义

### Inventory

- OCR 入库优先做 catalog 候选筛选，再做相似度匹配
- 已去掉“整张 books 表全量拉到 Python 再匹配”的实现
- 取书支持 `《书名》`、中文动作词和简单英文动作词

### Voice

- 支持 `chat / take / store / clarify`
- 当语义不完整时，会先返回澄清提示
- 语音转写与 TTS 默认走 OpenAI 兼容接口配置

## 已知说明

- `conversation` 目前是最小可用自动回复，不是完整多轮 agent
- `robot_sim` 目前是手动推进，不是后台自动调度系统
- 某些老测试数据可能仍使用历史状态 `completed`
- 如果真库里某本书已经被占用，下单时会返回 `book_unavailable`
- 部分导入与数据生成脚本仍依赖本机固定路径，迁移到新机器时需要先调整路径配置

## 相关文档

- `docs/recommendation_ml_upgrade.md`
- `docs/plans/2026-03-22-readers-module-design.md`
- `docs/plans/2026-03-22-readers-module-implementation-plan.md`

## 建议的开发顺序

如果继续在这个项目上开发，建议按下面顺序推进：

1. 完善 `conversation` 的多轮编排和推荐结果注入
2. 完善 `robot_sim` 的暂停 / 恢复 / 重置 / 自动调度
3. 给 `inventory` 增加管理员手动上架 / 下架 / 校正接口
4. 给 `analytics` 增加时间范围筛选与导出
