# Book Entity Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline copy-row expansion in the admin books table with a URL-backed secondary entity catalog view for a selected book.

**Architecture:** Keep the feature inside `BooksPage` instead of introducing a new route. Drive the secondary view from a `book_id` search param so the books list and entity catalog share the same page, filters, and pagination state while remaining refresh-safe.

**Tech Stack:** React, React Router search params, TanStack Query, Vitest, Testing Library

---

### Task 1: Lock the new secondary-view behavior in tests

**Files:**
- Modify: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Write the failing test assertions**

Update the books-page interaction test so it clicks `查看实体` instead of `展开实体`, then expects:

- the entity catalog view to render
- the selected book summary to appear
- copy location cards to appear
- `book_id=1` to be present in the location search probe

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- src/pages/management-pages.test.tsx -t "book filters"`

Expected: FAIL because the page still renders inline row expansion.

- [ ] **Step 3: Add a back-navigation assertion if the view supports it**

Assert that returning to the list removes `book_id` but preserves existing filter params.

- [ ] **Step 4: Run the focused test again**

Run: `npm test -- src/pages/management-pages.test.tsx -t "book filters"`

Expected: still FAIL until implementation is added.

### Task 2: Refactor `BooksPage` to a URL-backed entity catalog view

**Files:**
- Modify: `src/pages/books-page.tsx`
- Reference: `src/lib/search-params.ts`
- Reference: `src/types/domain.ts`

- [ ] **Step 1: Introduce a selected `book_id` search-param reader**

Use `readPositiveIntSearchParam(searchParams, 'book_id')` and derive the viewed book from current books query results.

- [ ] **Step 2: Replace inline expansion state with view-navigation helpers**

Remove the local `expandedBookIds` state from `BooksPage` and add:

- open entity catalog helper that writes `book_id`
- close entity catalog helper that removes `book_id`

- [ ] **Step 3: Change the books-table action column**

Replace the current first-column button label with `查看实体`, and wire it to the entity catalog navigation helper.

- [ ] **Step 4: Render a secondary entity catalog view**

Inside the books tab:

- if `book_id` is absent, render the books table
- if `book_id` is present and the book exists, render the book summary card plus copy directory
- if `book_id` is present but the book is unavailable in current results, render an empty-state message with a return button

- [ ] **Step 5: Keep current edit-sheet behavior intact**

Do not remove the existing `selectedBookId` and edit-sheet flow; preserve `编辑此书`.

### Task 3: Verify the interaction end-to-end

**Files:**
- Test: `src/pages/management-pages.test.tsx`

- [ ] **Step 1: Run the focused books-page test**

Run: `npm test -- src/pages/management-pages.test.tsx -t "hydrates book filters from the URL"`

Expected: PASS

- [ ] **Step 2: Run the broader management and operations page suite**

Run: `npm test -- src/pages/management-pages.test.tsx src/pages/operations-pages.test.tsx`

Expected: the books-page coverage passes; report unrelated pre-existing failures separately if they remain.

- [ ] **Step 3: Summarize residual risk**

Call out that `book_id` currently resolves from the loaded books page only, so opening a stale detail URL that no longer matches the current filtered page will fall back to the empty-state return view.
