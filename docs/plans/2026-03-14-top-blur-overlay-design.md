# Top Blur Overlay Design

**Goal:** Add a shared iOS-style top blur treatment to every screen so large titles and content scrolling under the status area feel softer and more polished.

## Approved Direction

Use a single shared overlay in [`components/navigation/screen-shell.tsx`](/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx) so all screens that render inside `ScreenShell` inherit the same visual treatment.

The overlay should combine:

- a real blur backdrop using Expo's blur primitive
- a soft milk-white gradient that fades to transparent
- absolute positioning at the top of the screen
- `pointerEvents="none"` so it never blocks taps or scrolling

## Why This Approach

- It fixes the issue once at the shell layer instead of repeating one-off headers.
- It matches the iOS visual direction already used in the tab bar.
- It keeps page layout logic unchanged because the overlay floats above content.

## Guardrails

- Keep the overlay height modest so it softens the top region without obscuring content.
- Prefer a gradient implementation that does not add a brand-new native dependency when an existing primitive can do the job.
- Fall back cleanly in tests by mocking blur and SVG gradient rendering.
- Avoid scroll-coupled behavior for now; keep this first pass static and stable.
