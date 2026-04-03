import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockAchievementsLoading = false;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');

  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    usePathname: () => '/profile',
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
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
      interestTags: ['AI', '机器学习'],
      major: '人工智能',
      onboarding: { completed: true, needsInterestSelection: false, needsProfileBinding: false },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    },
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useAchievementsQuery: () => ({
    data: mockAchievementsLoading
      ? undefined
      : {
          currentPoints: 240,
          streakLabel: '连续 7 天借阅',
          summary: {
            aiAssists: 2,
            completedOrders: 8,
            readingDays: 12,
            totalBorrowedBooks: 16,
          },
        },
    isFetching: mockAchievementsLoading,
  }),
}));

import ProfileRoute from '@/app/profile';

describe('ProfileRoute', () => {
  beforeEach(() => {
    mockAchievementsLoading = false;
  });

  it('uses reader-facing language for borrowing preferences', () => {
    render(<ProfileRoute />);

    expect(screen.getByText('陈知行')).toBeTruthy();
    expect(screen.getByText('借阅偏好概览')).toBeTruthy();
    expect(screen.getAllByText('近期节奏').length).toBeGreaterThan(0);
    expect(screen.getByText('本月概览')).toBeTruthy();
    expect(screen.getAllByText('借阅记录').length).toBeGreaterThan(0);
    expect(screen.queryByText('陈知行 · 借阅偏好')).toBeNull();
    expect(screen.queryByText('阅读画像')).toBeNull();
    expect(screen.queryByText('学习偏好线索')).toBeNull();
    expect(screen.queryByText('陈知行 · 阅读与学习画像')).toBeNull();
  });

  it('keeps profile sections mounted with skeletons while achievements load', () => {
    mockAchievementsLoading = true;

    render(<ProfileRoute />);

    expect(screen.getByText('本月概览')).toBeTruthy();
    expect(screen.getAllByText('借阅记录').length).toBeGreaterThan(0);
    expect(screen.getByTestId('profile-achievement-skeleton')).toBeTruthy();
    expect(screen.queryByText('240')).toBeNull();
  });
});
