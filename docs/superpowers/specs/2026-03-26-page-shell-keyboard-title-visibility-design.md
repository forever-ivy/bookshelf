# `PageShell` 键盘显隐标题设计

**日期：** 2026-03-26

**目标：** 在保留原生搜索框体验的前提下，让“找书”页在键盘弹起时隐藏页头标题“找书”，键盘收起后恢复显示，并把这套行为沉淀为 `PageShell` 的可复用能力。

## 背景

当前“找书”页使用 `Stack.SearchBar` 提供原生搜索框，用户明确希望保留这套原生交互。但在输入时，页头标题“找书”会继续占据可视空间，导致搜索状态下的垂直空间被挤压，视觉焦点也不够集中。

因此本轮不改搜索框实现，不回退到自定义输入框，而是在壳层组件里补一个“键盘显示时隐藏标题”的可选能力，再由“找书”页按需启用。

## 范围

- 包含：
  - 为 `PageShell` 新增键盘显隐标题开关
  - 让普通“找书”页启用该开关
  - 覆盖键盘弹起与收起的回归测试
- 不包含：
  - 改动原生 `Stack.SearchBar` 的实现方式
  - 改动“立即可借”页底部悬浮搜索条
  - 批量改动其他页面标题行为

## 方案选择

本轮采用用户确认的方案 2：在 `PageShell` 增加通用开关，由页面决定是否启用。

不采用“只在 `SearchScreen` 内硬编码隐藏标题”的原因：

- 行为会散落在页面组件中，不利于后续别的页面复用
- 页头展示规则本来就属于壳层职责，放在 `PageShell` 更符合边界

不采用“直接压缩标题样式高度”的原因：

- 标题节点仍然存在，只是视觉隐藏，容易留下空白或无障碍歧义
- 与现有 `PageShell` 的条件渲染模式不一致

## 组件设计

### `PageShell`

新增可选 prop：

- `hideHeaderTitleWhenKeyboardVisible?: boolean`

行为规则：

- 默认值为 `false`
- 当值为 `true` 时，`PageShell` 监听键盘显示状态
- 键盘显示时，仅隐藏 `headerTitle`
- 键盘收起后，恢复 `headerTitle`
- `showBackButton` 不受影响
- `headerDescription` 本轮保持原行为，不额外隐藏

原因：

- 用户当前只要求隐藏“找书”几个字
- 仅隐藏标题可以把行为收敛到最小，不影响其他页面已有描述文案

### “找书”页接入

`components/search/search-screen.tsx` 中：

- 普通搜索模式继续保留 `Stack.SearchBar`
- 向 `PageShell` 传入 `hideHeaderTitleWhenKeyboardVisible={true}`
- `borrowNowMode` 保持现状，不启用该开关

这样可以确保：

- 普通“找书”页键盘弹起时隐藏标题
- “立即可借”页仍然保留当前标题与返回按钮逻辑

## 渲染规则

`PageShell` 的头部存在性改为两层判断：

- 头部容器是否渲染：由“是否还有可见头部内容”决定
- 标题文本是否渲染：由 `headerTitle` 与键盘状态共同决定

建议使用以下推导：

- `isKeyboardVisible`
- `resolvedHeaderTitle = hideHeaderTitleWhenKeyboardVisible && isKeyboardVisible ? undefined : headerTitle`
- `hasHeader = Boolean(resolvedHeaderTitle || headerDescription || showBackButton)`

这样可以避免标题隐藏后仍然保留无意义的标题占位。

## 文件边界

- `components/navigation/page-shell.tsx`
  - 新增键盘监听与标题显示推导
- `components/search/search-screen.tsx`
  - 为普通“找书”模式启用壳层开关
- `__tests__/components/navigation/page-shell.test.tsx`
  - 增加壳层级别的键盘显隐测试
- `__tests__/ui-shell.test.tsx`
  - 增加“找书”页接入测试，验证标题会随键盘隐藏与恢复

## 测试策略

优先覆盖两层：

### 壳层级测试

- 默认情况下，`PageShell` 不受键盘事件影响
- 当 `hideHeaderTitleWhenKeyboardVisible = true` 时：
  - 初始显示标题
  - 模拟键盘显示事件后标题消失
  - 模拟键盘隐藏事件后标题恢复
- 若 `showBackButton = true`，键盘弹起时返回按钮仍然存在

### 页面级测试

- 普通“找书”页启用了该开关
- 触发原生搜索栏输入聚焦相关键盘事件后：
  - “找书”标题消失
  - 搜索结果列表仍存在
- 键盘隐藏后：
  - “找书”标题恢复

## 风险与控制

- 风险：键盘监听在不同平台事件名不一致
  - 控制：使用 React Native `Keyboard` 的 show/hide 事件，并在测试里直接模拟事件分发
- 风险：标题消失后留下顶部空白
  - 控制：让 `hasHeader` 基于“可见内容”重新计算，而不是仅基于原始 `headerTitle`
- 风险：误伤其他页面
  - 控制：prop 默认关闭，仅“找书”页显式启用

## 交付顺序

1. 在 `PageShell` 中加入键盘显隐标题开关
2. 为普通“找书”页接入该开关
3. 补齐壳层与页面回归测试
4. 手动验证原生搜索框、标题显隐和返回按钮行为
