import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockProfile: { displayName?: string | null } | null = {
  displayName: '陈知行',
};
let mockHasLibraryService = true;

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
  const { Text, View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  const StackScreen = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  StackScreen.Title = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(Text, null, children);

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
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
    }),
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
    profile: mockProfile,
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
    data: [
      {
        book: {
          title: '机器学习',
        },
        dueDateLabel: '4 月 2 日',
        statusLabel: '进行中',
      },
    ],
  }),
  useBookDetailQueries: () => [],
  useHomeFeedQuery: () => ({
    data: {
      quickActions: [],
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

import HomeRoute from '@/app/(tabs)/(home)';

describe('HomeRoute marker highlights', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-30T16:26:00+08:00'));
    mockHasLibraryService = true;
    mockProfile = {
      displayName: '陈知行',
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders quick-start tasks with icon chips and marker-highlighted detail lines', () => {
    render(<HomeRoute />);

    expect(screen.getByTestId('home-greeting-header')).toBeTruthy();
    expect(screen.getByText('下午好 🍃')).toBeTruthy();
    expect(screen.getByText('陈知行')).toBeTruthy();
    expect(screen.getByText('快速开始')).toBeTruthy();
    expect(screen.queryByText(/推荐解释：/)).toBeNull();
    expect(screen.getByText('继续阅读')).toBeTruthy();
    expect(screen.getByText('《机器学习》')).toBeTruthy();
    expect(screen.getByText('查看进度')).toBeTruthy();
    expect(screen.getByText('进行中 · 4 月 2 日')).toBeTruthy();
    expect(screen.getByText('去借阅页')).toBeTruthy();
    expect(screen.getByText('处理续借、归还和查看进度')).toBeTruthy();
    expect(screen.queryByText('个性化推荐')).toBeNull();
    expect(screen.queryByText('推荐引擎状态')).toBeNull();
    expect(screen.getAllByTestId('home-quick-start-item')).toHaveLength(3);
    expect(screen.getAllByTestId('home-quick-start-item-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('marker-highlight-root')).toHaveLength(2);
    expect(screen.queryByText('继续借阅')).toBeNull();
    expect(screen.queryByText('搜索书名、作者、更多信息')).toBeNull();
    expect(screen.queryByText('更多信息')).toBeNull();
  });

  it('falls back to a generic name when the profile display name is unavailable', () => {
    mockProfile = {
      displayName: '   ',
    };

    render(<HomeRoute />);

    expect(screen.getByText('下午好 🍃')).toBeTruthy();
    expect(screen.getByText('同学')).toBeTruthy();
  });

  it('does not render mock quick-start bullets when the real service is unavailable', () => {
    mockHasLibraryService = false;

    render(<HomeRoute />);

    expect(screen.getByText('快速开始')).toBeTruthy();
    expect(screen.getByTestId('home-quick-start-empty-state')).toBeTruthy();
    expect(screen.getByText('尚未连接真实数据')).toBeTruthy();
    expect(screen.queryByText(/预计 35 分钟可以完成一轮预习/)).toBeNull();
    expect(screen.queryByText(/这本适合你：/)).toBeNull();
  });
});
