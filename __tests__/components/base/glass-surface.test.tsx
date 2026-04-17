import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';

describe('GlassSurface', () => {
  it('makes non-interactive liquid glass layers transparent to touch', () => {
    render(
      <GlassSurface glassViewTestID="glass-surface-view">
        <Text>decorative card</Text>
      </GlassSurface>
    );

    expect(screen.getByTestId('glass-surface-view').props.pointerEvents).toBe('none');
  });

  it('keeps interactive liquid glass layers touchable', () => {
    render(
      <GlassSurface glassViewTestID="glass-surface-view" interactive>
        <Text>interactive card</Text>
      </GlassSurface>
    );

    expect(screen.getByTestId('glass-surface-view').props.pointerEvents).toBe('auto');
  });
});
