import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { DueStateChip } from '@/components/borrowing/due-state-chip';

describe('DueStateChip', () => {
  it('uses a vivid green palette for completed state', () => {
    render(<DueStateChip state="completed" />);

    expect(screen.getByText('已完成')).toHaveStyle({
      color: '#1F8A43',
    });
  });
});
