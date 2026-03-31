import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { SoftSearchBar } from '@/components/base/soft-search-bar';

describe('SoftSearchBar', () => {
  it('uses the marker-highlight component for the primary prompt', () => {
    render(<SoftSearchBar />);

    expect(screen.getByText('搜索书名、作者、更多信息')).toBeTruthy();
    expect(screen.queryByTestId('marker-highlight-overlay')).toBeNull();

    fireEvent(screen.getByText(/更多信息/), 'textLayout', {
      nativeEvent: {
        lines: [{ height: 20, width: 72, x: 0, y: 0 }],
      },
    });

    expect(screen.getByTestId('marker-highlight-overlay')).toBeTruthy();
  });
});
