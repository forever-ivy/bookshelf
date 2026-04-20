# Explore Graph Focus Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the graph tab into an Explore-only, question-centric graph view that hides Guide-specific nodes and focuses the graph around the latest Explore turn.

**Architecture:** Keep the shared profile graph endpoint as the data source, but derive an Explore lens in the app from the latest Explore presentation. The screen will filter out Guide step nodes, crop to a focus subgraph when evidence or related concepts exist, and update the detail panel to speak in Explore semantics.

**Tech Stack:** TypeScript, React Native, Expo Router, React Query, Jest, Testing Library.

---

### Task 1: Lock Explore graph focus behavior in graph adapter tests

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/lib/learning-graph.test.ts`
- Modify: `/Volumes/Disk/Code/bookshelf-app/lib/learning/graph.ts`

**Step 1: Write the failing test**

Add tests that require:
- Explore graph mode to exclude `LessonStep` nodes
- Focus seeds from Explore evidence and related concepts to produce a reduced subgraph

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/lib/learning-graph.test.ts
```

Expected: FAIL because the graph adapter currently has no Explore-only lens helpers.

**Step 3: Write minimal implementation**

Update `/Volumes/Disk/Code/bookshelf-app/lib/learning/graph.ts` with:
- an Explore-only filtered view model
- latest Explore focus extraction helpers
- focused subgraph derivation

**Step 4: Run test to verify it passes**

Run the same Jest command and confirm PASS.

### Task 2: Lock Explore-only graph screen behavior in route tests

**Files:**
- Modify: `/Volumes/Disk/Code/bookshelf-app/__tests__/app/learning-workspace-graph-screen.test.tsx`
- Modify: `/Volumes/Disk/Code/bookshelf-app/app/learning/[profileId]/(workspace)/graph/index.tsx`

**Step 1: Write the failing test**

Add tests that require:
- graph hero copy to use Explore semantics instead of Guide semantics
- current Explore question to appear above the graph
- Explore focus mode to hide Guide step nodes from graph stats

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/app/learning-workspace-graph-screen.test.tsx
```

Expected: FAIL because the screen still renders generic graph copy and full profile graph stats.

**Step 3: Write minimal implementation**

Update the graph screen to:
- read Explore context from the workspace provider
- use the Explore graph lens by default
- render Explore-only copy and focus summary

**Step 4: Run test to verify it passes**

Run the same Jest command and confirm PASS.

### Task 3: Run focused regression verification

**Files:**
- No new production files

**Step 1: Run graph adapter verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/lib/learning-graph.test.ts
```

Expected: PASS

**Step 2: Run graph screen verification**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/app/learning-workspace-graph-screen.test.tsx __tests__/components/learning-graph-webview.test.tsx
```

Expected: PASS

**Step 3: Run workspace contract spot-check**

```bash
cd /Volumes/Disk/Code/bookshelf-app && npm test -- --runInBand __tests__/api/learning-contract.test.ts -t "graph|explore reasoning"
```

Expected: PASS for Explore graph-related contract coverage.
