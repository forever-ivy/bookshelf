# Homepage Marker Highlight Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the existing marker-highlight treatment onto three approved homepage phrases without changing homepage copy or visual structure.

**Architecture:** Reuse `MarkerHighlightText` directly in the home hero subtitle and add a narrow opt-in `descriptionHighlight` prop to `SectionTitle` so section descriptions can render either plain text or marker-highlighted text without duplicating typography styles in `index.tsx`. Cover the new homepage behavior with a focused route-level test and keep the existing shell smoke test passing.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, Jest, @testing-library/react-native

---

## File Structure

- Modify: `app/(tabs)/index.tsx`
  Purpose: apply the marker-highlight component to the approved hero and section-description phrases.
- Modify: `components/base/section-title.tsx`
  Purpose: add a narrow opt-in description highlight path while preserving the existing plain-description rendering by default.
- Create: `__tests__/app/home-route-marker-highlight.test.tsx`
  Purpose: prove the home route renders the approved highlighted phrases and that overlays appear only after `textLayout`.

### Task 1: Add Homepage Highlight Integration Coverage

**Files:**
- Create: `__tests__/app/home-route-marker-highlight.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the focused test to verify it fails**
- [ ] **Step 3: Implement the minimal homepage and `SectionTitle` changes**
- [ ] **Step 4: Re-run the focused test to verify it passes**
- [ ] **Step 5: Commit**

### Task 2: Run Regression Verification

**Files:**
- No new files unless verification exposes regressions

- [ ] **Step 1: Run the focused homepage and marker-highlight tests**
- [ ] **Step 2: Run `__tests__/ui-shell.test.tsx`**
- [ ] **Step 3: Run `npm run lint`**
- [ ] **Step 4: Commit follow-up fixes only if verification requires code changes**
