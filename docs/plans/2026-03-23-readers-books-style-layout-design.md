# Readers Books-Style Layout Design

**Date:** 2026-03-23
**Status:** Approved for implementation
**Scope:** `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/readers-page.tsx`

## Goal

把当前 `读者管理` 页面从“列表 + 常驻编辑器 + 常驻摘要”的并排结构，调整成参考 `图书管理` 的单主工作区布局，让读者列表成为唯一主舞台，编辑操作退到次级抽屉层。

## Approved Direction

用户确认采用 `books` 风格的 `A` 方案：

- 页面主体只保留一个主工作区，用于搜索和浏览读者列表
- `编辑画像` 从常驻右栏改成右侧抽屉
- 原有“读者信息”和“读者摘要”并入抽屉，作为同一编辑流的一部分
- 指标条保留，但不再和右侧两个常驻面板同时竞争注意力

## Visual Thesis

这页应该先像一个运营索引页，再像一个资料修改器。默认状态下让人先看见列表、搜索和状态分布；当需要修改某个读者时，再进入抽屉完成编辑和核对，而不是把所有次级信息永远摊在主画布上。

## Layout Anatomy

### Hero + Metrics

- 保留现有页头与指标条
- 不新增营销式文案
- 让工作重心尽快落到列表区

### Primary Workspace

- 主体只保留一个 `WorkspacePanel`
- 标题聚焦在“读者索引”
- 搜索框放进工作区 action 区域，参考 `books` 的列表工具栏
- 表格仍承担选人和进入详情的职责

### Reader Editor Drawer

- 点击 `编辑画像` 后打开右侧 `Sheet`
- 顶部显示当前读者身份信息
- 中段承载限制状态、到期时间、分群和风险标签表单
- 底部补充最近活跃、当前限制和偏好信息摘要

## Interaction Notes

- 默认不打开抽屉，降低页面初始噪音
- 若切换到别的读者并再次点击 `编辑画像`，抽屉内容跟随当前读者更新
- 保存后刷新 `readers` 查询，继续停留在当前上下文

## Constraints

- 保持现有 API 调用和数据模型不变
- 不改变 `编辑画像` 和 `查看` 两个核心动作的业务含义
- 尽量复用已有 `Sheet`、`WorkspacePanel`、`MetricStrip` 与 `DataTable`
- 用聚焦测试验证新布局，不扩散到无关页面

## Success Criteria

- 首屏不再出现三块同级大面板同时争抢注意力
- 读者列表成为唯一明显的主工作区
- 编辑动作像 `books` 一样进入次级层，节奏更清楚
- 测试能证明抽屉交互和保存行为都正常工作
