# Inventory Information Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the inventory module into a clean hierarchy with a lightweight overview page, dedicated secondary index pages, and focused cabinet detail pages.

**Architecture:** Split the current all-in-one inventory route into route-aware surfaces: `/inventory` for overview, `/inventory/cabinets/:cabinetId` for cabinet detail, and dedicated list views for slots, records, and alerts. Keep `InventoryPage` as an orchestrator only if that stays simpler than creating many route files, but render clearly separate page modes per route and move filtering into query params.

**Tech Stack:** React, React Router, TanStack Query, existing admin API hooks, Vitest, Testing Library

---

### Task 1: Refactor inventory route structure

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/inventory-page.tsx`
- Inspect: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/layout/sidebar.tsx`

**Step 1: Remove mixed page-level tab behavior**

- Stop rendering tab-like navigation inside the main inventory workspace
- Derive page mode from pathname and query params only

**Step 2: Build the `/inventory` overview mode**

- Keep metric strip
- Keep cabinet cards
- Keep `库存调整` button and right-side sheet
- Remove slot/record/alert tables from this mode

**Step 3: Build the `/inventory/cabinets/:cabinetId` detail mode**

- Show cabinet overview only
- Add buttons for:
  - `查看位置`
  - `查看记录`
  - `查看警告`
- Each button navigates to the matching secondary page with `cabinetId` query param

### Task 2: Build dedicated secondary inventory pages

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/inventory-page.tsx`

**Step 1: Build slots mode**

- Render slots table only on `/inventory/slots`
- Read optional `cabinetId` query param
- Filter fetch or in-memory display based on current API shape

**Step 2: Build records mode**

- Render records table only on `/inventory/records`
- Respect `cabinetId` query param

**Step 3: Build alerts mode**

- Render alerts list only on `/inventory/alerts`
- Respect `cabinetId` query param when available

### Task 3: Update labels and navigation

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/inventory-page.tsx`

**Step 1: Update cabinet card CTA**

- Change `查看该书柜明细` to `查看明细`

**Step 2: Surface route context clearly**

- Add concise page titles and breadcrumbs/status lines for overview, cabinet detail, and secondary list pages

### Task 4: Update tests

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Rewrite the inventory workspace test**

- Assert `/inventory` renders metrics and cabinet cards
- Assert slot/record/alert tables are not shown in overview mode

**Step 2: Add cabinet detail assertions**

- Render `/inventory/cabinets/:cabinetId`
- Assert overview content plus jump buttons

**Step 3: Add secondary page assertions**

- Render `/inventory/slots`, `/inventory/records`, `/inventory/alerts`
- Assert each page shows only its own surface
- Assert `cabinetId` query param is honored

### Task 5: Verify

**Files:**
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Run focused inventory tests**

Run: `cd /Users/Code/bookshelf/bookshelf/.worktrees/admin && npx vitest run src/pages/management-pages.test.tsx`

**Step 2: Run build**

Run: `cd /Users/Code/bookshelf/bookshelf/.worktrees/admin && npm run build`
