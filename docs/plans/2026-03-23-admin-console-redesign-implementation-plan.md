# Admin Console Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 `/Users/Code/bookshelf/bookshelf/.worktrees/admin` 的管理后台重设计为简约、高级、统一的运营工作台，同时保留现有功能、权限和数据流。

**Architecture:** 先改全局设计系统与布局骨架，再逐页重排信息层次。功能逻辑、API 查询和权限路由保持不变，优先通过共享页面骨架、数据带、工作区容器和检视器容器实现风格统一。

**Tech Stack:** React 19, Vite, Tailwind CSS v4, Framer Motion, TanStack Query, Vitest, Testing Library

---

### Task 1: Build the New Visual Foundation

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/index.css`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/routes/app-layout.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/layout/sidebar.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/layout/topbar.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/routes/app-layout.test.tsx`

**Step 1: Write the failing test**

Add assertions that verify the upgraded shell exposes the new editorial-style structure, including:
- a calmer topbar search entry
- the sidebar nav still shows the same route labels
- the page shell renders the new metadata/status line when provided

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/routes/app-layout.test.tsx
```

Expected: FAIL because the new shell labels or status-line structure do not exist yet.

**Step 3: Write minimal implementation**

- Replace the current glassy shell with a paper-like layout system.
- Update CSS variables toward paper white, ink text, restrained blue, thinner borders, and lower shadow density.
- Refactor `Sidebar`, `Topbar`, and `PageShell` so the shared layout matches the approved design direction.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/routes/app-layout.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/admin/src/index.css .worktrees/admin/src/routes/app-layout.tsx .worktrees/admin/src/components/layout/sidebar.tsx .worktrees/admin/src/components/layout/topbar.tsx .worktrees/admin/src/components/shared/page-shell.tsx .worktrees/admin/src/routes/app-layout.test.tsx
git commit -m "feat: redesign admin shell foundation"
```

### Task 2: Introduce Shared Editorial Workspace Primitives

**Files:**
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/metric-strip.tsx`
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/workspace-panel.tsx`
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/inspector-panel.tsx`
- Create: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/section-intro.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/stat-card.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

Add a focused test that expects the dashboard or books page to render the new shared headings/data-strip semantics instead of only generic cards.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the new primitives are not yet used.

**Step 3: Write minimal implementation**

- Create reusable primitives for metric bands, grouped workspaces, and inspector-style side panels.
- Refactor `StatCard` so it behaves like a restrained data strip rather than a floating card.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/admin/src/components/shared/metric-strip.tsx .worktrees/admin/src/components/shared/workspace-panel.tsx .worktrees/admin/src/components/shared/inspector-panel.tsx .worktrees/admin/src/components/shared/section-intro.tsx .worktrees/admin/src/components/shared/stat-card.tsx .worktrees/admin/src/pages/management-pages.test.tsx
git commit -m "feat: add editorial workspace primitives"
```

### Task 3: Redesign Dashboard and Analytics

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/dashboard-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/analytics-page.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

Add tests that assert:
- dashboard shows a summary band instead of only KPI cards
- analytics shows grouped report-style sections with explicit section headings

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the current pages still use generic card grids.

**Step 3: Write minimal implementation**

- Rebuild `DashboardPage` as an operational briefing page with a summary strip, ranked content region, heatmap region, and lower snapshot band.
- Rebuild `AnalyticsPage` as a report-style layout with grouped summaries, narrative sections, and more spacious chart/data groupings.
- Keep all existing queries and data intact.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/admin/src/pages/dashboard-page.tsx .worktrees/admin/src/pages/analytics-page.tsx .worktrees/admin/src/pages/management-pages.test.tsx
git commit -m "feat: redesign dashboard and analytics pages"
```

### Task 4: Redesign Core Operations Pages

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/books-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/inventory-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/orders-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/order-detail-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/robots-page.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/operations-pages.test.tsx`

**Step 1: Write the failing test**

Add tests that verify:
- books page renders a two-zone workspace with table + inspector
- inventory page renders a cabinet/status workspace instead of stacked cards
- orders and robots pages still expose the same actionable controls after redesign

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx
```

Expected: FAIL because the new structural markers and headings do not exist yet.

**Step 3: Write minimal implementation**

- Convert `BooksPage` into an editor-style split layout.
- Convert `InventoryPage` into a cabinet operations console with strong summary strip and fewer boxed regions.
- Recompose `OrdersPage`, `OrderDetailPage`, and `RobotsPage` into workflow-first layouts, keeping all buttons and query hooks intact.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/admin/src/pages/books-page.tsx .worktrees/admin/src/pages/inventory-page.tsx .worktrees/admin/src/pages/orders-page.tsx .worktrees/admin/src/pages/order-detail-page.tsx .worktrees/admin/src/pages/robots-page.tsx .worktrees/admin/src/pages/management-pages.test.tsx .worktrees/admin/src/pages/operations-pages.test.tsx
git commit -m "feat: redesign core operations workspaces"
```

### Task 5: Redesign Governance and Planning Pages

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/alerts-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/readers-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/reader-detail-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/recommendation-page.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/system-page.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

Add tests that expect these pages to expose:
- clearer triage/planning headings
- left-right workspace composition
- preserved edit actions for readers, recommendation, and system settings

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: FAIL because the current pages still render older card-heavy layouts.

**Step 3: Write minimal implementation**

- Rebuild alerts as a triage console.
- Rebuild readers as roster + profile desk.
- Rebuild recommendation as an editorial planning studio.
- Rebuild system as a governance console with settings and roles as calmer, denser workspaces.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/pages/management-pages.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add .worktrees/admin/src/pages/alerts-page.tsx .worktrees/admin/src/pages/readers-page.tsx .worktrees/admin/src/pages/reader-detail-page.tsx .worktrees/admin/src/pages/recommendation-page.tsx .worktrees/admin/src/pages/system-page.tsx .worktrees/admin/src/pages/management-pages.test.tsx
git commit -m "feat: redesign governance and planning pages"
```

### Task 6: Final Polish, Motion, and Full Verification

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/routes/app-layout.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/index.css`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/routes/app-layout.test.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/operations-pages.test.tsx`

**Step 1: Write the failing test**

Add or tighten tests around:
- motion-safe structure labels
- route-level shell integrity
- presence of key page headings after the full redesign

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/routes/app-layout.test.tsx src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx
```

Expected: FAIL if final polish removed structural markers or broke route shell semantics.

**Step 3: Write minimal implementation**

- Add restrained motion polish.
- Normalize spacing, borders, states, and typography inconsistencies.
- Ensure mobile stacking and narrow-layout fallbacks still work.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/routes/app-layout.test.tsx src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx
npm run build
```

Expected: PASS and successful production build

**Step 5: Commit**

```bash
git add .worktrees/admin/src/routes/app-layout.tsx .worktrees/admin/src/components/shared/page-shell.tsx .worktrees/admin/src/index.css .worktrees/admin/src/routes/app-layout.test.tsx .worktrees/admin/src/pages/management-pages.test.tsx .worktrees/admin/src/pages/operations-pages.test.tsx
git commit -m "feat: polish redesigned admin console"
```

### Task 7: Final Regression Check

**Files:**
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/routes/app-layout.test.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/operations-pages.test.tsx`

**Step 1: Run focused frontend tests**

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test -- src/routes/app-layout.test.tsx src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx
```

Expected: PASS

**Step 2: Run full frontend suite**

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm test
```

Expected: PASS

**Step 3: Run production build**

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npm run build
```

Expected: PASS

**Step 4: Commit**

```bash
git add .worktrees/admin
git commit -m "test: verify redesigned admin console"
```
