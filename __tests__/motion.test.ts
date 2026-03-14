type MockChainableTransition = {
  damping: jest.Mock<MockChainableTransition, []>;
  delay: jest.Mock<MockChainableTransition, []>;
  easing: jest.Mock<MockChainableTransition, []>;
  mass: jest.Mock<MockChainableTransition, []>;
  springify: jest.Mock<MockChainableTransition, []>;
  stiffness: jest.Mock<MockChainableTransition, []>;
  duration: jest.Mock<MockChainableTransition, []>;
};

const createMockChainableTransition = (): MockChainableTransition => ({
  damping: jest.fn(() => createMockChainableTransition()),
  delay: jest.fn(() => createMockChainableTransition()),
  easing: jest.fn(() => createMockChainableTransition()),
  mass: jest.fn(() => createMockChainableTransition()),
  springify: jest.fn(() => createMockChainableTransition()),
  stiffness: jest.fn(() => createMockChainableTransition()),
  duration: jest.fn(() => createMockChainableTransition()),
});

jest.mock('react-native-reanimated', () => ({
  Easing: {
    bezier: jest.fn(() => 'bezier'),
  },
  FadeIn: {
    duration: jest.fn(() => createMockChainableTransition()),
  },
  FadeInDown: {
    duration: jest.fn(() => createMockChainableTransition()),
  },
  FadeInUp: {
    duration: jest.fn(() => createMockChainableTransition()),
  },
  LinearTransition: {
    springify: jest.fn(() => createMockChainableTransition()),
  },
  SlideInDown: {
    springify: jest.fn(() => createMockChainableTransition()),
  },
  SlideInUp: {
    duration: jest.fn(() => createMockChainableTransition()),
  },
}));

import { createSlowFadeIn, createStaggeredFadeIn } from '@/lib/presentation/motion';

const reanimatedMock = jest.requireMock('react-native-reanimated') as {
  FadeIn: { duration: jest.Mock };
  FadeInDown: { duration: jest.Mock };
  FadeInUp: { duration: jest.Mock };
};

describe('motion helpers', () => {
  beforeEach(() => {
    reanimatedMock.FadeIn.duration.mockClear();
    reanimatedMock.FadeInDown.duration.mockClear();
    reanimatedMock.FadeInUp.duration.mockClear();
  });

  it('uses opacity-only fade in for staggered entry so it can coexist with layout transitions', () => {
    createStaggeredFadeIn(2);

    expect(reanimatedMock.FadeIn.duration).toHaveBeenCalled();
    expect(reanimatedMock.FadeInDown.duration).not.toHaveBeenCalled();
  });

  it('uses opacity-only fade in for slow entry so it can coexist with layout transitions', () => {
    createSlowFadeIn(1);

    expect(reanimatedMock.FadeIn.duration).toHaveBeenCalled();
    expect(reanimatedMock.FadeInUp.duration).not.toHaveBeenCalled();
  });
});
