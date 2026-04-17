# Smart Bookshelf Backend

`service` 分支是智能书柜项目的后端服务，负责整个系统的业务中心能力。`app` 分支的手机端和 `admin` 分支的 Web 管理端都直接依赖这里提供的 API、数据库模型和业务流程。

## 这个分支负责什么

当前后端已经覆盖的核心模块包括：

- `auth`：管理员 / 读者登录、token 刷新、身份查询
- `readers`：读者资料、总览、订单、会话、推荐历史
- `catalog`：图书列表、搜索、详情
- `inventory`：书柜槽位、事件、库存状态、OCR 入库、文本取书
- `orders`：借阅单、取消借阅、归还请求、归还闭环
- `robot_sim`：机器人状态与订单推进
- `recommendation`：语义搜索、相似推荐、协同过滤、混合推荐、个性化推荐
- `conversation`：读者会话、消息、自动回复
- `voice`：文本 / 音频 / 图片统一入口，支持事件流
- `analytics`：概览与趋势分析
- `admin`：管理端订单、事件、任务、归还处理
- `learning`：学习资料、学习任务与相关存储
- `system` / `notifications` / `favorites` / `booklists`：系统与读者体验补充能力

## 技术栈

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL + pgvector
- Alembic
- Uvicorn
- Redis
- Celery
- PaddleOCR
- OpenAI 兼容接口
- Pytest

## 目录结构

```text
.
├── app/
│   ├── admin/
│   ├── analytics/
│   ├── api/
│   ├── auth/
│   ├── booklists/
│   ├── catalog/
│   ├── conversation/
│   ├── core/
│   ├── favorites/
│   ├── inventory/
│   ├── learning/
│   ├── notifications/
│   ├── orders/
│   ├── readers/
│   ├── recommendation/
│   ├── robot_sim/
│   ├── seed_factory/
│   ├── system/
│   └── voice/
├── alembic/
├── artifacts/
├── data/
├── docs/
├── scripts/
├── tests/
├── docker-compose.pgvector.yml
└── pyproject.toml
```

## 快速开始

## 第一次 clone 推荐流程

如果你是第一次在一台新机器上拉这个项目，并且要运行当前 `service` 分支，建议按下面顺序做。

### 1. 拉代码并切到 `service` 分支

```bash
git clone <仓库地址> bookshelf-service
cd bookshelf-service
git checkout service
```

如果你已经在本地 clone 过仓库，只需要确认当前分支是 `service` 即可。

### 2. 安装依赖

```bash
uv sync
```

### 3. 启动 PostgreSQL + pgvector

```bash
docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done
```

默认数据库：

- host: `127.0.0.1`
- port: `55432`
- db: `service`
- user: `library`
- password: `library`

默认连接串：

```text
postgresql+psycopg://library:library@localhost:55432/service
```

### 4. 恢复标准演示数据库，或初始化空库

如果仓库里已经带了标准演示数据库快照 `data/demo/service-demo.dump`，第一次 clone 推荐直接恢复，这样你的数据库内容会和当前标准演示库保持一致：

```bash
uv run python scripts/bootstrap_demo_database.py --reset
```

如果数据库里已经有旧数据、又想重新恢复 demo 快照，也请继续带 `--reset`；不要直接对非空库执行不带 `--reset` 的恢复命令。

如果当前没有快照文件，就先初始化空库：

```bash
uv run python scripts/init_postgres.py
```

### 5. 终端 1：准备数据库、Redis 和 demo 数据

```bash
cd /Volumes/Disk/Code/bookshelf
docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done
docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7
uv run python scripts/bootstrap_demo_database.py --reset
```

### 6. 终端 2：启动 API

```bash
cd /Volumes/Disk/Code/bookshelf
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 7. 终端 3：启动 learning worker

```bash
cd /Volumes/Disk/Code/bookshelf
uv run celery -A app.learning.tasks.celery_app worker -Q learning --loglevel=INFO
```

### 8. 验证第一次启动是否成功

至少先检查下面三个地址：

- `http://127.0.0.1:8000/api/v1/health`
- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`

更直接的命令行校验：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

如果要联调导学异步链路，health 里至少应看到：

- `database = ok`
- `learning.queue = ok`
- `learning.worker = ok`

### 9. 如果后面要联调前端

- `admin` 分支默认访问 `http://127.0.0.1:8000`
- `app` 分支默认也访问 `http://127.0.0.1:8000`

