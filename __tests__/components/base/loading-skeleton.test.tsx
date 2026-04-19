import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';

describe('loading skeleton primitives', () => {
  it('renders blocks through HeroUI Skeleton', () => {
    render(<LoadingSkeletonBlock height={18} testID="loading-block" width="62%" />);

    const block = screen.getByTestId('loading-block');

    expect(block.props.accessibilityLabel).toBe('heroui-skeleton');
    expect(block.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          height: 18,
          width: '62%',
        }),
      ])
    );
  });

  it('renders text lines through HeroUI SkeletonGroup items', () => {
    render(
      <LoadingSkeletonText
        gap={10}
        lineHeight={14}
        testIDPrefix="loading-copy"
        widths={['80%', '48%']}
      />
    );

    const firstLine = screen.getByTestId('loading-copy-1');
    const secondLine = screen.getByTestId('loading-copy-2');

    expect(screen.getByLabelText('heroui-skeleton-group')).toBeTruthy();
    expect(firstLine.props.accessibilityLabel).toBe('heroui-skeleton-group-item');
    expect(secondLine.props.accessibilityLabel).toBe('heroui-skeleton-group-item');
    expect(firstLine.props.style).toEqual(
      expect.objectContaining({
        height: 14,
        width: '80%',
      })
    );
  });

  it('keeps the card wrapper styling around skeleton content', () => {
    render(
      <LoadingSkeletonCard testID="loading-card">
        <Text>child</Text>
      </LoadingSkeletonCard>
    );

    const card = screen.getByTestId('loading-card');

    expect(card.props.accessibilityLabel).toBe('heroui-card');
    expect(screen.getByText('child')).toBeTruthy();
  });
});
