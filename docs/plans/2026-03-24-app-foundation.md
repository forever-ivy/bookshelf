# App Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a clean Expo Router foundation on `app` using the same dependency stack as `ziggy/app-auth`, without carrying any UI or feature logic.

**Architecture:** Copy the stable configuration surface from `ziggy/app-auth`, then replace runtime code with a minimal router shell plus a lightweight provider layer. Keep shared directories in place now so future work can add features without reshaping the project.

**Tech Stack:** Expo 55, Expo Router, React 19, React Native 0.83, TypeScript, Jest, React Query, Zustand, ESLint

---

### Task 1: Add planning docs

**Files:**
- Create: `docs/plans/2026-03-24-app-foundation-design.md`
- Create: `docs/plans/2026-03-24-app-foundation.md`

**Step 1: Write the approved design**

Save the agreed scaffold scope, non-goals, and verification strategy to the design doc.

**Step 2: Write the implementation plan**

Document the exact file set, dependency strategy, and verification steps for the scaffold.

### Task 2: Create a failing foundation test

**Files:**
- Create: `__tests__/app-providers.test.tsx`
- Create: `providers/app-providers.tsx`
- Create: `lib/app/query-client.ts`

**Step 1: Write the failing test**

Add a test that renders `AppProviders` around a simple child and expects the child to be present.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/app-providers.test.tsx`

Expected: FAIL because `AppProviders` does not exist yet.

**Step 3: Write minimal implementation**

Create `AppProviders` with a `QueryClientProvider` backed by `createAppQueryClient`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/app-providers.test.tsx`

Expected: PASS

### Task 3: Add the minimal Expo app shell

**Files:**
- Create: `app/_layout.tsx`
- Create: `app/index.tsx`
- Create: `components/.gitkeep`
- Create: `constants/.gitkeep`
- Create: `hooks/.gitkeep`
- Create: `stores/.gitkeep`
- Create: `lib/api/.gitkeep`
- Create: `lib/presentation/.gitkeep`

**Step 1: Write minimal runtime files**

Create a root layout with `GestureHandlerRootView`, `SafeAreaProvider`, `AppProviders`, `Stack`, and `StatusBar`.

Create a blank `app/index.tsx` that renders an empty full-screen `View`.

**Step 2: Add tracked placeholder files**

Create placeholder files so the agreed directory structure exists in git without shipping UI.

**Step 3: Run the focused test suite**

Run: `npm test -- --runInBand __tests__/app-providers.test.tsx`

Expected: PASS after the shell files are added.

### Task 4: Copy and adjust configuration

**Files:**
- Create: `.gitignore`
- Create: `.vscode/extensions.json`
- Create: `.vscode/settings.json`
- Create: `README.md`
- Create: `package.json`
- Create: `package-lock.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `eslint.config.js`
- Create: `jest.config.js`
- Create: `jest.setup.ts`
- Create: `eas.json`
- Create: `scripts/reset-project.js`

**Step 1: Copy config surface from `ziggy/app-auth`**

Bring over the matching config files to preserve the same dependency and tooling setup.

**Step 2: Rename project identity**

Update the app name, slug, scheme, and placeholder native identifiers from `bookleaf` to `app`.

**Step 3: Keep reset script and tooling setup**

Preserve developer ergonomics from the reference project while leaving runtime UI blank.

### Task 5: Copy required static assets

**Files:**
- Create: `assets/images/android-icon-background.png`
- Create: `assets/images/android-icon-foreground.png`
- Create: `assets/images/android-icon-monochrome.png`
- Create: `assets/images/favicon.png`
- Create: `assets/images/icon.png`
- Create: `assets/images/splash-icon.png`

**Step 1: Copy only assets referenced by config**

Bring over the image assets used by `app.json` so Expo metadata stays valid.

**Step 2: Avoid feature-only assets**

Do not copy milestone or UI illustration assets because they are not part of the initialization scope.

### Task 6: Install and verify

**Files:**
- Modify: `package-lock.json`

**Step 1: Install dependencies**

Run: `npm install`

Expected: matching dependency tree is installed locally.

**Step 2: Run tests**

Run: `npm test -- --runInBand __tests__/app-providers.test.tsx`

Expected: PASS

**Step 3: Run lint**

Run: `npm run lint`

Expected: PASS
