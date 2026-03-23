# Inventory Information Architecture Design

**Date:** 2026-03-23

## Goal

把库存模块从“一个页面里混合总览、二级目录和书柜详情”的结构，重构成更清楚的三级关系：

- 一级页 `/inventory` 只做总览和书柜入口
- 二级页 `/inventory/slots`、`/inventory/records`、`/inventory/alerts` 做独立目录
- 书柜详情页 `/inventory/cabinets/:cabinetId` 只展示书柜概览，并跳去带过滤条件的二级目录

## Current Problems

当前库存模块虽然已经有多个路径，但仍然共用同一个页面组件，导致：

- 一级页同时承担总览、筛选、表格和详情职责
- “书柜 / 位置 / 记录 / 警告”看起来像页内 tab，不像真正的目录层级
- 书柜详情和总览混在一起，路径感不明确
- 库存调整入口和浏览路径缠在一起

## Decision

采用 “总览页 + 独立目录页 + 书柜详情页” 的信息架构。

### 1. 一级页 `/inventory`

只保留：

- 总览指标
- 书柜卡片列表
- `库存调整` 按钮

移除：

- 位置明细表
- 记录表
- 警告列表
- 页内 tab 式切换

书柜卡片按钮文案统一为 `查看明细`。

### 2. 二级目录页

以下路径变成真正的独立目录页：

- `/inventory/slots`
- `/inventory/records`
- `/inventory/alerts`

这些页面支持通过 `cabinetId` 查询参数做过滤：

- `/inventory/slots?cabinetId=...`
- `/inventory/records?cabinetId=...`
- `/inventory/alerts?cabinetId=...`

### 3. 书柜详情页 `/inventory/cabinets/:cabinetId`

书柜详情页只展示该书柜的概览信息：

- 书柜名称
- 位置
- 状态
- 位置数
- 可借库存
- 待处理警告

同时提供 3 个明确跳转按钮：

- `查看位置`
- `查看记录`
- `查看警告`

这些按钮分别跳去对应的二级目录页，并自动带上当前书柜的过滤条件。

## Interaction Rules

- `库存调整` 仍然保留为独立动作按钮
- 调整面板仍使用右侧抽屉
- 调整按钮位于一级页 `/inventory`
- 浏览路径和调整路径分开，不再混用

## Routing Rules

- `/inventory`
  - 总览页
- `/inventory/cabinets/:cabinetId`
  - 书柜详情页
- `/inventory/slots`
  - 位置目录页
- `/inventory/records`
  - 记录目录页
- `/inventory/alerts`
  - 警告目录页

过滤通过查询参数承载，而不是继续加深嵌套路由。

## UI Direction

### 一级页

- 重点放在总览指标和书柜卡片
- 页面尽量轻，不再引入大块表格
- `库存调整` 是独立动作按钮，不抢书柜浏览流程

### 二级目录页

- 每页只做一件事
- 页头显示当前目录和过滤状态
- 表格是页面主体

### 书柜详情页

- 先给出概览卡
- 再给出三条跳转入口
- 不在详情页内塞表格

## Testing Impact

需要更新库存页测试，覆盖：

- `/inventory` 只显示总览与书柜卡片
- 书柜卡片点击 `查看明细` 后跳转到 `/inventory/cabinets/:cabinetId`
- 二级目录页能够独立渲染
- 带 `cabinetId` 查询参数时能正确过滤
- `库存调整` 按钮仍能打开右侧抽屉
