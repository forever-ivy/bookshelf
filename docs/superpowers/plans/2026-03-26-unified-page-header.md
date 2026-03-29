# Unified Page Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every app page use the same minimal large-title header style, with a floating round back button only on secondary pages.

**Architecture:** Extend `PageShell` into the shared page-header primitive so every route gets the same spacing, title typography, and optional back button. Then migrate route-level hero/title blocks into that shared header and keep only content section headings inside the body.

**Tech Stack:** Expo Router, React Native, Jest, Testing Library

---

### Task 1: Shared Header Primitive

**Files:**
- Modify: `components/navigation/page-shell.tsx`
- Test: `__tests__/components/navigation/page-shell.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the test and verify the new header expectations fail**
- [ ] **Step 3: Implement the minimal shared large-title header in `PageShell`**
- [ ] **Step 4: Run the targeted test and verify it passes**

### Task 2: Route Adoption

**Files:**
- Modify: `components/search/search-screen.tsx`
- Modify: `app/(tabs)/index.tsx`
- Modify: `app/(tabs)/borrowing.tsx`
- Modify: `app/(tabs)/me.tsx`
- Modify: `app/login.tsx`
- Modify: `app/onboarding/profile.tsx`
- Modify: `app/onboarding/interests.tsx`
- Modify: `app/collections.tsx`
- Modify: `app/recommendations.tsx`
- Modify: `app/profile.tsx`
- Modify: `app/notifications.tsx`
- Modify: `app/returns.tsx`
- Modify: `app/delivery-records.tsx`
- Modify: `app/books/[bookId].tsx`
- Modify: `app/borrow/[bookId].tsx`
- Modify: `app/orders/[orderId].tsx`
- Modify: `app/marker-examples.tsx`
- Test: `__tests__/ui-shell.test.tsx`

- [ ] **Step 1: Write failing route assertions for the new shared header usage**
- [ ] **Step 2: Run the route test and verify the new assertions fail**
- [ ] **Step 3: Migrate each page’s top title block into `PageShell` props**
- [ ] **Step 4: Run the route test and verify it passes**

### Task 3: Cleanup And Verification

**Files:**
- Modify: `app/_layout.tsx` (if the global back layer becomes redundant)
- Test: `__tests__/components/navigation/global-secondary-back-layer.test.tsx` (if behavior changes)

- [ ] **Step 1: Remove any redundant global back-button behavior if the shared header now owns it**
- [ ] **Step 2: Run focused tests for navigation shell behavior**
- [ ] **Step 3: Run the final targeted UI shell suite**
