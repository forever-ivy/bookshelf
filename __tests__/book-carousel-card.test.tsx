import React from 'react';
import { render, within } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { ScrollView, View } = require('react-native');

  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );
  const AnimatedScrollView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(ScrollView, { ...props, ref }, props.children)
  );
  const createChainableTransition = () => ({
    damping: () => createChainableTransition(),
    delay: () => createChainableTransition(),
    easing: () => createChainableTransition(),
    mass: () => createChainableTransition(),
    springify: () => createChainableTransition(),
    stiffness: () => createChainableTransition(),
    duration: () => createChainableTransition(),
  });

  const mockReanimated = {
    Easing: {
      bezier: () => 'bezier',
    },
    FadeIn: {
      duration: () => createChainableTransition(),
    },
    FadeInDown: {
      duration: () => createChainableTransition(),
    },
    FadeInUp: {
      duration: () => createChainableTransition(),
    },
    LinearTransition: {
      springify: () => createChainableTransition(),
    },
    SlideInDown: {
      springify: () => createChainableTransition(),
    },
    SlideInUp: {
      duration: () => createChainableTransition(),
    },
    View: AnimatedView,
    ScrollView: AnimatedScrollView,
    createAnimatedComponent: <T,>(Component: T) => Component,
    interpolate: (_value: number, _input: number[], output: number[]) => output[1] ?? output[0] ?? 0,
    useAnimatedScrollHandler: () => jest.fn(),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: <T,>(value: T) => ({ value }),
  };

  return {
    __esModule: true,
    ...mockReanimated,
    default: mockReanimated,
  };
});

import { BookCarouselCard } from '@/components/cards/book-carousel-card';

jest.mock('@/hooks/use-cover', () => ({
  useCover: () => ({
    cover: {
      colors: ['#123456', '#654321'],
      kind: 'gradient',
      title: '测试封面',
    },
    handleImageError: jest.fn(),
  }),
}));

describe('BookCarouselCard', () => {
  it('separates layout and transform animation wrappers for each book item', () => {
    const screen = render(
      <BookCarouselCard
        items={[
          {
            done: false,
            id: 1,
            note: '先读这本',
            title: '第一本书',
          },
        ]}
      />
    );

    const layoutWrapper = screen.getByTestId('book-carousel-item-layout-0');
    const motionWrapper = screen.getByTestId('book-carousel-item-motion-0');

    expect(layoutWrapper).toBeTruthy();
    expect(motionWrapper).toBeTruthy();
    expect(within(layoutWrapper).getByTestId('book-carousel-item-motion-0')).toBe(motionWrapper);
  });
});
