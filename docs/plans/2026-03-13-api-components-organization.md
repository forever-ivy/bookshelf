# API And Components Organization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize `lib/api` into clear sublayers and lightly group `components` by responsibility without changing app behavior.

**Architecture:** `lib/api` will be split into `core`, `contracts`, `domains`, and `react-query`, while keeping `client.ts` as the top-level aggregation entrypoint. `components` will be lightly bucketed into navigation, member, surfaces, actions, cards, base, and Expo-compat groups so the root folder stops acting like a catch-all.

**Tech Stack:** Expo Router, React Native, TypeScript, Zustand, React Query, Jest

---

### Task 1: Reorganize `lib/api` into sublayers

**Files:**
- Create: `lib/api/core/`
- Create: `lib/api/contracts/`
- Create: `lib/api/domains/`
- Create: `lib/api/react-query/`
- Move: `lib/api/http.ts` -> `lib/api/core/http.ts`
- Move: `lib/api/schemas.ts` -> `lib/api/contracts/schemas.ts`
- Move: `lib/api/types.ts` -> `lib/api/contracts/types.ts`
- Move: `lib/api/accounts.ts` -> `lib/api/domains/accounts.ts`
- Move: `lib/api/books.ts` -> `lib/api/domains/books.ts`
- Move: `lib/api/family.ts` -> `lib/api/domains/family.ts`
- Move: `lib/api/reports.ts` -> `lib/api/domains/reports.ts`
- Move: `lib/api/shelf.ts` -> `lib/api/domains/shelf.ts`
- Move: `lib/api/users.ts` -> `lib/api/domains/users.ts`
- Move: `lib/api/voice-chat.ts` -> `lib/api/domains/voice-chat.ts`
- Move: `lib/api/hooks.ts` -> `lib/api/react-query/hooks.ts`
- Modify: `lib/api/client.ts`
- Modify: all imports under `app/`, `components/`, `hooks/`, `providers/`, `stores/`, `lib/`, `__tests__/`
- Test: `__tests__/http.test.ts`
- Test: `__tests__/api-client.test.ts`
- Test: `__tests__/api-hooks.test.tsx`

**Step 1: Rewrite imports in the focused tests first**

Change test imports to the target structure:

- `@/lib/api/core/http`
- `@/lib/api/react-query/hooks`

Keep `@/lib/api/client` as the top-level client entrypoint.