也就是说，只要这个分支先跑起来，两个前端分支就可以继续往下接。

### 1. 安装依赖

```bash
uv sync
```

### 2. 启动 PostgreSQL + pgvector

```bash
docker compose -f docker-compose.pgvector.yml up -d
```

默认数据库：

- host: `127.0.0.1`
- port: `55432`
- db: `service`
- user: `library`
- password: `library`

默认连接串：

```text
postgresql+psycopg://library:library@localhost:55432/service
```

### 3. 初始化数据库

```bash
uv run python scripts/init_postgres.py
```

### 4. 导出当前演示数据库快照（可选）

如果你想把**当前这份 PostgreSQL 数据**原样带到另一台机器，而不是重新 seed 一份近似数据，可以先导出标准快照：

```bash
uv run python scripts/export_demo_snapshot.py
```

默认输出路径：

```text
data/demo/service-demo.dump
```

如果 `pg_dump` 不在 `PATH` 里，可以额外指定 PostgreSQL 客户端目录：

```bash
LIBRARY_POSTGRES_BIN_DIR=/opt/homebrew/opt/libpq/bin uv run python scripts/export_demo_snapshot.py
```

### 5. 启动服务

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果你还要跑 `learning` 的异步生成链路，请额外启动 Redis 和 Celery worker：

```bash
docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7
uv run celery -A app.learning.tasks.celery_app worker -Q learning --loglevel=INFO
```

### 6. 验证服务

- Swagger UI: `http://127.0.0.1:8000/docs`
- OpenAPI: `http://127.0.0.1:8000/openapi.json`
- Health: `http://127.0.0.1:8000/api/v1/health`

## 关键环境变量

项目使用 `LIBRARY_` 前缀读取配置。最常用的几项：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `LIBRARY_DATABASE_URL` | PostgreSQL 连接串 | `postgresql+psycopg://library:library@localhost:55432/service` |
| `LIBRARY_REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `LIBRARY_JWT_SECRET` | JWT 签名密钥 | `library-service-dev-secret-2026-change-me` |
| `LIBRARY_AUTO_CREATE_SCHEMA` | 启动时自动建表 | `true` |
| `LIBRARY_LLM_PROVIDER` | LLM 提供方 | `null` |
| `LIBRARY_LLM_MODEL` | LLM 模型 | `gpt-4.1-mini` |
| `LIBRARY_LLM_API_KEY` | LLM API key | 空 |
| `LIBRARY_LLM_BASE_URL` | LLM base URL | 空 |
| `LIBRARY_EMBEDDING_PROVIDER` | embedding 提供方 | `hash` |
| `LIBRARY_EMBEDDING_MODEL` | embedding 模型 | `text-embedding-3-small` |
| `LIBRARY_EMBEDDING_API_KEY` | embedding API key | 空 |
| `LIBRARY_EMBEDDING_BASE_URL` | embedding base URL | 空 |
| `LIBRARY_BOOK_SOURCE_STORAGE_DIR` | 图书源文件存储目录 | `artifacts/book-sources` |
| `LIBRARY_LEARNING_STORAGE_DIR` | 学习资料存储目录 | `artifacts/learning` |
| `LIBRARY_POSTGRES_BIN_DIR` | `pg_dump/pg_restore/psql` 所在目录 | 自动探测 |

补充说明：

- 没有配置 `LIBRARY_LLM_API_KEY` 时，对话、语音和部分理解能力会退化或禁用。
- 没有配置 embedding API 时，推荐模块默认使用本地 hash embedding。
- CORS 已默认放行本机常见的 `5173` 和 `4173` 端口，方便 `admin` 分支联调。

## 常用脚本

### 初始化数据库

```bash
uv run python scripts/init_postgres.py
```

### 导出当前演示数据库快照

```bash
uv run python scripts/export_demo_snapshot.py
```

### 一键恢复当前演示数据库快照

```bash
uv run python scripts/bootstrap_demo_database.py --reset
```

这条命令会：

1. 确保目标数据库存在
2. 清理现有对象
3. 从 `data/demo/service-demo.dump` 恢复完整结构和数据

如果你只想手动恢复，也可以：

```bash
uv run python scripts/restore_demo_snapshot.py --reset
```

说明：

- 这套流程恢复的是**当前 PostgreSQL 的精确快照**，不是重新 seed 的近似数据。
- 要让远端 clone 后可以直接一键恢复，仓库里需要先有 `data/demo/service-demo.dump` 这份标准快照。
- 推荐做法是：在拥有当前数据库的机器上先执行 `export_demo_snapshot.py`，再把生成的 dump 文件一并分发。

### 导入图书数据

```bash
uv run python scripts/import_chinese_books.py
```

### 生成图书 embedding

```bash
uv run python scripts/generate_book_embeddings.py
```

### 补 demo 库存

```bash
uv run python scripts/seed_demo_inventory.py --limit 20
```

### 补 demo 借阅数据

```bash
uv run python scripts/seed_demo_borrow_orders.py
```

### 训练推荐模型

```bash
uv run python scripts/train_recommendation_mf.py
```

## 推荐的初始化顺序

如果你想把推荐和借阅演示链路都跑起来，建议按这个顺序：

1. `uv sync`
2. `docker compose -f docker-compose.pgvector.yml up -d`
3. `uv run python scripts/init_postgres.py`
4. 导入图书数据
5. 生成库存与 demo 借阅数据
6. 生成 embedding
7. 如需二阶段重排，再训练推荐模型
8. 启动服务并用 `/docs` 联调

## 常见接口分组

### 系统

- `GET /api/v1/health`

### 认证

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/auth/admin/me`
- `GET /api/v1/auth/reader/me`

