# Homepage Marker Highlight Current Layout Design

**Date:** 2026-03-25

## Goal

Apply the existing native marker-highlight effect to the current simplified home route without bringing back any removed supporting copy.

## Approved Scope

- Keep the current stripped-down home structure intact
- Reuse `MarkerHighlightText`; do not add animation or new variants
- Highlight three currently visible home phrases:
  - `今晚待开始` in the quick action list
  - `35 分钟` in the learning-focus bullet list
  - `机器学习从零到一` in the recommendation list

## Implementation Direction

- Modify only `app/(tabs)/index.tsx` for the new highlight placements
- Keep `SectionTitle` unchanged for this pass because the current home route no longer renders section descriptions
- Validate with a focused home-route integration test plus existing route smoke coverage
