# Borrowing Favorites Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the favorites and booklist sections from the account center into a new `收藏` tab inside the borrowing route.

**Architecture:** Add one new borrowing tab key, extract the existing favorites/booklist UI into a focused shared component, and update route tests first so the migration is driven by observable behavior. Keep all existing data hooks and visual treatments intact while changing only where the content is mounted.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library

---

### Task 1: Lock the new route behavior with tests

**Files:**
- Modify: `__tests__/app/borrowing-route.test.tsx`
- Modify: `__tests__/app/me-route.test.tsx`
- Test: `__tests__/app/borrowing-route.test.tsx`
- Test: `__tests__/app/me-route.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add assertions that:
- the borrowing route renders a `收藏` tab
- tapping `收藏` reveals `收藏图书` and `书单`
- the me route no longer renders those two sections

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- --runTestsByPath __tests__/app/borrowing-route.test.tsx __tests__/app/me-route.test.tsx`
Expected: FAIL because the borrowing route does not yet expose the `收藏` tab and the me route still renders both sections.

### Task 2: Extract the shared favorites content

**Files:**
- Create: `components/favorites/favorites-tab-content.tsx`
- Modify: `components/me/me-screen-content.tsx`
- Modify: `app/(tabs)/borrowing/index.tsx`

- [ ] **Step 1: Write the minimal shared component**

Move the existing `收藏图书` and `书单` JSX, loading states, and empty states from `MeScreenContent` into a new focused component that owns:
- `useFavoritesQuery`
- `useBooklistsQuery`
- the current section ordering and card styling

- [ ] **Step 2: Wire the borrowing route to the new tab**

Extend the borrowing tab config with `收藏`, render the shared component when the new tab is active, and keep the existing `借阅` and `动态` branches unchanged.

- [ ] **Step 3: Remove the old me-route sections**

Delete the original favorites/booklist sections and any now-unused query hooks or skeleton flags from `MeScreenContent`.

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm test -- --runTestsByPath __tests__/app/borrowing-route.test.tsx __tests__/app/me-route.test.tsx`
Expected: PASS

### Task 3: Final verification

**Files:**
- Modify: none if verification passes

- [ ] **Step 1: Run the focused regression set**

Run: `npm test -- --runTestsByPath __tests__/app/borrowing-route.test.tsx __tests__/app/me-route.test.tsx __tests__/app/tab-shared-header-visibility.test.tsx`
Expected: PASS

- [ ] **Step 2: Run lint if needed for import cleanup**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 3: Note residual risk**

Call out that borrowing-tab spacing was verified in tests, but no device-level visual pass was run unless requested.
