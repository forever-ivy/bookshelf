# bookleaf-main api 与 components 整理设计

## 背景

上一轮已经把 `lib` 根目录整理成了：

- `lib/api`
- `lib/app`
- `lib/presentation`

现在剩下两个明显仍然偏平铺的区域：

1. `lib/api/`
2. `components/`

### `lib/api` 的问题

当前 [`lib/api/`](/Users/Code/bookshelf-client/bookshelf-main/lib/api) 虽然目录集中，但内部职责仍然混杂：

- 传输基础设施：`http.ts`
- 协议契约：`schemas.ts`、`types.ts`
- 领域 client：`users.ts`、`shelf.ts` 等
- React Query：`hooks.ts`
- 聚合入口：`client.ts`

这些文件都平铺在同一级，后续继续扩接口时，可读性会越来越差。

### `components` 的问题

当前 [`components/`](/Users/Code/bookshelf-client/bookshelf-main/components) 同时放着：

- 导航壳层组件
- 会员相关组件
- 玻璃风表面与按钮
- 卡片/展示组件
- Expo 模板遗留组件

这类组件并不需要 feature 化重构，但确实应该做轻量职责分桶。

## 目标

在不改变页面行为的前提下：

- 深整理 `lib/api`
- 轻整理 `components`
- 控制 import churn 在可验证范围内
- 保持现有测试全部通过

## 本次采用的结构

### 1. `lib/api` 深整理

目标结构：

```text
lib/api/
  client.ts
  core/
    http.ts
  contracts/
    schemas.ts
    types.ts
  domains/
    accounts.ts
    books.ts
    family.ts
    reports.ts
    shelf.ts
    users.ts
    voice-chat.ts
  react-query/
    hooks.ts
```

#### 设计原则

- `core/` 只放传输基础设施
- `contracts/` 只放 API 契约与稳定类型
- `domains/` 只放按域拆分的 client 方法
- `react-query/` 只放 query/mutation hooks
- `client.ts` 保留为统一聚合入口，方便 app 代码继续以一个 client 消费

### 2. `components` 轻整理

这轮不做 feature 化重组，只按职责轻量分桶。

目标结构：

```text
components/
  actions/
  base/
  cards/
  expo/
  member/
  navigation/
  surfaces/
  ui/
```

#### 分桶规则

##### `components/navigation/`

放导航壳层组件：

- `app-bottom-nav.tsx`
- `floating-bottom-nav.tsx`
- `screen-shell.tsx`

##### `components/member/`

放读者/成员相关组件：

- `avatar-glyph.tsx`
- `avatar-switcher.tsx`
- `member-switcher-sheet.tsx`

##### `components/surfaces/`

放玻璃表面和视觉容器：

- `glass-surface.tsx`

##### `components/actions/`

放按钮与动作触发组件：

- `glass-action-button.tsx`
- `glass-pill-button.tsx`
- `primary-action-button.tsx`

##### `components/cards/`

放页面级展示卡片：

- `book-carousel-card.tsx`
- `cabinet-status-card.tsx`
- `goal-progress-card.tsx`

##### `components/base/`

放被多个分组复用的基础展示件：

- `app-icon.tsx`
- `animated-count-text.tsx`

##### `components/expo/`

放 Expo 模板或兼容遗留组件：

- `external-link.tsx`
- `haptic-tab.tsx`
- `hello-wave.tsx`
- `parallax-scroll-view.tsx`
- `themed-text.tsx`
- `themed-view.tsx`

`components/ui/` 保留原样。

## 为什么这样分

### `lib/api`

这次优先解决的是“技术职责边界”问题，而不是“业务 feature 边界”问题。

如果现在直接按 `member / shelf / reports` 再拆 hooks、types、schemas，会引入更多目录层级和导出复杂度。先把 `core / contracts / domains / react-query` 分开，已经足够把数据层的心智模型稳定下来。

### `components`

组件层本次只做轻量整理，不做业务域化，是为了避免：

- 页面 import 大面积震荡
- 组件 API 被顺手重写
- 把“整理目录”做成“重新设计组件”

## 不做的事

本次明确不做：

- 不把 `components` 按业务 feature 重组
- 不改组件 API
- 不新增 barrel export 泛滥
- 不调整页面行为
- 不重写现有 API client 逻辑

## 验证策略

### `lib/api`

重点验证：

- [`__tests__/http.test.ts`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/http.test.ts)
- [`__tests__/api-client.test.ts`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/api-client.test.ts)
- [`__tests__/api-hooks.test.tsx`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/api-hooks.test.tsx)

### `components`

重点验证：

- [`__tests__/app-icon.test.tsx`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/app-icon.test.tsx)
- [`__tests__/floating-bottom-nav.test.tsx`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/floating-bottom-nav.test.tsx)
- [`__tests__/glass-surface.test.tsx`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/glass-surface.test.tsx)
- [`__tests__/primary-action-button.test.tsx`](/Users/Code/bookshelf-client/bookshelf-main/__tests__/primary-action-button.test.tsx)

### 最终验证

- `npm test`

## 预期结果

整理完成后：

- `lib/api` 一眼能看出 transport、contracts、domain client、React Query 的分层
- `components` 一眼能看出导航、成员、动作、卡片、基础件、Expo 兼容件的分桶
- 后续继续扩 API 或组件时，不会再默认往单层目录里堆
