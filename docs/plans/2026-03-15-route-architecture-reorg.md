# Route Architecture Reorg Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the Expo Router route tree so the app reads as one root stack, four primary tabs, two domain sub-stacks, and one global modal group without changing core product behavior.

**Architecture:** Keep the current `home / library / reports / settings` tab shell, move root-level task pages into their owning tab domains, and introduce grouped segments for connect flows and global modals. The first migration should preserve current UI and data logic while only changing route ownership and navigation responsibilities.

**Tech Stack:** Expo Router, Native Tabs, React Native, Expo dev client, Jest, TypeScript

---

## Current Route Inventory

### Root stack today

- `/` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/index.tsx`]
- `/connect` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/connect.tsx`]
- `/scanner` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/scanner.tsx`]
- `/shelf` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/shelf.tsx`]
- `/store-book` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/store-book.tsx`]
- `/take-book` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/take-book.tsx`]
- `/booklist-manage` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/booklist-manage.tsx`]
- `/goal-settings` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/goal-settings.tsx`]
- `/members` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/members.tsx`]
- `/member-form` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/member-form.tsx`]
- `/(tabs)` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/_layout.tsx`]

### Tab routes today

- `/home` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/index.tsx`]
- `/home/profile/[memberId]` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/profile/[memberId].tsx`]
- `/library` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/index.tsx`]
- `/reports` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/reports/index.tsx`]
- `/settings` -> [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/index.tsx`]

## Target Route Tree

```text
app
├─ _layout.tsx
├─ index.tsx
├─ (connect)
│  ├─ _layout.tsx
│  ├─ connect.tsx
│  └─ scanner.tsx
├─ (tabs)
│  ├─ _layout.tsx
│  ├─ home
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx
│  │  └─ profile
│  │     └─ [memberId].tsx
│  ├─ library
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx
│  │  ├─ booklist.tsx
│  │  ├─ take-book.tsx
│  │  ├─ store-book.tsx
│  │  └─ history.tsx
│  ├─ reports
│  │  ├─ _layout.tsx
│  │  ├─ index.tsx
│  │  ├─ member
│  │  │  └─ [memberId].tsx
│  │  └─ family.tsx
│  └─ settings
│     ├─ _layout.tsx
│     ├─ index.tsx
│     ├─ cabinet.tsx
│     ├─ shelf.tsx
│     ├─ members
│     │  ├─ index.tsx
│     │  └─ form.tsx
│     └─ goals.tsx
└─ (modals)
   ├─ _layout.tsx
   ├─ member-switcher.tsx
   ├─ badge-detail.tsx
   ├─ share-profile.tsx
   └─ connect-scanner.tsx
```

## File Migration Table

| Current file | Current URL | Proposed file | Proposed URL | Reason |
| --- | --- | --- | --- | --- |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/connect.tsx`] | `/connect` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(connect)/connect.tsx`] | `/connect` | Keep connect flow out of the main app tabs. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/scanner.tsx`] | `/scanner` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(modals)/connect-scanner.tsx`] or [`/Users/Code/bookshelf-client/bookshelf-main/app/(connect)/scanner.tsx`] | `/connect-scanner` or `/scanner` | Better treated as a modal task. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/shelf.tsx`] | `/shelf` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/shelf.tsx`] | `/library/shelf` | Shelf is a book-space view and fits better inside Library than Settings. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/store-book.tsx`] | `/store-book` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/store-book.tsx`] | `/library/store-book` | Store-book belongs to the book domain. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/take-book.tsx`] | `/take-book` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/take-book.tsx`] | `/library/take-book` | Take-book belongs to the book domain. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/booklist-manage.tsx`] | `/booklist-manage` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/booklist.tsx`] | `/library/booklist` | Booklist management should live inside Library. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/goal-settings.tsx`] | `/goal-settings` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/goals.tsx`] | `/settings/goals` | Cheapest migration that still moves goals into a domain. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/members.tsx`] | `/members` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/members/index.tsx`] | `/settings/members` | Member admin belongs to Settings. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/member-form.tsx`] | `/member-form` | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/members/form.tsx`] | `/settings/members/form` | Keep CRUD form inside the members domain. |
| [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/profile/[memberId].tsx`] | `/home/profile/[memberId]` | keep file | keep URL now | Already correctly nested under Home. |
| new | n/a | [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/cabinet.tsx`] | `/settings/cabinet` | Split connection management from the generic settings index. |
| new | n/a | [`/Users/Code/bookshelf-client/bookshelf-main/app/(modals)/member-switcher.tsx`] | modal only | Current member switching should become a global task. |
| new | n/a | [`/Users/Code/bookshelf-client/bookshelf-main/app/(modals)/badge-detail.tsx`] | modal only | Badge detail is a contextual drill-in, not a full route. |
| new | n/a | [`/Users/Code/bookshelf-client/bookshelf-main/app/(modals)/share-profile.tsx`] | modal only | Share is a transient action. |

