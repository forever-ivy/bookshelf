import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, ScrollView, StyleSheet } from 'react-native';
import { toast } from 'sonner-native';

let mockLocalSearchParams: Record<string, string | undefined> = {};
let mockPathname = '/';
let mockHasLibraryService = true;
let mockBookSearchQueries: unknown[] = [];
let mockLastHeaderSearchBarOptions: unknown;
let mockCatalogPageQueries: Array<{ category: string | null; limit: number; offset: number; query: string }> = [];
let mockExplicitPageQueries: Array<{ category: string | null; limit: number; offset: number; query: string }> = [];
let mockRecommendationQueries: string[] = [];
let mockRecommendationPageQueries: Array<{ limit: number; query: string }> = [];
let mockCatalogSearchErrorQueries = new Set<string>();
let mockRecommendationSearchErrorQueries = new Set<string>();
let mockActiveOrdersLoading = false;
let mockHomeFeedLoading = false;
let mockPersonalizedLoading = false;
let mockOverviewLoading = false;
let mockFavoritesLoading = false;
let mockBooklistsLoading = false;
let mockNotificationsLoading = false;
let mockAchievementsLoading = false;
let mockBorrowOrdersLoading = false;
let mockReturnRequestsLoading = false;
let mockCatalogLoadingQueries = new Set<string>();
let mockRecommendationLoadingQueries = new Set<string>();
const SEARCH_INPUT_DEBOUNCE_MS = 300;
let mockSessionProfile = {
  accountId: 1,
  affiliationType: 'student' as const,
  college: '信息与电气工程学院',
  displayName: '陈知行',
  gradeYear: '2023',
  id: 1,
  interestTags: ['AI', '心理学', '产品设计'],
  major: '人工智能',
  onboarding: {
    completed: true,
    needsInterestSelection: false,
    needsProfileBinding: false,
  },
  readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
};
const mockClearSession = jest.fn();
const mockKeyboardListeners = {
  keyboardDidHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardDidShow: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillHide: new Set<(payload?: { duration?: number }) => void>(),
  keyboardWillShow: new Set<(payload?: { duration?: number }) => void>(),
};

function emitKeyboardEvent(
  event: keyof typeof mockKeyboardListeners,
  payload?: { duration?: number }
) {
  mockKeyboardListeners[event].forEach((listener) =>
    listener({
      duration: payload?.duration ?? 220,
    } as never)
  );
}

function mockCreatePaginatedMockItems(query: string, count: number, startId: number) {
  return Array.from({ length: count }, (_, index) => ({
    availabilityLabel: index % 3 === 0 ? '馆藏充足 · 可立即借阅' : '暂不可借',
    author: `${query}作者 ${index + 1}`,
    cabinetLabel: `智能书柜 ${index + 1}`,
    category: index % 2 === 0 ? '环境科学、安全科学' : '管理学',
    coverTone: (index % 2 === 0 ? 'coral' : 'lavender') as 'coral' | 'lavender',
    deliveryAvailable: index % 2 === 0,
    etaLabel: index % 2 === 0 ? '12 分钟可送达' : '到柜自取',
    id: startId + index,
    matchedFields: index % 4 === 0 ? ['summary'] : [],
    recommendationReason: index % 4 === 0 ? `${query} 推荐解释 ${index + 1}` : null,
    stockStatus: index % 3 === 0 ? 'available' : 'out_of_stock',
    summary: `${query} 摘要 ${index + 1}`,
    title: `${query}结果 ${index + 1}`,
  }));
}

