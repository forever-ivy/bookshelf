import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    delay: () => chain,
    duration: () => chain,
  };

  return {
    __esModule: true,
    FadeInUp: chain,
    default: {
      View: ({ children, ...props }: React.ComponentProps<typeof View>) =>
        React.createElement(View, props, children),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  return {
    Link,
    useRouter: () => mockRouter,
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: {
      accountId: 1,
      profileId: 1,
      role: 'reader',
    },
    isAuthenticated: true,
    onboarding: {
      completed: true,
      needsInterestSelection: false,
      needsProfileBinding: false,
    },
    profile: null,
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useActiveOrdersQuery: () => ({
    data: [
      {
        statusLabel: '机器人配送中',
      },
    ],
  }),
  useHomeFeedQuery: () => ({
    data: {
      quickActions: [
        {
          code: 'borrow_now',
          description: '从可借、可送的书里直接开始',
          meta: '3 本优先推荐已就绪',
          title: '今晚待开始',
        },
        {
          code: 'delivery_status',
          description: '查看机器人和书柜履约进度',
          meta: '配送元信息',
          title: '配送状态',
        },
        {
          code: 'recommendation_reason',
          description: '看看为什么推荐这几本',
          meta: '解释型推荐',
          title: '推荐解释',
        },
      ],
      systemBooklists: [],
      todayRecommendations: [],
    },
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: [],
  }),
  useRecommendationDashboardQuery: () => ({
    data: null,
  }),
}));

import HomeRoute from '@/app/(tabs)/index';

describe('HomeRoute quick actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('routes each homepage quick action to its destination', () => {
    render(<HomeRoute />);

    expect(screen.queryByText('3 本优先推荐已就绪')).toBeNull();
    expect(screen.queryByText('配送元信息')).toBeNull();
    expect(screen.queryByText('解释型推荐')).toBeNull();

    fireEvent.press(screen.getByTestId('home-quick-action-borrow_now'));
    fireEvent.press(screen.getByTestId('home-quick-action-delivery_status'));
    fireEvent.press(screen.getByTestId('home-quick-action-recommendation_reason'));

    expect(mockRouter.push).toHaveBeenNthCalledWith(1, '/search/borrow-now');
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, '/(tabs)/borrowing');
    expect(mockRouter.push).toHaveBeenNthCalledWith(3, '/search');
  });
});
