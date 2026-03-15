import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';

import { TwoColumnGrid } from '@/components/layout/two-column-grid';

describe('TwoColumnGrid', () => {
  it('splits an odd number of children into multiple deterministic rows', () => {
    const screen = render(
      <TwoColumnGrid>
        <Text>A</Text>
        <Text>B</Text>
        <Text>C</Text>
      </TwoColumnGrid>
    );

    expect(screen.getByTestId('two-column-grid-row-0')).toBeTruthy();
    expect(screen.getByTestId('two-column-grid-row-1')).toBeTruthy();
    expect(screen.getByTestId('two-column-grid-spacer-1')).toBeTruthy();
  });
});
