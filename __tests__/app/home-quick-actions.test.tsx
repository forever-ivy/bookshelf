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
let mockActiveOrdersData: Array<{
  mode: 'cabinet_pickup' | 'robot_delivery';
  status: 'active' | 'dueSoon';
  statusLabel: string;
}> = [];

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

  const StackScreen = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  StackScreen.Title = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);

  const Toolbar = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  Toolbar.Button = () => null;
  Toolbar.View = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);

  const Stack = {
    Screen: StackScreen,
    Toolbar,
  };

  return {
    Link,
    Stack,
    usePathname: () => '/',
    useRouter: () => mockRouter,
  };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: jest.fn(),
  }),
}));

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
  useAchievementsQuery: () => ({
    data: {
      currentPoints: 860,
      streakLabel: '连续学习 9 天',
      summary: {
        aiAssists: 14,
        completedOrders: 7,
        readingDays: 28,
        totalBorrowedBooks: 28,
      },
    },
  }),
  useActiveOrdersQuery: () => ({
    data: mockActiveOrdersLoading ? undefined : mockActiveOrdersData,
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

import HomeRoute from '@/app/(tabs)/(home)';

describe('HomeRoute quick actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasLibraryService = true;
    mockActiveOrdersLoading = false;
    mockHomeFeedLoading = false;
    mockPersonalizedLoading = false;
    mockActiveOrdersData = [
      {
        mode: 'robot_delivery',
        status: 'active',
        statusLabel: '机器人配送中',
      },
      {
        mode: 'cabinet_pickup',
        status: 'dueSoon',
        statusLabel: '即将到期',
      },
    ];
  });

  it('does not render homepage quick actions or the search shortcut', () => {
    render(<HomeRoute />);

    expect(screen.getByText('1 单配送中')).toBeTruthy();
    expect(screen.getByText('1 本临近到期')).toBeTruthy();
    expect(screen.getByText('连续学习 9 天')).toBeTruthy();
    expect(screen.queryByText('学习导师')).toBeNull();
    expect(screen.queryByText('继续《机器学习从零到一》')).toBeNull();
    expect(screen.queryByText('1 / 4 步')).toBeNull();
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

    expect(screen.queryByTestId('home-learning-focus-skeleton')).toBeNull();
    expect(screen.getByText('快速开始')).toBeTruthy();
    expect(screen.getByText('推荐借阅')).toBeTruthy();
    expect(screen.getByText('专题书单')).toBeTruthy();
    expect(screen.getByTestId('home-quick-start-skeleton')).toBeTruthy();
    expect(screen.getByTestId('home-recommendation-skeleton')).toBeTruthy();
    expect(screen.getByTestId('home-featured-skeleton')).toBeTruthy();
  });

  it('shows empty-state hero chips when there are no delivery or due-soon orders', () => {
    mockActiveOrdersData = [];

    render(<HomeRoute />);

    expect(screen.getByText('暂无订单')).toBeTruthy();
    expect(screen.getByText('暂无临期')).toBeTruthy();
    expect(screen.getByText('连续学习 9 天')).toBeTruthy();
  });

  it('prioritizes real hero chip signals ahead of empty-state chips', () => {
    mockActiveOrdersData = [
      {
        mode: 'cabinet_pickup',
        status: 'dueSoon',
        statusLabel: '即将到期',
      },
    ];

    render(<HomeRoute />);

    const chipTexts = screen.getAllByText(/(连续学习 9 天|1 本临近到期|暂无订单)/).map((node) => node.props.children);

    expect(chipTexts).toEqual(['1 本临近到期', '连续学习 9 天', '暂无订单']);
  });
});
