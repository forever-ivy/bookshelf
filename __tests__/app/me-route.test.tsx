import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockOverviewLoading = false;
let mockFavoritesLoading = false;
let mockBooklistsLoading = false;
let mockNotificationsLoading = false;
let mockAchievementsLoading = false;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  usePathname: () => '/me',
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
    data: mockBooklistsLoading
      ? undefined
      : {
          customItems: [{ books: [], description: '我的书单', id: '1', title: '我的书单' }],
          systemItems: [{ books: [], description: '系统书单', id: '2', title: '系统书单' }],
        },
    isFetching: mockBooklistsLoading,
  }),
  useFavoritesQuery: () => ({
    data: mockFavoritesLoading
      ? undefined
      : [
          {
            book: {
              author: '周志华',
              availabilityLabel: '馆藏充足 · 可立即借阅',
              cabinetLabel: '智能书柜 A-03',
              coverTone: 'lavender',
              etaLabel: '18 分钟可送达',
              id: 11,
              recommendationReason: null,
              summary: '课程导读',
              title: '机器学习',
            },
            id: 'fav-1',
          },
          {
            book: {
              author: '李航',
              availabilityLabel: '馆藏充足 · 可立即借阅',
              cabinetLabel: '智能书柜 B-01',
              coverTone: 'coral',
              etaLabel: '12 分钟可送达',
              id: 12,
              recommendationReason: null,
              summary: '统计学习方法',
              title: '统计学习方法',
            },
            id: 'fav-2',
          },
        ],
    isFetching: mockFavoritesLoading,
  }),
  useMyOverviewQuery: () => ({
    data: mockOverviewLoading
      ? undefined
      : {
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
    isFetching: mockOverviewLoading,
  }),
  useNotificationsQuery: () => ({
    data: mockNotificationsLoading
      ? undefined
      : [{ body: '提醒', id: 'notice-1', kind: 'borrowing', title: '借阅提醒' }],
    isFetching: mockNotificationsLoading,
  }),
  useAchievementsQuery: () => ({
    data: mockAchievementsLoading ? undefined : null,
    isFetching: mockAchievementsLoading,
  }),
}));

import MeRoute from '@/app/(tabs)/me';

describe('MeRoute', () => {
  beforeEach(() => {
    mockOverviewLoading = false;
    mockFavoritesLoading = false;
    mockBooklistsLoading = false;
    mockNotificationsLoading = false;
    mockAchievementsLoading = false;
  });

  it('renders reader-facing account overview and usage records', () => {
    render(<MeRoute />);

    expect(screen.getByText('今日提醒')).toBeTruthy();
    expect(screen.getByText('数据概览')).toBeTruthy();
    expect(screen.getByText('阅读偏好')).toBeTruthy();
    expect(screen.getByText('活跃')).toBeTruthy();
    expect(screen.queryByText('先处理最影响当前节奏的一项。')).toBeNull();
    expect(screen.queryByText('把最常用的数据收在一起，不再拆成多块卡片。')).toBeNull();
    expect(screen.queryByText('只保留最近的几条，方便快速扫一眼。')).toBeNull();
    expect(screen.queryByText('收藏图书')).toBeNull();
    expect(screen.queryByText('书单')).toBeNull();
    expect(screen.getByText('最近使用记录')).toBeTruthy();
    expect(screen.getByText('机器学习')).toBeTruthy();
    expect(screen.getByText('推荐系统')).toBeTruthy();
    expect(screen.getByText('机器学习从零到一')).toBeTruthy();
    expect(screen.queryByText('消息通知')).toBeNull();
    expect(screen.queryByText('借阅与推荐概览')).toBeNull();
    expect(screen.queryByText('推荐信号')).toBeNull();
    expect(screen.queryByText('找书行为')).toBeNull();
    expect(screen.queryByText('最近搜索与推荐')).toBeNull();
    expect(screen.queryByText('账户概览')).toBeNull();
    expect(screen.queryByText('阅读成就')).toBeNull();
  });

  it('keeps account sections mounted with skeletons during first load', () => {
    mockOverviewLoading = true;
    mockFavoritesLoading = true;
    mockBooklistsLoading = true;
    mockNotificationsLoading = true;
    mockAchievementsLoading = true;

    render(<MeRoute />);

    expect(screen.getByText('今日提醒')).toBeTruthy();
    expect(screen.getByText('数据概览')).toBeTruthy();
    expect(screen.queryByText('收藏图书')).toBeNull();
    expect(screen.queryByText('书单')).toBeNull();
    expect(screen.getByTestId('me-reminders-skeleton')).toBeTruthy();
    expect(screen.getByTestId('me-profile-summary-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('me-collection-skeleton').length).toBeGreaterThan(0);
    expect(screen.getByTestId('me-history-skeleton')).toBeTruthy();
    expect(screen.queryByTestId('me-notifications-skeleton')).toBeNull();
    expect(screen.queryByText('机器学习从零到一')).toBeNull();
    expect(screen.queryByText('账户概览')).toBeNull();
    expect(screen.queryByText('阅读成就')).toBeNull();
  });
});
