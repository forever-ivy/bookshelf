import { render, screen } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};
let mockHasLibraryService = true;
let mockActiveOrdersLoading = false;
let mockHomeFeedLoading = false;
let mockPersonalizedLoading = false;

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
    usePathname: () => '/',
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

jest.mock('@/lib/api/client', () => {
  const actual = jest.requireActual('@/lib/api/client');

  return {
    ...actual,
    hasLibraryService: () => mockHasLibraryService,
  };
});

jest.mock('@/hooks/use-library-app-data', () => ({
  useActiveOrdersQuery: () => ({
    data: mockActiveOrdersLoading
      ? undefined
      : [
          {
            statusLabel: '机器人配送中',
          },
        ],
    isFetching: mockActiveOrdersLoading,
  }),
  useBookDetailQueries: () => [],
  useHomeFeedQuery: () => ({
    data: mockHomeFeedLoading
      ? undefined
      : {
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
    isFetching: mockHomeFeedLoading,
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: mockPersonalizedLoading ? undefined : [],
    isFetching: mockPersonalizedLoading,
  }),
  useRecommendationDashboardQuery: () => ({
    data: null,
  }),
}));

import HomeRoute from '@/app/(tabs)/index';

describe('HomeRoute quick actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasLibraryService = true;
    mockActiveOrdersLoading = false;
    mockHomeFeedLoading = false;
    mockPersonalizedLoading = false;
  });

  it('does not render homepage quick actions or the search shortcut', () => {
    render(<HomeRoute />);

    expect(screen.queryByText('搜索书名、作者、更多信息')).toBeNull();
    expect(screen.queryByText('继续借阅')).toBeNull();
    expect(screen.queryByText('配送状态')).toBeNull();
    expect(screen.queryByText('推荐解释')).toBeNull();
    expect(screen.queryByTestId('home-quick-action-borrow_now')).toBeNull();
    expect(screen.queryByTestId('home-quick-action-delivery_status')).toBeNull();
    expect(screen.queryByTestId('home-quick-action-recommendation_reason')).toBeNull();
  });

  it('keeps reader homepage sections mounted with skeletons during the first load', () => {
    mockActiveOrdersLoading = true;
    mockHomeFeedLoading = true;
    mockPersonalizedLoading = true;

    render(<HomeRoute />);

    expect(screen.getByText('快速开始')).toBeTruthy();
    expect(screen.getByText('推荐借阅')).toBeTruthy();
    expect(screen.getByText('专题书单')).toBeTruthy();
    expect(screen.getByTestId('home-quick-start-skeleton')).toBeTruthy();
    expect(screen.getByTestId('home-recommendation-skeleton')).toBeTruthy();
    expect(screen.getByTestId('home-featured-skeleton')).toBeTruthy();
  });
});
