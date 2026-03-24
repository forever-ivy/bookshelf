# Marker Highlight Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable native marker-highlight text component that paints a static multi-line marker effect and wire it into the soft search bar.

**Architecture:** Keep deterministic string parsing and marker-rectangle derivation in a pure helper module so the tricky logic is easy to test without rendering. Build the React Native component on top of nested `Text` nodes plus a `react-native-svg` overlay that paints one marker shape per wrapped line. Integrate the component into the search bar only after the helper and component behavior are covered by focused tests.

**Tech Stack:** Expo 55, React Native 0.83, TypeScript, react-native-svg, Jest, @testing-library/react-native

---

## Implementation Notes

- Follow `@superpowers:test-driven-development` for every code change.
- Follow `@superpowers:verification-before-completion` before making any success claim.
- Keep the first version narrow: exact first-match highlight only, static highlight only, no arbitrary `children`.
- Prefer adding one soft blue theme token instead of hard-coding the default marker color in the component.

## File Structure

- Create: `components/base/marker-highlight-text.utils.ts`
  Purpose: pure helpers for exact-match text splitting and stable marker rectangle derivation from wrapped line metrics.
- Create: `components/base/marker-highlight-text.tsx`
  Purpose: render prefix/highlight/suffix text, capture highlight layout, and paint the SVG marker overlay.
- Modify: `components/base/soft-search-bar.tsx`
  Purpose: replace the plain prompt text with the reusable marker-highlight component.
- Modify: `constants/app-theme.ts`
  Purpose: add the default marker blue token used by the new component.
- Create: `__tests__/components/base/marker-highlight-text.utils.test.ts`
  Purpose: cover exact-match splitting, fallback behavior, and deterministic rectangle derivation.
- Create: `__tests__/components/base/marker-highlight-text.test.tsx`
  Purpose: cover plain-text fallback, highlighted rendering, and the post-layout SVG overlay path.
- Create: `__tests__/components/base/soft-search-bar.test.tsx`
  Purpose: cover the integration point used by the first shipped surface.

### Task 1: Add Pure Highlight Helpers

**Files:**
- Create: `components/base/marker-highlight-text.utils.ts`
- Modify: `constants/app-theme.ts`
- Test: `__tests__/components/base/marker-highlight-text.utils.test.ts`

- [ ] **Step 1: Write the failing helper test**

```ts
import {
  buildMarkerRects,
  splitHighlightText,
} from '@/components/base/marker-highlight-text.utils';

describe('splitHighlightText', () => {
  it('splits the first exact match into prefix, highlight, and suffix', () => {
    expect(
      splitHighlightText('搜索书名、作者、课程或自然语言', '课程或自然语言')
    ).toEqual({
      prefix: '搜索书名、作者、',
      highlight: '课程或自然语言',
      suffix: '',
    });
  });

  it('returns null when highlight is empty or not found', () => {
    expect(splitHighlightText('搜索书名', '')).toBeNull();
    expect(splitHighlightText('搜索书名', '自然语言')).toBeNull();
  });
});

describe('buildMarkerRects', () => {
  it('builds deterministic layered marker rectangles for wrapped lines', () => {
    expect(
      buildMarkerRects(
        [
          { height: 20, width: 46, x: 0, y: 0 },
          { height: 20, width: 72, x: 0, y: 20 },
        ],
        'medium'
      )
    ).toEqual([
      expect.objectContaining({ lineIndex: 0, layer: 0, width: expect.any(Number) }),
      expect.objectContaining({ lineIndex: 0, layer: 1, width: expect.any(Number) }),
      expect.objectContaining({ lineIndex: 1, layer: 0, width: expect.any(Number) }),
      expect.objectContaining({ lineIndex: 1, layer: 1, width: expect.any(Number) }),
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.utils.test.ts`
Expected: FAIL because `marker-highlight-text.utils.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export type MarkerIntensity = 'soft' | 'medium';

export function splitHighlightText(text: string, highlight: string) {
  if (!highlight) {
    return null;
  }

  const start = text.indexOf(highlight);
  if (start < 0) {
    return null;
  }

  return {
    prefix: text.slice(0, start),
    highlight,
    suffix: text.slice(start + highlight.length),
  };
}

export function buildMarkerRects(
  lines: Array<{ width: number; height: number; x: number; y: number }>,
  intensity: MarkerIntensity
) {
  const layers = intensity === 'medium'
    ? [
        { insetX: 2, offsetY: 3, heightRatio: 0.62, opacity: 0.34 },
        { insetX: 0, offsetY: 5, heightRatio: 0.54, opacity: 0.22 },
      ]
    : [
        { insetX: 1, offsetY: 2, heightRatio: 0.54, opacity: 0.28 },
        { insetX: 0, offsetY: 4, heightRatio: 0.46, opacity: 0.18 },
      ];

  return lines.flatMap((line, lineIndex) =>
    layers.map((layer, layerIndex) => ({
      key: `marker-${lineIndex}-${layerIndex}`,
      lineIndex,
      layer: layerIndex,
      opacity: layer.opacity,
      x: line.x - layer.insetX,
      y: line.y + layer.offsetY,
      width: line.width + layer.insetX * 2,
      height: line.height * layer.heightRatio,
      rx: 6,
    }))
  );
}
```

Also add a theme token in `constants/app-theme.ts`, for example:

```ts
markerHighlightBlue: '#9FD4F6',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add constants/app-theme.ts \
  components/base/marker-highlight-text.utils.ts \
  __tests__/components/base/marker-highlight-text.utils.test.ts
git commit -m "feat: add marker highlight helpers"
```

### Task 2: Build the MarkerHighlightText Component

