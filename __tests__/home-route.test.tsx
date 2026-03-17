import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
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

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      Text: AnimatedText,
    },
    Extrapolation: {
      CLAMP: 'clamp',
    },
    View: AnimatedView,
    interpolate: jest.fn(() => 1),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    useSharedValue: (value: unknown) => ({ value }),
  };
});

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: `redirect-${href}` });
  },
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: (
    selector: (state: {
      connection: { baseUrl: string; displayName: string } | null;
      currentMemberId: number | null;
      setCurrentMemberId: (id: number) => void;
    }) => unknown
  ) =>
    selector({
      connection: {
        baseUrl: 'preview://cabinet',
        displayName: '预览书柜',
      },
      currentMemberId: 1,
      setCurrentMemberId: jest.fn(),
    }),
}));

jest.mock('@/lib/api/react-query/hooks', () => ({
  useCompartmentsQuery: () => ({
    data: [{ book: '设计心理学', cid: 1, status: 'occupied', x: 0, y: 0 }],
    error: null,
  }),
  useCurrentUserQuery: () => ({
    data: { id: 1, name: '米洛' },
  }),
  useMemberStatsQuery: () => ({
    data: {
      goal_reached: false,
      weekly_goal: 5,
      weekly_takes: 2,
    },
    error: null,
  }),
  useUsersQuery: () => ({
    data: [{ id: 1, name: '米洛' }],
    error: null,
  }),
}));

jest.mock('@/components/navigation/screen-shell', () => ({
  ScreenShell: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-screen-shell' }, children);
  },
}));

jest.mock('@/components/member/avatar-switcher', () => ({
  AvatarSwitcher: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-avatar-switcher' });
  },
}));

jest.mock('@/components/background/hero-bubble-background', () => ({
  HeroBubbleBackground: () => null,
}));

jest.mock('@/components/cards/cabinet-status-card', () => ({
  CabinetStatusCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-cabinet-status' });
  },
}));

jest.mock('@/components/actions/glass-pill-button', () => ({
  GlassPillButton: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-glass-pill-button' });
  },
}));

jest.mock('@/components/cards/goal-progress-card', () => ({
  GoalProgressCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-goal-card' });
  },
}));

jest.mock('@/components/member/member-switcher-sheet', () => ({
  MemberSwitcherSheet: () => null,
}));

jest.mock('@/components/surfaces/section-card', () => ({
  SectionCard: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-section-card' }, children);
  },
}));

jest.mock('@/components/actions/shortcut-card', () => ({
  ShortcutCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-shortcut-card' });
  },
}));

jest.mock('@/components/layout/two-column-grid', () => ({
  TwoColumnGrid: ({ children }: { children?: React.ReactNode }) => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-grid' }, children);
  },
}));

jest.mock('@/components/cards/book-carousel-card', () => ({
  BookCarouselCard: () => {
    const React = require('react');
    const { View } = require('react-native');

    return React.createElement(View, { testID: 'home-book-carousel' });
  },
}));

jest.mock('@/lib/presentation/home-helpers', () => ({
  buildCabinetStatusSummary: () => ({
    availableCompartments: 1,
    connectedLabel: '已连接',
    locationLabel: '书房',
    totalCompartments: 2,
    usedCompartments: 1,
  }),
  getTimeBasedGreeting: () => '晚上好',
}));

jest.mock('@/lib/presentation/motion', () => ({
  createStaggeredFadeIn: () => undefined,
  motionTransitions: {
    gentle: undefined,
  },
}));

import HomeRoute from '@/app/(tabs)/home/index';

describe('HomeRoute', () => {
  it('does not render the family overview carousel on the home dashboard anymore', () => {
    const screen = render(<HomeRoute />);

    expect(screen.queryByTestId('home-book-carousel')).toBeNull();
  });
});
