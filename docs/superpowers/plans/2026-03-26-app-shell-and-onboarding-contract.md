# App Shell And Onboarding Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the Expo app's first protected-shell slice by locking the session/onboarding contract, cleaning up the `auth` and `readers` API boundaries, and verifying the login/bootstrap guard flow with tests.

**Architecture:** Keep the current router and visual shell intact, but move profile normalization into a dedicated `readers` API module and make the session layer consume one normalized contract. Tests drive the contract: first assert the approved login payload and onboarding derivation, then adjust the providers/hooks to satisfy those expectations.

**Tech Stack:** Expo Router, React Native, TypeScript, Jest, React Query, Zustand

---

### Task 1: Persist The Approved Design Inputs

**Files:**
- Create: `docs/superpowers/specs/2026-03-26-app-shell-and-service-contract-design.md`
- Create: `docs/superpowers/plans/2026-03-26-app-shell-and-onboarding-contract.md`

- [ ] **Step 1: Save the approved design**

Write the agreed scope split, state machine, App contract, and backend interface surface into the spec file.

- [ ] **Step 2: Save the first-slice execution plan**

Write the exact files, tests, and verification steps for the Expo app shell work into this plan file.

### Task 2: Lock The Auth Contract With Failing Tests

**Files:**
- Create: `__tests__/api/auth-contract.test.ts`
- Modify: `lib/api/auth.ts`

- [ ] **Step 1: Write a failing login contract test**

Assert that `login()` posts only `identifier_type`, `identifier`, and `password` to `/api/v1/auth/login`.

- [ ] **Step 2: Run the focused auth test and verify it fails**

Run: `npm test -- --runInBand __tests__/api/auth-contract.test.ts`

Expected: FAIL because the current implementation still posts `role`.

- [ ] **Step 3: Write a failing `/auth/me` normalization test**

Assert that `getMe()` keeps `profile` as `null` and derives an onboarding state that routes the user into profile binding when the backend has no reader profile yet.

- [ ] **Step 4: Run the same focused auth test again**

Run: `npm test -- --runInBand __tests__/api/auth-contract.test.ts`

Expected: FAIL for the missing normalization behavior.

### Task 3: Introduce The Readers API Boundary

**Files:**
- Create: `__tests__/api/readers-contract.test.ts`
- Create: `lib/api/readers.ts`
- Modify: `lib/api/index.ts`
- Modify: `hooks/use-library-app-data.ts`
- Modify: `app/onboarding/profile.tsx`
- Modify: `app/onboarding/interests.tsx`

- [ ] **Step 1: Write a failing readers contract test**

Assert that updating `/api/v1/readers/me/profile` normalizes a `profile`-only response into `{ profile, onboarding }` without requiring an extra `/auth/me` round trip.

- [ ] **Step 2: Run the focused readers test and verify it fails**

Run: `npm test -- --runInBand __tests__/api/readers-contract.test.ts`

Expected: FAIL because `lib/api/readers.ts` does not exist yet.

- [ ] **Step 3: Implement the readers module**

Add `lib/api/readers.ts` with shared profile normalization and onboarding derivation helpers, then update the hook layer to use it.

- [ ] **Step 4: Re-run the readers test**

Run: `npm test -- --runInBand __tests__/api/readers-contract.test.ts`

Expected: PASS

### Task 4: Refactor The Auth Session Layer To Green

**Files:**
- Modify: `lib/api/auth.ts`

- [ ] **Step 1: Update the auth implementation**

Remove `role` from the login payload, reuse the shared readers normalization helpers, and stop inventing mock profile data when the backend returns a real but incomplete session snapshot.

- [ ] **Step 2: Re-run the auth contract test**

Run: `npm test -- --runInBand __tests__/api/auth-contract.test.ts`

Expected: PASS

### Task 5: Verify The Guard Flow Still Holds

**Files:**
- Modify: `__tests__/app-session-gate.test.ts` (only if coverage gaps appear)
- Modify: `providers/app-providers.tsx` (only if tests expose bootstrap issues)

- [ ] **Step 1: Run the existing route-gate test**

Run: `npm test -- --runInBand __tests__/app-session-gate.test.ts`

Expected: PASS

- [ ] **Step 2: Run the provider smoke test**

Run: `npm test -- --runInBand __tests__/app-providers.test.ts`

Expected: PASS

- [ ] **Step 3: Run all impacted tests together**

Run: `npm test -- --runInBand __tests__/api/auth-contract.test.ts __tests__/api/readers-contract.test.ts __tests__/app-session-gate.test.ts __tests__/app-providers.test.ts`

Expected: PASS
