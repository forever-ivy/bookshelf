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
