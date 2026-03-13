# bookleaf-main lib 目录整理设计

## 背景

当前 [`lib/`](/Users/Code/bookshelf-client/bookshelf-main/lib) 已经自然分成两类内容：

- 数据访问层：[`lib/api/`](/Users/Code/bookshelf-client/bookshelf-main/lib/api)
- 杂项根目录：导航、连接、预览数据、动画、展示 helper、页面级 helper

真正的问题不在 `api`，而在 `lib` 根目录逐渐变成“通用抽屉”：

- 跨页面的基础能力和单页面 helper 混在一起
- 应用壳层逻辑和展示逻辑没有边界
- `lib/types.ts` 这样的兜底文件容易继续膨胀
- 后续继续重构 API 或导航时，很容易顺手碰到不相关代码

## 目标

在不改变页面行为的前提下，把 `bookshelf-main` 的公共代码按层整理为清晰边界：

- `api`：只负责远程数据访问和 React Query
- `app`：只负责应用壳层能力
- `presentation`：只负责跨页面展示逻辑
- 页面专属 helper：从 `lib` 中移走，靠近对应页面

## 本次采用的整理方向

采用“中度整理”：

- 允许批量改 import
- 允许顺手理顺 `hooks/`、`stores/`、`providers/` 等边界
- 不做按业务 feature 的大拆分
- 不引入新的架构层级复杂度

## 目标结构

建议整理后的主结构：

```text
bookshelf-main/
  app/
  components/
  hooks/
  providers/
  stores/
  lib/
    api/
    app/
    presentation/
```

### 1. `lib/api/`

保留为数据访问层，不承担 UI 和应用壳层职责。

保留内容：

- `api/http.ts`
- `api/schemas.ts`
- `api/types.ts`
- `api/client.ts`
- `api/hooks.ts`
- `api/users.ts`
- `api/shelf.ts`
- `api/books.ts`
- `api/family.ts`
- `api/accounts.ts`
- `api/reports.ts`
- `api/voice-chat.ts`

### 2. `lib/app/`

承载应用级但不属于 UI 展示的能力。

建议迁入：

- `connection.ts`
- `query-client.ts`
- `preview-data.ts`
- `session-actions.ts`
- `navigation.ts`
- `navigation-transitions.ts`
- `types.ts` 中仅与导航壳层相关的类型

整理后，`lib/app/` 负责：

- 连接 profile
- 预览模式数据
- QueryClient 创建
- 路由和导航配置
- 应用壳层类型

### 3. `lib/presentation/`

承载跨页面复用、但偏展示语义的逻辑。

建议迁入：

- `avatar-rendering.ts`
- `createBookCover.ts`
- `member-presentation.ts`
- `motion.ts`

整理后，`presentation` 负责：

- 头像展示规则
- 书封面回退策略
- 成员展示文案/色彩
- 动画 token 与 motion preset

### 4. 页面专属 helper 不再放在 `lib/`

这批文件本质上不是通用库，而是页面流程辅助逻辑。

建议迁移：

- `home-helpers.ts`
- `profile-helpers.ts`
- `scanner-guards.ts`

迁移原则：

- 如果只服务一个页面，移动到该页面附近
- 如果只服务一个路由簇，可移动到该路由簇目录下的本地 helper 文件
- 不再留在 `lib` 根目录伪装成“公共能力”

## 文件归位建议

### 保留原位

- [`lib/api/client.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/api/client.ts)
- [`lib/api/hooks.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/api/hooks.ts)
- [`lib/api/http.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/api/http.ts)
- [`lib/api/schemas.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/api/schemas.ts)
- [`lib/api/types.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/api/types.ts)
- 其余 `lib/api/*`

### 移动到 `lib/app/`

- [`lib/connection.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/connection.ts)
- [`lib/query-client.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/query-client.ts)
- [`lib/preview-data.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/preview-data.ts)
- [`lib/session-actions.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/session-actions.ts)
- [`lib/navigation.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/navigation.ts)
- [`lib/navigation-transitions.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/navigation-transitions.ts)
- [`lib/types.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/types.ts)

### 移动到 `lib/presentation/`

- [`lib/avatar-rendering.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/avatar-rendering.ts)
- [`lib/createBookCover.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/createBookCover.ts)
- [`lib/member-presentation.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/member-presentation.ts)
- [`lib/motion.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/motion.ts)

### 移出 `lib/` 根目录

- [`lib/home-helpers.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/home-helpers.ts)
- [`lib/profile-helpers.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/profile-helpers.ts)
- [`lib/scanner-guards.ts`](/Users/Code/bookshelf-client/bookshelf-main/lib/scanner-guards.ts)

## 迁移边界

本次只做整理，不做额外架构扩展：

- 不把 `api` 改成 feature-first
- 不引入 barrel export 作为强依赖
- 不在本次把 `components/` 再二次重构
- 不改页面行为、不改数据契约

## 迁移顺序

建议按风险从低到高推进：

1. 先创建 `lib/app/` 和 `lib/presentation/`
2. 先迁移“被动依赖较少”的基础文件
3. 再批量更新 import
4. 再迁页面专属 helper
5. 最后跑全量 Jest 验证

## 风险点

### 1. import 路径回归

这次主要风险不是业务逻辑，而是 import 漏改和别名路径错误。

### 2. 页面级 helper 归属不清

`home/profile/scanner` 这三类 helper 如果还放在 `lib`，后面还是会继续失控；但迁移时要避免把真正跨页面的函数错搬走。

### 3. 预览模式与 session 依赖链

`preview-data -> connection -> stores/session-store` 是一条真实依赖链，迁移时要确保没有形成循环引用。

## 验证方式

至少需要覆盖：

- `npm test`
- 连接页、扫码页、首页、书库页、报告页 import 正常
- 预览模式仍能工作
- React Query provider 和 session store 仍能正常组装

## 最终效果

整理完成后，`bookshelf-main` 的公共代码边界会更清楚：

- `api` 只管远程数据
- `app` 只管应用壳层
- `presentation` 只管跨页面展示逻辑
- 页面私有 helper 回到页面附近

这样后面无论继续整理网络层、导航层，还是做页面演进，都不会再让 `lib` 根目录持续膨胀。
