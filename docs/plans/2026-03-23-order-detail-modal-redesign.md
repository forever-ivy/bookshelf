# Order Detail Modal Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the admin order detail page as a read-focused surface with modal actions and back navigation.

**Architecture:** Keep the existing data fetching and mutation hooks in `order-detail-page.tsx`, but move each mutation flow behind a dedicated dialog. The page body becomes a display-first layout, while action buttons open focused forms for status updates, prioritization, intervention, retry, and return handling.

**Tech Stack:** React, React Router, TanStack Query, shadcn dialog primitives, Vitest, Testing Library

---

### Task 1: Restructure the order detail page

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/order-detail-page.tsx`

**Step 1: Add the new shell actions**

- Add a back link to `/orders`
- Add button triggers for the five order actions

**Step 2: Convert the page body to read-only sections**

- Keep summary cards for current statuses
- Keep summary cards for processing data
- Keep return request display, but remove inline action form fields

**Step 3: Replace inline editing with dialogs**

- Create one dialog each for:
  - status update
  - priority update
  - intervention
  - retry
  - return handling

### Task 2: Update tests for dialog-driven interactions

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/operations-pages.test.tsx`

**Step 1: Rewrite the order detail interaction test**

- Open each dialog from its button
- Fill required fields inside the dialog
- Submit and assert the same API calls as before

**Step 2: Add a back-navigation assertion**

- Assert that `返回订单列表` links to `/orders`

### Task 3: Verify the redesign

**Files:**
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/operations-pages.test.tsx`

**Step 1: Run focused tests**

Run: `cd /Users/Code/bookshelf/bookshelf/.worktrees/admin && npx vitest run src/pages/operations-pages.test.tsx`

**Step 2: Run build**

Run: `cd /Users/Code/bookshelf/bookshelf/.worktrees/admin && npm run build`
