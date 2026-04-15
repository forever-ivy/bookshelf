# 知序 App

`app` 分支是智能书柜项目的手机端读者应用，面向借阅用户使用。它负责承接读者侧的登录、找书、借阅、收藏、个人中心和导学交互，并通过 `service` 分支提供的后端接口完成真实业务联调。

## 这个分支负责什么

- 读者登录、注册和 onboarding
- 首页推荐、搜索、图书详情
- 借阅单、配送进度、归还详情
- 收藏夹和书单
- 个人中心与阅读画像
- 导学 tutor 工作区
- 与 `service` 的认证、图书、订单、推荐、会话等接口对接

如果你想看管理员使用的 Web 端，请切到 `admin` 分支；如果你想看接口、数据库和推荐逻辑，请切到 `service` 分支。

## 技术栈

- Expo 55
- React 19
- React Native 0.83
- expo-router
- TanStack Query
- Zustand
- React Native Reanimated
- Jest

## 目录结构

```text
.
├── app/               # 路由与页面
├── components/        # 基础组件、页面组件、业务组件
├── hooks/             # 应用级与业务级 hooks
├── lib/               # API client、领域逻辑、展示逻辑、mock 数据
├── providers/         # Query、profile sheet 等全局 provider
├── stores/            # token 与本地会话存储
├── assets/            # 图标、图片、启动图等资源
├── __tests__/         # 单元测试与交互测试
└── docs/              # PRD、联调说明、设计记录
```

## 当前主要页面

- `app/login.tsx`
- `app/register.tsx`
- `app/onboarding/profile.tsx`
- `app/onboarding/interests.tsx`
- `app/(tabs)/(home)/index.tsx`
- `app/(tabs)/search/index.tsx`
- `app/(tabs)/borrowing/index.tsx`
- `app/(tabs)/me/index.tsx`
- `app/books/[bookId].tsx`
- `app/orders/[orderId].tsx`
- `app/returns/[returnRequestId].tsx`
- `app/favorites/index.tsx`
- `app/tutor/[profileId]/session/[sessionId].tsx`

## 与后端的关系

这个分支通过 `lib/api/client.ts` 中的请求层访问 `service` 后端。

核心特征：

- 使用 `EXPO_PUBLIC_LIBRARY_SERVICE_URL` 指定后端地址
- 没有配置后端地址时，部分能力会走 fallback / mock，方便前端阶段性开发
- 访问受保护接口时会自动读取本地 token
- 遇到认证失效时会尝试用 refresh token 刷新会话

默认本地联调地址通常为：

```env
EXPO_PUBLIC_LIBRARY_SERVICE_URL=http://127.0.0.1:8000
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

可以在 `.env` 中写入：

```env
EXPO_PUBLIC_LIBRARY_SERVICE_URL=http://127.0.0.1:8000
```

如果暂时不接真实后端，也可以不配置，但届时只能使用部分降级数据流。

### 3. 启动开发环境

```bash
npx expo start
```

常用命令：

```bash
npx expo run:ios
npx expo run:android
npx expo start --web
npm run lint
npm test
```

## iOS / Android 标识

`app.json` 当前已经配置：

- iOS bundle identifier: `com.liuxuan.bookshelf.app`
- Android package: `com.liuxuan.bookshelf.app`
- URL scheme: `app`

同时已经启用：

- `expo-router`
- `expo-dev-client`
- `expo-camera`
- `expo-secure-store`
- React Compiler

## 开发时最值得先看的文件

如果你第一次接这个分支，建议按这个顺序读：

1. `app/_layout.tsx`
2. `app/(tabs)/_layout.tsx`
3. `lib/api/client.ts`
4. `hooks/use-library-app-data.ts`
5. `components/navigation/`
6. `components/search/`
7. `components/tutor/`

这样可以先建立路由、会话和数据流的基本认知。

## 常见联调链路

### 登录链路

- 用户输入账号密码
- App 调用 `service` 的认证接口
- access token / refresh token 写入本地存储
- 后续请求自动携带 token

### 搜索与借阅链路

- 用户在搜索页查询图书
- App 调用 catalog / recommendation 接口
- 用户发起借阅后查看订单和配送状态

### 导学链路

- 用户进入 tutor 工作区
- App 拉取 profile、session、sources 等数据
- 与后端的推荐 / 会话能力协作

## 测试

```bash
npm test
```

当前测试主要覆盖：

- 路由加载与页面壳子
- 搜索页与头部显示
- UI shell 和部分交互行为

## 常见问题

### 启动了 App 但接口都失败

先检查：

- `service` 分支是否已经启动
- `EXPO_PUBLIC_LIBRARY_SERVICE_URL` 是否正确
- 手机模拟器是否能访问本机 `8000` 端口

### 页面能开，但数据是假的

通常说明没有连上真实后端，当前走的是 fallback / mock 流程。

### 登录后又被打回登录页

通常说明：

- access token 已过期
- refresh token 不可用
- 后端地址配置错了

## 推荐的本地联调顺序

1. 切到 `service` 分支并启动后端
2. 确认 `http://127.0.0.1:8000/api/v1/health` 可访问
3. 回到当前 `app` 分支配置 `EXPO_PUBLIC_LIBRARY_SERVICE_URL`
4. 启动 Expo 并从登录、搜索、借阅三条主链路开始联调
