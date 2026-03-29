# Remove Classification Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove classification-code fields from the app-facing catalog and recommendation contract so book models expose only category names.

**Architecture:** Delete the field at the shared type boundary, then remove all normalization and mock-data paths that can reintroduce it. Keep the change contract-driven by updating tests first and verifying targeted catalog and recommendation flows.

**Tech Stack:** TypeScript, Jest

---

### Task 1: Update the contract tests first

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/__tests__/api/catalog-contract.test.ts`
- Test: `/Users/Code/bookshelf/bookshelf/__tests__/api/catalog-contract.test.ts`

- [ ] **Step 1: Write the failing test**

Add assertions that catalog and recommendation results no longer contain `classificationCode`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: FAIL because the current normalizers still expose `classificationCode`.

- [ ] **Step 3: Write minimal implementation**

Remove `classificationCode` expectations that reflect the old contract and replace them with negative assertions.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: PASS

### Task 2: Remove the field from the app model layer

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/lib/api/types.ts`
- Modify: `/Users/Code/bookshelf/bookshelf/lib/api/catalog.ts`
- Modify: `/Users/Code/bookshelf/bookshelf/lib/api/recommendation.ts`

- [ ] **Step 1: Write the failing test**

Use the contract failures from Task 1 as the red state.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: FAIL with book models still containing `classificationCode`.

- [ ] **Step 3: Write minimal implementation**

Delete the shared type field and stop mapping classification-code payload keys.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: PASS

### Task 3: Remove classification-code support from mocks

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/lib/api/mock.ts`
- Test: `/Users/Code/bookshelf/bookshelf/__tests__/api/catalog-contract.test.ts`

- [ ] **Step 1: Write the failing test**

Use existing contract coverage plus targeted mock usage if needed to expose the stale field.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: FAIL if mocks still surface `classificationCode`.

- [ ] **Step 3: Write minimal implementation**

Delete mock values and remove classification-code text from the mock search index.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts`
Expected: PASS

### Task 4: Verify the targeted contract surface

**Files:**
- Test: `/Users/Code/bookshelf/bookshelf/__tests__/api/catalog-contract.test.ts`
- Test: `/Users/Code/bookshelf/bookshelf/__tests__/api/recommendation-contract.test.ts`

- [ ] **Step 1: Run the targeted test suite**

Run: `npm test -- --runInBand __tests__/api/catalog-contract.test.ts __tests__/api/recommendation-contract.test.ts`
Expected: PASS

- [ ] **Step 2: Review for accidental field leakage**

Run: `rg -n "classificationCode|classification_code" /Users/Code/bookshelf/bookshelf`
Expected: No remaining product-code references, aside from the design/plan docs if they mention the removed field.
