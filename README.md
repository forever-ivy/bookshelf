# 知序 App

这是智能书柜项目的移动端读者应用，对应读者日常会用到的手机端能力。

它负责这些事情：

- 登录、注册、首次资料填写
- 首页推荐、搜索、图书详情
- 借阅单、配送进度、归还详情
- 收藏夹和书单
- 个人中心和阅读画像
- 导学工作区，包括 Guide、Explore、图谱、复盘、文档阅读

这份仓库本身是前端。真实数据来自 `service` 端；管理员 Web 端在 `admin`。

## 先看这三句

- 这里说的“第一次部署”，指第一次把本地开发环境跑起来。
- 第一次需要装依赖、拉起后端基础服务、导入 demo 数据、再启动 App。
- 后续每天继续开发时，不要再执行 `bootstrap_demo_database.py --reset`，否则会把你本地数据重置回 demo 状态。

## 第一次部署

### 1. 先准备好这些工具

- Node.js 和 npm
- `uv`
- Docker Desktop
- iOS 开发需要 Xcode
- Android 开发需要 Android Studio 或真机

这个仓库当前带的是 `package-lock.json`，默认按 `npm` 使用。

### 2. 安装 App 依赖

```bash
cd bookshelf-app
npm install
```

### 3. 准备 `service` 端

这个 App 不自己带后端。要联调真实接口，需要另一个 `service` 工作目录。

如果你本地还没有 `service` 目录，先准备一份：

```bash
cd ..
git clone <仓库地址> bookshelf
cd bookshelf
git checkout service
uv sync
```

如果你本地已经有 `bookshelf` 这个目录，就直接进入它，并确认当前是 `service` 即可。

### 4. 第一次拉起 `service` 的基础依赖和 demo 数据

在 `service` 根目录执行：

```bash
docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done

docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7

docker compose -f compose.learning.yml up -d neo4j

uv run python scripts/bootstrap_demo_database.py --reset
```

这一步会做三件事：

- 拉起 PostgreSQL
- 拉起 Redis 和 Neo4j
- 导入一份标准 demo 数据

如果你只是第一次把项目跑起来，推荐直接这样做，最省事。

### 5. 启动后端

#### 方式 A：最小联调

如果你现在只想联调登录、搜索、借阅、收藏、个人中心这类普通页面，先开 API 就够了。

在 `service` 根目录执行：

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### 方式 B：完整联调

如果你要联调导学、Explore、图谱、异步生成这条完整链路，推荐按下面 3 个进程来开。

终端 1，在 `service` 根目录：

```bash
export LIBRARY_LEARNING_TASKS_EAGER=false
export LIBRARY_LEARNING_AI_AGENT_URL=http://127.0.0.1:8787
export LIBRARY_LEARNING_AI_CALLBACK_BASE_URL=http://127.0.0.1:8000

uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

终端 2，在 `service/learning-agent` 目录：

```bash
npm install

set -a
source ../.env.local
set +a

export LIBRARY_REDIS_URL=redis://127.0.0.1:6379/0

npm start
```

终端 3，在 `service` 根目录：

```bash
export LIBRARY_LEARNING_TASKS_EAGER=false

uv run celery -A app.learning.tasks.celery_app worker -Q learning --loglevel=INFO
```

启动后，可以先检查：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

完整模式下，`health` 里至少最好能看到这些状态：

- `database = ok`
- `learning.queue = ok`
- `learning.worker = ok`

### 6. 配置 App 环境变量

回到 `bookshelf-app`，在 `.env` 里确认后端地址：

```env
EXPO_PUBLIC_LIBRARY_SERVICE_URL=http://127.0.0.1:8000
```

有两个注意点：

- 模拟器和同机开发，通常可以直接用 `127.0.0.1`
- 真机调试不能用 `127.0.0.1`，要改成你电脑当前的局域网 IP

如果你发现 `.env` 里已经有别人机器留下来的局域网地址，先改掉再启动。

### 7. 启动 App

```bash
cd bookshelf-app
npx expo start
```

常用启动方式：

```bash
npm run ios
npm run android
npm run web
```

## 后续继续开启

如果你之前已经完整跑过一次，后面每天继续开发时，通常按这个顺序来。

### 1. 先拉起 `service` 基础依赖

在 `service` 根目录执行：

```bash
docker compose -f docker-compose.pgvector.yml up -d
until docker exec bookshelf pg_isready -U library -d service >/dev/null 2>&1; do sleep 1; done

