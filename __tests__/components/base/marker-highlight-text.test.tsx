import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { MarkerHighlightText } from '@/components/base/marker-highlight-text';

describe('MarkerHighlightText', () => {
  it('falls back to plain text and forwards numberOfLines when the highlight is missing', () => {
    render(
      <MarkerHighlightText highlight="自然语言" numberOfLines={2} text="搜索书名" />
    );

    expect(screen.getByText('搜索书名').props.numberOfLines).toBe(2);
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
  });

  it('does not render the svg overlay until the highlight text reports wrapped lines', () => {
    render(
      <MarkerHighlightText
        highlight="课程或自然语言"
        text="搜索书名、作者、课程或自然语言"
      />
    );

    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();
    expect(screen.queryByTestId('marker-highlight-rect')).toBeNull();
  });

  it('shows the svg overlay after the highlight text reports wrapped lines', () => {
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
    expect(screen.getAllByTestId('marker-highlight-rect')).toHaveLength(4);
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
    expect(screen.getAllByTestId('marker-highlight-rect')).toHaveLength(2);
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
    expect(screen.getAllByTestId('marker-highlight-rect')).toHaveLength(4);
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
