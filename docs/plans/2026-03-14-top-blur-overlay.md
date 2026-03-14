# Top Blur Overlay Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a shared blur and gradient overlay at the top of every `ScreenShell` page.

**Architecture:** Keep all page content untouched and extend `ScreenShell` with one absolute, non-interactive overlay layer. Use Expo-native visual primitives so iOS gets a real blur while tests stay deterministic through mocks.

**Tech Stack:** Expo Router, React Native, `expo-blur`, `react-native-svg`, Jest, TypeScript

---

### Task 1: Add a failing shell test

**Files:**
- Create: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/screen-shell.test.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/jest.setup.ts`

**Step 1: Write the failing test**

Assert that `ScreenShell` renders a top overlay marker and still renders its children.

**Step 2: Run test to verify it fails**

Run: `npx jest __tests__/screen-shell.test.tsx --runInBand`

**Step 3: Mock the native visual primitives needed by the shell**

Add lightweight Jest mocks for `expo-blur` and any SVG helper used by the shell test.

**Step 4: Re-run test**

Confirm failure is now specifically about the missing overlay in `ScreenShell`.

### Task 2: Implement the shared overlay

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/package.json`

**Step 1: Install the minimal blur dependency**

Run Expo install for `expo-blur`.

**Step 2: Add the overlay**

Render a top absolute container with:

- `BlurView`
- an SVG gradient layer
- fixed top height
- `pointerEvents="none"`

**Step 3: Keep layout stable**

Do not change the existing scroll container API or child rendering contract.

### Task 3: Verify

**Files:**
- Test: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/screen-shell.test.tsx`

**Step 1: Run targeted test**

Run: `npx jest __tests__/screen-shell.test.tsx --runInBand`

**Step 2: Run typecheck**

Run: `npx tsc --noEmit`

**Step 3: Run lint**

Run: `npm run -s lint`
