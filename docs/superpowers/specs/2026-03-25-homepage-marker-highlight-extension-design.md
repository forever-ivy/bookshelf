# Homepage Marker Highlight Extension Design

**Date:** 2026-03-25

## Goal

Extend the existing native marker-highlight treatment onto the home route so the first screen surfaces three key phrases without changing the overall calm, editorial tone.

## Approved Scope

- Keep the existing `MarkerHighlightText` component as the only rendering primitive
- Apply the effect to three homepage phrases only:
  - hero subtitle: `今晚最该开始的一章`
  - `今晚学习` section summary: `最短路径`
  - `推荐起点` section description: `直接开始`
- Do not add animation, new marker variants, or additional highlighted surfaces outside the home route

## Rendering Approach

- Replace the home hero subtitle `Text` node with `MarkerHighlightText`, preserving the current typography and color
- Extend `SectionTitle` with an optional `descriptionHighlight` prop so section descriptions can opt into the same marker treatment without duplicating layout styles inside the route
- Keep all existing copy unchanged; only annotate the approved substrings

## Testing

- Add a focused home-route integration test that renders the route, confirms the new phrases are present, and verifies overlays appear only after `textLayout` is emitted for those highlighted substrings
- Keep the existing UI shell smoke test green to ensure the homepage still mounts within the app shell

## Risks

- Adding highlight support to `SectionTitle` could affect other surfaces if the default path changes, so the component should preserve the current plain-description rendering when `descriptionHighlight` is absent
- The homepage will now host multiple marker overlays at once, so tests should prove they remain opt-in and layout-driven
