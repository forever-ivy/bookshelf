# Readers Books-Style Layout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the Readers admin page into a single primary workspace with a secondary editor drawer, matching the Books page interaction model.

**Architecture:** Keep the current data fetching and mutation flow in `ReadersPage`, but collapse the page body into one `WorkspacePanel` containing search plus the readers table. Move the reader editor and summary content into a `Sheet` so editing becomes an explicit secondary action instead of a permanent parallel column.

**Tech Stack:** React 19, TanStack Query, React Router, TanStack Table, Vitest, Testing Library, existing shared admin UI components

---

### Task 1: Lock the new Readers interaction in tests

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`

**Step 1: Write the failing test**

- Update the readers workspace expectations to assert:
  - the page still renders the readers heading
  - the page renders a primary workspace heading like `读者索引`
  - the page no longer renders the old always-visible editor heading
  - clicking `编辑画像` opens a drawer dialog with the editor title and current reader information

**Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/management-pages.test.tsx -t "renders the upgraded readers workspace from admin reader APIs"`

Expected: FAIL because the current page still renders the side-by-side editor panel instead of a drawer.

**Step 3: Write the failing save-flow assertion**

- Update the save-flow test to:
  - click `编辑画像`
  - scope field queries to the opened drawer dialog
  - submit through the drawer primary action

**Step 4: Run test to verify it fails**

Run: `npm test -- src/pages/management-pages.test.tsx -t "updates reader restrictions and segment from the readers workspace"`

Expected: FAIL because the current implementation does not expose the editor as a dialog drawer.

### Task 2: Refactor ReadersPage into a Books-style primary workspace

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/readers-page.tsx`

**Step 1: Introduce drawer state**

- Add explicit `isEditorOpen` state.
- Keep `selectedReaderId` as the source of truth for the current editor target.

**Step 2: Collapse the body into a single primary workspace**

- Remove the `InspectorPanel` + summary side column layout.
- Keep the metric strip.
- Render one `WorkspacePanel` titled `读者索引`, with the search input in `action`.

**Step 3: Move reader editing into a Sheet**

- Reuse the shared `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, and `SheetFooter`.
- Open the drawer from the `编辑画像` table action.
- Keep the form fields and mutation payload the same.

**Step 4: Merge summary content into the drawer**

- Show current reader identity at the top of the drawer.
- Keep quick summary blocks for recent activity and restriction state.
- Show the preference profile in the drawer instead of the page body.

**Step 5: Preserve the save flow**

- Keep `updateAdminReader` payload shape unchanged.
- After save success, invalidate queries as before and close the drawer only if that keeps the interaction clean.

### Task 3: Verify the focused Readers behavior

**Files:**
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/management-pages.test.tsx`
- Modify: `/Users/Code/bookshelf/bookshelf/.worktrees/admin/src/pages/readers-page.tsx`

**Step 1: Run the focused readers layout test**

Run: `npm test -- src/pages/management-pages.test.tsx -t "renders the upgraded readers workspace from admin reader APIs"`

Expected: PASS with the new primary workspace plus drawer interaction.

**Step 2: Run the focused readers mutation test**

Run: `npm test -- src/pages/management-pages.test.tsx -t "updates reader restrictions and segment from the readers workspace"`

Expected: PASS and confirm the mutation payload remains unchanged.

**Step 3: Run a combined verification command**

Run: `npm test -- src/pages/management-pages.test.tsx -t "readers workspace"`

Expected: PASS for the readers-focused coverage in this file.
