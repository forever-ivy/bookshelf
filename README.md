# 智能书柜后端服务

这是智能书柜项目的后端仓库。手机端 `app` 和管理端 `admin` 都直接依赖这里提供的 API、数据库模型和业务流程。

这个仓库不只是一个简单的接口层。它同时负责图书目录、库存、借阅、推荐、会话、学习资料、学习记录，以及一部分 AI 能力和异步任务。

## 这个项目能做什么

- 管理员和读者登录
- 图书列表、搜索、详情
- 书柜库存、槽位、事件、OCR 入库
- 借阅单、取消借阅、归还请求、归还闭环
- 推荐、相似书、个性化推荐
- 读者会话、消息、语音入口
- 学习资料、学习任务、学习记录、Explore 链路

## 技术栈

- Python 3.12
- FastAPI
- SQLAlchemy 2
- Alembic
- PostgreSQL
- pgvector
- Redis
- Celery
- Neo4j
- Uvicorn
- Node.js 22

## 用到的开源技术

- [FastAPI](https://fastapi.tiangolo.com/)：提供 HTTP API 和接口文档
- [SQLAlchemy](https://www.sqlalchemy.org/)：管理数据库模型和查询
- [Alembic](https://alembic.sqlalchemy.org/)：管理数据库结构变更
- [PostgreSQL](https://www.postgresql.org/)：主业务数据库
- [pgvector](https://github.com/pgvector/pgvector)：保存向量，用于语义检索和相似推荐
- [Redis](https://redis.io/)：任务队列、缓存、流式状态
- [Celery](https://docs.celeryq.dev/)：跑 learning 异步任务
- [Neo4j](https://neo4j.com/)：图谱相关能力
- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)：OCR 入库能力
- [AI SDK](https://ai-sdk.dev/) 和 [@ai-sdk/deepseek](https://www.npmjs.com/package/@ai-sdk/deepseek)：本地 `learning-agent` 的流式 AI 调用
- [OpenAI Python SDK](https://github.com/openai/openai-python)：兼容 OpenAI 风格接口的 LLM 和 embedding 调用
- [Pandas](https://pandas.pydata.org/) / [OpenPyXL](https://openpyxl.readthedocs.io/)：导入 CSV、Excel 书目
- [PyPDF](https://pypi.org/project/pypdf/)：PDF 解析
- [MinIO](https://min.io/) / [MinerU](https://github.com/opendatalab/MinerU)：对象存储和文档解析，可选

## 项目亮点

- 一个后端同时服务手机端和管理端，接口、数据模型和业务流程都在这里统一维护。
- 本地可以走两种数据路径：直接恢复标准 demo 快照，或者用自己的 `books.csv` 全量重建演示业务库。
- 基础 API 可以单独启动；如果要联调 Explore 和 learning，也可以切到完整的异步链路。
- AI 能力是可插拔的。没配 LLM 时，基础业务仍然可以跑；配好后可以打开推荐、语音、学习问答等能力。
- 仓库里已经带了初始化、恢复、导出、全量重建、验证等脚本，适合做本地联调和演示环境维护。

## 目录

```text
.
├── app/                  # 主后端代码
├── alembic/              # 数据库迁移
├── learning-agent/       # 本地 Explore AI agent
├── scripts/              # 初始化、导入、重建、导出脚本
├── tests/                # 测试
├── docker-compose.pgvector.yml
├── compose.learning.yml
└── README.md
```

## 先准备什么

第一次在新机器上跑这个仓库，建议先准备下面这些东西：

- Docker Desktop
- `uv`
- Python 3.12
- Node.js 22
- PostgreSQL client tools

说明：

- `Node.js 22` 只在你要本地启动 `learning-agent` 时才需要。
- `pg_restore`、`psql`、`pg_dump` 只在你要恢复或导出 PostgreSQL 快照时需要。
- 配置会自动读取 `.env.local` 和 `.env`，环境变量统一用 `LIBRARY_` 前缀。

## 默认端口和默认数据

- API：`8000`
- PostgreSQL：`55432`
- Redis：`6379`
- Neo4j HTTP：`7474`
- Neo4j Bolt：`7687`
- learning-agent：`8787`

默认数据库连接串：

```text
postgresql+psycopg://library:library@localhost:55432/service
```

常用 demo 账号：

- 管理员：`admin / admin123`
- 如果你跑的是全量重建数据：`reader_1 / reader123`

标准 demo 快照里的读者账号以快照本身内容为准。

## 第一次部署

第一次部署时，建议按下面顺序来。

### 1. 安装 Python 依赖

```bash
cd /Volumes/Disk/Code/bookshelf
uv sync
```

### 2. 启动基础依赖

```bash
cd /Volumes/Disk/Code/bookshelf

docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done

docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7

docker compose -f compose.learning.yml up -d neo4j
```

如果你只是先跑基础 API，到这里已经够了。

### 3. 初始化数据库

这里有两条路，二选一。

#### 方案 A：恢复仓库里的标准 demo 快照

适合第一次快速起一套标准演示库。

```bash
cd /Volumes/Disk/Code/bookshelf
uv run python scripts/bootstrap_demo_database.py --reset
```

如果机器上找不到 `pg_restore` 或 `psql`，先安装 PostgreSQL client tools，或者像下面这样指定路径：

```bash
cd /Volumes/Disk/Code/bookshelf
LIBRARY_POSTGRES_BIN_DIR=/opt/homebrew/opt/libpq/bin uv run python scripts/bootstrap_demo_database.py --reset
```

#### 方案 B：用自己的 `books.csv` 全量重建演示业务库

适合你要替换整库图书数据，并同步重建库存、借阅、学习资料、推荐日志这些业务数据。

```bash
cd /Volumes/Disk/Code/bookshelf

uv run python scripts/reseed_full_demo_dataset.py \
  --source-file "/absolute/path/to/books.csv" \
  --anchor-date 2026-04-22 \
  --scale-profile full \
  --reset \
  --verify
```

这条命令会按下面顺序做事：

1. 读取 `books.csv`
2. 归一化成内部 snapshot
3. 重建 schema
4. 重建整套演示业务数据
5. 运行校验，确认时间线和比例没有越界

### 4. 启动后端

如果你现在只是想把 API 跑起来，直接用最小启动方式：

```bash
cd /Volumes/Disk/Code/bookshelf
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后可以直接打开：

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/v1/health`

### 5. 如果要联调整条 learning / Explore 链路

推荐用下面这套本地异步模式。

#### 终端 1：基础依赖

```bash
cd /Volumes/Disk/Code/bookshelf

docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done

docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7

docker compose -f compose.learning.yml up -d neo4j
```

#### 终端 2：API

```bash
cd /Volumes/Disk/Code/bookshelf

export LIBRARY_LEARNING_TASKS_EAGER=false
export LIBRARY_LEARNING_AI_AGENT_URL=http://127.0.0.1:8787
export LIBRARY_LEARNING_AI_CALLBACK_BASE_URL=http://127.0.0.1:8000

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 终端 3：learning-agent

```bash
cd /Volumes/Disk/Code/bookshelf/learning-agent

npm install

if [ -f /Volumes/Disk/Code/bookshelf/.env.local ]; then
  set -a
  source /Volumes/Disk/Code/bookshelf/.env.local
  set +a
fi

export LIBRARY_REDIS_URL=redis://127.0.0.1:6379/0

npm start
```

#### 终端 4：learning worker

```bash
cd /Volumes/Disk/Code/bookshelf

export LIBRARY_LEARNING_TASKS_EAGER=false

uv run celery -A app.learning.tasks.celery_app worker -Q learning --loglevel=INFO
```

如果你只是联调普通业务接口，不需要把这四个都开起来。很多时候只开 PostgreSQL、Redis、API 就够了。

## 后续再次开启

数据库已经初始化过以后，日常重新开服务只需要做下面这些事。

### 1. 重新拉起基础依赖

```bash
cd /Volumes/Disk/Code/bookshelf

docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done

docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7

docker compose -f compose.learning.yml up -d neo4j
```

### 2. 启动 API

```bash
cd /Volumes/Disk/Code/bookshelf
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 需要异步链路时，再启动 agent 和 worker

命令和上面的“第一次部署”一致，不重复写。

### 4. 不要重复跑这些重置命令

后续再次开启时，不要顺手再跑下面这些命令。它们会覆盖你当前库里的数据。

- `uv run python scripts/bootstrap_demo_database.py --reset`
- `uv run python scripts/reseed_full_demo_dataset.py ... --reset`

只有你明确要重置或重建数据时，才重新执行。

## 启动后怎么确认真的好了

最直接的检查方式：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

也可以直接打开：

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/openapi.json`

如果你跑的是本地异步模式，`/api/v1/health` 里建议至少看到：

- `status = ok`
- `learning.mode = async`
- `learning.worker = ok`

如果看到 `orchestrator = not_configured`，但你本地是走 `LIBRARY_LEARNING_AI_AGENT_URL` 这条链路，这种情况可以接受。

## 常用环境变量

项目统一读取 `LIBRARY_` 前缀环境变量。最常用的是下面这些：

| 变量 | 作用 | 默认值 |
| --- | --- | --- |
| `LIBRARY_DATABASE_URL` | PostgreSQL 连接串 | `postgresql+psycopg://library:library@localhost:55432/service` |
| `LIBRARY_REDIS_URL` | Redis 连接串 | `redis://localhost:6379/0` |
| `LIBRARY_LEARNING_TASKS_EAGER` | learning 任务是否在 API 进程里直接执行 | `false` |
| `LIBRARY_LEARNING_AI_AGENT_URL` | 本地 learning-agent 地址 | 空 |
| `LIBRARY_LEARNING_AI_CALLBACK_BASE_URL` | agent 回调 API 地址 | 空 |
| `LIBRARY_GRAPH_PROVIDER` | 图谱存储提供方 | `disabled` |
| `LIBRARY_GRAPH_URI` | Neo4j Bolt 地址 | 空 |
| `LIBRARY_LLM_PROVIDER` | LLM 提供方 | `null` |
| `LIBRARY_LLM_MODEL` | 默认 LLM 模型 | `gpt-4.1-mini` |
| `LIBRARY_EMBEDDING_PROVIDER` | embedding 提供方 | `hash` |
| `LIBRARY_BOOK_SOURCE_STORAGE_DIR` | 图书源文件目录 | `artifacts/book-sources` |
| `LIBRARY_LEARNING_STORAGE_DIR` | 学习资料目录 | `artifacts/learning` |
| `LIBRARY_POSTGRES_BIN_DIR` | `pg_restore`、`psql` 所在目录 | 自动探测 |

## 常用脚本

- `scripts/bootstrap_demo_database.py`：恢复标准 demo 快照
- `scripts/reseed_full_demo_dataset.py`：从 `books.csv` 全量重建演示业务库
- `scripts/export_demo_snapshot.py`：导出当前 PostgreSQL 快照
- `scripts/build_openlibrary_snapshot.py`：把书源整理成内部 snapshot
- `scripts/verify_large_dataset.py`：检查大规模演示库数据是否合理
- `scripts/generate_book_embeddings.py`：生成图书 embedding
- `scripts/train_recommendation_mf.py`：训练推荐模型

## 测试

```bash
cd /Volumes/Disk/Code/bookshelf
uv run pytest -q
```

## 开发时的一个简单建议

如果你今天只是改普通接口，先按“后续再次开启”把 PostgreSQL、Redis、API 拉起来就行。

如果你今天要联调 Explore、learning、图谱、异步消息，再补开 `learning-agent`、worker 和 Neo4j。

这样最省时间，也不容易把本地数据误重置。
