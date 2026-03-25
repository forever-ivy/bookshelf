import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { appTheme } from '@/constants/app-theme';

describe('MarkerHighlightText', () => {
  it('falls back to plain text and forwards numberOfLines when the highlight is missing', () => {
    render(
      <MarkerHighlightText highlight="自然语言" numberOfLines={2} text="搜索书名" />
    );

    expect(screen.getByText('搜索书名').props.numberOfLines).toBe(2);
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('does not render the Skia overlay until the highlight text reports wrapped lines', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    expect(
      StyleSheet.flatten(screen.getByText('课程或自然语言').props.style).backgroundColor
    ).toBe(`${appTheme.colors.markerHighlightBlue}88`);
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
    expect(screen.queryByTestId('marker-highlight-skia-canvas')).toBeNull();
  });

  it('uses the requested preset highlight tone for fallback and Skia fill', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        highlightTone="orange"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    expect(
      StyleSheet.flatten(screen.getByText('课程或自然语言').props.style).backgroundColor
    ).toBe(`${appTheme.colors.markerHighlightOrange}88`);

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('prefers explicit highlightColor over the preset tone', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        highlightColor="#F06292"
        highlightTone="green"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    expect(
      StyleSheet.flatten(screen.getByText('课程或自然语言').props.style).backgroundColor
    ).toBe('#F0629288');

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('renders brush-style Skia layers for the underline variant with native underline fallback', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        highlightTone="orange"
        text="搜索书名、作者、课程或自然语言"
        variant="underline"
      />
    );

    expect(
      StyleSheet.flatten(screen.getByText('课程或自然语言').props.style)
    ).toMatchObject({
      textDecorationColor: appTheme.colors.markerHighlightOrange,
      textDecorationLine: 'underline',
    });
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('renders underline brush layers from layout when nested textLayout is unavailable', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        highlightTone="orange"
        text="搜索书名、作者、课程或自然语言"
        variant="underline"
      />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();

    fireEvent(screen.getByText('课程或自然语言'), 'layout', {
      nativeEvent: {
        layout: { height: 20, width: 72, x: 0, y: 0 },
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('uses declared lineHeight for underline layout fallback when text layout height is smaller', () => {
    render(
      <MarkerHighlightText
        highlight="35 分钟"
        highlightColor="#F28A14"
        text="预计 35 分钟可以完成一轮预习。"
        textStyle={{
          fontSize: 14,
          lineHeight: 20,
        }}
        variant="underline"
      />
    );

    fireEvent(screen.getByText('35 分钟'), 'layout', {
      nativeEvent: {
        layout: { height: 14, width: 52, x: 0, y: 0 },
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('normalizes underline textLayout lines to the declared lineHeight', () => {
    render(
      <MarkerHighlightText
        highlight="35 分钟"
        highlightColor="#F28A14"
        text="预计 35 分钟可以完成一轮预习。"
        textStyle={{
          fontSize: 14,
          lineHeight: 20,
        }}
        variant="underline"
      />
    );

    fireEvent(screen.getByText('35 分钟'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 14, width: 52, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('shows the Skia overlay after the highlight text reports wrapped lines', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        numberOfLines={2}
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
    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
    expect(screen.getByText('搜索书名、作者、课程或自然语言').props.numberOfLines).toBe(2);
  });

  it('renders marker rects only for the visible truncated highlight lines', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        numberOfLines={1}
        text="搜索书名、作者、课程或自然语言"
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 46, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();
    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
    expect(screen.getByText('搜索书名、作者、课程或自然语言').props.numberOfLines).toBe(1);
  });

  it('clears stale marker rects when the text or highlight changes', () => {
    const { rerender } = render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();

    rerender(
      <MarkerHighlightText highlight="自然语言" text="搜索书名、作者、自然语言" />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('clears stale marker rects when numberOfLines changes', () => {
    const { rerender } = render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        numberOfLines={2}
        text="搜索书名、作者、课程或自然语言"
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();

    rerender(
      <MarkerHighlightText
        highlight="课程或自然语言"
        numberOfLines={1}
        text="搜索书名、作者、课程或自然语言"
      />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('clears stale marker rects when the container width changes and redraws after relayout', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    const root = screen.getByTestId('marker-highlight-root');
    const highlightText = screen.getByText('课程或自然语言');

    fireEvent(root, 'layout', {
      nativeEvent: {
        layout: { width: 240, height: 20, x: 0, y: 0 },
      },
    });

    fireEvent(highlightText, 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();

    fireEvent(root, 'layout', {
      nativeEvent: {
        layout: { width: 160, height: 40, x: 0, y: 0 },
      },
    });

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();

    fireEvent(highlightText, 'textLayout', {
      nativeEvent: {
        lines: [
          { height: 20, width: 46, x: 0, y: 0 },
          { height: 20, width: 72, x: 0, y: 20 },
        ],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();
    expect(screen.getByTestId('marker-highlight-skia-canvas')).toBeTruthy();
  });

  it('clears stale marker rects when typography-related textStyle values change', () => {
    const styles = StyleSheet.create({
      largeText: {
        fontSize: 20,
        fontWeight: '600',
      },
      smallText: {
        fontSize: 16,
        fontWeight: '400',
      },
    });

    const { rerender } = render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
        textStyle={styles.largeText}
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();

    rerender(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
        textStyle={styles.smallText}
      />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('clears stale marker rects when letterSpacing changes', () => {
    const styles = StyleSheet.create({
      normalSpacing: {
        fontSize: 18,
        letterSpacing: 0,
      },
      looseSpacing: {
        fontSize: 18,
        letterSpacing: 1.5,
      },
    });

    const { rerender } = render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
        textStyle={styles.normalSpacing}
      />
    );

    fireEvent(screen.getByText('课程或自然语言'), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();

    rerender(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
        textStyle={styles.looseSpacing}
      />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });
});
