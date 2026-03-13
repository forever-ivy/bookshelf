# Lib Organization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize `bookshelf-main` shared code into clear `api`, `app`, and `presentation` layers, while moving page-only helpers out of the `lib` root without changing behavior.

**Architecture:** Keep `lib/api` as the data-access layer, introduce `lib/app` for application-shell concerns, introduce `lib/presentation` for cross-screen display logic, and move page-specific helpers next to the routes that use them. This is a structural refactor only: imports change, behavior should not.

**Tech Stack:** Expo Router, React Native, TypeScript, Zustand, React Query, Jest

---

### Task 1: Establish the target folders and move app-shell utilities

**Files:**
- Create: `lib/app/`
- Move: `lib/connection.ts` -> `lib/app/connection.ts`
- Move: `lib/query-client.ts` -> `lib/app/query-client.ts`
- Move: `lib/preview-data.ts` -> `lib/app/preview-data.ts`
- Move: `lib/session-actions.ts` -> `lib/app/session-actions.ts`
- Move: `lib/navigation.ts` -> `lib/app/navigation.ts`
- Move: `lib/navigation-transitions.ts` -> `lib/app/navigation-transitions.ts`
- Move: `lib/types.ts` -> `lib/app/types.ts`
- Modify: `app/index.tsx`
- Modify: `app/_layout.tsx`
- Modify: `app/(app)/_layout.tsx`
- Modify: `app/connect.tsx`
- Modify: `app/scanner.tsx`
- Modify: `app/(app)/settings.tsx`
- Modify: `providers/app-providers.tsx`
- Modify: `stores/session-store.ts`
- Test: `__tests__/connection.test.ts`
- Test: `__tests__/preview-data.test.ts`
- Test: `__tests__/preview-session.test.ts`
- Test: `__tests__/session-actions.test.ts`
- Test: `__tests__/session-store.test.ts`
- Test: `__tests__/session-storage.test.ts`
- Test: `__tests__/navigation-transitions.test.ts`

**Step 1: Write or adjust the failing tests**

Update the existing tests so imports point to the new app-layer paths:

- `@/lib/app/connection`
- `@/lib/app/preview-data`
- `@/lib/app/session-actions`
- `@/lib/app/navigation`
- `@/lib/app/navigation-transitions`
- `@/lib/app/types`
- `@/lib/app/query-client`

**Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/connection.test.ts __tests__/preview-data.test.ts __tests__/preview-session.test.ts __tests__/session-actions.test.ts __tests__/session-store.test.ts __tests__/session-storage.test.ts __tests__/navigation-transitions.test.ts
```

Expected: FAIL due to moved module paths not existing yet.

**Step 3: Move the app-shell files and update imports**

Implement the directory moves and update all route/provider/store imports to the new `@/lib/app/*` paths.

**Step 4: Run the targeted tests to verify they pass**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add app providers stores lib/app __tests__/connection.test.ts __tests__/preview-data.test.ts __tests__/preview-session.test.ts __tests__/session-actions.test.ts __tests__/session-store.test.ts __tests__/session-storage.test.ts __tests__/navigation-transitions.test.ts
git commit -m "refactor: group app shell utilities under lib/app"
```

### Task 2: Move presentation utilities into a dedicated layer

**Files:**
- Create: `lib/presentation/`
- Move: `lib/avatar-rendering.ts` -> `lib/presentation/avatar-rendering.ts`
- Move: `lib/createBookCover.ts` -> `lib/presentation/createBookCover.ts`
- Move: `lib/member-presentation.ts` -> `lib/presentation/member-presentation.ts`
- Move: `lib/motion.ts` -> `lib/presentation/motion.ts`
- Modify: `components/avatar-glyph.tsx`
- Modify: `components/book-carousel-card.tsx`
- Modify: `components/member-switcher-sheet.tsx`
- Modify: `components/avatar-switcher.tsx`
- Modify: `components/floating-bottom-nav.tsx`
- Modify: `components/glass-action-button.tsx`
- Modify: `components/goal-progress-card.tsx`
- Modify: `components/glass-pill-button.tsx`
- Modify: `components/animated-count-text.tsx`
- Modify: `hooks/use-cover.ts`
- Modify: `app/connect.tsx`
- Modify: `app/scanner.tsx`
- Modify: `app/(app)/home.tsx`
- Modify: `app/(app)/library.tsx`
- Modify: `app/(app)/reports.tsx`
- Modify: `app/(app)/profile/[memberId].tsx`
- Test: `__tests__/avatar-rendering.test.ts`
- Test: `__tests__/createBookCover.test.ts`
- Test: `__tests__/floating-bottom-nav.test.tsx`
- Test: `__tests__/glass-surface.test.tsx`
- Test: `__tests__/primary-action-button.test.tsx`
- Test: `__tests__/use-cover.test.tsx`
- Test: `__tests__/profile-helpers.test.ts`

**Step 1: Update imports in the affected tests first**

Change tests and affected components to use:

- `@/lib/presentation/avatar-rendering`
- `@/lib/presentation/createBookCover`
- `@/lib/presentation/member-presentation`
- `@/lib/presentation/motion`

**Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/avatar-rendering.test.ts __tests__/createBookCover.test.ts __tests__/floating-bottom-nav.test.tsx __tests__/glass-surface.test.tsx __tests__/primary-action-button.test.tsx __tests__/use-cover.test.tsx __tests__/profile-helpers.test.ts
```

Expected: FAIL because the new module paths are not in place yet.

**Step 3: Move the presentation files and update all imports**

Create `lib/presentation/`, move the files, and update all references in routes, components, and hooks.

**Step 4: Run the targeted tests to verify they pass**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add components hooks app lib/presentation __tests__/avatar-rendering.test.ts __tests__/createBookCover.test.ts __tests__/floating-bottom-nav.test.tsx __tests__/glass-surface.test.tsx __tests__/primary-action-button.test.tsx __tests__/use-cover.test.tsx __tests__/profile-helpers.test.ts
git commit -m "refactor: group shared display helpers under lib/presentation"
```

### Task 3: Move page-only helpers out of the lib root

**Files:**
- Move: `lib/home-helpers.ts` -> `app/(app)/home.helpers.ts`
- Move: `lib/profile-helpers.ts` -> `app/(app)/profile.helpers.ts`
- Move: `lib/scanner-guards.ts` -> `app/scanner.helpers.ts`
- Modify: `app/(app)/home.tsx`
- Modify: `app/(app)/profile/[memberId].tsx`
- Modify: `app/scanner.tsx`
- Test: `__tests__/home-helpers.test.ts`
- Test: `__tests__/profile-helpers.test.ts`
- Test: `__tests__/scanner-guards.test.ts`

**Step 1: Update the helper tests to import the new local paths**

Point tests at:

- `@/app/(app)/home.helpers`
- `@/app/(app)/profile.helpers`
- `@/app/scanner.helpers`

**Step 2: Run the targeted tests to verify they fail**

Run:

```bash
npm test -- --runTestsByPath __tests__/home-helpers.test.ts __tests__/profile-helpers.test.ts __tests__/scanner-guards.test.ts
```

Expected: FAIL because the helper files have not moved yet.

**Step 3: Move the helpers next to the routes that own them**

Update route imports so page-specific logic no longer lives under the shared `lib` root.

**Step 4: Run the targeted tests to verify they pass**

Run the same command from Step 2.

Expected: PASS.

**Step 5: Commit**

```bash
git add app __tests__/home-helpers.test.ts __tests__/profile-helpers.test.ts __tests__/scanner-guards.test.ts
git commit -m "refactor: colocate page-specific helpers with their routes"
```

### Task 4: Clean up API imports and verify the final dependency boundaries

**Files:**
- Modify: `lib/api/client.ts`
- Modify: `lib/api/hooks.ts`
- Modify: `lib/api/http.ts`
- Modify: `lib/api/types.ts`
- Modify: `components/app-bottom-nav.tsx`
- Modify: `components/floating-bottom-nav.tsx`
- Modify: `components/screen-shell.tsx`
- Modify any remaining files still importing removed `@/lib/*` root paths
- Test: `__tests__/api-client.test.ts`
- Test: `__tests__/api-hooks.test.tsx`
- Test: `__tests__/http.test.ts`
- Test: `npm test`

**Step 1: Search for stale imports**

Run:

```bash
rg -n "@/lib/(connection|preview-data|session-actions|navigation|navigation-transitions|types|avatar-rendering|createBookCover|member-presentation|motion|home-helpers|profile-helpers|scanner-guards)" app components hooks providers stores lib __tests__
```

Expected: any remaining hits are stale imports to fix.

**Step 2: Update the remaining imports**

Make sure all files now point to:

- `@/lib/app/*`
- `@/lib/presentation/*`
- local route helper files under `app/`
- `@/lib/api/*` only for data access

**Step 3: Run the API-focused regression tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/api-client.test.ts __tests__/api-hooks.test.tsx __tests__/http.test.ts
```

Expected: PASS.

**Step 4: Run the full test suite**

Run:

```bash
npm test
```

Expected: PASS with all suites green.

**Step 5: Commit**

```bash
git add app components hooks providers stores lib __tests__
git commit -m "refactor: clarify lib layer boundaries"
```

### Task 5: Final cleanup and developer ergonomics pass

**Files:**
- Modify: any newly awkward file names or imports discovered during refactor
- Optional Create: `lib/app/README.md`
- Optional Create: `lib/presentation/README.md`
- Test: `npm test`

**Step 1: Review the resulting tree**

Run:

```bash
find lib app -maxdepth 2 -type d | sort
```

Expected: `lib` only contains `api`, `app`, and `presentation`, while page-specific helpers sit near their routes.

**Step 2: Add lightweight directory notes if needed**

If the new boundaries are not obvious, add a short README in `lib/app/` and `lib/presentation/` explaining what belongs there.

**Step 3: Run final verification**

Run:

```bash
npm test
```

Expected: PASS.

**Step 4: Commit**

```bash
git add lib app
git commit -m "docs: document shared code boundaries"
```
