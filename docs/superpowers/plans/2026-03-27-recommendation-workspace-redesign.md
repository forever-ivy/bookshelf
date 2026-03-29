# Recommendation Workspace Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin recommendation workspace into an editor-first surface with a status-only header, dominant editing column, secondary preview/release column, and fixed bottom action bar.

**Architecture:** Keep the existing React Query, draft mutation, and preview-feed logic intact while changing only page composition, section hierarchy, and action placement. Use tests to lock the new information architecture first, then reshape the page shell and recommendation workspace into a two-column editorial layout that collapses cleanly on narrow screens.

**Tech Stack:** React, TypeScript, React Query, React Testing Library, Vitest, Tailwind CSS utility classes

---

### Task 1: Lock The New Workspace Structure In Tests

**Files:**
- Modify: `src/pages/management-pages.test.tsx`
- Modify: `src/pages/recommendation-page.tsx`
- Test: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that the recommendation page:
- exposes a dedicated bottom action region instead of page-shell hero actions
- renders `书目位编排` before `专题位编排`
- renders `App 预览`, `发布状态`, `发布记录` in the secondary context region
- keeps save/publish controls reachable in the bottom bar

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: FAIL because the current page still mounts the action cluster through `PageShell.actions` and does not expose the new layout landmarks.

- [ ] **Step 3: Write minimal implementation**

Update the recommendation page component to add stable test ids and landmarks for:
- status-only header summary
- primary editor column
- secondary context column
- fixed bottom action bar

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: PASS for the new recommendation workspace assertions.

- [ ] **Step 5: Commit**

```bash
git add src/pages/management-pages.test.tsx src/pages/recommendation-page.tsx
git commit -m "test: lock recommendation workspace layout"
```

### Task 2: Recompose RecommendationPage Around Editor-First Hierarchy

**Files:**
- Modify: `src/pages/recommendation-page.tsx`
- Modify: `src/components/shared/page-shell.tsx`
- Test: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or refine assertions for:
- header showing status summary instead of action buttons
- primary editor width/column landmark rendered before secondary context
- fixed bottom action bar label showing draft sync state

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: FAIL until the page shell and recommendation page stop using the hero action slot.

- [ ] **Step 3: Write minimal implementation**

Implement:
- a lighter status header using the existing `PageShell` without top-right action chrome
- a two-column body where the left side owns `书目位编排` and `专题位编排`
- a right-side stack for preview, release state, and history
- bottom padding plus fixed action bar so form fields are not obscured

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: PASS with the new hierarchy visible in the DOM.

- [ ] **Step 5: Commit**

```bash
git add src/pages/recommendation-page.tsx src/components/shared/page-shell.tsx src/pages/management-pages.test.tsx
git commit -m "feat: redesign recommendation workspace layout"
```

### Task 3: Refine Section Surfaces And Preserve Editing Flow

**Files:**
- Modify: `src/pages/recommendation-page.tsx`
- Modify: `src/components/shared/workspace-panel.tsx` (only if surface variants are needed)
- Test: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that:
- candidate pools remain attached inside the relevant editing section
- quick actions remain marked as system generated in preview
- reset/save/publish interactions still work after the layout change

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: FAIL if the new grouping or actions break existing behavior.

- [ ] **Step 3: Write minimal implementation**

Refine section composition so:
- `书目位编排` reads slot-first and candidate-second
- `专题位编排` groups hot lists, explanation card, and system booklists with clearer internal rhythm
- preview cards become quieter than editor panels
- action bar status line reflects dirty/saving/publishing states

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: PASS with existing mutation assertions still green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/recommendation-page.tsx src/components/shared/workspace-panel.tsx src/pages/management-pages.test.tsx
git commit -m "refactor: polish recommendation editing flow"
```

### Task 4: Verify Responsive Safety And No Regression In Core Flows

**Files:**
- Modify: `src/pages/recommendation-page.tsx` (if verification reveals overlap or order issues)
- Test: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Write the failing test**

If needed, add a regression assertion for the bottom action bar and section order in the rendered mobile stack.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: FAIL only if a missing DOM hook or ordering regression is found.

- [ ] **Step 3: Write minimal implementation**

Adjust spacing, sticky/fixed offsets, and stacking order so the action bar does not cover interactive fields and the editor remains first on narrow widths.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --run src/pages/management-pages.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/recommendation-page.tsx src/pages/management-pages.test.tsx
git commit -m "test: cover recommendation workspace responsive layout"
```