### 图书与库存

- `GET /api/v1/catalog/books`
- `GET /api/v1/catalog/books/search`
- `GET /api/v1/catalog/books/{book_id}`
- `GET /api/v1/inventory/slots`
- `GET /api/v1/inventory/status`
- `POST /api/v1/inventory/ocr/ingest`
- `POST /api/v1/inventory/take-by-text`

### 借阅与归还

- `GET /api/v1/orders/borrow-orders`
- `POST /api/v1/orders/borrow-orders`
- `GET /api/v1/orders/borrow-orders/{borrow_order_id}`
- `POST /api/v1/orders/borrow-orders/{borrow_order_id}/cancel`
- `POST /api/v1/orders/borrow-orders/{borrow_order_id}/return-requests`
- `GET /api/v1/orders/return-requests`

### 推荐与会话

- `POST /api/v1/recommendation/search`
- `GET /api/v1/recommendation/books/{book_id}/similar`
- `GET /api/v1/recommendation/me/personalized`
- `POST /api/v1/conversation/sessions`
- `POST /api/v1/conversation/sessions/{session_id}/messages`
- `POST /api/v1/conversation/sessions/{session_id}/reply`

### 管理端

- `GET /api/v1/admin/orders`
- `PATCH /api/v1/admin/orders/{borrow_order_id}/state`
- `GET /api/v1/admin/tasks`
- `GET /api/v1/admin/robots`
- `GET /api/v1/admin/events`
- `GET /api/v1/admin/return-requests`

## 与其他分支的协作关系

- `app` 分支主要消费读者接口、推荐接口、订单接口和会话接口
- `admin` 分支主要消费管理接口、库存接口、分析接口和读者管理接口
- 这两个前端要能稳定联调，首先要保证这里的认证、CORS、数据初始化和基础样本数据是可用的

## 测试

```bash
uv run pytest -q
```

测试目录已经按能力拆分，例如：

- `tests/test_auth_api.py`
- `tests/test_readers_api.py`
- `tests/test_catalog_inventory_api.py`
- `tests/test_orders_robot_admin_api.py`
- `tests/test_recommendation_*`
- `tests/test_learning_api.py`
- `tests/test_voice_api.py`

## 适合先读的代码

如果你第一次接这个分支，建议先看：

1. `app/main.py`
2. `app/api/router.py`
3. `app/core/config.py`
4. `app/auth/`
5. `app/catalog/`
6. `app/orders/`
7. `app/recommendation/`
8. `app/learning/`

这样能最快建立入口、配置、接口编排和业务分层的整体认知。
