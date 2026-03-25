# Marker Highlight Brush Effect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push `MarkerHighlightText` to the approved “B” brush direction so both underline and fill read as hand-drawn marker strokes while staying readable in compact Chinese UI copy.

**Architecture:** Keep the current Skia rendering pipeline intact and do all visual work by re-tuning the deterministic path builders that already feed `Canvas`/`Path`. Drive the change with focused geometry tests first, then update underline and fill path generation independently so each visual change stays understandable and reversible.

**Tech Stack:** Expo Router, React Native, `@shopify/react-native-skia`, Jest, Testing Library, ESLint

---

## File Structure

- `components/base/marker-highlight-text.utils.ts`
  - Owns deterministic path generation for highlight fills and underline strokes
  - Main implementation surface for this feature pass
- `components/base/marker-highlight-text.tsx`
  - Owns layout measurement, fallback styles, and Skia canvas placement
  - Only touch if the stronger brush envelope needs spacing or overlay adjustments
- `__tests__/components/base/marker-highlight-text.utils.test.ts`
  - Owns geometry-level assertions for brush envelope, overshoot, and visual bounds
- `__tests__/components/base/marker-highlight-text.test.tsx`
  - Owns render-state assertions for fallback-to-overlay transitions and component stability

## Task 1: Lock The Desired Brush Envelope In Tests

**Files:**
- Modify: `__tests__/components/base/marker-highlight-text.utils.test.ts`
- Reference: `docs/superpowers/specs/2026-03-25-marker-highlight-brush-design.md`

- [ ] **Step 1: Add failing geometry assertions for the stronger underline**

Add or update a test in `__tests__/components/base/marker-highlight-text.utils.test.ts` so the primary underline path must:
- extend farther left and right than the current expectation
- sit lower than the current expectation
- preserve a non-closed stroked path

- [ ] **Step 2: Add failing geometry assertions for the thicker fill**

Add or update a test in `__tests__/components/base/marker-highlight-text.utils.test.ts` so the primary fill path must:
- cover more vertical area than the current envelope
- extend farther laterally than the current envelope
- remain a closed path

- [ ] **Step 3: Run the geometry test file and confirm failure**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.utils.test.ts
```

Expected:
- FAIL on the new underline/fill envelope assertions
- No unrelated test failures

## Task 2: Re-Tune The Underline Brush Path Builder

**Files:**
- Modify: `components/base/marker-highlight-text.utils.ts`
- Test: `__tests__/components/base/marker-highlight-text.utils.test.ts`
- Reference: `docs/superpowers/specs/2026-03-25-marker-highlight-brush-design.md`

- [ ] **Step 1: Increase underline overshoot and baseline drop**

In `components/base/marker-highlight-text.utils.ts`, update the medium and soft underline layer parameters inside `buildUnderlineMarkerPaths()` so the primary stroke:
- starts earlier and ends later
- sits lower relative to line height
- reads longer than a standard underline

- [ ] **Step 2: Increase underline brush weight and asymmetry**

Still in `buildUnderlineMarkerPaths()`, adjust:
- `strokeWidth`
- `waveHeight`
- jitter amplitudes and control-point placement

so the first pass feels like a heavier brush drag and the second pass remains a lighter echo instead of a duplicate line.

- [ ] **Step 3: Run the geometry test file and confirm the underline expectations pass**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.utils.test.ts
```

Expected:
- underline envelope assertions PASS
- fill assertions may still fail until Task 3 is complete

## Task 3: Re-Tune The Fill Brush Path Builder

**Files:**
- Modify: `components/base/marker-highlight-text.utils.ts`
- Test: `__tests__/components/base/marker-highlight-text.utils.test.ts`
- Reference: `docs/superpowers/specs/2026-03-25-marker-highlight-brush-design.md`

- [ ] **Step 1: Widen the fill swipe**

Update the fill-layer parameters inside `buildMarkerFillPaths()` so the fill:
- bleeds more to the left and right
- occupies a thicker central body
- still avoids swallowing glyph edges

- [ ] **Step 2: Roughen the contour**

Adjust top/bottom ratios, control-point distribution, and jitter amplitude so the fill:
- looks less like a rounded rectangle
- feels more like a broad marker swipe
- stays deterministic for tests

- [ ] **Step 3: Re-run the geometry tests and confirm all pass**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.utils.test.ts
```

Expected:
- PASS for both underline and fill geometry tests

## Task 4: Validate The Component-Level Rendering

**Files:**
- Modify: `components/base/marker-highlight-text.tsx` only if needed
- Modify: `__tests__/components/base/marker-highlight-text.test.tsx` only if current render assertions no longer reflect the intended layout envelope
- Reference: `app/(tabs)/index.tsx`
- Reference: `components/base/soft-search-bar.tsx`

- [ ] **Step 1: Check whether stronger paths require spacing adjustments**

Inspect `components/base/marker-highlight-text.tsx` and decide whether the stronger underline/fill paths require:
- extra `paddingBottom`
- overlay placement adjustment
- no component change at all

Only change this file if the stronger brush strokes would clip or overlap surrounding text.

- [ ] **Step 2: Run the focused component tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.test.tsx __tests__/app/home-route-marker-highlight.test.tsx
```

Expected:
- PASS for fallback state assertions
- PASS for Skia canvas rendering assertions

## Task 5: Full Verification

**Files:**
- Verify: `components/base/marker-highlight-text.utils.ts`
- Verify: `components/base/marker-highlight-text.tsx`
- Verify: `__tests__/components/base/marker-highlight-text.utils.test.ts`
- Verify: `__tests__/components/base/marker-highlight-text.test.tsx`

- [ ] **Step 1: Run the full test suite**

Run:

```bash
npm test -- --runInBand
```

Expected:
- PASS across all test suites

- [ ] **Step 2: Run lint without cache**

Run:

```bash
npm run lint -- --no-cache
```

Expected:
- PASS with no new lint errors

- [ ] **Step 3: Manually inspect the key UI targets**

Open the app and inspect:
- `35 分钟` on the homepage
- the highlight in `components/base/soft-search-bar.tsx`
- the homepage content highlight usages

Confirm:
- underline feels lower, thicker, and longer
- fill feels wider and more brush-like
- readability remains acceptable

## Self-Review Notes

- Keep the change deterministic; do not introduce randomness that changes between renders
- Do not add new props to “solve” the visual tuning problem
- Prefer parameter and curve-shape tuning over component restructuring
- If the result starts obscuring glyphs, dial opacity and vertical coverage back before changing architecture
