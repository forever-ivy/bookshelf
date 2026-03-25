# Marker Highlight Brush Design

## Context

The current `MarkerHighlightText` implementation already renders with Skia, but the visual language still reads as a technical SVG-style path rather than the intended hand-drawn marker treatment.

The user-selected direction is **B: stronger brush feel with preserved readability**:

- Underline should feel lower, longer, thicker, and more hand-drawn
- Highlight fill should feel more like a wider marker swipe
- Both effects must stay readable in small Chinese UI copy

## Goals

1. Push the underline toward a more expressive brush stroke
2. Push the fill toward a thicker, more irregular marker swipe
3. Keep the public `MarkerHighlightText` API unchanged
4. Preserve layout-driven rendering and existing Skia-based structure
5. Maintain automated test coverage around geometry and rendering states

## Non-Goals

- No new props or new component variants
- No animation work in this pass
- No unrelated refactors outside the marker effect path builders and their tests

## Chosen Visual Direction

### Underline

- Extend farther beyond the text bounds on both sides
- Sit slightly lower than the current version
- Increase primary stroke thickness and keep a lighter trailing pass
- Introduce more asymmetry and a more obvious brush-drag feel
- Avoid looking like a neat bezier underline or system text decoration

### Highlight Fill

- Increase lateral overshoot and vertical coverage
- Make the top and bottom contours less even
- Keep a broad central body so the fill reads as a marker swipe, not a rounded rectangle
- Retain enough transparency that glyph edges remain crisp

## Implementation Shape

The adjustment should stay inside the existing rendering pipeline:

1. Keep Skia `Canvas`/`Path` rendering in `MarkerHighlightText`
2. Re-tune `buildUnderlineMarkerPaths()` for:
   - longer stroke span
   - lower baseline
   - thicker first pass
   - more pronounced path irregularity
3. Re-tune `buildMarkerFillPaths()` for:
   - thicker body
   - more uneven contour
   - slightly more expressive left/right bleed
4. Update geometry tests to reflect the new stronger brush envelope where needed

## Affected Files

- `components/base/marker-highlight-text.utils.ts`
- `components/base/marker-highlight-text.tsx` only if spacing needs tiny follow-up adjustment
- `__tests__/components/base/marker-highlight-text.utils.test.ts`
- `__tests__/components/base/marker-highlight-text.test.tsx` only if render assertions need tuning

## Validation

- Run targeted marker tests first
- Run full `npm test -- --runInBand`
- Run `npm run lint -- --no-cache`
- Manually inspect the homepage and example usages, focusing on:
  - `35 分钟` underline
  - search-bar highlight
  - homepage title/content highlights

## Acceptance Criteria

- The underline visibly reads as a brush stroke rather than a default underline
- The highlight fill visibly reads as a marker swipe rather than a rounded block
- The result is closer to the user’s selected **B** direction
- No regressions in existing marker usages or test coverage
