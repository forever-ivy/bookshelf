# Admin Hero Two-Line Design

**Scope:** `/Users/Code/bookshelf/bookshelf/.worktrees/admin`

## Goal

将 `admin` 端所有顶部横幅统一为图二样式，只保留两行主信息：一行页面标题、一行页面说明，消除当前不同页面在眉标、右侧说明区和状态胶囊上的视觉分叉。

## Decision

- 统一在共享组件 [`/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`](/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx) 收口，而不是逐页分别改。
- 保留背景图、圆角、整体留白和右上角 `actions` 区，避免影响已有功能入口。
- 横幅正文改为单一文案块：
  - 第一行：`title`
  - 第二行：`description`
- `eyebrow` 与 `statusLine` 不再在横幅中展示。
- `heroLayout="split"` 与 `heroLayout="stacked"` 继续保留为兼容参数，但在视觉上统一输出为两行结构。

## Expected Result

- `dashboard / books / inventory / orders / robots / alerts / readers / recommendation / analytics / system / catalog / events / detail` 页的头部表现一致。
- 页面不再出现：
  - 左上角小眉标
  - 右侧单独说明栏
  - 底部状态胶囊
- 页面说明始终直接跟在标题下方，形成稳定的两行阅读路径。

## Verification

- 更新 `page-shell` 组件测试，验证：
  - 默认渲染时不再出现独立 meta band
  - 传入 `statusLine` 时不再展示状态胶囊
  - 传入默认 `eyebrow` 时不再展示眉标
- 运行 admin Vitest，用现有页面级测试确认共享改动没有破坏页面装载。