**Step 2: Run the focused API tests and verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/http.test.ts __tests__/api-client.test.ts __tests__/api-hooks.test.tsx
```

Expected: FAIL because the new API paths do not exist yet.

**Step 3: Move API files into the new subfolders**

Move the files into `core/`, `contracts/`, `domains/`, and `react-query/`, then update all cross-imports.

**Step 4: Run the focused API tests and verify they pass**

Run the same command from Step 2.

Expected: PASS.

### Task 2: Lightly group the app-owned components

**Files:**
- Create: `components/actions/`
- Create: `components/base/`
- Create: `components/cards/`
- Create: `components/member/`
- Create: `components/navigation/`
- Create: `components/surfaces/`
- Move: `components/app-icon.tsx` -> `components/base/app-icon.tsx`
- Move: `components/animated-count-text.tsx` -> `components/base/animated-count-text.tsx`
- Move: `components/glass-surface.tsx` -> `components/surfaces/glass-surface.tsx`
- Move: `components/glass-action-button.tsx` -> `components/actions/glass-action-button.tsx`
- Move: `components/glass-pill-button.tsx` -> `components/actions/glass-pill-button.tsx`
- Move: `components/primary-action-button.tsx` -> `components/actions/primary-action-button.tsx`
- Move: `components/app-bottom-nav.tsx` -> `components/navigation/app-bottom-nav.tsx`
- Move: `components/floating-bottom-nav.tsx` -> `components/navigation/floating-bottom-nav.tsx`
- Move: `components/screen-shell.tsx` -> `components/navigation/screen-shell.tsx`
- Move: `components/avatar-glyph.tsx` -> `components/member/avatar-glyph.tsx`
- Move: `components/avatar-switcher.tsx` -> `components/member/avatar-switcher.tsx`
- Move: `components/member-switcher-sheet.tsx` -> `components/member/member-switcher-sheet.tsx`
- Move: `components/book-carousel-card.tsx` -> `components/cards/book-carousel-card.tsx`
- Move: `components/cabinet-status-card.tsx` -> `components/cards/cabinet-status-card.tsx`
- Move: `components/goal-progress-card.tsx` -> `components/cards/goal-progress-card.tsx`
- Modify: all imports under `app/`, `components/`, `__tests__/`
- Test: `__tests__/app-icon.test.tsx`
- Test: `__tests__/floating-bottom-nav.test.tsx`
- Test: `__tests__/glass-surface.test.tsx`
- Test: `__tests__/primary-action-button.test.tsx`

**Step 1: Rewrite focused component test imports first**

Change the focused tests and consuming components to target:

- `@/components/base/*`
- `@/components/actions/*`
- `@/components/navigation/*`
- `@/components/member/*`
- `@/components/cards/*`
- `@/components/surfaces/*`

**Step 2: Run the focused component tests and verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/app-icon.test.tsx __tests__/floating-bottom-nav.test.tsx __tests__/glass-surface.test.tsx __tests__/primary-action-button.test.tsx
```

Expected: FAIL because the new component paths do not exist yet.

**Step 3: Move the grouped app-owned components**

Perform the directory moves and update all imports in routes and components.

**Step 4: Run the focused component tests and verify they pass**

Run the same command from Step 2.

Expected: PASS.

### Task 3: Move Expo/template leftovers into a compat bucket

**Files:**
- Create: `components/expo/`
- Move: `components/external-link.tsx` -> `components/expo/external-link.tsx`
- Move: `components/haptic-tab.tsx` -> `components/expo/haptic-tab.tsx`
- Move: `components/hello-wave.tsx` -> `components/expo/hello-wave.tsx`
- Move: `components/parallax-scroll-view.tsx` -> `components/expo/parallax-scroll-view.tsx`
- Move: `components/themed-text.tsx` -> `components/expo/themed-text.tsx`
- Move: `components/themed-view.tsx` -> `components/expo/themed-view.tsx`
- Modify: `components/ui/collapsible.tsx`
- Modify: any remaining imports still pointing at the old root component paths
- Test: relevant consumers via `npm test`

**Step 1: Update any internal references to the Expo/template files**

At minimum, update `components/ui/collapsible.tsx` and any remaining direct imports.

**Step 2: Run a light verification to establish failure if needed**

Run:

```bash
npm test -- --runTestsByPath __tests__/app-icon.test.tsx __tests__/floating-bottom-nav.test.tsx
```

Expected: either PASS before move or FAIL only if an import path changed early. The main goal is to keep this step small because these files are mostly template leftovers.

**Step 3: Move the files into `components/expo/`**

Update imports after moving.

**Step 4: Run full component verification**

Run:

```bash
npm test -- --runTestsByPath __tests__/app-icon.test.tsx __tests__/floating-bottom-nav.test.tsx __tests__/glass-surface.test.tsx __tests__/primary-action-button.test.tsx
```

Expected: PASS.

### Task 4: Final cleanup and full verification

**Files:**
- Modify: any stale imports still pointing to old `lib/api/*` or `components/*` root paths
- Test: `npm test`

**Step 1: Search for stale imports**

Run:

```bash
rg -n "@/lib/api/(http|schemas|types|accounts|books|family|reports|shelf|users|voice-chat|hooks)" app components hooks providers stores lib __tests__
```

Run:

```bash
rg -n "@/components/(app-bottom-nav|floating-bottom-nav|screen-shell|avatar-glyph|avatar-switcher|member-switcher-sheet|glass-action-button|glass-pill-button|glass-surface|primary-action-button|animated-count-text|app-icon|book-carousel-card|cabinet-status-card|goal-progress-card|external-link|haptic-tab|hello-wave|parallax-scroll-view|themed-text|themed-view)" app components __tests__
```

Expected: no stale paths remaining, except deliberate top-level paths like `@/lib/api/client`.

**Step 2: Fix any remaining stale imports**

Normalize all remaining references to the new structure.

**Step 3: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS.
