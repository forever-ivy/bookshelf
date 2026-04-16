# Smart Bookshelf Admin

`admin` 分支是智能书柜项目的 Web 管理后台，面向管理员和运营人员使用。它直接对接 `service` 分支提供的管理接口、库存接口、读者接口和分析接口，用来完成后台运营与设备管理工作。

## 这个分支负责什么

- 管理员登录与会话管理
- Dashboard 与运营概览
- 图书与库存管理
- OCR 入库流程
- 借阅单查看与状态纠正
- 机器人与任务状态监控
- 告警 / 事件流查看
- 读者管理与读者详情
- 系统设置与权限页框架

如果你想看读者手机端，请切到 `app` 分支；如果你想看 API、数据库和推荐逻辑，请切到 `service` 分支。

## 技术栈

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- Radix UI
- TanStack Query
- TanStack Table
- React Router
- React Hook Form + Zod
- Axios
- Vitest
- Playwright

## 目录结构

```text
.
├── public/                 # logo、背景图、仪表盘静态图
├── src/
│   ├── components/         # layout、shared、ui 组件
│   ├── constants/          # API 地址、错误文案、常量
│   ├── hooks/              # SSE、sidebar、移动端检测等 hooks
│   ├── lib/                # api 封装、http client、session store、utils
│   ├── pages/              # 页面级组件
│   ├── providers/          # Query / app providers
│   ├── routes/             # 路由壳子与权限守卫
│   └── types/              # API / domain 类型
├── tests/e2e/              # Playwright 测试
├── .env.example
└── playwright.config.ts
```

## 当前主要页面

- `/login`
- `/dashboard`
- `/books`
- `/analytics`
- `/inventory`
- `/inventory/cabinets/:cabinetId`
- `/ocr`
- `/orders`
- `/orders/:orderId`
- `/robots`
- `/alerts`
- `/readers`
- `/readers/:readerId`
- `/system`

另外保留了部分过渡路由：

- `/catalog`
- `/events`
- `/recommendation`
- `/legacy/catalog`
- `/legacy/events`

## 与后端的关系

这个分支默认通过 `VITE_API_BASE_URL` 连接 `service` 后端。

默认本地地址：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

前端请求层位于 `src/lib/http/client.ts`，核心行为包括：

- 自动注入 `Authorization: Bearer <token>`
- `401` 时尝试刷新会话，失败则清空本地登录态并跳回登录页
- `403` 时统一提示无权限
- 页面统一消费标准化后的 `ApiResponse` / `ApiError`

## 快速开始

## 第一次 clone 推荐流程

如果你是第一次在一台新机器上拉这个项目，并且要运行当前 `admin` 分支，建议按下面顺序做。

### 1. 拉代码并切到 `admin` 分支

```bash
git clone <仓库地址> bookshelf-admin
cd bookshelf-admin
git checkout admin
```

如果你已经在本地 clone 过仓库，只需要确认当前分支是 `admin` 即可。

### 2. 安装当前分支依赖

```bash
npm install
```

### 3. 准备 `service` 后端

`admin` 分支依赖 `service` 后端提供管理接口、库存接口和分析接口。第一次联调时，建议在另一个目录再准备一份 `service` 分支。

```bash
cd ..
git clone <仓库地址> bookshelf-service
cd bookshelf-service
git checkout service
uv sync
docker compose -f docker-compose.pgvector.yml up -d
```

如果仓库里已经有标准演示数据库快照 `data/demo/service-demo.dump`，推荐直接恢复：

```bash
uv run python scripts/bootstrap_demo_database.py --reset
```

如果当前没有快照文件，就先初始化空库：

```bash
uv run python scripts/init_postgres.py
```

然后启动后端：

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

确认后端健康检查可访问：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

### 4. 回到 `admin` 分支配置环境变量

```bash
cd ../bookshelf-admin
cp .env.example .env.local
```

写入：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 5. 启动当前分支

```bash
npm run dev
```

默认开发地址通常是：

- `http://127.0.0.1:5173`

### 6. 第一次联调建议先验证这三条链路

1. 管理员登录是否正常
2. Dashboard / 图书列表是否能返回真实数据
3. 订单、机器人和 SSE 事件流是否能正常加载

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

写入：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. 启动开发环境

```bash
npm run dev
```

默认开发地址通常是：

- `http://127.0.0.1:5173`

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:coverage
npm run e2e
```

## 页面与接口对应关系

### 登录与鉴权

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/admin/me`

### 图书与库存

- `GET /api/v1/catalog/books`
- `GET /api/v1/catalog/books/search`
- `GET /api/v1/catalog/books/{id}`
- `GET /api/v1/inventory/status`
- `GET /api/v1/inventory/slots`
- `GET /api/v1/inventory/events`
- `POST /api/v1/inventory/ocr/ingest`

### 订单与机器人

- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/{id}`
- `PATCH /api/v1/admin/orders/{id}/state`
- `GET /api/v1/admin/tasks`
- `GET /api/v1/admin/robots`
- `GET /api/v1/admin/events`
- `GET /api/v1/admin/events/stream`

### 读者与分析

- `GET /api/v1/readers`
- `GET /api/v1/readers/{readerId}`
- `GET /api/v1/readers/{readerId}/overview`
- `GET /api/v1/readers/{readerId}/orders`
- `GET /api/v1/readers/{readerId}/conversations`
- `GET /api/v1/readers/{readerId}/recommendations`
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/trends`

## 权限与路由

应用入口在 `src/App.tsx`，当前已经按权限码做了页面级控制，例如：

- `dashboard.view`
- `books.manage`
- `analytics.view`
- `inventory.manage`
- `orders.manage`
- `robots.manage`
- `alerts.manage`
- `readers.manage`
- `system.settings.manage`
- `system.roles.manage`

页面路由统一挂在：

- `ProtectedRoute`
- `PermissionRoute`
- `AppLayout`

之下，避免未登录和越权直接访问。

## 适合先读的代码

如果你第一次接这个分支，建议先看：

1. `src/App.tsx`
2. `src/main.tsx`
3. `src/lib/http/client.ts`
4. `src/lib/session-store.ts`
5. `src/routes/`
6. `src/pages/dashboard-page.tsx`
7. `src/pages/orders-page.tsx`
8. `src/hooks/use-admin-events-stream.ts`

这样可以先把入口、鉴权、路由和实时事件流串起来。

## 测试

### 单元与组件测试

```bash
npm test
```

当前重点覆盖：

- `HttpClient` 行为
- 受保护路由
- 数据表格与共享组件
- 页面级交互

### E2E

```bash
npm run e2e
```

当前 Playwright 主要覆盖：

- 登录进入 dashboard
- 订单详情状态纠正
- 机器人页 SSE 实时事件

## 常见问题

### 页面能打开，但没有数据

通常先检查：

- `service` 分支是否已经启动
- `VITE_API_BASE_URL` 是否正确
- 后端是否放行了当前前端地址的 CORS

### 登录后立刻跳回登录页

通常说明：

- token 失效
- refresh 失败
- 后端地址错误
- 当前账号没有管理员身份

### 页面提示无权限

这一般不是前端报错，而是后端返回了 `403`，需要检查当前管理员角色和对应权限码。
