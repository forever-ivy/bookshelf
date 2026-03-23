# Admin Hero Two-Line Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 admin 共享横幅统一为只有标题和说明两行的头图样式。

**Architecture:** 在共享的 `PageShell` 组件中删除分裂式文案布局与状态胶囊展示，让所有调用方自动继承新的两行结构。先修改组件测试制造失败，再以最小代码调整组件实现并运行 admin 测试验证。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library

---

### Task 1: Lock the new shared hero contract with failing tests

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.test.tsx`

**Step 1: Write the failing test**

- 更新 `PageShell` 测试，要求默认横幅只渲染标题和说明。
- 断言不再出现：
  - `page-shell-meta-band`
  - `page-shell-status-chip`
  - 默认眉标文本 `知序`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/shared/page-shell.test.tsx`

Expected: FAIL，因为当前组件仍会渲染独立说明区、状态胶囊和眉标。

### Task 2: Simplify the shared hero layout

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`

**Step 1: Write minimal implementation**

- 将标题区改成单列文案块。
- 把 `description` 始终放在标题下方渲染。
- 停止渲染 `eyebrow`、独立 meta band 和 `statusLine`。
- 保留 `actions`、背景图和内容区结构。

**Step 2: Run targeted tests to verify it passes**

Run: `npm test -- src/components/shared/page-shell.test.tsx`

Expected: PASS

### Task 3: Run regression verification for admin pages

**Files:**
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Run broader regression tests**

Run: `npm test -- src/pages/management-pages.test.tsx`

Expected: PASS，确认共享头图改动没有破坏主要管理页渲染。