docker start bookshelf-redis 2>/dev/null || docker run -d --name bookshelf-redis -p 6379:6379 redis:7

docker compose -f compose.learning.yml up -d neo4j
```

这一步不要再加 `bootstrap_demo_database.py --reset`。

### 2. 再启动后端进程

如果你只看普通页面，启动 API 就够：

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

如果你要继续调导学、Explore、图谱，再把下面两个也开起来：

AI agent：

```bash
cd <service目录>/learning-agent

set -a
source ../.env.local
set +a

export LIBRARY_REDIS_URL=redis://127.0.0.1:6379/0

npm start
```

learning worker：

```bash
cd <service目录>
export LIBRARY_LEARNING_TASKS_EAGER=false

uv run celery -A app.learning.tasks.celery_app worker -Q learning --loglevel=INFO
```

### 3. 最后启动 App

在 `bookshelf-app` 根目录执行：

```bash
npx expo start
```

## 常用命令

```bash
npm run ios
npm run android
npm run web
npm run lint
npm test
npm run build:learning-graph-runtime
```

## 技术栈

当前这份 App 主要是下面这套组合：

- Expo 55
- React 19
- React Native 0.83
- Expo Router
- TanStack Query
- Zustand
- React Native Reanimated
- HeroUI Native
- Uniwind + Tailwind CSS 4
- Jest + Testing Library

## 用到的开源技术

下面这些库在项目里都能直接对应到实际代码：

- `expo`、`react`、`react-native`：跨平台应用基础
- `expo-router`：页面路由和导航结构
- `@tanstack/react-query`：服务端数据请求、缓存、重试
- `zustand`：会话和本地状态管理
- `expo-secure-store`：本地 token 安全存储
- `assistant-ui`、`react-native-gifted-chat`：导学对话体验
- `react-native-webview`：富文本和图谱运行容器
- `react-native-pdf`：PDF 文档阅读
- `react-native-markdown-display`、`katex`：Markdown 和公式渲染
- `react-force-graph-2d`：图谱画布
- `react-native-reanimated`、`@shopify/react-native-skia`：动画和定制绘制
- `heroui-native`、`lucide-react-native`、`sonner-native`：基础 UI、图标、提示
- `zod`：数据结构约束
- `jest`、`@testing-library/react-native`：单测和交互测试

## 项目亮点

这份 App 的特点，不是“页面多”，而是把几条不同类型的流程放进了一个移动端里：

- 一个仓库里同时覆盖读者侧主流程：登录、找书、借阅、收藏、个人中心
- 导学不是单一聊天页，而是拆成了 Guide、Explore、图谱、复盘、文档阅读几个部分
- 支持 PDF 阅读、Markdown 渲染、公式渲染，学习内容不是纯文本
- 图谱页面能把导学内容组织成节点和关系，方便从全局看知识结构
- 没配真实后端时，部分接口可以走 fallback / mock，方便前端先做页面和交互
- 同一套代码可以跑 iOS、Android，也保留了 Web 调试入口

## 这个仓库和其他分支的关系

- `app`：移动端读者应用，也就是当前这份仓库
- `service`：后端接口、数据库、导学流程、推荐能力
- `admin`：管理员 Web 端

如果你现在要解决的是“App 为什么连不上后端”，先优先检查这三件事：

1. `service` 有没有真的启动
2. `EXPO_PUBLIC_LIBRARY_SERVICE_URL` 写的是不是当前正确地址
3. 真机调试时是不是还误用了 `127.0.0.1`