function mockCreateLoadingKey(query: string, marker: number) {
  return `${query || '__empty__'}:${marker}`;
}

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
  const { Text, TextInput, View } = require('react-native');

  const Link = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Link.Preview = () => null;
  Link.Trigger = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);

  const Tabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'web-tabs' }, children);

  Tabs.Screen = ({
    name,
    options,
  }: {
    name: string;
    options?: { title?: string };
  }) =>
    React.createElement(
      Text,
      {
        testID: `web-tab-${name}`,
      },
      options?.title ?? name
    );

  const Stack = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'mock-stack' }, children);

  const StackScreen = ({
    children,
    options,
  }: {
    children?: React.ReactNode;
    options?: { headerSearchBarOptions?: { onChangeText?: (value: unknown) => void; placeholder?: string } };
  }) => {
    const headerSearchBarOptions = options?.headerSearchBarOptions;
    mockLastHeaderSearchBarOptions = headerSearchBarOptions;

    return React.createElement(
      View,
      null,
      headerSearchBarOptions
        ? React.createElement(TextInput, {
            onChangeText: headerSearchBarOptions.onChangeText,
            placeholder: headerSearchBarOptions.placeholder,
            testID: 'native-search-bar',
          })
        : null,
      children
    );
  };
  StackScreen.Title = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);

  const Toolbar = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  Toolbar.Button = () => null;
  Toolbar.View = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);

  Stack.Screen = StackScreen;
  Stack.SearchBar = () => null;
  Stack.Toolbar = Toolbar;

  return {
    Redirect: ({ href }: { href: string }) =>
      React.createElement('redirect', {
        href,
        testID: 'route-redirect',
      }),
    Link,
    Stack,
    Tabs,
    useLocalSearchParams: () => mockLocalSearchParams,
    usePathname: () => mockPathname,
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

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'native-tabs', ...props }, children);

  const Trigger: any = ({
    children,
    name,
    role,
  }: {
    children: React.ReactNode;
    name?: string;
    role?: string;
  }) =>
    React.createElement(
      View,
      {
        accessibilityLabel: role,
        testID: name ? `native-tab-${name}` : undefined,
      },
      children
    );
  Trigger.Icon = () => null;
  Trigger.Label = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);
  NativeTabs.Trigger = Trigger;

  return {
    NativeTabs,
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: mockClearSession,
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
    profile: mockSessionProfile,
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
        actionableLabel: '查看状态',
        book: {
          author: '周志华',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '智能书柜 A-03',
          coverTone: 'lavender',
          deliveryAvailable: true,
          etaLabel: '18 分钟可送达',
          etaMinutes: 18,
          id: 101,
          matchedFields: ['课程推荐'],
          recommendationReason: '配套课程：人工智能导论 · 可先看第 1 章',
          shelfLabel: '主馆 2 楼',
          status: 'available',
          stockStatus: 'available',
          summary: '课程导读与基础概念整理。',
          tags: ['AI', '课程推荐'],
          title: '机器学习',
        },
        id: 101,
        mode: 'robot_delivery',
        note: '配套课程：人工智能导论 · 可先看第 1 章',
        renewable: true,
        status: 'renewable',
        statusLabel: '可续借',
        timeline: [],
        dueDateLabel: '4 月 2 日',
      },
    ],
  }),
  useBookSearchQuery: () => ({
    data: [
      {
        availabilityLabel: '馆藏充足 · 可立即借阅',
        author: '周志华',
        cabinetLabel: '智能书柜 A-03',
        coverTone: 'lavender',
        etaLabel: '18 分钟可送达',
        id: 1,
        recommendationReason: '与你本周的课程和 AI 学习记录最相关',
        title: '机器学习',
      },
    ],
  }),
  useBookDetailQueries: () => [],
  useCatalogCategoriesQuery: () => ({
    data: [
      { id: 1, name: '人工智能' },
      { id: 2, name: '管理学' },
      { id: 3, name: '环境科学、安全科学' },
    ],
    isFetching: false,
  }),
  useCatalogBookSearchPageQuery: (
    query: unknown,
    options?: { category?: string | null; enabled?: boolean; limit?: number; offset?: number }
  ) => {
    const normalizedQuery = typeof query === 'string' ? query : '';
    const category = options?.category?.trim() ?? null;
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const enabled = options?.enabled ?? true;
    mockBookSearchQueries.push(normalizedQuery);
    mockCatalogPageQueries.push({ category, limit, offset, query: normalizedQuery });

    if (!enabled) {
      return { data: undefined, error: undefined, isFetching: false };
    }

    if (mockCatalogLoadingQueries.has(mockCreateLoadingKey(normalizedQuery, offset))) {
      return {
        data: undefined,
        error: undefined,
        isFetching: true,
      };
    }

    if (mockCatalogSearchErrorQueries.has(normalizedQuery)) {
      return {
        data: undefined,
        error: new Error('catalog_page_failed'),
        isFetching: false,
      };
    }

    const allItems =
      normalizedQuery === '安全'
        ? mockCreatePaginatedMockItems('安全', 45, 3000)
        : [
            {
              availabilityLabel: '馆藏充足 · 可立即借阅',
              author: '周志华',
              cabinetLabel: '智能书柜 A-03',
              category: '人工智能',
              coverTone: 'lavender',
              deliveryAvailable: true,
              etaLabel: '18 分钟可送达',
              etaMinutes: 18,
              id: 1,
              matchedFields: ['title'],
              recommendationReason: '与你本周的课程和 AI 学习记录最相关',
              shelfLabel: '主馆 2 楼',
              stockStatus: 'available',
              summary: '适合课程导读和期末复习的入门书。',
              tags: ['AI'],
              title: '机器学习',
            },
            {
              availabilityLabel: '馆藏充足 · 可立即借阅',
              author: '陈越',
              cabinetLabel: '主馆 C-11',
              category: '管理学',
              coverTone: 'mint',
              deliveryAvailable: false,
              etaLabel: '到柜自取',
              etaMinutes: null,
              id: 2,
              matchedFields: ['summary'],
              recommendationReason: null,
              shelfLabel: '主馆 1 楼',
              stockStatus: 'available',
              summary: '适合做协作与组织方法的延伸阅读。',
              tags: ['组织管理'],
              title: '组织行为学',
            },
          ];

    const filteredItems = category
      ? allItems.filter((item) => (item.category ?? null) === category)
      : allItems;
    const items = filteredItems.slice(offset, offset + limit);

    return {
      data: {
        hasMore: offset + items.length < filteredItems.length,
        items,
        limit,
        offset,
        query: normalizedQuery,
        total: filteredItems.length,
      },
      error: undefined,
      isFetching: false,
    };
  },
  useBorrowOrdersQuery: () => ({
    data: [
      {
        actionableLabel: '查看状态',
        book: {
          author: '周志华',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '智能书柜 A-03',
          coverTone: 'lavender',
          deliveryAvailable: true,
          etaLabel: '18 分钟可送达',
          etaMinutes: 18,
          id: 101,
          matchedFields: ['课程推荐'],
          recommendationReason: '配套课程：人工智能导论 · 可先看第 1 章',
          shelfLabel: '主馆 2 楼',
          stockStatus: 'available',
          summary: '课程导读与基础概念整理。',
          tags: ['AI', '课程推荐'],
          title: '机器学习',
        },
        id: 101,
        mode: 'robot_delivery',
        note: '配套课程：人工智能导论 · 可先看第 1 章',
        renewable: true,
        status: 'renewable',
        statusLabel: '可续借',
        timeline: [],
        dueDateLabel: '4 月 2 日',
      },
      {
        actionableLabel: '查看状态',
        book: {
          author: '原研哉',
          availabilityLabel: '已完成',
          cabinetLabel: '主馆 1 楼',
          coverTone: 'mint',
          deliveryAvailable: false,
          etaLabel: '到柜自取',
          etaMinutes: null,
          id: 201,
          matchedFields: [],
          recommendationReason: null,
          shelfLabel: '主馆 1 楼',
          stockStatus: 'available',
          summary: '已完成历史借阅。',
          tags: ['设计'],
          title: '设计中的设计',
        },
        id: 201,
        mode: 'cabinet_pickup',
        note: '已归还',
        renewable: false,
        status: 'completed',
        statusLabel: '已完成',
        timeline: [],
        dueDateLabel: '3 月 20 日',
      },
    ],
    isError: false,
  }),
  useCancelBorrowOrderMutation: () => ({ isPending: false, mutate: jest.fn(), mutateAsync: jest.fn() }),
  useExplicitBookSearchQuery: (
    query: unknown,
    options?: { category?: string | null; enabled?: boolean; limit?: number; offset?: number }
  ) => {
    const normalizedQuery = typeof query === 'string' ? query : '';
    const category = options?.category?.trim() ?? null;
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;
    const enabled = options?.enabled ?? true;
    mockBookSearchQueries.push(normalizedQuery);
    mockExplicitPageQueries.push({ category, limit, offset, query: normalizedQuery });

    if (!enabled || normalizedQuery.trim().length === 0) {
      return { data: undefined, error: undefined, isFetching: false };
    }

    if (mockCatalogLoadingQueries.has(mockCreateLoadingKey(normalizedQuery, offset))) {
      return {
        data: undefined,
        error: undefined,
        isFetching: true,
      };
    }

    if (mockCatalogSearchErrorQueries.has(normalizedQuery)) {
      return {
        data: undefined,
        error: new Error('explicit_catalog_failed'),
        isFetching: false,
      };
    }

    const allItems =
      normalizedQuery === '安全'
        ? mockCreatePaginatedMockItems('安全', 45, 3000)
        : [
            {
              availabilityLabel: '馆藏充足 · 可立即借阅',
              author: '李航',
              cabinetLabel: '智能书柜 B-02',
              category: '人工智能',
              coverTone: 'coral',
              deliveryAvailable: true,
              etaLabel: '12 分钟可送达',
              etaMinutes: 12,
              id: 3,
              matchedFields: ['title'],
              recommendationReason: '显式搜索命中统计学习主题',
              shelfLabel: '主馆 2 楼',
              stockStatus: 'available',
              summary: '适合继续补齐统计学习方法。',
              tags: ['AI'],
              title: '统计学习方法',
            },
          ];
    const filteredItems = category
      ? allItems.filter((item) => (item.category ?? null) === category)
      : allItems;
    const items = filteredItems.slice(offset, offset + limit);

    return {
      data: {
        hasMore: offset + items.length < filteredItems.length,
        items,
        limit,
        offset,
        query: normalizedQuery,
        total: filteredItems.length,
      },
      error: undefined,
      isFetching: false,
    };
  },
  useBooklistsQuery: () => ({
    data: {
      customItems: [
        {
          books: [{ id: 1 }, { id: 2 }],
          description: '今晚先看的两本轻量阅读。',
          id: 'tonight',
          source: 'custom',
          title: '今晚预习',
        },
      ],
      systemItems: [
        {
          books: [{ id: 3 }, { id: 4 }, { id: 5 }],
          description: '适合刚开始接触 AI 的同学',
          id: 'system-ai',
          source: 'system',
          title: 'AI 入门书单',
        },
      ],
    },
  }),
  useFavoritesQuery: () => ({
    data: [
      {
        id: 'favorite-1',
        book: {
          author: '周志华',
          availabilityLabel: '馆藏充足 · 可立即借阅',
          cabinetLabel: '智能书柜 A-03',
          coverTone: 'lavender',
          deliveryAvailable: true,
          etaLabel: '18 分钟可送达',
          etaMinutes: 18,
          id: 1,
          matchedFields: ['收藏'],
          recommendationReason: '与你本周的课程和 AI 学习记录最相关',
          shelfLabel: '主馆 2 楼',
          stockStatus: 'available',
          summary: '适合课程导读和期末复习的入门书。',
          tags: ['AI'],
          title: '机器学习从零到一',
        },
      },
    ],
  }),
  useHomeFeedQuery: () => ({
    data: {
      examZone: [
        {
          availabilityLabel: '馆藏充足 · 可立即借阅',
          author: 'NaN',
          cabinetLabel: '智能书柜 A-03',
          coverTone: 'lavender',
          etaLabel: '18 分钟可送达',
          id: 1,
          recommendationReason: '与你本周的课程和 AI 学习记录最相关',
          summary: '适合课程导读和期末复习的入门书。',
          title: '机器学习从零到一',
        },
      ],
      explanationCard: {
        body: '系统会结合你的课程、收藏和最近借阅，优先展示能立即拿到的书。',
        title: '为什么推荐给你',
      },
      hotLists: [
        { description: '最近 48 小时最热门的借阅', id: 'hot-week', title: '本周热门' },
      ],
      quickActions: [
        { code: 'borrow_now', description: '从可借、可送的书里直接开始', meta: '3 本优先推荐已就绪', title: '今晚待开始' },
        { code: 'delivery_status', description: '查看机器人和书柜履约进度', meta: '1 单配送中', title: '配送状态' },
      ],
      systemBooklists: [
        { description: '适合刚开始接触 AI 的同学', id: 'system-ai', title: 'AI 入门书单' },
      ],
      todayRecommendations: [
        {
          availabilityLabel: '馆藏充足 · 可立即借阅',
          author: '周志华',
          cabinetLabel: '智能书柜 A-03',
          coverTone: 'lavender',
          etaLabel: '18 分钟可送达',
          id: 1,
          recommendationReason: '与你本周的课程和 AI 学习记录最相关',
          summary: '适合课程导读和期末复习的入门书。',
          title: '机器学习从零到一',
        },
      ],
    },
  }),
  useNotificationsQuery: () => ({
    data: [
      { body: '你的 AI 入门书单已更新 2 本新推荐。', id: 'note-2', kind: 'achievement', title: '推荐更新' },
    ],
  }),
  useDismissNotificationMutation: () => ({
    isPending: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
  }),
  useMyOverviewQuery: () => ({
    data: {
      profile: null,
      recentConversations: [],
      recentOrders: [
        {
          actionableLabel: '查看状态',
          book: { title: '机器学习' },
          dueDateLabel: '4 月 2 日',
          id: 101,
          mode: 'robot_delivery',
          note: '配套课程：人工智能导论 · 可先看第 1 章',
          renewable: true,
          status: 'renewable',
          statusLabel: '可续借',
          timeline: [],
        },
      ],
      recentQueries: ['机器学习', '深度学习'],
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
  useOrderHistoryQuery: () => ({
    data: [
      {
        dueDateLabel: '3 月 20 日',
        id: 201,
        book: { title: '设计中的设计' },
        statusLabel: '已完成',
      },
    ],
  }),
  useMyOrdersQuery: () => ({
    data: [
      {
        actionableLabel: '查看状态',
        book: { title: '机器学习' },
        dueDateLabel: '4 月 2 日',
        id: 101,
        mode: 'robot_delivery',
        note: '配套课程：人工智能导论 · 可先看第 1 章',
        renewable: true,
        status: 'renewable',
        statusLabel: '可续借',
        timeline: [],
      },
      {
        actionableLabel: '查看详情',
        book: { title: '设计中的设计' },
        dueDateLabel: '3 月 20 日',
        id: 201,
        mode: 'robot_delivery',
        note: '已归还',
        renewable: false,
        status: 'completed',
        statusLabel: '已完成',
        timeline: [],
      },
    ],
  }),
  usePersonalizedRecommendationsQuery: () => ({
    data: [],
  }),
  useRecommendationDashboardQuery: () => ({
    data: null,
  }),
  useRecommendationSearchQuery: (
    query: unknown,
    enabled?: boolean,
    options?: { limit?: number }
  ) => {
    const normalizedQuery = typeof query === 'string' ? query : '';
    const limit = options?.limit ?? 5;
    mockRecommendationQueries.push(normalizedQuery);
    mockRecommendationPageQueries.push({ limit, query: normalizedQuery });
    if (!enabled) {
      return { data: undefined, error: undefined, isFetching: false };
    }

    if (mockRecommendationLoadingQueries.has(mockCreateLoadingKey(normalizedQuery, limit))) {
      return {
        data: undefined,
        error: undefined,
        isFetching: true,
      };
    }

    if (mockRecommendationSearchErrorQueries.has(normalizedQuery)) {
      return {
        data: undefined,
        error: new Error('recommendation_search_failed'),
        isFetching: false,
      };
    }

    const discoveryRecommendations = [
      {
        availabilityLabel: '馆藏充足 · 可立即借阅',
        author: 'Ian Goodfellow',
        cabinetLabel: '主馆 2 楼',
        coverTone: 'blue',
        deliveryAvailable: false,
        etaLabel: '到柜自取',
        etaMinutes: null,
        id: 2,
        matchedFields: ['summary'],
        recommendationReason: '如果你在做深度学习专题，它会更系统',
        shelfLabel: '主馆 2 楼',
        stockStatus: 'available',
        summary: '推荐区结果',
        tags: ['推荐'],
        title: 'Deep Learning',
      },
      ...mockCreatePaginatedMockItems('推荐', 11, 9100),
    ];

    return {
      data:
        normalizedQuery.length === 0
          ? discoveryRecommendations.slice(0, limit)
          : [
              {
                availabilityLabel: '馆藏充足 · 可立即借阅',
                author: normalizedQuery === '安全' ? '安全治理课题组' : 'Ian Goodfellow',
                cabinetLabel: '主馆 2 楼',
                coverTone: 'blue',
                deliveryAvailable: false,
                etaLabel: '到柜自取',
                etaMinutes: null,
                id: normalizedQuery === '安全' ? 9001 : 2,
                matchedFields: ['summary'],
                recommendationReason:
                  normalizedQuery === '安全'
                    ? '从主题语义看，这本更贴近安全治理方向'
                    : '如果你在做深度学习专题，它会更系统',
                shelfLabel: '主馆 2 楼',
                stockStatus: 'available',
                summary: '推荐区结果',
                tags: ['推荐'],
                title: normalizedQuery === '安全' ? '安全治理导论' : 'Deep Learning',
              },
            ],
      error: undefined,
      isFetching: false,
    };
  },
  useRenewBorrowOrderMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
  useReturnRequestMutation: () => ({ isPending: false, mutate: jest.fn(), mutateAsync: jest.fn() }),
  useReturnRequestsQuery: () => ({
    data: [],
  }),
}));

