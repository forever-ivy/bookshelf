import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

let mockDetailLoading = false;
let mockCollaborativeLoading = false;
let mockSimilarLoading = false;
let mockHybridLoading = false;

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

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    __esModule: true,
    Easing: {
      ease: 'ease',
      inOut: (value: unknown) => value,
    },
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
    usePathname: () => '/books/1',
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
    data: mockDetailLoading
      ? undefined
      : {
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
    isFetching: mockDetailLoading,
  }),
  useCreateBooklistMutation: () => mockCreateBooklistMutation,
  useCreateBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(async () => ({ id: 101 })),
  }),
  useCollaborativeBooksQuery: () => ({
    data: mockCollaborativeLoading
      ? undefined
      : [
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
    error: null,
    isFetching: mockCollaborativeLoading,
  }),
  useFavoritesQuery: () => ({
    data: [
      {
        book: { id: 1 },
        id: 'fav-1',
      },
    ],
  }),
  useHybridBooksQuery: () => ({
    data: mockHybridLoading
      ? undefined
      : [
      {
        author: '李航',
        availabilityLabel: '馆藏充足 · 可立即借阅',
        cabinetLabel: '智能书柜 B-02',
        coverTone: 'coral',
        deliveryAvailable: true,
        etaLabel: '12 分钟可送达',
        etaMinutes: 12,
        id: 4,
        matchedFields: ['title'],
        recommendationReason: '综合你的课程与借阅轨迹生成',
        shelfLabel: '主馆 3 楼',
        stockStatus: 'available',
        summary: '适合进一步补齐统计学习方法。',
        tags: ['统计学习'],
        title: '统计学习方法',
      },
    ],
    error: null,
    isFetching: mockHybridLoading,
  }),
  useSimilarBooksQuery: () => ({
    data: mockSimilarLoading
      ? undefined
      : [
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
    error: null,
    isFetching: mockSimilarLoading,
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
    mockDetailLoading = false;
    mockCollaborativeLoading = false;
    mockSimilarLoading = false;
    mockHybridLoading = false;
  });

  it('prioritizes borrowing decisions and keeps recommendation language user-facing', () => {
    render(<BookDetailRoute />);

    expect(screen.getByText('馆藏与借阅')).toBeTruthy();
    expect(screen.getByText('智能书柜 A-03')).toBeTruthy();
    expect(screen.getByText('18 分钟可送达')).toBeTruthy();
    expect(screen.getByText('为什么可能适合你')).toBeTruthy();
    expect(screen.getByText('与你本周的课程和 AI 学习记录最相关')).toBeTruthy();
    expect(screen.getByText('借过这本的人也借了')).toBeTruthy();
    expect(screen.getByText('Deep Learning')).toBeTruthy();
    expect(screen.getByText('同主题图书')).toBeTruthy();
    expect(screen.getByText('心理学入门')).toBeTruthy();
    expect(screen.getByText('你可能还想借')).toBeTruthy();
    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.getByText('已收藏')).toBeTruthy();
    expect(screen.getByText('加入稍后阅读')).toBeTruthy();
    expect(screen.queryByText('推荐理由')).toBeNull();
    expect(screen.queryByText('综合推荐')).toBeNull();
    expect(screen.queryByText('默认书柜')).toBeNull();
    expect(screen.getAllByText('馆藏位置待确认').length).toBeGreaterThan(0);
  });

  it('adds the book into a later-reading list and jumps back to the account center', async () => {
    render(<BookDetailRoute />);

    fireEvent.press(screen.getByText('加入稍后阅读'));

    expect(mockCreateBooklistMutation.mutateAsync).toHaveBeenCalledWith({
      bookIds: [1],
      description: '来自《机器学习从零到一》的待读标记',
      title: '稍后阅读',
    });
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/(tabs)/me');
    });
  });

  it('keeps detail sections mounted with skeletons while loading', () => {
    mockDetailLoading = true;
    mockCollaborativeLoading = true;
    mockSimilarLoading = true;
    mockHybridLoading = true;

    render(<BookDetailRoute />);

    expect(screen.getByText('为什么可能适合你')).toBeTruthy();
    expect(screen.getByText('目录')).toBeTruthy();
    expect(screen.getByText('借过这本的人也借了')).toBeTruthy();
    expect(screen.getByText('同主题图书')).toBeTruthy();
    expect(screen.getByText('你可能还想借')).toBeTruthy();
    expect(screen.getByTestId('book-detail-primary-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-recommendation-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-contents-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-collaborative-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-similar-skeleton')).toBeTruthy();
    expect(screen.getByTestId('book-detail-hybrid-skeleton')).toBeTruthy();
    expect(screen.queryByText('机器学习从零到一')).toBeNull();
  });
});
