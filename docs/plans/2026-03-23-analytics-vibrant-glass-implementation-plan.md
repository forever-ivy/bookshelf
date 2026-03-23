# Analytics Vibrant Glass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 analytics 页图表换成更有活力的色板，并加入透明毛玻璃图表容器质感，同时保持现有数据展示结构和接口不变。

**Architecture:** 颜色和玻璃容器样式集中收口在共享的 `ChartContainer` 和 analytics 页的 chart config 中，避免把风格修改扩散到全站。先通过 `chart.test.tsx` 锁定玻璃容器和主题色变量，再最小化修改 analytics 图表配色映射。

**Tech Stack:** React 19, TypeScript, Vite, Recharts, Testing Library, Vitest

---

### Task 1: Add a failing test for glass chart theming

**Files:**
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.test.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.tsx`

**Step 1: Write the failing test**

Create a test that renders `ChartContainer` with a simple chart and expects:

```tsx
expect(screen.getByTestId('chart-container')).toHaveStyle('--color-series: #ff7a59')
expect(screen.getByTestId('chart-container').className).toContain('backdrop-blur')
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/ui/chart.test.tsx
```

Expected: FAIL because the current chart container does not expose the new glass-specific hooks.

**Step 3: Write minimal implementation**

Update `ChartContainer` to expose a test id and the glass surface classes while preserving existing responsive and jsdom behavior.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/ui/chart.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/ui/chart.tsx src/components/ui/chart.test.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "test: cover analytics glass chart surface"
```

### Task 2: Refresh analytics chart palette and glass treatment

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/analytics-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/ui/chart.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

Reuse the `chart.test.tsx` test from Task 1 as the red-state proof that the glass container API is missing.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/ui/chart.test.tsx
```

Expected: FAIL before implementation.

**Step 3: Write minimal implementation**

- Update chart series colors in `analytics-page.tsx` to:
  - 湖蓝 / 青绿 / 珊瑚橙 / 金黄组合
- Strengthen the chart container surface with:
  - translucent gradient background
  - stronger border highlight
  - blur and soft glow
- Keep all section titles, data labels, and analytics test text intact

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/ui/chart.test.tsx
npx vitest run src/pages/management-pages.test.tsx -t "renders analytics summaries from the new analytics endpoints"
npm run build
```

Expected:
- chart test PASS
- analytics targeted test PASS
- build exits 0

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/ui/chart.tsx src/components/ui/chart.test.tsx src/pages/analytics-page.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "feat: refresh analytics charts with vibrant glass styling"
```
