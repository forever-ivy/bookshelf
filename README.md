# Curated Archive Admin

面向图书馆管理员的 Web SaaS 管理端，运行在独立的 `admin` 分支中，用来对接本地 `service` 后端。

## 技术栈

- `React 19`
- `Vite`
- `TypeScript`
- `Tailwind CSS v4`
- `shadcn/ui` 风格组件 + `Radix UI`
- `React Router`
- `TanStack Query`
- `TanStack Table`
- `react-hook-form + zod`
- `axios`
- `sonner`
- `Vitest + React Testing Library`
- `Playwright`

## 目录结构

```text
.
├── public/                     # favicon 和静态图标
├── references/stitch/          # Stitch 截图 / HTML / manifest / design notes
├── src/
│   ├── components/             # layout、shared、ui 组件
│   ├── constants/              # API_BASE_URL、错误文案、storage keys
│   ├── hooks/                  # SSE 等页面级 hooks
│   ├── lib/                    # api 封装、axios client、sse、utils
│   ├── pages/                  # 登录、Dashboard、目录、库存、OCR、订单、机器人、事件、读者
│   ├── providers/              # Query / Session providers
│   ├── routes/                 # 路由守卫和应用壳子
│   ├── test/                   # Vitest setup
│   ├── types/                  # api / domain 类型
│   └── utils/                  # storage 和通用格式化
├── tests/e2e/                  # Playwright 端到端回归
├── .env.example                # 前端环境变量示例
└── playwright.config.ts        # Playwright 配置
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制一份环境变量：

```bash
cp .env.example .env.local
```

默认会请求本机后端：

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. 启动开发环境

```bash
npm run dev
```

默认前端地址由 Vite 分配，通常是：

- [http://127.0.0.1:5173](http://127.0.0.1:5173)

## 常用命令

```bash
npm run dev            # 本地开发
npm run build          # 生产构建
npm run preview        # 预览构建产物
npm run lint           # ESLint
npm test               # Vitest
npm run test:coverage  # 覆盖率
npm run e2e            # Playwright
```

## 页面范围

已落地页面：

- `/login`
- `/dashboard`
- `/catalog`
- `/inventory`
- `/ocr`
- `/orders`
- `/orders/:orderId`
- `/robots`
- `/events`
- `/readers`
- `/readers/:readerId`

## 后端接口映射

当前页面直接对接 `service` 后端，主要使用：

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/admin/me`
- `GET /api/v1/admin/orders`
- `GET /api/v1/admin/orders/:id`
- `PATCH /api/v1/admin/orders/:id/state`
- `GET /api/v1/admin/tasks`
- `GET /api/v1/admin/robots`
- `GET /api/v1/admin/events`
- `GET /api/v1/admin/events/stream`
- `GET /api/v1/catalog/books`
- `GET /api/v1/catalog/books/search`
- `GET /api/v1/catalog/books/:id`
- `GET /api/v1/inventory/status`
- `GET /api/v1/inventory/slots`
- `GET /api/v1/inventory/events`
- `POST /api/v1/inventory/ocr/ingest`
- `GET /api/v1/readers`
- `GET /api/v1/readers/:readerId`
- `GET /api/v1/readers/:readerId/overview`
- `GET /api/v1/readers/:readerId/orders`
- `GET /api/v1/readers/:readerId/conversations`
- `GET /api/v1/readers/:readerId/recommendations`

## HTTP 层说明

数据层采用自定义 `HttpClient`，底层是 `axios.create()`：

- 文件位置：`src/lib/http/client.ts`
- 统一注入 `Authorization: Bearer <token>`
- 成功返回统一标准化为：

```ts
type ApiResponse<T> = {
  success: true
  data: T
  message?: string
  meta?: Record<string, unknown>
}
```

- 错误统一标准化为：

```ts
type ApiError = {
  success: false
  status: number
  code: string
  message: string
  details?: unknown
}
```

默认行为：

- `401`：清空 token、toast 提示、跳转 `/login`
- `403`：toast 无权限
- 其他：统一错误提示
- 支持 `upload()` 和 `download()`

## Stitch 参考资源

`references/stitch/` 里保存了本项目的设计参考：

- `screenshots/`：页面截图
- `html/`：Stitch 导出的 HTML
- `manifest.json`：screen id、标题、文件路径
- `design-system.md`：设计主题摘要

这些文件只作为参考资产，不直接参与运行时代码。

## 测试策略

### 单元与组件测试

当前覆盖：

- `HttpClient` 的 token 注入、成功标准化、401 清会话、上传进度
- 受保护路由的登录拦截

### 端到端测试

Playwright 目前覆盖：

- 管理员登录后进入 Dashboard
- 订单详情页的状态纠正
- 机器人监控页的 SSE 实时事件

默认使用前端开发服务器，并通过路由 mock 模拟后端响应，不依赖真实后端在线。

## 设计约束

- `Design System` 不单独做页面，只沉淀为主题和组件规范
- HTTP 层统一消费标准化结果，不在页面里处理 axios 原始响应
- 登录态固定保存在 `localStorage`
- 所有受保护页面必须通过 `ProtectedRoute`

## 后续建议

- 为 Dashboard 和大表格页增加按路由拆包，降低首屏 bundle
- 继续补 Playwright 用例：库存 OCR、读者详情、事件页筛选
- 增加 `.env.production` 与部署说明
