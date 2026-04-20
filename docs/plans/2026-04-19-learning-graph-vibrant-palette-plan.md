# Learning Graph Vibrant Palette Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the graph colors more lively while keeping them aligned with the existing app theme.

**Architecture:** Keep the current graph structure and runtime behavior unchanged. Only update the runtime theme helper so graph nodes and status states use brighter colors drawn from the app's existing highlight and status tokens, then rebuild the runtime bundle.

**Tech Stack:** React Native, Expo, react-force-graph-2d, Jest

---

### Task 1: Lock the brighter graph palette

**Files:**
- Modify: `__tests__/lib/learning-graph-theme.test.ts`
- Modify: `lib/learning/graph-theme.ts`

**Step 1: Write the failing test**

Change the expected runtime theme colors to brighter app-theme-derived values.

**Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand __tests__/lib/learning-graph-theme.test.ts`

**Step 3: Write minimal implementation**

Update `buildLearningGraphRuntimeTheme` to use brighter existing tokens for concept, source, explore, success, and warning states.

**Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand __tests__/lib/learning-graph-theme.test.ts`

### Task 2: Rebuild and verify the graph runtime

**Files:**
- Modify: `components/learning/learning-graph-runtime.generated.ts`

**Step 1: Rebuild the runtime bundle**

Run: `npm run build:learning-graph-runtime`

**Step 2: Run targeted regression tests**

Run: `npm test -- --runInBand __tests__/lib/learning-graph.test.ts __tests__/lib/learning-graph-theme.test.ts __tests__/app/learning-workspace-graph-screen.test.tsx __tests__/components/learning-graph-webview.test.tsx`

**Step 3: Run contract regression**

Run: `npm test -- --runInBand __tests__/api/learning-contract.test.ts -t "graph|explore reasoning"`
