# Homepage Marker Highlight Current Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the approved marker-highlight treatment to three visible phrases on the current simplified home route without restoring removed body copy.

**Architecture:** Reuse `MarkerHighlightText` directly inside the existing quick action, learning-focus, and recommendation text nodes. Keep the change local to `app/(tabs)/index.tsx`, and protect it with a focused home-route integration test that fires `textLayout` on the highlighted substrings.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, Jest, @testing-library/react-native

---

## File Structure

- Modify: `app/(tabs)/index.tsx`
  Purpose: replace three specific `Text` nodes with `MarkerHighlightText`.
- Create: `__tests__/app/home-route-marker-highlight.test.tsx`
  Purpose: prove the three homepage overlays appear only after layout for the selected phrases.

### Task 1: Add Homepage Highlight Coverage

**Files:**
- Create: `__tests__/app/home-route-marker-highlight.test.tsx`

- [ ] **Step 1: Write the failing integration test**
- [ ] **Step 2: Run it and confirm it fails before implementation**
- [ ] **Step 3: Implement the minimal homepage highlight changes**
- [ ] **Step 4: Re-run the focused test and confirm it passes**

### Task 2: Verify The Merge Working Tree

**Files:**
- No new files unless verification surfaces a regression

- [ ] **Step 1: Run focused marker-highlight and homepage tests**
- [ ] **Step 2: Run `npm test -- --runInBand`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: Leave the merge uncommitted**
