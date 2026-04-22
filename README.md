# Smart Bookshelf Admin

这是智能书柜项目的管理后台，对应仓库里的 `admin` 分支。  
它给管理员和运营人员使用，主要处理登录、图书管理、库存查看、订单处理、机器人状态、异常告警、读者信息和统计数据。

这个前端不会单独工作，运行时需要连到 `service` 分支提供的后端接口。

## 这个项目能做什么

- 管理员登录和会话管理
- 首页总览和统计看板
- 图书列表、检索和详情管理
- 书柜库存和柜位记录查看
- OCR 入库流程
- 借阅订单和订单详情处理
- 机器人状态和任务查看
- 异常告警和事件流查看
- 读者列表和读者详情查看
- 系统权限相关页面

如果你要看读者手机端，请切到 `app` 分支。  
如果你要看接口、数据库和业务服务，请切到 `service` 分支。

## 技术栈

- React 19
- TypeScript
- Vite
- React Router 7
- Tailwind CSS v4
- Axios
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Framer Motion
- Vitest
- Playwright

## 用到的开源技术

- `react` / `react-dom`：前端基础框架
- `vite`：开发服务器和构建工具
- `react-router-dom`：页面路由
- `@tanstack/react-query`：接口请求、缓存和状态管理
- `@tanstack/react-table`：表格能力
- `axios`：HTTP 请求封装
- `react-hook-form` + `zod`：表单和校验
- `tailwindcss`：样式系统
- `@radix-ui/*`：基础交互组件
- `lucide-react`：图标
- `framer-motion`：过渡动画
- `cmdk`：全局搜索弹层
- `recharts`：图表
- `vitest` + `@testing-library/react`：单元测试
- `playwright`：端到端测试

## 项目亮点

- 一个后台里把图书、库存、订单、机器人、异常、读者、统计都串起来了，日常管理不用来回切系统
- 登录态和接口层是统一封装的，带 `Bearer Token`、过期处理和统一错误提示
- 支持事件流能力，适合看订单、机器人和后台事件的实时变化
- 路由和权限是绑定的，不同角色进入后台后只会看到自己能用的模块
- 顶部全局搜索已经接入图书、读者和订单，查找常用信息更快
- 接口地址支持显式配置，也支持按当前访问主机自动推导到 `:8000`

## 目录结构

```text
.
├── public/                 # 静态资源
├── src/
│   ├── components/         # layout、shared、ui 组件
│   ├── constants/          # 常量和默认配置
│   ├── hooks/              # 业务 hooks
│   ├── lib/                # api、http、sse、session 等封装
│   ├── pages/              # 页面组件
│   ├── providers/          # 全局 provider
│   ├── routes/             # 路由壳和权限守卫
│   └── types/              # 类型定义
├── tests/e2e/              # Playwright 测试
├── .env.example
└── package.json
```

## 运行前准备

第一次部署前，先准备这些环境：

- Node.js 和 npm
- Python
- `uv`
- Docker Desktop 或其他可用的 Docker 环境

原因很简单：

- `admin` 分支本身是前端，靠 `npm` 运行
- `service` 分支是后端，靠 Python、`uv` 和 Docker 运行

## 第一次部署

下面这套流程适合第一次在一台新机器上把后台跑起来。

### 1. 准备代码

如果你已经按 worktree 方式把三个分支拆开了，可以直接使用现有目录。  
如果你还没有准备，至少要有两份代码：

- 一份 `bookshelf-admin`，用于运行当前后台
- 一份 `bookshelf` 或 `bookshelf-service`，用于运行 `service` 后端

### 2. 启动后端依赖

先进入 `service` 分支所在目录：

```bash
cd /path/to/bookshelf
```

安装 Python 依赖：

```bash
uv sync
```

启动数据库等依赖：

```bash
docker compose -f docker-compose.pgvector.yml up -d
```

如果你要恢复演示数据，执行：

```bash
uv run python scripts/bootstrap_demo_database.py --reset
```

如果当前没有演示库，或者你只想先起一个空库，可以执行：

```bash
uv run python scripts/init_postgres.py
```

启动后端服务：

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

确认后端已经启动：

```bash
curl http://127.0.0.1:8000/api/v1/health
```

能拿到健康检查结果，说明后端已经可以给后台提供接口了。

### 3. 配置后台环境变量

回到当前仓库：

```bash
cd /path/to/bookshelf-admin
cp .env.example .env.local
```

`.env.local` 默认写成下面这样就可以：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

如果你的后端不在本机，而是在局域网其他机器上，把这里改成真实地址即可。

### 4. 安装前端依赖

```bash
npm install
```

### 5. 启动后台

```bash
npm run dev
```

启动后默认访问：

- `http://127.0.0.1:5173`

### 6. 首次联调建议检查这几项

- 登录页能否正常打开
- 是否能用 `admin / admin123` 登录
- 首页和图书列表是否能正常请求数据
- 订单、机器人、异常页面是否能正常加载

## 以后怎么继续开启

第一次部署完成后，后面就简单很多了。

### 场景 1：电脑刚重启，什么都没开

先开后端依赖和服务：

```bash
cd /path/to/bookshelf
docker compose -f docker-compose.pgvector.yml up -d
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

再开前端：

```bash
cd /path/to/bookshelf-admin
npm run dev
```

### 场景 2：数据库容器还在，只是前后端进程停了

只需要重新启动服务进程：

```bash
cd /path/to/bookshelf
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd /path/to/bookshelf-admin
npm run dev
```

### 场景 3：后端地址没变，只是改了前端代码

这种情况通常只要：

```bash
cd /path/to/bookshelf-admin
npm run dev
```

就够了，不需要重新初始化数据库。

## 默认接口地址

当前项目优先读取：

```env
VITE_API_BASE_URL
```

如果你没有手动配置，前端会按当前访问的主机名自动拼成：

```text
http://当前主机:8000
```

本地开发最常见的配置还是：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

## 主要页面

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

当前还保留了少量过渡路由：

- `/catalog`
- `/events`
- `/recommendation`
- `/legacy/catalog`
- `/legacy/events`

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm test
npm run test:watch
npm run test:coverage
npm run e2e
```

## 与后端的关系

这个后台主要对接 `service` 分支提供的管理接口。  
前端里的请求层在 `src/lib/http/client.ts`，SSE 能力在 `src/lib/sse.ts`。

当前这套前端会统一处理这些事情：

- 请求时自动带登录 token
- `401` 时尝试刷新登录态
- 刷新失败后清理本地会话并回到登录页
- `403` 时统一提示无权限
- 网络错误时给出统一提示

## 页面和接口的大致对应关系

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

### 读者与统计

- `GET /api/v1/readers`
- `GET /api/v1/readers/{readerId}`
- `GET /api/v1/readers/{readerId}/overview`
- `GET /api/v1/readers/{readerId}/orders`
- `GET /api/v1/readers/{readerId}/conversations`
- `GET /api/v1/readers/{readerId}/recommendations`
- `GET /api/v1/analytics/overview`
- `GET /api/v1/analytics/trends`

## 遇到问题先看哪里

- 打不开页面：先看 `npm run dev` 是否正常启动
- 登录失败：先确认后端是否可访问，再确认账号和密码
- 页面一直转圈或报网络错误：先检查 `VITE_API_BASE_URL`
- 后台页面空白：先看浏览器控制台和终端报错
- 接口请求失败：先访问 `http://127.0.0.1:8000/api/v1/health`

如果你想继续补充部署脚本、生产部署方式或 Docker 化方案，可以在这份 `README` 上继续加。
