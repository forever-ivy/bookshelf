# Page Shell Poster Hero Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将后台 `PageShell` 改造成海报式页头排版，让标题尺寸、位置和说明文案形成更有设计感的版式层次。

**Architecture:** 保持 `PageShell` 的入参不变，只重构头图区域内部结构。通过新增稳定的测试标记来锁定标题区、说明区和状态条的存在与层次，再最小化修改布局类名和遮罩层。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Vitest, Testing Library

---

### Task 1: Update PageShell tests for poster hero structure

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.test.tsx`

**Step 1: Write the failing test**

Update the test to assert the new poster structure:

```tsx
expect(screen.getByTestId('page-shell-title-band')).toBeInTheDocument()
expect(screen.getByTestId('page-shell-meta-band')).toBeInTheDocument()
expect(screen.getByTestId('page-shell-status-chip')).toHaveTextContent('布局状态')
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/shared/page-shell.test.tsx
```

Expected: FAIL because the current `PageShell` does not yet render the poster hero structure.

**Step 3: Write minimal implementation**

Keep the updated test focused on structural markers and text visibility. Do not add behavior beyond the approved layout markers.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/shared/page-shell.test.tsx
```

Expected: PASS after Task 2 updates the component.

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/shared/page-shell.test.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "test: cover poster page shell hero"
```

### Task 2: Implement the poster hero layout

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.tsx`
- Test: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/components/shared/page-shell.test.tsx`

**Step 1: Write the failing test**

Use the updated `page-shell.test.tsx` from Task 1.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/shared/page-shell.test.tsx
```

Expected: FAIL before the layout is refactored.

**Step 3: Write minimal implementation**

Refactor the hero area to render:

```tsx
<div data-testid="page-shell-title-panel">...</div>
<div data-testid="page-shell-title-band">...</div>
<div data-testid="page-shell-meta-band">...</div>
<div data-testid="page-shell-status-chip">...</div>
```

And apply:

- larger title sizing
- lower poster-style positioning
- separate narrow description block
- soft text-area mask overlay
- responsive single-column fallback

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/Code/bookshelf/bookshelf/.worktrees/admin
npx vitest run src/components/shared/page-shell.test.tsx
npm run build
```

Expected:
- page-shell test PASS
- build exits 0

**Step 5: Commit**

```bash
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin add src/components/shared/page-shell.tsx src/components/shared/page-shell.test.tsx
git -C /Users/Code/bookshelf/bookshelf/.worktrees/admin commit -m "feat: redesign page shell hero as poster layout"
```
