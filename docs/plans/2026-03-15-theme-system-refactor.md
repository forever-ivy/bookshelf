# Theme System Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the app around semantic light and dark theme tokens so shared components, primary routes, and special flows all render consistently without hardcoded color logic.

**Architecture:** Convert the existing theme file into a dual-theme token source, add a shared hook for reading the active scheme, and migrate high-leverage components before cleaning up individual routes. Keep the current layout, routing, and typography structure intact while replacing raw colors, borders, glass fills, and shadows with semantic tokens.

**Tech Stack:** Expo Router, React Native, Expo Glass Effect, Jest, TypeScript

---

### Task 1: Add failing theme-foundation tests

**Files:**
- Create: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/bookleaf-theme.test.ts`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/hero-bubble-background.test.tsx`

**Step 1: Write the failing tests**

Add tests that assert:

- the theme module exposes distinct light and dark themes
- the theme hook returns the correct palette for a mocked color scheme
- hero bubbles use stronger light-mode colors and dedicated dark-mode colors

**Step 2: Run tests to verify they fail**

Run:

```bash
npx jest __tests__/bookleaf-theme.test.ts __tests__/hero-bubble-background.test.tsx --runInBand
```

Expected: FAIL because the current theme system is still single-mode and hero bubbles are hardcoded.

### Task 2: Implement the theme foundation

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/constants/bookleaf-theme.ts`
- Create: `/Users/Code/bookshelf-client/bookshelf-main/hooks/use-bookleaf-theme.ts`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/_layout.tsx`

**Step 1: Split the theme**

Refactor the theme file to export:

- shared typography, spacing, and radii tokens
- `bookleafLightTheme`
- `bookleafDarkTheme`
- a small helper that maps a color scheme to the correct theme

**Step 2: Add the theme hook**

Create a shared hook that reads the system scheme and returns the resolved theme plus a normalized `isDark` flag.

**Step 3: Update root app chrome**

Make the status bar follow the active theme instead of staying pinned to light mode.

### Task 3: Migrate shared visual primitives

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/background/hero-bubble-background.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/actions/glass-pill-button.ios.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/cards/goal-progress-card.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/cards/cabinet-status-card.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/cards/milestone.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/member/avatar-switcher.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/components/member/avatar-glyph.tsx`

**Step 1: Refactor high-traffic components**

Replace hardcoded fills, borders, shadows, and glass colors with theme tokens.

**Step 2: Preserve platform-specific behavior**

Keep `expo-glass-effect` and other native integrations, but feed them themed values and use a dark glass scheme when appropriate.

**Step 3: Re-run focused tests**

Run the tests for the components touched so the migration stays incremental.

### Task 4: Migrate primary routes

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/index.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/index.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/reports/index.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/index.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/profile/[memberId].tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/connect.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/goal-settings.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/members.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/member-form.tsx`

**Step 1: Replace route-local literals**

Move page backgrounds, titles, helper copy, cards, and decorative accents to semantic theme tokens.

**Step 2: Keep bubble hierarchy intentional**

Ensure Home and Settings use the stronger light-mode bubbles and darker dark-mode variants without affecting other routes.

**Step 3: Verify screens still compose cleanly**

Run route-level tests where available and spot-check layout-sensitive screens.

### Task 5: Bring special flows into the same token system

**Files:**
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/scanner.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/shelf.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/store-book.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/take-book.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/app/booklist-manage.tsx`
- Modify: `/Users/Code/bookshelf-client/bookshelf-main/lib/app/navigation-transitions.ts`

**Step 1: Theme flow screens**

Apply the same semantic token layer to scanner and the task-flow routes so they stop depending on isolated one-off colors.

**Step 2: Align navigation chrome**

Update navigation appearances that still assume light mode.

**Step 3: Add or extend focused tests if behavior changes**

Only add tests where the refactor would otherwise be easy to regress.

### Task 6: Full verification

**Files:**
- Test: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/bookleaf-theme.test.ts`
- Test: `/Users/Code/bookshelf-client/bookshelf-main/__tests__/hero-bubble-background.test.tsx`
- Test: existing shared-component and route tests touched during migration

**Step 1: Run targeted Jest suites**

Run:

```bash
npx jest __tests__/bookleaf-theme.test.ts __tests__/hero-bubble-background.test.tsx __tests__/screen-shell.test.tsx __tests__/glass-buttons.test.tsx __tests__/milestone-badge.test.tsx __tests__/profile-route.test.tsx --runInBand
```

**Step 2: Run typecheck**

Run:

```bash
npx tsc --noEmit
```

**Step 3: Run lint**

Run:

```bash
npm run -s lint
```

**Step 4: Run iOS sanity build if native theme wiring changes require it**

Run:

```bash
npx expo run:ios
```
