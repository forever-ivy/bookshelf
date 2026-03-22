# 图书服务后端

基于 FastAPI 的单馆图书服务后端，面向“智能书柜 + App + 管理端”场景，当前主线已经全部收敛到仓库根目录。

当前版本覆盖的核心能力包括：

- 读者 / 管理员认证
- 图书检索与详情查询
- 库存、柜位与 OCR 入柜
- 借阅下单与归还申请
- 模拟小车配送与管理员实时观测
- 推荐、对话与语音入口
- PostgreSQL + pgvector 数据存储

## 技术栈

- Python 3.12+
- FastAPI
- SQLAlchemy 2
- PostgreSQL 18 + pgvector
- Redis
- OpenAI-compatible SDK
- PaddleOCR
- Pytest
- Alembic

## 目录结构

```text
.
├── app/                         业务代码
│   ├── admin/                   管理端接口
│   ├── analytics/               统计与分析模块
│   ├── api/                     顶层路由聚合
│   ├── auth/                    登录、刷新、身份上下文
│   ├── catalog/                 图书目录与检索
│   ├── connectors/              OCR / 外部能力适配
│   ├── context/                 上下文组装
│   ├── conversation/            会话与消息持久化
│   ├── core/                    配置、数据库、鉴权、错误处理
│   ├── inventory/               库存、柜位、入柜、取书
│   ├── llm/                     大模型 provider
│   ├── orders/                  借阅单与归还单
│   ├── readers/                 读者域
│   ├── recommendation/          推荐与自然语言找书
│   ├── robot_sim/               模拟小车状态流转
│   ├── system/                  健康检查等系统接口
│   ├── voice/                   语音入口、ASR、TTS
│   └── workers/                 后台任务
├── alembic/                     数据库迁移目录
├── scripts/                     初始化与辅助脚本
├── tests/                       自动化测试
├── alembic.ini                  Alembic 配置
├── docker-compose.pgvector.yml  本地 PostgreSQL + pgvector
├── pyproject.toml               项目依赖与 pytest 配置
└── uv.lock                      依赖锁文件
```

## 主要模块

当前 API 通过 [app/api/router.py](/Users/Code/bookshelf/bookshelf/app/api/router.py) 聚合，模块边界如下：

| 模块 | 说明 |
| --- | --- |
| `system` | 健康检查、系统状态 |
| `auth` | 登录、刷新、当前身份、初始化配对 |
| `readers` | 读者中心，提供资料、自助概览与管理员读者查询 |
| `catalog` | 图书列表、搜索、详情 |
| `inventory` | 柜位、库存事件、OCR 入柜、文本取书 |
| `orders` | 借阅订单、归还请求 |
| `robot_sim` | 模拟小车当前状态 |
| `recommendation` | 自然语言找书、推荐解释 |
| `conversation` | 会话创建、消息持久化 |
| `voice` | 音频/文本语音入口、事件流、SSE |
| `analytics` | 统计能力占位 |
| `admin` | 管理员订单、任务、机器人、事件流 |

## 本地开发

### 1. 准备依赖

建议使用 `uv` 管理环境：

```bash
uv sync
```

如果你不想先执行 `uv sync`，后面的 `uv run ...` 也会自动补齐依赖。

### 2. 启动 PostgreSQL + pgvector

```bash
docker compose -f docker-compose.pgvector.yml up -d
```

默认会启动一台本地数据库：

- Host: `127.0.0.1`
- Port: `55432`
- Database: `service`
- Username: `library`
- Password: `library`

默认连接串：

```text
postgresql+psycopg://library:library@localhost:55432/service
```

### 3. 初始化数据库

```bash
uv run python scripts/init_postgres.py
```

这个脚本会：

- 自动创建数据库（如果不存在）
- 自动启用 `vector` 扩展
- 自动创建当前 SQLAlchemy 模型对应的表

### 4. 启动服务

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动后可访问：

- Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- OpenAPI JSON: [http://127.0.0.1:8000/openapi.json](http://127.0.0.1:8000/openapi.json)
- 健康检查: [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

## 测试

运行全部测试：

```bash
uv run pytest -q
```

当前测试覆盖：

- 应用启动与 OpenAPI
- 认证
- 读者中心
- 图书与库存
- OCR 入柜与文本取书
- 订单与模拟小车
- 管理端实时接口
- 推荐、会话、语音
- PostgreSQL + pgvector 初始化

## 环境变量

配置通过 [app/core/config.py](/Users/Code/bookshelf/bookshelf/app/core/config.py) 读取，统一使用 `LIBRARY_` 前缀。

### 基础配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `LIBRARY_APP_NAME` | `Library Service V2` | 应用名称 |
| `LIBRARY_APP_VERSION` | `0.1.0` | 应用版本 |
| `LIBRARY_ENVIRONMENT` | `development` | 运行环境 |
| `LIBRARY_DATABASE_URL` | `postgresql+psycopg://library:library@localhost:55432/service` | 主数据库连接串 |
| `LIBRARY_REDIS_URL` | `redis://localhost:6379/0` | Redis 地址 |
| `LIBRARY_CABINET_ID` | `cabinet-001` | 默认书柜 ID |
| `LIBRARY_AUTO_CREATE_SCHEMA` | `true` | 启动时是否自动建表 |

### 鉴权配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `LIBRARY_JWT_SECRET` | 开发默认值 | JWT 密钥 |
| `LIBRARY_JWT_ALGORITHM` | `HS256` | JWT 算法 |
| `LIBRARY_ACCESS_TOKEN_TTL_MINUTES` | `30` | Access Token 有效期 |
| `LIBRARY_REFRESH_TOKEN_TTL_MINUTES` | `20160` | Refresh Token 有效期 |

### 大模型配置

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `LIBRARY_LLM_PROVIDER` | `openai-compatible` | 支持 `openai` / `openai-compatible` / `sdk` / `null` |
| `LIBRARY_LLM_MODEL` | `gpt-4.1-mini` | 推荐、OCR 解析、聊天默认模型 |
| `LIBRARY_LLM_API_KEY` | 空 | OpenAI-compatible API Key |
| `LIBRARY_LLM_BASE_URL` | 空 | 自定义 OpenAI-compatible Base URL |

如果没有配置 `LIBRARY_LLM_API_KEY`：

- 推荐、OCR 解析、语音问答等需要云端模型的接口会返回受控错误或退化行为
- 纯业务接口和大部分测试仍可运行

### 语音模型可选配置

这些变量由 [app/voice/speech.py](/Users/Code/bookshelf/bookshelf/app/voice/speech.py) 读取：

| 变量名 | 默认值 | 说明 |
| --- | --- | --- |
| `LIBRARY_SPEECH_TRANSCRIPTION_MODEL` | `gpt-4o-mini-transcribe` | 语音转写模型 |
| `LIBRARY_SPEECH_TTS_MODEL` | `gpt-4o-mini-tts` | TTS 模型 |
| `LIBRARY_SPEECH_TTS_VOICE` | `alloy` | TTS 音色 |

## 数据库说明

- 当前默认数据库是 PostgreSQL，不再使用旧的 SQLite 主线
- `pgvector` 通过 [app/core/database.py](/Users/Code/bookshelf/bookshelf/app/core/database.py) 在初始化时自动启用
- 当前建表方式以 `SQLAlchemy metadata.create_all` 为主
- Alembic 目录已经准备好，后续正式迁移可逐步补充版本脚本

## 常用命令

```bash
# 安装依赖
uv sync

# 初始化 PostgreSQL
uv run python scripts/init_postgres.py

# 启动开发服务器
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 运行测试
uv run pytest -q
```

## 说明

- 旧 Flask 后端、旧 Web 模板和旧本地 SQLite 主线已经移除
- 当前仓库只保留新的 FastAPI 后端实现
- 如果后续要补部署文档、接口清单或 `.env.example`，建议在此 README 基础上继续扩展
