# PageShell Keyboard Title Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide the "找书" page title while the keyboard is visible, without replacing the native search bar.

**Architecture:** Add an opt-in `PageShell` prop that listens to keyboard visibility and resolves whether the header title should render. Then enable that prop only for the normal search route and verify both the shared shell behavior and the integrated route behavior with focused tests.

**Tech Stack:** Expo Router, React Native Keyboard API, Jest, Testing Library

---

### Task 1: Shared PageShell Keyboard Visibility Toggle

**Files:**
- Modify: `components/navigation/page-shell.tsx`
- Test: `__tests__/components/navigation/page-shell.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the PageShell test and verify the keyboard-title assertions fail**
- [ ] **Step 3: Implement the minimal `hideHeaderTitleWhenKeyboardVisible` prop in `PageShell`**
- [ ] **Step 4: Re-run the PageShell test and verify it passes**

### Task 2: Search Route Adoption

**Files:**
- Modify: `components/search/search-screen.tsx`
- Test: `__tests__/ui-shell.test.tsx`

- [ ] **Step 1: Write the failing search-route test for keyboard-driven title hiding**
- [ ] **Step 2: Run the UI shell test and verify the new search assertions fail**
- [ ] **Step 3: Enable the new `PageShell` prop for the normal search route only**
- [ ] **Step 4: Re-run the UI shell test and verify it passes**

### Task 3: Final Focused Verification

**Files:**
- Test: `__tests__/components/navigation/page-shell.test.tsx`
- Test: `__tests__/ui-shell.test.tsx`
- Test: `__tests__/app-providers.test.tsx`

- [ ] **Step 1: Run the focused PageShell test suite**
- [ ] **Step 2: Run the focused UI shell test suite**
- [ ] **Step 3: Run the focused provider/navigation-theme suite to confirm no regression around the native search container**
