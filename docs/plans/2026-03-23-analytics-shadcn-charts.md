# Analytics Shadcn Charts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将分析页从列表式数据展示改造成使用 shadcn 风格图表组件的分析简报页，同时保持现有 analytics API 与页面摘要信息不变。

**Architecture:** 在现有 `recharts` 依赖基础上新增一个共享图表封装组件，为图表容器、tooltip、legend 提供统一视觉样式与主题色变量。`AnalyticsPage` 仅负责把现有 7 组 analytics 接口数据映射为面积图、柱状图、环形图等版块，并继续复用现有 `MetricStrip`、`WorkspacePanel`、`PageShell`。

**Tech Stack:** React 19, Vite, TypeScript, TanStack Query, shadcn/ui 风格组件, Recharts, Vitest, Testing Library

---

### Task 1: Expand analytics page tests for chart-driven sections

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

Add expectations that assert the analytics page renders explicit chart-driven sections:

```tsx
expect(await screen.findByRole('heading', { name: '借阅趋势总览' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: '时段与留存洞察' })).toBeInTheDocument()
expect(screen.getByText('学院借阅偏好')).toBeInTheDocument()
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the current analytics page still renders old list-based section titles.

**Step 3: Write minimal implementation**

Update only the analytics test case to assert the new headings while keeping the existing data assertions.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: PASS after the page implementation is updated in Task 3.

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/pages/management-pages.test.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "test: cover analytics chart sections"
```

### Task 2: Add shared shadcn-style chart primitives

**Files:**
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.tsx`

**Step 1: Write the failing test**

Reuse the failing analytics page test from Task 1 as the red-state proof that chart infrastructure is missing from the rendered page.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the analytics page has no shared chart component and cannot render the new chart sections.

**Step 3: Write minimal implementation**

Create a chart helper module that includes:

```tsx
export type ChartConfig = Record<string, { label?: string; color?: string }>

export function ChartContainer(...) { ... }
export function ChartTooltip(...) { ... }
export function ChartTooltipContent(...) { ... }
export function ChartLegend(...) { ... }
export function ChartLegendContent(...) { ... }
```

The implementation should:
- expose CSS variables such as `--color-borrows`
- wrap `ResponsiveContainer`
- render lightweight tooltip and legend content consistent with the admin theme

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: still FAIL until Task 3 wires the page to these primitives.

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/ui/chart.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "feat: add shared analytics chart primitives"
```

### Task 3: Rebuild analytics page as a chart report

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/analytics-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.tsx`

**Step 1: Write the failing test**

Use the updated analytics page test from Task 1.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the analytics page still shows list-based content instead of chart sections.

**Step 3: Write minimal implementation**

Refactor the page into the following sections:

```tsx
<WorkspacePanel title="借阅趋势总览">...</WorkspacePanel>
<WorkspacePanel title="学院借阅偏好">...</WorkspacePanel>
<WorkspacePanel title="热门书目热度">...</WorkspacePanel>
<WorkspacePanel title="书柜周转对比">...</WorkspacePanel>
<WorkspacePanel title="机器人执行效率">...</WorkspacePanel>
<WorkspacePanel title="时段与留存洞察">...</WorkspacePanel>
```

Use:
- `AreaChart` for borrow trends
- horizontal `BarChart` for college preferences and cabinet turnover
- `BarChart` for popular books and time peaks
- `RadialBarChart` for robot efficiency and retention rate

Keep all query hooks, loading state, empty state, top summary metrics, and key labels such as `信息学院`, `75%`, and `cabinet-001`.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: PASS with the new chart headings and existing data text still visible.

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/ui/chart.tsx src/pages/analytics-page.tsx src/pages/management-pages.test.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "feat: visualize analytics with shadcn charts"
```