## Old URL -> New URL Mapping

### No change

| Old | New |
| --- | --- |
| `/` | `/` |
| `/connect` | `/connect` |
| `/home` | `/home` |
| `/library` | `/library` |
| `/reports` | `/reports` |
| `/settings` | `/settings` |
| `/home/profile/[memberId]` | `/home/profile/[memberId]` |

### Rename and move into owning domains

| Old | New |
| --- | --- |
| `/shelf` | `/library/shelf` |
| `/store-book` | `/library/store-book` |
| `/take-book` | `/library/take-book` |
| `/booklist-manage` | `/library/booklist` |
| `/goal-settings` | `/settings/goals` |
| `/members` | `/settings/members` |
| `/member-form` | `/settings/members/form` |

### Modal candidates

| Current URL | Target interaction |
| --- | --- |
| `/scanner` | modal first, route fallback second |
| future badge detail | modal |
| future share profile | modal |
| current member switcher UI | sheet |

## Push / Modal / Sheet Rules

### `push`

Use `router.push` for full-screen domain pages that users may navigate back from:

- `/library/booklist`
- `/library/take-book`
- `/library/store-book`
- `/library/shelf`
- `/settings/members`
- `/settings/members/form`
- `/settings/goals`
- `/home/profile/[memberId]`

### `modal`

Use `Stack.Screen` with modal presentation for short, interruptible tasks:

- scanner
- badge detail
- share profile
- future report drill-down explainers if they do not need persistent tab context

### `sheet`

Use in-place sheet or bottom sheet for contextual tasks that should not leave the current page:

- member switcher
- quick member actions
- book quick-preview
- future AI recommendation picker

## Known Navigation Call Sites To Update

These are the current files that already push old root-level routes and will need follow-up edits after files move:

- [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/index.tsx`]
  - `/shelf`
  - `/store-book`
  - `/take-book`
  - `/goal-settings`
- [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/library/index.tsx`]
  - `/booklist-manage`
  - `/take-book`
- [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/settings/index.tsx`]
  - `/members`
  - `/shelf`
  - `/scanner`
  - `/connect`
- [`/Users/Code/bookshelf-client/bookshelf-main/app/shelf.tsx`]
  - `/take-book`
  - `/store-book`
- [`/Users/Code/bookshelf-client/bookshelf-main/app/members.tsx`]
  - `/member-form`
- [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/home/profile/[memberId].tsx`]
  - `/goal-settings`
  - `/members`

## Recommended Migration Order

### Phase 1: Move files without changing UI behavior

1. Create grouped folders: `(connect)`, `(modals)`, `settings/members`.
2. Move `shelf`, `store-book`, `take-book`, `booklist-manage`, `members`, and `member-form` into domain folders.
3. Update `app/_layout.tsx` to stop registering old root pages and register grouped segments instead.
4. Update every `router.push`, `router.replace`, and `Redirect href` to the new URLs.
5. Run route smoke tests and manual tab navigation.

### Phase 2: Tighten domain ownership

1. Add `/settings/cabinet` and move connection controls out of `settings/index`.
2. Slim down `home/index` so it only shows overview cards and shortcuts.
3. Keep management actions as entry points into `library/*` and `settings/*`.

### Phase 3: Introduce contextual overlays

1. Promote member switcher to a global sheet.
2. Convert scanner to modal presentation if the dev-client and camera flow remain smooth.
3. Add badge detail and share profile as modals instead of stack pages.

## Test Checklist

- Verify app startup still routes `/` -> `/connect` when disconnected and `/` -> `/home` when connected.
- Verify all four tabs still mount from [`/Users/Code/bookshelf-client/bookshelf-main/app/(tabs)/_layout.tsx`].
- Verify every old root-level shortcut now lands in its new domain page.
- Verify deep link behavior for `/home/profile/[memberId]` still works.
- Verify scanner presentation works on simulator and physical iPhone after modal conversion.
- Update route tests:
  - [`/Users/Code/bookshelf-client/bookshelf-main/__tests__/tab-config.test.ts`]
  - add a route map test for renamed URLs
  - update any profile or redirect tests that assert old paths

## Recommended Default For Goals

Short term: use `/settings/goals`.

Reason:

- It preserves the existing `goal-settings` feature with minimal refactor risk.
- It still removes the worst root-level sprawl immediately.
- Later, if the product becomes fully member-centric, goals can move again to `/home/profile/[memberId]/goals` without first undoing root-stack debt.
