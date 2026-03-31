# Homepage Time-Based Greeting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the home route's single-line title with a time-based two-line greeting that uses a lightweight editorial layout and the signed-in user's display name.

**Architecture:** Extend `PageShell` with an optional custom header slot so the shell still owns spacing and back-button layout, while `HomeRoute` owns the greeting composition and time/name formatting. Update focused home-route tests first, then implement the smallest shell and route changes needed to satisfy them.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library

---

### Task 1: Cover the new home header behavior

**Files:**
- Modify: `__tests__/app/home-route-marker-highlight.test.tsx`
- Modify: `__tests__/ui-shell.test.tsx`
- Test: `__tests__/app/home-route-marker-highlight.test.tsx`
- Test: `__tests__/ui-shell.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add assertions that the home route:
- shows the correct time-based greeting for a mocked afternoon clock
- shows the user's display name on its own line
- no longer renders `今晚路径`
- falls back to `同学` when `profile.displayName` is missing

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm test -- --runTestsByPath __tests__/app/home-route-marker-highlight.test.tsx __tests__/ui-shell.test.tsx`
Expected: FAIL because the current home header still renders `今晚路径` and has no custom greeting slot.

- [ ] **Step 3: Commit the failing test state if desired**

Optional checkpoint only if the repo workflow wants a red-state commit.

### Task 2: Add a custom `PageShell` header slot

**Files:**
- Modify: `components/navigation/page-shell.tsx`
- Test: `__tests__/components/navigation/page-shell.test.tsx`

- [ ] **Step 1: Write the failing shell test**

Add a test that renders `PageShell` with `headerContent` and verifies the custom node appears while existing children still render.

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/navigation/page-shell.test.tsx`
Expected: FAIL because `headerContent` does not exist yet.

- [ ] **Step 3: Write the minimal shell implementation**

Update `PageShell` to accept `headerContent?: React.ReactNode`, render it in the existing header block, and keep the current `headerTitle` / `headerDescription` behavior unchanged for callers that do not pass the new prop.

- [ ] **Step 4: Run the shell test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/navigation/page-shell.test.tsx`
Expected: PASS

### Task 3: Implement the home greeting

**Files:**
- Modify: `app/(tabs)/index.tsx`
- Test: `__tests__/app/home-route-marker-highlight.test.tsx`
- Test: `__tests__/ui-shell.test.tsx`

- [ ] **Step 1: Write the minimal implementation**

In `HomeRoute`:
- derive the greeting from the current hour
- derive the display name from `useAppSession().profile?.displayName`, trimmed with `同学` fallback
- build an editorial two-line header with a thin divider
- pass it via `PageShell headerContent`

- [ ] **Step 2: Run the targeted tests to verify they pass**

Run: `npm test -- --runTestsByPath __tests__/components/navigation/page-shell.test.tsx __tests__/app/home-route-marker-highlight.test.tsx __tests__/ui-shell.test.tsx`
Expected: PASS

- [ ] **Step 3: Refine styling only if needed**

Keep the visual treatment minimal: no heavy card, no extra helper copy, just spacing, hierarchy, and one light accent line.

### Task 4: Final verification

**Files:**
- Modify: none if all tests pass

- [ ] **Step 1: Run the full focused verification set**

Run: `npm test -- --runTestsByPath __tests__/components/navigation/page-shell.test.tsx __tests__/app/home-route-marker-highlight.test.tsx __tests__/app/home-quick-actions.test.tsx __tests__/ui-shell.test.tsx`
Expected: PASS

- [ ] **Step 2: Summarize any residual risk**

Call out that the greeting uses client local time and that broader route coverage was not rerun unless needed.
