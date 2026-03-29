import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
};

const mockCreateBooklistMutation = {
  isPending: false,
  mutateAsync: jest.fn(async () => ({
    books: [],
    description: '待读清单',
    id: 'later',
    source: 'custom',
    title: '稍后阅读',
  })),
};

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
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    useLocalSearchParams: () => ({ bookId: '1' }),
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
    profile: {
      accountId: 1,
      affiliationType: 'student',
      college: '信息与电气工程学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI'],
      major: '人工智能',
      onboarding: {
        completed: true,
        needsInterestSelection: false,
        needsProfileBinding: false,
      },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    },
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBookDetailQuery: () => ({
    data: {
      catalog: {
        author: '周志华',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '智能书柜 A-03',
        contents: ['第 1 章 概述', '第 2 章 核心概念'],
        coverTone: 'lavender',
        deliveryAvailable: true,
        etaLabel: '18 分钟可送达',
        etaMinutes: 18,
        id: 1,
        locationNote: '主馆 2 楼 · 智能书柜 A-03',
        matchedFields: ['title'],
        recommendationReason: '与你本周的课程和 AI 学习记录最相关',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'available',
        summary: '适合课程导读和期末复习的入门书。',
        tags: ['人工智能', '课程配套'],
        title: '机器学习从零到一',
      },
      peopleAlsoBorrowed: [
        {
          author: 'Ian Goodfellow',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '主馆 2 楼',
          coverTone: 'blue',
          deliveryAvailable: false,
          etaLabel: '到柜自取',
          etaMinutes: null,
          id: 2,
          matchedFields: ['title'],
          recommendationReason: '如果你在做深度学习专题，它会更系统',
          shelfLabel: '主馆 2 楼',
          stockStatus: 'limited',
          summary: '适合继续拓展模型与训练方法。',
          tags: ['深度学习'],
          title: 'Deep Learning',
        },
      ],
      recommendationReason: '与你本周的课程和 AI 学习记录最相关',
      relatedBooks: [
        {
          author: '格致',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '默认书柜',
          coverTone: 'mint',
          deliveryAvailable: true,
          etaLabel: '明早可达',
          etaMinutes: 480,
          id: 3,
          matchedFields: ['title'],
          recommendationReason: '偏兴趣阅读，适合碎片时间浏览',
          shelfLabel: '主馆 2 楼',
          stockStatus: 'available',
          summary: '适合兴趣阅读和跨学科补充。',
          tags: ['心理学'],
          title: '心理学入门',
        },
      ],
    },
  }),
  useCreateBooklistMutation: () => mockCreateBooklistMutation,
  useCreateBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => ({ id: 101 })),
  }),
  useFavoritesQuery: () => ({
    data: [
      {
        book: { id: 1 },
        id: 'fav-1',
      },
    ],
  }),
  useToggleFavoriteMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => []),
  }),
}));

import BookDetailRoute from '@/app/books/[bookId]';

describe('BookDetailRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders recommendation explanation, related titles, and current favorite state', () => {
    render(<BookDetailRoute />);

    expect(screen.getByText('推荐理由')).toBeTruthy();
    expect(screen.getByText('与你本周的课程和 AI 学习记录最相关')).toBeTruthy();
    expect(screen.getByText('借过这本书的人还借了什么')).toBeTruthy();
    expect(screen.getByText('Deep Learning')).toBeTruthy();
    expect(screen.getByText('相似图书')).toBeTruthy();
    expect(screen.getByText('心理学入门')).toBeTruthy();
    expect(screen.getByText('已收藏')).toBeTruthy();
    expect(screen.getByText('加入稍后阅读')).toBeTruthy();
  });

  it('adds the book into a later-reading list and jumps to collections', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByText('加入稍后阅读'));

    expect(mockCreateBooklistMutation.mutateAsync).toHaveBeenCalledWith({
      bookIds: [1],
      description: '来自《机器学习从零到一》的待读标记',
      title: '稍后阅读',
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/collections');
    });
  });
});
