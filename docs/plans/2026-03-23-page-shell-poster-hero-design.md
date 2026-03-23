# Page Shell Poster Hero Design

**Date:** 2026-03-23
**Status:** Approved for implementation
**Scope:** `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`

## Goal

将当前后台页头从普通的“左上文本堆叠”改成更有设计感的海报式排版，让标题、前导标签和描述形成明确层级与视觉落点，同时保持后台工作台的专业气质。

## Approved Direction

用户确认采用 `A` 方案：

- 标题放大并下沉到左下区域
- eyebrow 保持轻量，作为更小的前导标签
- 描述文案从标题块中拆出来，形成错位窄栏
- 背景文字区域增加柔和遮罩，保证阅读性
- 移动端自动回收到单列，不牺牲可读性

## Visual Thesis

页头应该像一张安静但有力度的海报，而不是默认组件的文字堆叠。标题块负责视觉锚点，说明块负责信息补充，两者之间通过尺寸、间距和位置错位建立节奏。

## Layout Anatomy

### Title Band

- `eyebrow` 放在标题上方，字更小、跟踪更宽
- 主标题字号明显加大，字距更紧
- 标题在桌面端靠近左下区域而不是贴顶部

### Meta Band

- 描述文案单独做成窄栏
- 在桌面端与标题块形成轻微错位
- 与状态条分层，不再与标题挤在一起

### Status Chip

- 保留状态条，但位置和呼吸感要更从容
- 作为页头底部的补充信息，而不是和标题争抢主视觉

## Constraints

- 不改现有 `PageShell` API
- 不破坏现有页面对 `title / description / statusLine / actions` 的使用方式
- 不引入额外依赖
- 保持移动端单列自然收缩

## Success Criteria

- 标题看起来更像视觉主角而不是普通模块名
- 描述和状态信息有明确层次，不再挤成一列
- `dashboard / analytics` 等页面自动获得更强设计感
- 测试通过，构建通过
