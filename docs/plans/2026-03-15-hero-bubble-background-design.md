# Hero Bubble Background Design

**Goal:** Add a soft blue bubble background treatment to large-title pages so Home and Settings feel more intentional without changing their content structure.

## Approved Direction

Use a reusable decorative component that individual pages opt into, instead of baking the effect into [`/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx`](/Users/Code/bookshelf-client/bookshelf-main/components/navigation/screen-shell.tsx).

The component should:

- render behind page content
- be non-interactive with `pointerEvents="none"`
- use 2 to 3 pale blue translucent bubble layers
- support small per-page layout differences for Home and Settings

## Why This Approach

- It keeps the shared shell neutral, so library, reports, and form pages do not inherit a decorative hero treatment they do not need.
- It gives Home and Settings a shared visual language while still allowing each page to tune bubble size and placement.
- It stays lightweight by using standard React Native views instead of adding another graphics dependency.

## Guardrails

- Keep the effect subtle and airy; the bubbles should frame the title area rather than become the focal point.
- Preserve readability by keeping the strongest tint away from body copy and cards.
- Render the decoration outside the scrolling content flow so it does not affect layout or hit targets.
- Cover the integration with focused tests so future refactors do not silently drop the background from hero pages.
