import React from 'react';
import { render, within } from '@testing-library/react-native';
import { Circle } from 'react-native-svg';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const createChainableTransition = () => ({
    damping: () => createChainableTransition(),
    delay: () => createChainableTransition(),
    duration: () => createChainableTransition(),
    easing: () => createChainableTransition(),
    mass: () => createChainableTransition(),
    springify: () => createChainableTransition(),
    stiffness: () => createChainableTransition(),
  });

  const AnimatedView = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(View, { ...props, ref }, props.children)
  );
  const AnimatedText = React.forwardRef(
    (
      props: Record<string, unknown> & { children?: React.ReactNode },
      ref: React.ForwardedRef<unknown>
    ) => React.createElement(Text, { ...props, ref }, props.children)
  );

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
    Text: AnimatedText,
    createAnimatedComponent: <T,>(Component: T) => Component,
    runOnJS: <T extends (...args: never[]) => unknown>(fn: T) => fn,
    useAnimatedProps: (updater: () => Record<string, unknown>) => updater(),
    useAnimatedReaction: jest.fn(),
    useSharedValue: <T,>(value: T) => ({ value }),
    withTiming: <T,>(value: T) => value,
  };

  return {
    __esModule: true,
    ...mockReanimated,
    default: mockReanimated,
  };
});

import { GoalProgressCard } from '@/components/cards/goal-progress-card';

describe('GoalProgressCard', () => {
  it('applies a concrete dash offset to the progress ring for the current progress', () => {
    const screen = render(
      <GoalProgressCard
        currentValue={1}
        progress={0.2}
        subtitle="这周再借几本书，就能把家庭阅读节奏重新带起来。"
        targetValue={5}
        title="阅读目标"
      />
    );

    const circles = screen.UNSAFE_getAllByType(Circle);
    const progressRing = circles[1];
    const radius = 42;
    const circumference = 2 * Math.PI * radius;

    expect(progressRing.props.strokeDashoffset).toBeCloseTo(circumference * 0.8, 5);
  });

  it('keeps the CTA inside the copy column when the action is available', () => {
    const screen = render(
      <GoalProgressCard
        buttonLabel="查看档案"
        currentValue={1}
        onPress={jest.fn()}
        progress={0.2}
        subtitle="这周再借几本书，就能把家庭阅读节奏重新带起来。"
        targetValue={5}
        title="阅读目标"
      />
    );

    const copyColumn = screen.getByTestId('goal-progress-card-copy');
    const cta = screen.getByRole('button', { name: '查看档案' });

    expect(within(copyColumn).getByText('阅读目标')).toBeTruthy();
    expect(within(copyColumn).getByText('这周再借几本书，就能把家庭阅读节奏重新带起来。')).toBeTruthy();
    expect(within(copyColumn).getByRole('button', { name: '查看档案' })).toBe(cta);
  });

  it('omits the CTA when no action is provided', () => {
    const screen = render(
      <GoalProgressCard
        currentValue={3}
        progress={0.6}
        subtitle="每周借阅次数和目标进度会显示在这里。"
        targetValue={5}
        title="每日阅读目标"
      />
    );

    expect(screen.queryByRole('button')).toBeNull();
  });
});
