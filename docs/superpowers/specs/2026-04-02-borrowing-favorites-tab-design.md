# 2026-04-02 Borrowing Favorites Tab Design

## Goal

- Move the existing `收藏图书` and `书单` sections out of the account center content.
- Add a new `收藏` tab inside the borrowing route so saved content lives next to borrowing workflows.

## Chosen Approach

- Keep the current borrowing route as the owner of the page-level tabs and extend its tab list from `借阅 / 动态` to `借阅 / 收藏 / 动态`.
- Extract the current favorites and booklist rendering into a shared section component so the UI, loading states, and empty states stay aligned.
- Remove the duplicated sections from `MeScreenContent` after the new borrowing tab renders them.

## Scope

- Update the borrowing route tab switcher and content rendering.
- Reuse the existing favorites and booklist queries inside the shared section.
- Keep the existing card layout, copy, and visual style unchanged unless required by the new container.

## Regression Risks

- The new borrowing tab can accidentally break the current `动态` tab if the conditional rendering is not kept mutually exclusive.
- The account center tests need to stop expecting `收藏图书` and `书单` after the migration.
- Reusing the same query-backed content in a new route can surface hidden assumptions about spacing or parent containers.