jest.mock('@/lib/app/artwork', () => ({
  appArtwork: {
    notionBorrowSuccess: 1,
    notionNoResults: 1,
    notionReadingProgress: 1,
    profileHero: 1,
  },
}));

import HomeRoute from '@/app/(tabs)/(home)';
import BorrowingRoute from '@/app/(tabs)/borrowing';
import MeRoute from '@/app/(tabs)/me';
import SearchRoute from '@/app/(tabs)/search';
import BorrowNowSearchRoute from '@/app/search/borrow-now';
import TabsLayout from '@/app/(tabs)/_layout';
import WebTabsLayout from '@/app/(tabs)/_layout.web';
import MarkerExamplesRoute from '@/app/marker-examples';
import ProfileRoute from '@/app/profile';
import { appTheme } from '@/constants/app-theme';

function renderWithProviders(node: React.ReactElement) {
  return render(node);
}

describe('UI shell routes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-30T16:26:00+08:00'));
    mockHasLibraryService = true;
    mockSessionProfile = {
      accountId: 1,
      affiliationType: 'student',
      college: '信息与电气工程学院',
      displayName: '陈知行',
      gradeYear: '2023',
      id: 1,
      interestTags: ['AI', '心理学', '产品设计'],
      major: '人工智能',
      onboarding: {
        completed: true,
        needsInterestSelection: false,
        needsProfileBinding: false,
      },
      readingProfileSummary: '偏好先看章节框架，再进入细节和例题。',
    };
    mockClearSession.mockReset();
    mockCatalogPageQueries = [];
    mockExplicitPageQueries = [];
    mockRecommendationQueries = [];
    mockRecommendationPageQueries = [];
    mockCatalogSearchErrorQueries = new Set<string>();
    mockRecommendationSearchErrorQueries = new Set<string>();
    mockCatalogLoadingQueries = new Set<string>();
    mockRecommendationLoadingQueries = new Set<string>();
    mockKeyboardListeners.keyboardDidHide.clear();
    mockKeyboardListeners.keyboardDidShow.clear();
    mockKeyboardListeners.keyboardWillHide.clear();
    mockKeyboardListeners.keyboardWillShow.clear();
    jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
      if (
        event === 'keyboardDidShow' ||
        event === 'keyboardDidHide' ||
        event === 'keyboardWillShow' ||
        event === 'keyboardWillHide'
      ) {
        mockKeyboardListeners[event].add(listener as (payload?: { duration?: number }) => void);
      }

      return {
        remove: () => {
          if (
            event === 'keyboardDidShow' ||
            event === 'keyboardDidHide' ||
            event === 'keyboardWillShow' ||
            event === 'keyboardWillHide'
          ) {
            mockKeyboardListeners[event].delete(listener as (payload?: { duration?: number }) => void);
          }
        },
      } as ReturnType<typeof Keyboard.addListener>;
    });
  });

  afterEach(() => {
    mockLocalSearchParams = {};
    mockPathname = '/';
    mockBookSearchQueries = [];
    mockLastHeaderSearchBarOptions = undefined;
    mockCatalogPageQueries = [];
    mockExplicitPageQueries = [];
    mockRecommendationQueries = [];
    mockRecommendationPageQueries = [];
    mockCatalogSearchErrorQueries = new Set<string>();
    mockRecommendationSearchErrorQueries = new Set<string>();
    mockCatalogLoadingQueries = new Set<string>();
    mockRecommendationLoadingQueries = new Set<string>();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the home route hero without the search entry or quick actions', () => {
    renderWithProviders(<HomeRoute />);

    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
    expect(screen.getByText('下午好 🍃')).toBeTruthy();
    expect(screen.getByText('陈知行')).toBeTruthy();
    expect(screen.getByTestId('home-greeting-header')).toBeTruthy();
    expect(
      StyleSheet.flatten(screen.getByTestId('home-greeting-label').props.style).fontSize
    ).toBeGreaterThan(StyleSheet.flatten(screen.getByTestId('home-greeting-name').props.style).fontSize);
    expect(StyleSheet.flatten(screen.getByTestId('home-greeting-name').props.style).marginLeft).toBeUndefined();
    expect(screen.getByTestId('home-artwork')).toBeTruthy();
    expect(screen.queryByText('搜索书名、作者、更多信息')).toBeNull();
    expect(screen.queryByText('继续借阅')).toBeNull();
    expect(screen.queryByText('配送状态')).toBeNull();
    expect(screen.queryByText('推荐解释')).toBeNull();
    expect(screen.getByText('快速开始')).toBeTruthy();
    expect(screen.getByText('继续阅读')).toBeTruthy();
    expect(screen.getByText('《机器学习》')).toBeTruthy();
    expect(screen.getByText('查看进度')).toBeTruthy();
    expect(screen.getByText('可续借 · 4 月 2 日')).toBeTruthy();
    expect(screen.getByText('去借阅页')).toBeTruthy();
    expect(screen.getByText('处理续借、归还和查看进度')).toBeTruthy();
    expect(screen.getAllByTestId('home-quick-start-item')).toHaveLength(3);
    expect(screen.getAllByTestId('home-quick-start-item-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('marker-highlight-root')).toHaveLength(4);
    expect(screen.queryByText('今晚学习')).toBeNull();
    expect(screen.queryByText(/推荐解释：/)).toBeNull();
    expect(screen.getByText('推荐借阅')).toBeTruthy();
    expect(screen.queryByText('原因')).toBeNull();
    expect(
      screen.getByText('这些书更贴近你最近在看的方向，也优先帮你挑出现在更容易借到的书。')
    ).toBeTruthy();
    expect(screen.getAllByTestId('marker-highlight-root')).toHaveLength(4);
    expect(screen.getByTestId('home-recommendation-link-1')).toBeTruthy();
    expect(screen.queryByText('查看详情并借阅')).toBeNull();
    expect(screen.getByText('查看当前借阅')).toBeTruthy();
    expect(screen.queryByText('个性化推荐')).toBeNull();
    expect(screen.queryByText('推荐引擎状态')).toBeNull();
    expect(screen.getByText('专题书单')).toBeTruthy();
    expect(screen.getByText('AI 入门书单')).toBeTruthy();
    expect(screen.getByText('适合刚开始接触 AI 的同学')).toBeTruthy();
    expect(screen.queryByText('书目')).toBeNull();
    expect(screen.getByText('先从这几本看起')).toBeTruthy();
    expect(screen.getByText('佚名 · 智能书柜 A-03')).toBeTruthy();
    expect(screen.getByTestId('home-booklist-link-1')).toBeTruthy();
    expect(screen.queryByText('系统书单')).toBeNull();
    expect(screen.queryByTestId('brand-mark')).toBeNull();
    expect(screen.queryByTestId('illustration-home')).toBeNull();
    expect(screen.queryByTestId('secondary-back-button')).toBeNull();
    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
  });

  it('falls back to 同学 in the home route header when no display name is available', () => {
    mockSessionProfile = {
      ...mockSessionProfile,
      displayName: '   ',
    };

    renderWithProviders(<HomeRoute />);

    expect(screen.getByText('下午好 🍃')).toBeTruthy();
    expect(screen.getByText('同学')).toBeTruthy();
  });

  it('renders the search route as an independent find-book workspace', () => {
    const view = renderWithProviders(<SearchRoute />);
    const filterStrip = screen.getByTestId('search-filter-strip');

    expect(mockCatalogPageQueries.at(0)?.query).toBe('');
    expect(mockExplicitPageQueries.at(0)?.query).toBe('');
    expect(mockRecommendationQueries.at(0)).toBe('');
    expect(mockLastHeaderSearchBarOptions).toEqual(
      expect.objectContaining({
        placeholder: '搜索书名、作者、更多信息',
      })
    );
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
    expect(screen.getByText('筛选')).toBeTruthy();
    expect(screen.getAllByText('全部')).toHaveLength(1);
    expect(screen.getAllByText('人工智能')).toHaveLength(1);
    expect(screen.getAllByText('管理学')).toHaveLength(1);
    expect(screen.getAllByText('环境科学、安全科学')).toHaveLength(1);
    expect(screen.queryByText('支持配送')).toBeNull();
    expect(screen.queryByText('猜你想要')).toBeNull();
    expect(screen.queryByText('馆藏充足')).toBeNull();
    expect(screen.queryByText('可立即借阅')).toBeNull();
    expect(screen.queryByText('已确认位置')).toBeNull();
    expect(filterStrip).toBeTruthy();
    expect(view.UNSAFE_getAllByType(ScrollView).some((item) => item.props.testID === 'search-filter-strip')).toBe(true);
    expect(filterStrip.props.horizontal).toBe(true);
    expect(filterStrip.props.nestedScrollEnabled).toBe(true);
    expect(screen.getByTestId('search-filter-chip-all-shell')).toHaveStyle({
      backgroundColor: appTheme.colors.primarySoft,
      padding: 2,
    });
    expect(screen.getByTestId('search-filter-chip-all-label')).toHaveStyle({
      color: appTheme.colors.textMuted,
    });
    expect(screen.queryByTestId('borrow-now-search-dock')).toBeNull();
    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.getByText('为你推荐')).toBeTruthy();
    expect(screen.queryByText('馆藏结果')).toBeNull();
    expect(screen.queryByText('馆藏位置')).toBeNull();
    expect(screen.queryByText('推荐解释')).toBeNull();
    expect(screen.queryByText(/推荐解释 ·/)).toBeNull();
    expect(screen.getByTestId('search-results-list')).toBeTruthy();
    expect(screen.getAllByTestId('search-result-cell').length).toBeGreaterThan(0);
    expect(screen.queryByText('查看详情并借阅')).toBeNull();
    expect(screen.getAllByTestId('search-result-action-chevron').length).toBeGreaterThan(0);
    expect(screen.queryByText('没看到想找的书？')).toBeNull();
    expect(screen.queryByTestId('search-fallback-artwork')).toBeNull();
    expect(screen.queryByTestId('search-feedback-trigger')).toBeNull();
    expect(screen.getByPlaceholderText('搜索书名、作者、更多信息')).toBeTruthy();
  });

  it('switches the result section title to 馆藏结果 after entering a query', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.getByText('馆藏结果')).toBeTruthy();
    expect(screen.queryByText('为你推荐')).toBeNull();
    expect(screen.getByText('没看到想找的书？')).toBeTruthy();
    expect(screen.getByTestId('search-fallback-artwork')).toBeTruthy();
    expect(screen.getByTestId('search-feedback-trigger')).toBeTruthy();
  });

  it('moves the active shell highlight onto the selected filter chip', () => {
    renderWithProviders(<SearchRoute />);

    fireEvent.press(screen.getByTestId('search-filter-chip-category:管理学'));

    expect(screen.getByTestId('search-filter-chip-category:管理学-shell')).toHaveStyle({
      backgroundColor: appTheme.colors.primarySoft,
      padding: 2,
    });
    expect(screen.getByTestId('search-filter-chip-all-shell')).toHaveStyle({
      backgroundColor: 'transparent',
      padding: 0,
    });
  });

  it('keeps discovery recommendations unchanged when a category chip is selected without a query', () => {
    renderWithProviders(<SearchRoute />);

    fireEvent.press(screen.getByTestId('search-filter-chip-category:管理学'));

    expect(screen.getByText('为你推荐')).toBeTruthy();
    expect(screen.queryByText('馆藏结果')).toBeNull();
    expect(screen.getByText('Deep Learning')).toBeTruthy();
    expect(screen.getByTestId('search-filter-chip-category:管理学-shell')).toHaveStyle({
      backgroundColor: appTheme.colors.primarySoft,
      padding: 2,
    });
    expect(screen.getByTestId('search-filter-chip-all-shell')).toHaveStyle({
      backgroundColor: 'transparent',
      padding: 0,
    });
  });

  it('loads more discovery recommendations when the search query is empty', () => {
    renderWithProviders(<SearchRoute />);

    expect(screen.getByText('为你推荐')).toBeTruthy();
    expect(screen.getAllByTestId('search-result-cell')).toHaveLength(5);
    expect(screen.queryByText('推荐结果 6')).toBeNull();
    expect(mockRecommendationPageQueries).toContainEqual({
      limit: 5,
      query: '',
    });

    fireEvent.press(screen.getByText('加载更多结果'));

    expect(mockRecommendationPageQueries).toContainEqual({
      limit: 10,
      query: '',
    });
    expect(screen.getAllByTestId('search-result-cell')).toHaveLength(10);
    expect(screen.getByText('推荐结果 6')).toBeTruthy();
  });

  it('keeps visible discovery results mounted while loading more recommendations', () => {
    renderWithProviders(<SearchRoute />);

    expect(screen.getAllByTestId('search-result-cell')).toHaveLength(5);
    mockRecommendationLoadingQueries.add(mockCreateLoadingKey('', 10));

    fireEvent.press(screen.getByText('加载更多结果'));

    expect(mockRecommendationPageQueries).toContainEqual({
      limit: 10,
      query: '',
    });
    expect(screen.getAllByTestId('search-result-cell')).toHaveLength(5);
    expect(screen.getByText('Deep Learning')).toBeTruthy();
    expect(screen.queryByText('加载更多结果')).toBeNull();
    expect(screen.getByTestId('search-load-more-spinner')).toBeTruthy();
    expect(screen.queryByTestId('search-result-skeleton-1')).toBeNull();
  });

  it('passes the selected category through to explicit catalog search results', () => {
    renderWithProviders(<SearchRoute />);

    fireEvent.press(screen.getByTestId('search-filter-chip-category:人工智能'));

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '统计',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(mockExplicitPageQueries).toContainEqual({
      category: '人工智能',
      limit: 20,
      offset: 0,
      query: '统计',
    });
  });

  it('opens the missing-book feedback modal and shows a toast after mock submit', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    fireEvent.press(screen.getByTestId('search-feedback-trigger'));

    expect(screen.getByTestId('missing-book-feedback-modal')).toBeTruthy();
    expect(screen.getByPlaceholderText('请输入书名或关键词')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('请输入书名或关键词'), '安全');
    fireEvent.changeText(screen.getByPlaceholderText('请输入作者、课程名或备注'), '图书馆没有这本书');

    fireEvent.press(screen.getByTestId('missing-book-submit'));

    expect(screen.queryByTestId('missing-book-feedback-modal')).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('已收到缺书反馈');
    expect(screen.queryByTestId('missing-book-feedback-toast')).toBeNull();
  });

  it('renders the standalone borrow-now search route with its own native search bar', () => {
    renderWithProviders(<BorrowNowSearchRoute />);

    expect(mockLastHeaderSearchBarOptions).toEqual(
      expect.objectContaining({
        placeholder: '搜索想立刻借走的书',
      })
    );
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.getByPlaceholderText('搜索想立刻借走的书')).toBeTruthy();
    expect(screen.getAllByText('只看可借可送').length).toBeGreaterThan(0);
  });

  it('accepts native-event payloads from the stack search bar without crashing', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        nativeEvent: {
          text: '深度学习',
        },
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(mockBookSearchQueries.at(-1)).toBe('深度学习');
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
  });

  it('accepts direct text payloads from the native stack search bar', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '统计学习',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(mockBookSearchQueries.at(-1)).toBe('统计学习');
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
  });

  it('prefers committed native-event text over top-level composition text from the native search bar', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        nativeEvent: {
          text: '安全',
        },
        text: 'anqua',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(mockBookSearchQueries.at(-1)).toBe('安全');
    expect(screen.queryByTestId('page-shell-header-title')).toBeNull();
  });

  it('paginates a broad explicit search and loads more catalog results on demand', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.getAllByText(/安全结果 \d+/)).toHaveLength(20);
    expect(screen.queryByText('安全治理导论')).toBeNull();
    expect(screen.getByText('加载更多结果')).toBeTruthy();
    expect(mockExplicitPageQueries).toContainEqual({
      category: null,
      limit: 20,
      offset: 0,
      query: '安全',
    });

    fireEvent.press(screen.getByText('加载更多结果'));

    expect(mockExplicitPageQueries).toContainEqual({
      category: null,
      limit: 20,
      offset: 20,
      query: '安全',
    });
    expect(screen.getAllByText(/安全结果 \d+/)).toHaveLength(40);
    expect(screen.queryByText('安全治理导论')).toBeNull();
  });

  it('keeps visible catalog results mounted while loading more explicit search results', () => {
    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.getAllByText(/安全结果 \d+/)).toHaveLength(20);
    mockCatalogLoadingQueries.add(mockCreateLoadingKey('安全', 20));

    fireEvent.press(screen.getByText('加载更多结果'));

    expect(mockExplicitPageQueries).toContainEqual({
      category: null,
      limit: 20,
      offset: 20,
      query: '安全',
    });
    expect(screen.getAllByText(/安全结果 \d+/)).toHaveLength(20);
    expect(screen.queryByText('加载更多结果')).toBeNull();
    expect(screen.getByTestId('search-load-more-spinner')).toBeTruthy();
    expect(screen.queryByTestId('search-result-skeleton-1')).toBeNull();
  });

  it('keeps recommendation results visible when catalog search fails without showing the global search failure card', () => {
    mockCatalogSearchErrorQueries.add('安全');

    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.queryByText('找书联调失败')).toBeNull();
    expect(screen.getByText('馆藏检索暂不可用')).toBeTruthy();
    expect(screen.getByText('安全治理导论')).toBeTruthy();
  });

  it('keeps catalog results visible when recommendation search fails without showing the global search failure card', () => {
    mockRecommendationSearchErrorQueries.add('安全');

    renderWithProviders(<SearchRoute />);

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS);
    });

    expect(screen.queryByText('找书联调失败')).toBeNull();
    expect(screen.queryByText('馆藏检索暂不可用')).toBeNull();
    expect(screen.getByText('安全结果 1')).toBeTruthy();
  });

  it('debounces explicit and recommendation searches while typing', () => {
    renderWithProviders(<SearchRoute />);

    mockExplicitPageQueries = [];
    mockRecommendationQueries = [];

    act(() => {
      const nativeSearchBar = screen.getByTestId('native-search-bar');
      nativeSearchBar.props.onChangeText({
        text: 'a',
      });
      nativeSearchBar.props.onChangeText({
        text: 'an',
      });
      nativeSearchBar.props.onChangeText({
        text: '安全',
      });
    });

    expect(mockExplicitPageQueries.some((entry) => ['a', 'an', '安全'].includes(entry.query))).toBe(false);
    expect(mockRecommendationQueries.some((entry) => ['a', 'an', '安全'].includes(entry))).toBe(false);

    act(() => {
      jest.advanceTimersByTime(SEARCH_INPUT_DEBOUNCE_MS - 1);
    });

    expect(mockExplicitPageQueries.some((entry) => entry.query === '安全')).toBe(false);
    expect(mockRecommendationQueries.some((entry) => entry === '安全')).toBe(false);

    act(() => {
      jest.advanceTimersByTime(1);
    });

    expect(mockExplicitPageQueries).toContainEqual({
      category: null,
      limit: 20,
      offset: 0,
      query: '安全',
    });
    expect(mockRecommendationQueries).toContain('安全');
    expect(mockExplicitPageQueries.some((entry) => entry.query === 'a' || entry.query === 'an')).toBe(false);
    expect(mockRecommendationQueries.some((entry) => entry === 'a' || entry === 'an')).toBe(false);
  });

  it('keeps the native search bar mounted while keyboard events fire', () => {
    renderWithProviders(<SearchRoute />);

    expect(screen.getByTestId('native-search-bar')).toBeTruthy();

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 320 });
    });

    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.getByTestId('search-results-list')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(320);
    });

    act(() => {
      emitKeyboardEvent('keyboardWillHide', { duration: 260 });
    });

    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
  });

  it('renders borrowing route sections', () => {
    renderWithProviders(<BorrowingRoute />);

    expect(screen.getByText('借阅')).toBeTruthy();
    expect(screen.getByText('动态')).toBeTruthy();
    expect(screen.getByText('借阅任务中心')).toBeTruthy();
    expect(screen.getAllByText('进行中借阅').length).toBeGreaterThan(0);
    expect(screen.queryByText('当前借阅')).toBeNull();
    expect(screen.queryByText('现在处理')).toBeNull();
    expect(screen.getByText('我的借阅')).toBeTruthy();
    expect(screen.queryByText('借阅闭环')).toBeNull();
    expect(screen.getByTestId('borrowing-artwork')).toBeTruthy();

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(screen.getByText('最近动态')).toBeTruthy();
    expect(screen.getByTestId('borrowing-activity-timeline')).toBeTruthy();
  });

  it('renders the me route workspace entries', () => {
    renderWithProviders(<MeRoute />);

    expect(screen.getByText('今日提醒')).toBeTruthy();
    expect(screen.getByText('打开个人中心')).toBeTruthy();
    expect(screen.getByText('阅读偏好')).toBeTruthy();
    expect(screen.getByText('数据概览')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();

    fireEvent.press(screen.getByText('退出登录'));

    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('renders the marker examples route with both highlight variants', () => {
    renderWithProviders(<MarkerExamplesRoute />);

    expect(screen.getByText(/这里集中放当前项目里可直接复用的 marker 文本样式/)).toBeTruthy();
    expect(screen.getByText('块状高亮')).toBeTruthy();
    expect(screen.getByText('底部下划线')).toBeTruthy();
    expect(screen.getAllByText('highlight').length).toBeGreaterThan(0);
    expect(screen.getAllByText('underline').length).toBeGreaterThan(0);
    expect(screen.getByText('蓝色信息')).toBeTruthy();
    expect(screen.getByText('黄色时长')).toBeTruthy();
    expect(screen.getByText('橙色路径')).toBeTruthy();
    expect(screen.getByText('绿色完成')).toBeTruthy();
    expect(screen.getAllByText('红色提醒').length).toBeGreaterThan(0);
    expect(screen.getByText('自定义下划线')).toBeTruthy();
  });

  it('renders the profile route reading portrait sections', () => {
    renderWithProviders(<ProfileRoute />);

    expect(screen.getByText('陈知行')).toBeTruthy();
    expect(screen.getByText('借阅偏好')).toBeTruthy();
    expect(screen.getAllByText('近期节奏').length).toBeGreaterThan(0);
    expect(screen.queryByText('最近借阅、主题偏好与阅读节奏，一页查看。')).toBeNull();
    expect(screen.getByTestId('profile-artwork')).toBeTruthy();
    expect(screen.queryByTestId('illustration-profile')).toBeNull();
  });

  it('renders three tabs in native and web layouts', () => {
    renderWithProviders(<TabsLayout />);
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('找书')).toBeTruthy();
    expect(screen.getByText('借阅')).toBeTruthy();
    expect(screen.queryByText('我的')).toBeNull();
    expect(screen.getByTestId('native-tabs').props.backgroundColor).toBeUndefined();
    expect(screen.getByTestId('native-tabs').props.blurEffect).toBeUndefined();
    expect(screen.getByTestId('native-tabs').props.iconColor).toBeUndefined();
    expect(screen.getByTestId('native-tabs').props.labelStyle).toBeUndefined();
    expect(screen.getByTestId('native-tabs').props.tintColor).toBeUndefined();
    expect(screen.getByTestId('native-tabs').props.disableTransparentOnScrollEdge).toBe(true);
    expect(screen.getByTestId('native-tab-search').props.accessibilityLabel).toBe('search');
    expect(screen.queryByTestId('native-tab-me')).toBeNull();
    expect(screen.getByTestId('native-tab-(home)')).toBeTruthy();

    renderWithProviders(<WebTabsLayout />);
    expect(screen.getByTestId('web-tab-(home)')).toBeTruthy();
    expect(screen.getByTestId('web-tab-search')).toBeTruthy();
    expect(screen.getByTestId('web-tab-borrowing')).toBeTruthy();
    expect(screen.queryByTestId('web-tab-me')).toBeNull();
  });
});
