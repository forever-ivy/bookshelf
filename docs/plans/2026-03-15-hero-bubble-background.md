# Hero Bubble Background Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a reusable blue bubble background decoration to Home and Settings without changing the shared shell for every page.

**Architecture:** Create a page-level decorative component and thread it into `ScreenShell` through an opt-in prop so the shell stays reusable while individual routes decide whether to show the hero background. Keep the bubbles absolutely positioned behind the scroll view and above the base background.

**Tech Stack:** Expo Router, React Native, Jest, TypeScript

---

### Task 1: Add the failing tests

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/screen-shell.test.tsx`

**Step 1: Write the failing test**

Assert that `ScreenShell` renders an optional decorative background node when the new prop is provided, while still rendering its children and top overlay.

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screen-shell.test.tsx --runInBand`

Expected: FAIL because `ScreenShell` does not yet accept or render the new decorative prop.

### Task 2: Implement the reusable background

**Files:**
- Create: `/Users/Code/bookshelf-client/bookshelf-main/components/background/hero-bubble-background.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/index.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/index.tsx`

**Step 1: Build the decoration component**

Create a non-interactive background component that renders 2 to 3 translucent rounded shapes and exposes a small `variant` API for page-specific placement.

**Step 2: Extend `ScreenShell`**

Add an optional `backgroundDecoration` prop and render it in an absolute layer behind the scroll content.

**Step 3: Wire in the hero pages**

Pass the decorative background into Home and Settings, using page-appropriate variants.

### Task 3: Verify the result

**Files:**
- Test: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/screen-shell.test.tsx`

**Step 1: Run targeted test**

Run: `npx jest __tests__/screen-shell.test.tsx --runInBand`

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`

**Step 3: Run lint**

Run: `npm run -s lint`
