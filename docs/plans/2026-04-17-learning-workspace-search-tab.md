# Learning Workspace Search Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the learning workspace `study` tab into a native search-style tab and move user message input from the footer composer into the system search bar.

**Architecture:** Keep the learning workspace on `NativeTabs`, but make `study` the last tab with `role="search"` so iOS can render the native search-tab treatment. Refactor the `study` route into a nested stack route so it can own `headerSearchBarOptions`, push draft/search submission through the existing learning workspace provider, and remove the duplicated footer input while preserving guide/explore actions and suggestion chips in page content.

**Tech Stack:** Expo Router NativeTabs, Expo Router Stack, React Native, TypeScript, Jest, React Query, Zustand

---

### Task 1: Lock the new native tab contract in tests

**Files:**
- Modify: `__tests__/app/learning-workspace-tabs-layout.test.tsx`

**Step 1: Write the failing test**

Assert that the learning workspace tabs still register `study`, `graph`, and `review`, but that `study` is rendered with the native `search` role and appears after the other two tabs.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-tabs-layout.test.tsx`

Expected: FAIL because the current layout keeps `study` as a regular first tab.

**Step 3: Write minimal implementation**

Update `app/learning/[profileId]/(workspace)/_layout.tsx` to move `study` to the end and set `role="search"` on that trigger.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-tabs-layout.test.tsx`

Expected: PASS

### Task 2: Lock native header search behavior for the study route

**Files:**
- Modify: `__tests__/app/learning-workspace-routes.test.tsx`
- Create: `app/learning/[profileId]/(workspace)/study/_layout.tsx`
- Create: `app/learning/[profileId]/(workspace)/study/index.tsx`
- Delete: `app/learning/[profileId]/(workspace)/study.tsx`

**Step 1: Write the failing test**

Add a route test that renders the learning workspace study route and expects:
- a native search bar placeholder that matches the current guide/explore prompts
- no footer composer placeholder rendered in the page body
- typing into the native search bar updates provider draft state and search submission streams the reply through `handleSend`

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx`

Expected: FAIL because the current route still renders `LearningComposer` in the footer and does not expose a stack search bar.

**Step 3: Write minimal implementation**

Refactor `study.tsx` into `study/index.tsx`, add `study/_layout.tsx` with a nested `Stack`, wire `headerSearchBarOptions` to `draft`, `setDraft`, and `handleSend`, and remove the footer input from the page.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx`

Expected: PASS

### Task 3: Preserve study actions after removing the footer composer

**Files:**
- Modify: `app/learning/[profileId]/(workspace)/study/index.tsx`
- Modify: `__tests__/app/learning-workspace-routes.test.tsx`

**Step 1: Write the failing test**

Add/adjust route assertions so `转去 Explore 深挖`, `收编到当前步骤`, and prompt suggestions remain visible and actionable in the study page body after the footer composer is removed.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx`

Expected: FAIL because the current UI couples these controls to the footer composer.

**Step 3: Write minimal implementation**

Extract the non-input controls from the old composer into inline chips/actions near the study rail so the workflow remains intact without a second visible input field.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-routes.test.tsx`

Expected: PASS

### Task 4: Clean up scaffolding and verify focused suites

**Files:**
- Modify: `components/learning/learning-workspace-scaffold.tsx`
- Modify: `__tests__/components/learning-workspace-scaffold.test.tsx`
- Modify: any imports affected by the `study/index.tsx` refactor

**Step 1: Remove now-unused footer assumptions**

Keep the scaffold footer optional for graph/review, but stop assuming the study route always needs a footer-mounted input.

**Step 2: Run focused verification**

Run: `npm test -- --runInBand __tests__/app/learning-workspace-tabs-layout.test.tsx __tests__/app/learning-workspace-routes.test.tsx __tests__/components/learning-workspace-scaffold.test.tsx __tests__/lib/learning-workspace.test.ts __tests__/api/learning-contract.test.ts`

Expected: PASS

**Step 3: Commit**

```bash
git add docs/plans/2026-04-17-learning-workspace-search-tab.md app/learning/[profileId]/(workspace)/_layout.tsx app/learning/[profileId]/(workspace)/study __tests__/app/learning-workspace-tabs-layout.test.tsx __tests__/app/learning-workspace-routes.test.tsx components/learning/learning-workspace-scaffold.tsx __tests__/components/learning-workspace-scaffold.test.tsx
git commit -m "feat: move learning workspace input into native search tab"
```
