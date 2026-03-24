# Marker Highlight Text Design

**Date:** 2026-03-24

## Goal

Add a reusable native text highlighter component for the Expo app that visually matches the approved static "marker stroke" direction.

The first implementation should work on iOS and Android, avoid animation, and support a highlighted substring that can wrap across multiple lines while keeping the hand-marked look.

## Approved Decisions

- Visual direction: `B` style marker highlight
- Component scope: reusable base component
- Wrapping support: the highlighted substring itself may span multiple lines
- Interaction model: static only, no animation
- Initial style support: highlight only

## Non-Goals

- No rough-notation style animation
- No support for arbitrary `children` trees in the first version
- No support for multiple highlighted substrings in the first version
- No underline, box, circle, or strike-through variants in the first version

## Component Boundary

Create a new base component at `components/base/marker-highlight-text.tsx`.

The component is responsible for rendering a complete text string, locating the first matching substring, and painting a marker-style background behind the matched text.

The component should gracefully fall back to plain text when the highlight string is empty or not found.

## Proposed API

```ts
type MarkerHighlightTextProps = {
  text: string;
  highlight: string;
  textStyle?: TextStyle;
  highlightColor?: string;
  markerIntensity?: 'soft' | 'medium';
  numberOfLines?: number;
};
```

### API Notes

- `text`: the full rendered string
- `highlight`: the first matching substring to annotate
- `textStyle`: caller-provided typography and color styles
- `highlightColor`: optional override for the marker color
- `markerIntensity`: small visual preset for opacity and offset strength
- `numberOfLines`: forwarded to the underlying text layout for constrained contexts

This API intentionally favors reliable measurement over maximum flexibility. A string-based API is easier to measure correctly in React Native than an arbitrary nested `children` API.

For the first version, substring matching should be a simple first exact match against the provided string. Case-insensitive search and multiple-match support are explicitly out of scope.

## Rendering Strategy

Use a layered native rendering approach:

1. Render the real text using nested React Native `Text` nodes for prefix, highlighted substring, and suffix.
2. Attach `onTextLayout` to the highlighted substring so React Native reports how that substring wraps into lines.
3. Place an absolutely positioned `Svg` overlay inside the same container.
4. For each reported line, draw two rounded rectangles with slight inset and offset differences to simulate a marker stroke.

This approach preserves native line wrapping while allowing the highlight background to match the real width of each wrapped line.

The overlay should be non-interactive and should only draw against the visible lines returned by layout. If `numberOfLines` truncates the text, the marker should only cover the visible portion of the highlighted substring.

## Visual Rules

- Default color should be a soft blue that fits the current paper-like theme
- Each wrapped line should receive two static marker layers
- The two layers should differ slightly in inset, height, and vertical offset
- Shapes should be rounded and imperfect enough to feel hand-marked, but still clean and calm
- Rendering should be deterministic; no random values during render

## Theme Alignment

The component should fit the current visual system in `constants/app-theme.ts`, which is warm, muted, and paper-like.

The default marker color should stay soft enough to avoid overpowering body text, especially in compact surfaces like the search bar.

## Initial Integration

Use the component first in `components/base/soft-search-bar.tsx`.

The first integration should highlight the `"课程或自然语言"` portion of the search prompt text so the effect can be validated in a compact, real product surface before broader reuse.

## Error Handling And Fallbacks

- If `highlight` is empty, render plain text
- If the substring is not found, render plain text
- If text layout information is unavailable on first render, render text first and paint the overlay after layout is reported
- If line measurements differ slightly by platform, prioritize stable visual output over exact pixel parity

## Testing Strategy

Add focused tests around the non-visual logic first:

- splitting text into prefix / highlight / suffix
- handling empty or missing highlight values
- deriving stable marker rectangles from reported line metrics

Then add a component-level render test to verify the fallback and highlighted rendering paths can mount without crashing.

Visual fine-tuning should be validated in the app runtime after tests pass.

## Risks

- `onTextLayout` behavior may vary slightly between iOS and Android
- Nested text measurement can be sensitive to typography and line-height changes
- Compact layouts may make the marker look too heavy if the default opacity is too strong

These risks are acceptable for the first version because the component scope is intentionally narrow and the initial integration surface is small.

## Implementation Direction

Proceed with a lightweight implementation that keeps the drawing logic local to this component.

If the component proves useful in additional surfaces later, a future iteration can add richer APIs such as multiple highlights or alternate annotation styles without changing the first version's core rendering model.