**Files:**
- Create: `components/base/marker-highlight-text.tsx`
- Test: `__tests__/components/base/marker-highlight-text.test.tsx`

- [ ] **Step 1: Write the failing component test**

```ts
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { MarkerHighlightText } from '@/components/base/marker-highlight-text';

describe('MarkerHighlightText', () => {
  it('falls back to plain text when the highlight is missing', () => {
    render(<MarkerHighlightText highlight="自然语言" text="搜索书名" />);

    expect(screen.getByText('搜索书名')).toBeTruthy();
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('shows the svg overlay after the highlight text reports wrapped lines', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [
          { height: 20, width: 46, x: 0, y: 0 },
          { height: 20, width: 72, x: 0, y: 20 },
        ],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();
    expect(screen.getAllByTestId('marker-highlight-rect')).toHaveLength(4);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.test.tsx`
Expected: FAIL because `marker-highlight-text.tsx` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, type TextStyle, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { appTheme } from '@/constants/app-theme';
import {
  buildMarkerRects,
  splitHighlightText,
  type MarkerIntensity,
} from '@/components/base/marker-highlight-text.utils';

type MarkerHighlightTextProps = {
  text: string;
  highlight: string;
  textStyle?: TextStyle;
  highlightColor?: string;
  markerIntensity?: MarkerIntensity;
  numberOfLines?: number;
};

export function MarkerHighlightText({
  text,
  highlight,
  textStyle,
  highlightColor = appTheme.colors.markerHighlightBlue,
  markerIntensity = 'medium',
  numberOfLines,
}: MarkerHighlightTextProps) {
  const parts = splitHighlightText(text, highlight);
  const [lines, setLines] = useState<Array<{ height: number; width: number; x: number; y: number }>>([]);
  const rects = useMemo(() => buildMarkerRects(lines, markerIntensity), [lines, markerIntensity]);

  if (!parts) {
    return <Text style={textStyle}>{text}</Text>;
  }

  return (
    <View style={styles.container}>
      {rects.length > 0 ? (
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} testID="marker-highlight-overlay">
          {rects.map((rect) => (
            <Rect
              key={rect.key}
              fill={highlightColor}
              fillOpacity={rect.opacity}
              height={rect.height}
              rx={rect.rx}
              testID="marker-highlight-rect"
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
          ))}
        </Svg>
      ) : null}
      <Text numberOfLines={numberOfLines} style={textStyle}>
        {parts.prefix}
        <Text onTextLayout={(event) => setLines(event.nativeEvent.lines)}>{parts.highlight}</Text>
        {parts.suffix}
      </Text>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/base/marker-highlight-text.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/base/marker-highlight-text.tsx \
  __tests__/components/base/marker-highlight-text.test.tsx
git commit -m "feat: add marker highlight text component"
```

### Task 3: Integrate the Component into SoftSearchBar

**Files:**
- Modify: `components/base/soft-search-bar.tsx`
- Test: `__tests__/components/base/soft-search-bar.test.tsx`

- [ ] **Step 1: Write the failing integration test**

```ts
import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SoftSearchBar } from '@/components/base/soft-search-bar';

describe('SoftSearchBar', () => {
  it('uses the marker-highlight component for the primary prompt', () => {
    render(<SoftSearchBar />);

    expect(screen.getByText('搜索书名、作者、课程或自然语言')).toBeTruthy();
    expect(screen.getByText('比如：机器学习入门、适合新手的心理学书')).toBeTruthy();

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runTestsByPath __tests__/components/base/soft-search-bar.test.tsx`
Expected: FAIL because `SoftSearchBar` still uses a plain `Text` node and never renders `marker-highlight-overlay`.

- [ ] **Step 3: Write minimal implementation**

Update `components/base/soft-search-bar.tsx` so the first line uses the reusable component instead of a plain `Text` node:

```tsx
import { MarkerHighlightText } from '@/components/base/marker-highlight-text';

<MarkerHighlightText
  highlight="课程或自然语言"
  text="搜索书名、作者、课程或自然语言"
  textStyle={{
    color: theme.colors.text,
    ...theme.typography.medium,
    fontSize: 14,
  }}
/>
```

Keep the secondary line and the rest of the search bar unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runTestsByPath __tests__/components/base/soft-search-bar.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/base/soft-search-bar.tsx \
  __tests__/components/base/soft-search-bar.test.tsx
git commit -m "feat: use marker highlight in search bar"
```

### Task 4: Run Feature-Level Regression Verification

**Files:**
- No new files unless verification exposes regressions that need fixes

- [ ] **Step 1: Run the focused marker-highlight suite**

Run:

```bash
npm test -- --runTestsByPath \
  __tests__/components/base/marker-highlight-text.utils.test.ts \
  __tests__/components/base/marker-highlight-text.test.tsx \
  __tests__/components/base/soft-search-bar.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run the existing UI shell smoke test**

Run: `npm test -- --runTestsByPath __tests__/ui-shell.test.tsx`
Expected: PASS

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS

- [ ] **Step 4: Fix any regression surfaced by the verification commands**

If any command fails, make the smallest code change necessary, then rerun only the failing command before returning to the full verification sequence.

- [ ] **Step 5: Commit verification fixes only if Step 4 changed files**

```bash
git add constants/app-theme.ts \
  components/base/marker-highlight-text.tsx \
  components/base/marker-highlight-text.utils.ts \
  components/base/soft-search-bar.tsx \
  __tests__/components/base/marker-highlight-text.utils.test.ts \
  __tests__/components/base/marker-highlight-text.test.tsx \
  __tests__/components/base/soft-search-bar.test.tsx
git commit -m "fix: address marker highlight verification issues"
```
