import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, StyleSheet } from 'react-native';

let mockLocalSearchParams: Record<string, string | undefined> = {};
let mockBookSearchQueries: unknown[] = [];
const mockClearSession = jest.fn();
const mockKeyboardListeners = {
  keyboardDidHide: new Set<() => void>(),
  keyboardDidShow: new Set<() => void>(),
  keyboardWillHide: new Set<() => void>(),
  keyboardWillShow: new Set<() => void>(),
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

  const StackScreen = ({ children }: { children?: React.ReactNode }) =>
    React.createElement(View, null, children);
  StackScreen.Title = ({ children }: { children: React.ReactNode }) =>
    React.createElement(Text, null, children);

  Stack.Screen = StackScreen;
  Stack.SearchBar = ({
    onChangeText,
    placeholder,
  }: {
    onChangeText?: (value: unknown) => void;
    placeholder?: string;
  }) =>
    React.createElement(TextInput, {
      onChangeText,
      placeholder,
      testID: 'native-search-bar',
    });

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
    useRouter: () => ({
      back: jest.fn(),
      push: jest.fn(),
    }),
  };
});

jest.mock('expo-router/unstable-native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');

  const NativeTabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, { testID: 'native-tabs' }, children);

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
    profile: {
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
    },
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'reader-token',
  }),
}));

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
  useBookSearchQuery: (query: unknown) => {
    mockBookSearchQueries.push(query);
    return {
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
    };
  },
  useBooklistsQuery: () => ({
    data: {
      customItems: [
        { description: '今晚先看的两本轻量阅读。', id: 'tonight', source: 'custom', title: '今晚预习' },
      ],
      systemItems: [
        { description: '适合刚开始接触 AI 的同学', id: 'system-ai', source: 'system', title: 'AI 入门书单' },
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
  useRecommendationSearchQuery: () => ({
    data: [
      {
        availabilityLabel: '馆藏充足 · 可立即借阅',
        author: 'Ian Goodfellow',
        cabinetLabel: '主馆 2 楼',
        coverTone: 'blue',
        etaLabel: '到柜自取',
        id: 2,
        recommendationReason: '如果你在做深度学习专题，它会更系统',
        title: 'Deep Learning',
      },
    ],
  }),
  useRenewBorrowOrderMutation: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
}));

jest.mock('@/lib/app/artwork', () => ({
  appArtwork: {
    notionBorrowSuccess: 1,
    notionNoResults: 1,
    notionReadingProgress: 1,
    profileHero: 1,
  },
}));

import HomeRoute from '@/app/(tabs)/index';
import BorrowingRoute from '@/app/(tabs)/borrowing';
import MeRoute from '@/app/(tabs)/me';
import SearchRoute from '@/app/(tabs)/search';
import BorrowNowSearchRoute from '@/app/search/borrow-now';
import TabsLayout from '@/app/(tabs)/_layout';
import WebTabsLayout from '@/app/(tabs)/_layout.web';
import MarkerExamplesRoute from '@/app/marker-examples';
import ProfileRoute from '@/app/profile';

function renderWithProviders(node: React.ReactElement) {
  return render(node);
}

describe('UI shell routes', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockClearSession.mockReset();
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
        mockKeyboardListeners[event].add(listener as () => void);
      }

      return {
        remove: () => {
          if (
            event === 'keyboardDidShow' ||
            event === 'keyboardDidHide' ||
            event === 'keyboardWillShow' ||
            event === 'keyboardWillHide'
          ) {
            mockKeyboardListeners[event].delete(listener as () => void);
          }
        },
      } as { remove: () => void };
    });
  });

  afterEach(() => {
    mockLocalSearchParams = {};
    mockBookSearchQueries = [];
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('renders the home route hero and search entry', () => {
    renderWithProviders(<HomeRoute />);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('今晚路径');
    expect(screen.getByText('今晚路径')).toBeTruthy();
    expect(screen.getByTestId('home-artwork')).toBeTruthy();
    expect(screen.getByText('搜索书名、作者、课程或自然语言')).toBeTruthy();
    expect(screen.getByText('继续学习')).toBeTruthy();
    expect(screen.queryByTestId('brand-mark')).toBeNull();
    expect(screen.queryByTestId('illustration-home')).toBeNull();
    expect(screen.queryByTestId('secondary-back-button')).toBeNull();
    expect(screen.queryByTestId('secondary-back-layer')).toBeNull();
  });

  it('renders the search route as an independent find-book workspace', () => {
    renderWithProviders(<SearchRoute />);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
    expect(screen.getByText('筛选')).toBeTruthy();
    expect(screen.queryByTestId('borrow-now-search-dock')).toBeNull();
    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.getByText('搜索结果')).toBeTruthy();
    expect(screen.getByTestId('search-results-list')).toBeTruthy();
    expect(screen.getAllByTestId('search-result-cell').length).toBeGreaterThan(0);
    expect(screen.queryByText('查看详情并借阅')).toBeNull();
    expect(screen.getByText('没看到想找的书？')).toBeTruthy();
    expect(screen.getByTestId('search-fallback-artwork')).toBeTruthy();
    expect(screen.getByPlaceholderText('搜索书名、作者、课程或自然语言')).toBeTruthy();
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

    expect(mockBookSearchQueries.at(-1)).toBe('深度学习');
    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
  });

  it('hides the search title while the keyboard is visible and restores it afterward', () => {
    const scheduleLayoutAnimationSpy = jest
      .spyOn(Keyboard, 'scheduleLayoutAnimation')
      .mockImplementation(() => {});

    renderWithProviders(<SearchRoute />);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');

    act(() => {
      emitKeyboardEvent('keyboardWillShow', { duration: 320 });
    });

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
    expect(scheduleLayoutAnimationSpy).toHaveBeenCalledWith(
      expect.objectContaining({ duration: 320 })
    );
    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.getByTestId('search-results-list')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(320);
    });

    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header-title-slot').props.style).height).toBe(0);

    act(() => {
      emitKeyboardEvent('keyboardWillHide', { duration: 260 });
    });

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
    expect(StyleSheet.flatten(screen.getByTestId('page-shell-header-title-slot').props.style).height).toBe(36);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('找书');
  });

  it('renders the dedicated borrow-now route as an immediate borrow workspace', () => {
    renderWithProviders(<BorrowNowSearchRoute />);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('立即可借');
    expect(screen.getByTestId('secondary-back-button')).toBeTruthy();
    expect(screen.getAllByText('立即可借').length).toBeGreaterThan(0);
    expect(screen.getAllByText('只看可借可送').length).toBeGreaterThan(0);
    expect(screen.getByTestId('search-results-list')).toBeTruthy();
    expect(screen.getAllByTestId('search-result-cell').length).toBeGreaterThan(0);
    expect(screen.queryByText('立即借这本')).toBeNull();
    expect(screen.getByTestId('native-search-bar')).toBeTruthy();
    expect(screen.queryByTestId('borrow-now-search-dock')).toBeNull();
    expect(screen.queryByTestId('borrow-now-search-bar-surface')).toBeNull();
    expect(screen.getByPlaceholderText('搜索想立刻借走的书')).toBeTruthy();
  });

  it('renders borrowing route sections', () => {
    renderWithProviders(<BorrowingRoute />);

    expect(screen.getByText('借阅任务面板')).toBeTruthy();
    expect(screen.getAllByText('当前借阅').length).toBeGreaterThan(0);
    expect(screen.getAllByText('即将到期').length).toBeGreaterThan(0);
    expect(screen.getByText('历史借阅')).toBeTruthy();
    expect(screen.getByText('借阅闭环')).toBeTruthy();
    expect(screen.getByTestId('borrowing-artwork')).toBeTruthy();
  });

  it('renders the me route workspace entries', () => {
    renderWithProviders(<MeRoute />);

    expect(screen.getByTestId('page-shell-header-title')).toHaveTextContent('我的');
    expect(screen.getByText('今日提醒')).toBeTruthy();
    expect(screen.getByText('打开个人中心')).toBeTruthy();
    expect(screen.getAllByText('收藏与书单').length).toBeGreaterThan(0);
    expect(screen.getByText('常用入口')).toBeTruthy();
    expect(screen.getByText('退出登录')).toBeTruthy();

    fireEvent.press(screen.getByText('退出登录'));

    expect(mockClearSession).toHaveBeenCalledTimes(1);
  });

  it('renders the marker examples route with both highlight variants', () => {
    renderWithProviders(<MarkerExamplesRoute />);

    expect(screen.getByText('文字高亮示例')).toBeTruthy();
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

    expect(screen.getByText('陈知行 · 阅读与学习画像')).toBeTruthy();
    expect(screen.getByText('学习偏好线索')).toBeTruthy();
    expect(screen.getByTestId('profile-artwork')).toBeTruthy();
    expect(screen.queryByTestId('illustration-profile')).toBeNull();
  });

  it('renders four tabs in native and web layouts', () => {
    renderWithProviders(<TabsLayout />);
    expect(screen.getByText('首页')).toBeTruthy();
    expect(screen.getByText('找书')).toBeTruthy();
    expect(screen.getByText('借阅')).toBeTruthy();
    expect(screen.getByText('我的')).toBeTruthy();
    expect(screen.getByTestId('native-tab-search').props.accessibilityLabel).toBe('search');

    renderWithProviders(<WebTabsLayout />);
    expect(screen.getByTestId('web-tab-index')).toBeTruthy();
    expect(screen.getByTestId('web-tab-search')).toBeTruthy();
    expect(screen.getByTestId('web-tab-borrowing')).toBeTruthy();
    expect(screen.getByTestId('web-tab-me')).toBeTruthy();
  });
});
