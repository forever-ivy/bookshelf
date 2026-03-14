# Milestone Badge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render profile milestones as icon-above-label badge tiles using the local milestone PNG assets.

**Architecture:** Create one reusable milestone badge component that owns asset lookup, label formatting, and halo styling. Replace the inline badge chip markup in the profile page with this component so badge presentation is centralized.

**Tech Stack:** Expo Router, React Native, `expo-image`, Jest, TypeScript

---

### Task 1: Add a failing milestone badge test

**Files:**
- Create: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/milestone-badge.test.tsx`

**Step 1: Write the failing test**

Assert that a known badge key renders:

- a halo wrapper
- an image
- a centered label beneath the image

Also assert an unknown key still renders a fallback label.

**Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/milestone-badge.test.tsx --runInBand`

### Task 2: Implement the badge component

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/cards/milestone.tsx`

**Step 1: Replace the incomplete placeholder file**

Turn `components/cards/milestone.tsx` into a real exported component.

**Step 2: Add badge metadata**

Map known badge keys to:

- local PNG asset
- short Chinese label

**Step 3: Render the vertical tile**

Create:

- halo wrapper
- icon container
- image
- centered label

### Task 3: Use the new badge in the profile page

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/profile/[memberId].tsx`

**Step 1: Replace inline chip markup**

Render the new `MilestoneBadge` component inside the badge list.

**Step 2: Adjust list spacing if needed**

Keep the wrapped grid balanced once the tiles become taller.

### Task 4: Verify

**Files:**
- Test: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/milestone-badge.test.tsx`

**Step 1: Run targeted test**

Run: `npx jest __tests__/milestone-badge.test.tsx --runInBand`

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`

**Step 3: Run lint**

Run: `npm run -s lint`
