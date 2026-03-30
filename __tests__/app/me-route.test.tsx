import { render, screen } from '@testing-library/react-native';
import React from 'react';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: { accountId: 1, profileId: 1, role: 'reader' },
    isAuthenticated: true,
    onboarding: { completed: true, needsInterestSelection: false, needsProfileBinding: false },
    profile: {
      accountId: 1,
      affiliationType: 'student',
      college: '信息学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI'],
      major: '人工智能',
      onboarding: { completed: true, needsInterestSelection: false, needsProfileBinding: false },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    },
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBooklistsQuery: () => ({
    data: { customItems: [{ id: '1' }], systemItems: [{ id: '2' }] },
  }),
  useFavoritesQuery: () => ({
    data: [{ id: 'fav-1' }, { id: 'fav-2' }],
  }),
  useMyOverviewQuery: () => ({
    data: {
      profile: null,
      recentConversations: [],
      recentOrders: [
        {
          actionableLabel: '查看详情',
          book: { title: '机器学习从零到一' },
          dueDateLabel: '3 月 31 日前归还',
          id: 101,
          mode: 'robot_delivery',
          note: '已送达阅览室',
          renewable: false,
          status: 'active',
          statusLabel: '借阅中',
          timeline: [],
        },
      ],
      recentQueries: ['机器学习', '推荐系统'],
      recentReadingEvents: [],
      recentRecommendations: [],
      stats: {
        activeOrdersCount: 1,
        borrowHistoryCount: 8,
        conversationCount: 0,
        lastActiveAt: '2026-03-29',
        readingEventCount: 0,
        recommendationCount: 12,
        searchCount: 5,
      },
    },
  }),
  useNotificationsQuery: () => ({
    data: [{ id: 'notice-1' }],
  }),
}));

import MeRoute from '@/app/(tabs)/me';

describe('MeRoute', () => {
  it('renders overview-driven stats and recent search context', () => {
    render(<MeRoute />);

    expect(screen.getByText('借阅与推荐概览')).toBeTruthy();
    expect(screen.getByText('1 条进行中借阅')).toBeTruthy();
    expect(screen.getByText('12 条推荐记录')).toBeTruthy();
    expect(screen.getByText('最近搜索与推荐')).toBeTruthy();
    expect(screen.getByText('机器学习、推荐系统')).toBeTruthy();
    expect(screen.getByText('机器学习从零到一')).toBeTruthy();
  });
});
