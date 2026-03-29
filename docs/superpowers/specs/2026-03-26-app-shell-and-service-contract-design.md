# 智慧借阅 App 壳与 `service` 契约设计

**日期：** 2026-03-26

**目标：** 先在 Expo App 中锁定学生端会话、onboarding 与受保护路由，再以这套 App 契约反推 `service` 分支的后端扩展。

## 范围

本轮拆成两个子项目，但共享同一份 App 契约。

- 子项目 A：`app` 分支第一切片，收敛登录门禁、身份绑定、兴趣初始化、统一会话模型和 `lib/api/*` 归一层
- 子项目 B：`service` 分支契约补齐，扩展 `auth / readers / catalog / orders / recommendation`，新增 `favorites / booklists / notifications / achievements`

本次编码先执行子项目 A，不直接在当前工作区混写后端实现。

## 前端第一切片

### 页面流

- 冷启动先做 bootstrap
- 无 token 进入 `/login`
- 已登录且缺资料进入 `/onboarding/profile`
- 资料齐全但缺兴趣进入 `/onboarding/interests`
- 仅当 `onboarding.completed = true` 时进入 `/(tabs)`
- `books/[bookId]`、`borrow/[bookId]`、`orders/[orderId]`、`collections`、`recommendations`、`notifications`、`returns`、`delivery-records`、`profile` 等二级页都视为受保护页面

### 状态机

- `idle`：尚未尝试恢复会话
- `loading`：正在读取本地 token 并请求 `/api/v1/auth/me`
- `ready + anonymous`：无 token 或恢复失败
- `ready + authenticated + profile_pending`：缺学院、专业或年级
- `ready + authenticated + interests_pending`：资料齐全但兴趣标签未完成
- `ready + authenticated + onboarded`：允许进入 4 Tab 主壳和二级受保护页面

页面只消费 `token + identity + profile + onboarding + bootstrapStatus`，不直接消费后端裸 DTO，也不在页面里自行推导 onboarding。

### 文件边界

- `providers/app-providers.tsx`：启动期 bootstrap 与 React Query Provider
- `stores/session-store.ts`：最小会话快照与持久化 token
- `hooks/use-app-session.ts`：页面读取会话的唯一入口
- `components/navigation/app-session-gate.tsx`：统一门禁判断
- `components/navigation/protected-route.tsx`：二级页守卫封装
- `lib/api/auth.ts`：登录与 `/auth/me` 会话归一
- `lib/api/readers.ts`：读者资料读写、onboarding 推导与 profile 归一
- `hooks/use-library-app-data.ts`：查询与变更 hook，页面禁止直接发请求

## App 契约

### 会话与资料

- `SessionIdentity`
  - `accountId`
  - `profileId`
  - `role`
- `StudentProfile`
  - `id`
  - `accountId`
  - `displayName`
  - `affiliationType`
  - `college`
  - `major`
  - `gradeYear`
  - `interestTags`
  - `readingProfileSummary`
  - `onboarding`
- `OnboardingState`
  - `completed`
  - `needsProfileBinding`
  - `needsInterestSelection`

### Onboarding 推导规则

- `needsProfileBinding = !college || !major || !gradeYear`
- `needsInterestSelection = interestTags.length === 0`
- `completed = !needsProfileBinding && !needsInterestSelection`

若后端已返回 `onboarding`，前端直接采用；若未返回，统一在 `lib/api/readers.ts` 中按以上规则兜底推导。

### 登录契约

- `POST /api/v1/auth/login`
- 请求字段：
  - `identifier_type`
  - `identifier`
  - `password`
- App 端不再传 `role: reader`

### `/auth/me` 与 `/readers/me/profile`

- `GET /api/v1/auth/me` 返回完整会话快照：`account + identity + profile + onboarding`
- `GET /api/v1/readers/me/profile` 返回 `profile + onboarding`
- `PATCH /api/v1/readers/me/profile` 允许修改：
  - `display_name`
  - `college`
  - `major`
  - `grade_year`
  - `interest_tags`
  - `reading_profile_summary`

## `service` 分支最小接口面

为避免 App 在后续联调阶段回退到旧字段，本轮后端至少需要对齐以下接口形状：

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `GET|PATCH /api/v1/readers/me/profile`
- `GET /api/v1/recommendation/home-feed`
- `GET /api/v1/catalog/books/{book_id}/related`
- `GET /api/v1/orders/me/active`
- `GET /api/v1/orders/me/history`
- `GET /api/v1/orders/borrow-orders/{id}`
- `POST /api/v1/orders/borrow-orders/{id}/renew`

`favorites / booklists / notifications / achievements` 在后续子项目中补齐，但前端从本轮开始就按独立 API 域组织文件。

## 测试策略

前端第一切片优先验证“门禁与契约”：

- `AppSessionGate` 覆盖未登录、缺资料、缺兴趣、已完成 onboarding 四条主路径
- `lib/api/auth.ts` 覆盖登录请求载荷、`/auth/me` 会话归一与缺失 onboarding 的兜底逻辑
- `lib/api/readers.ts` 覆盖 profile 更新响应的归一与 onboarding 推导
- `providers/app-providers.tsx` 覆盖冷启动恢复成功与失败清理

## 交付顺序

1. 写设计文档并锁定契约
2. 写子项目 A 的实现计划
3. 按计划在 `app` 分支执行第一切片
4. 再基于同一契约为 `service` 分支编写后端实现计划
