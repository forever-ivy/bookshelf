import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockHasLibraryService = true;
let mockPersonalizedData:
  | Array<{
      author: string;
      availabilityLabel: string;
      cabinetLabel: string;
      coverTone: 'lavender';
      deliveryAvailable: boolean;
      etaLabel: string;
      etaMinutes: number;
      id: number;
      matchedFields: [];
      recommendationReason: string;
      shelfLabel: string;
      stockStatus: 'available';
      summary: string;
      tags: [];
      title: string;
    }>
  | undefined;
let mockPersonalizedLoading = false;

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const chain = {
    delay: () => chain,
    duration: () => chain,
  };

  return {
    __esModule: true,
    Easing: {
      ease: 'ease',
      inOut: (value: unknown) => value,
    },
    FadeInUp: chain,
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    useSharedValue: (value: unknown) => ({ value }),
    withRepeat: (value: unknown) => value,
    withSequence: (...values: unknown[]) => values.at(-1),
    withTiming: (value: unknown) => value,
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
    profile: { displayName: '陈知行' },
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
    data: [],
  }),
  useBookDetailQueries: () => [
    {
      data: {
        catalog: {
          cabinetLabel: 'A058',
          id: 21608,
          shelfLabel: '东区主书柜',
        },
      },
    },
  ],
  useHomeFeedQuery: () => ({
    data: {
      quickActions: [],
      systemBooklists: [],
      todayRecommendations: [
        {
          author: '列宁著',
          availabilityLabel: '可立即借阅',
          cabinetLabel: 'A058',
          coverTone: 'lavender',
          deliveryAvailable: true,
          etaLabel: '15 分钟可送达',
          etaMinutes: 15,
          id: 21608,
          matchedFields: [],
          recommendationReason: '结合你最近借阅的图书推荐。',
          shelfLabel: '东区主书柜',
          stockStatus: 'available',
          summary: '摘要',
          tags: [],
          title: '帝国主义论',
        },
      ],
    },
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: mockPersonalizedData,
    isFetching: mockPersonalizedLoading,
  }),
  useRecommendationDashboardQuery: () => ({
    data: null,
  }),
}));

import HomeRoute from '@/app/(tabs)/(home)';

describe('HomeRoute recommendation location merge', () => {
  beforeEach(() => {
    mockHasLibraryService = true;
    mockPersonalizedLoading = false;
    mockPersonalizedData = [
      {
        author: '列宁著',
        availabilityLabel: '可立即借阅',
        cabinetLabel: '位置待确认',
        coverTone: 'lavender',
        deliveryAvailable: true,
        etaLabel: '15 分钟可送达',
        etaMinutes: 15,
        id: 21608,
        matchedFields: [],
        recommendationReason: '结合你最近借阅的图书推荐。',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'available',
        summary: '摘要',
        tags: [],
        title: '帝国主义论',
      },
    ];
  });

  it('uses home-feed location when personalized results miss the real cabinet label', () => {
    render(<HomeRoute />);

    expect(screen.getByText(/A058/)).toBeTruthy();
    expect(screen.queryByText('位置待确认')).toBeNull();
  });

  it('keeps the recommendation skeleton visible until personalized results are ready', () => {
    mockPersonalizedData = undefined;
    mockPersonalizedLoading = true;

    render(<HomeRoute />);

    expect(screen.getByTestId('home-recommendation-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('home-recommendation-link-21608')).toBeNull();
    expect(screen.queryByText('帝国主义论')).toBeNull();
  });
});
