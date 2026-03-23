# Analytics Vibrant Glass Design

**Date:** 2026-03-23
**Status:** Approved for implementation
**Scope:** `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/analytics-page.tsx`, `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.tsx`

## Goal

在不改变分析页信息结构与接口契约的前提下，把当前偏克制的图表配色升级成更有活力的运营色板，并为图表容器加入透明毛玻璃质感，让 analytics 页面更有视觉能量，但仍然保持后台工作台的专业气质。

## Approved Direction

用户确认采用 `B` 方案：

- 色板更鲜明
- 图表区域具备透明毛玻璃质感
- 保留当前浅底后台基调
- 仅调整 analytics 图表层，不把整站做成高饱和看板

## Visual Thesis

以浅色纸感底作为稳定背景，把图表本身提升为更有节奏感的观察对象。颜色承担“区分数据类型”和“提升页面生命力”的职责，容器承担“轻透明、轻高光、轻模糊”的玻璃面板职责。

## Color Direction

采用一组更活跃但仍偏产品化的图表色：

- 湖蓝：趋势主线、核心指标
- 青绿：偏好、效率、正向分布
- 珊瑚橙：热度、活跃度、风险较高的关注项
- 金黄：预测分、周转、次强调

这些颜色仅用于图表系列，不替换全局主色。

## Surface Direction

图表容器从“浅色平面框”升级为“玻璃观察窗”：

- 半透明白雾渐变底
- 轻微 backdrop blur
- 更亮的高光边线
- 柔和的内阴影和下投影
- 图表填充使用透明渐变，不使用厚重纯色块

## Chart Mapping

- 借阅趋势：湖蓝到青色的透明面积渐变
- 学院偏好：青绿色横向柱图
- 热门书目：珊瑚橙柱图 + 金黄折线
- 书柜周转：暖金柱图
- 机器人效率：蓝 / 绿 / 橙多色环形
- 留存率：亮青环形

## Constraints

- 不改 API、不改查询逻辑
- 不调整 analytics 页面布局结构
- 不全局替换后台主题 token
- 保持现有 analytics 文本断言仍然成立

## Success Criteria

- analytics 图表一眼看上去比当前更有活力
- 图表容器具备明显但克制的毛玻璃感
- 页面仍然属于后台工作台，而不是营销化视觉
- 定向测试通过，构建通过
