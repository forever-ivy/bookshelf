import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { ScrollView } from 'react-native';
import { toast } from 'sonner-native';

let mockBorrowingLoading = false;
let mockDynamicLoading = false;
let mockFavoritesLoading = false;
let mockBooklistsLoading = false;
const mockRouter = {
  push: jest.fn(),
};
const mockDismissNotificationMutateAsync = jest.fn(async (notificationId: string) => {
  mockNotifications = mockNotifications.filter((item) => item.id !== notificationId);
  return { notificationId, ok: true };
});
let mockNotifications = [
  {
    body: '机器人已从主馆出发，预计 10 分钟后送达。',
    id: 'note-1',
    kind: 'delivery' as const,
    title: '配送状态更新',
  },
  {
    body: '你有一本图书将在明天到期，请及时处理。',
    id: 'note-2',
    kind: 'borrowing' as const,
    title: '到期提醒',
  },
  {
    body: '馆内已确认你的归还申请，等待最终入库。',
    id: 'note-3',
    kind: 'borrowing' as const,
    title: '归还进展',
  },
  {
    body: '你的学习笔记摘要已生成，可继续查看。',
    id: 'note-4',
    kind: 'reminder' as const,
    title: '学习结果更新',
  },
];

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
    Swipeable: ({
      children,
      renderRightActions,
    }: {
      children?: React.ReactNode;
      renderRightActions?: () => React.ReactNode;
    }) =>
      React.createElement(
        View,
        null,
        children,
        renderRightActions ? React.createElement(View, null, renderRightActions()) : null
      ),
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Screen = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  Screen.Title = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);

  const Toolbar = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);
  Toolbar.Button = () => null;
  Toolbar.View = ({ children }: { children?: React.ReactNode }) => React.createElement(View, null, children);

  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    Stack: {
      Screen,
      Toolbar,
    },
    usePathname: () => '/borrowing',
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
    hydrateStoredToken: jest.fn(),
    identity: {
      accountId: 42,
      profileId: 7,
      role: 'reader',
    },
    isAuthenticated: true,
    onboarding: null,
    profile: null,
    refreshToken: null,
    setBootstrapStatus: jest.fn(),
    setSession: jest.fn(),
    token: 'session-token',
  }),
}));

jest.mock('@/lib/app/artwork', () => ({
  appArtwork: {
    notionBorrowSuccess: 1,
  },
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBorrowOrdersQuery: (filters?: { activeOnly?: boolean; status?: string | null }) => ({
    data: mockBorrowingLoading
      ? undefined
      : filters?.status === 'completed'
        ? []
        : [
            {
              actionableLabel: '查看详情',
              book: { author: '周志华', coverTone: 'lavender', title: '机器学习' },
              dueDateLabel: '4 月 2 日前归还',
              id: 101,
              mode: 'robot_delivery',
              note: '已送达阅览室',
              renewable: true,
              status: 'renewable',
              statusLabel: '可续借',
              timeline: [],
            },
            {
              actionableLabel: '发起归还请求',
              book: { author: 'Andrew Ng', coverTone: 'blue', title: '深度学习导论' },
              dueDateLabel: '明天到期',
              id: 102,
              mode: 'cabinet_pickup',
              note: '请尽快处理',
              renewable: false,
              status: 'dueSoon',
              statusLabel: '即将到期',
              timeline: [],
            },
            {
              actionableLabel: '查看详情',
              book: { author: '李航', coverTone: 'coral', title: '统计学习方法' },
              dueDateLabel: '已完成',
              id: 103,
              mode: 'robot_delivery',
              note: '已完成',
              renewable: false,
              status: 'completed',
              statusLabel: '已完成',
              timeline: [],
            },
          ],
    error: null,
    isError: false,
    isFetching: mockBorrowingLoading,
  }),
  useMyOrdersQuery: () => ({
    data: mockBorrowingLoading
      ? undefined
      : [
          {
            actionableLabel: '查看详情',
            book: { author: '周志华', coverTone: 'lavender', title: '机器学习' },
            dueDateLabel: '4 月 2 日前归还',
            id: 101,
            mode: 'robot_delivery',
            note: '已送达阅览室',
            renewable: true,
            status: 'renewable',
            statusLabel: '可续借',
            timeline: [],
          },
          {
            actionableLabel: '发起归还请求',
            book: { author: 'Andrew Ng', coverTone: 'blue', title: '深度学习导论' },
            dueDateLabel: '明天到期',
            id: 102,
            mode: 'cabinet_pickup',
            note: '请尽快处理',
            renewable: false,
            status: 'dueSoon',
            statusLabel: '即将到期',
            timeline: [],
          },
          {
            actionableLabel: '查看详情',
            book: { author: '李航', coverTone: 'coral', title: '统计学习方法' },
            dueDateLabel: '3 月 20 日',
            id: 201,
            mode: 'robot_delivery',
            note: '已完成',
            renewable: false,
            status: 'completed',
            statusLabel: '已完成',
            timeline: [],
          },
        ],
    error: null,
    isFetching: mockBorrowingLoading,
  }),
  useMyOverviewQuery: () => ({
    data: mockDynamicLoading
      ? undefined
      : {
          profile: null,
          recentConversations: [],
          recentOrders: [
            {
              actionableLabel: '查看状态',
              book: { author: '周志华', coverTone: 'lavender', title: '机器学习' },
              dueDateLabel: '4 月 2 日前归还',
              id: 101,
              mode: 'robot_delivery',
              note: '已送达阅览室',
              renewable: true,
              status: 'renewable',
              statusLabel: '可续借',
              timeline: [],
            },
          ],
          recentQueries: [],
          recentReadingEvents: [
            {
              created_at: '2026-04-01T08:00:00Z',
              event_type: 'reading_session',
              id: 1,
              metadata_json: { title: '晚间阅读 45 分钟' },
            },
          ],
          recentRecommendations: [],
          stats: {
            activeOrdersCount: 2,
            borrowHistoryCount: 8,
            conversationCount: 0,
            lastActiveAt: '2026-04-01',
            readingEventCount: 3,
            recommendationCount: 0,
            searchCount: 0,
          },
        },
    isFetching: mockDynamicLoading,
  }),
  useNotificationsQuery: () => ({
    data: mockDynamicLoading ? undefined : mockNotifications,
    isFetching: mockDynamicLoading,
  }),
  useDismissNotificationMutation: () => ({
    isPending: false,
    mutateAsync: mockDismissNotificationMutateAsync,
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
          {
            book: {
              author: '陈越',
              availabilityLabel: '馆藏充足 · 可立即借阅',
              cabinetLabel: '主馆 C-11',
              coverTone: 'mint',
              etaLabel: '不可配送',
              id: 13,
              recommendationReason: null,
              summary: '第三本不应该在借阅页预览区出现',
              title: '组织行为学',
            },
            id: 'fav-3',
          },
        ],
    isError: false,
    isFetching: mockFavoritesLoading,
  }),
  useBooklistsQuery: () => ({
    data: mockBooklistsLoading
      ? undefined
      : {
          customItems: [{ books: [], description: '我的书单', id: '1', title: '我的书单' }],
          systemItems: [{ books: [], description: '系统书单', id: '2', title: '系统书单' }],
        },
    isFetching: mockBooklistsLoading,
  }),
  useCreateBooklistMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useDeleteBooklistMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useOrderHistoryQuery: () => ({
    data: mockDynamicLoading
      ? undefined
      : [
          {
            actionableLabel: '查看详情',
            book: { author: '李航', coverTone: 'coral', title: '统计学习方法' },
            dueDateLabel: '3 月 20 日',
            id: 201,
            mode: 'robot_delivery',
            note: '已完成',
            renewable: false,
            status: 'completed',
            statusLabel: '已完成',
            timeline: [],
          },
          {
            actionableLabel: '查看详情',
            book: { author: 'Robert C. Martin', coverTone: 'blue', title: '代码整洁之道' },
            dueDateLabel: '3 月 12 日',
            id: 202,
            mode: 'cabinet_pickup',
            note: '已完成',
            renewable: false,
            status: 'completed',
            statusLabel: '已完成',
            timeline: [],
          },
          {
            actionableLabel: '查看详情',
            book: { author: 'Martin Fowler', coverTone: 'mint', title: '重构' },
            dueDateLabel: '3 月 1 日',
            id: 203,
            mode: 'robot_delivery',
            note: '已完成',
            renewable: false,
            status: 'completed',
            statusLabel: '已完成',
            timeline: [],
          },
        ],
    isFetching: mockDynamicLoading,
  }),
  useCancelBorrowOrderMutation: () => ({
    error: null,
    isPending: false,
    mutate: jest.fn(),
  }),
  useRenewBorrowOrderMutation: () => ({
    error: null,
    mutate: jest.fn(),
  }),
  useReturnRequestMutation: () => ({
    isPending: false,
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
  }),
  useReturnRequestsQuery: () => ({
    data: mockBorrowingLoading
      ? undefined
      : [
          {
            borrowOrderStatus: '馆内处理中',
            id: 301,
            note: '归还申请已提交，等待馆内确认。',
          },
        ],
    isFetching: mockBorrowingLoading,
  }),
}));

import BorrowingRoute from '@/app/(tabs)/borrowing';

describe('BorrowingRoute', () => {
  beforeEach(() => {
    mockBorrowingLoading = false;
    mockDynamicLoading = false;
    mockFavoritesLoading = false;
    mockBooklistsLoading = false;
    mockRouter.push.mockReset();
    mockDismissNotificationMutateAsync.mockClear();
    mockNotifications = [
      {
        body: '机器人已从主馆出发，预计 10 分钟后送达。',
        id: 'note-1',
        kind: 'delivery',
        title: '配送状态更新',
      },
      {
        body: '你有一本图书将在明天到期，请及时处理。',
        id: 'note-2',
        kind: 'borrowing',
        title: '到期提醒',
      },
      {
        body: '馆内已确认你的归还申请，等待最终入库。',
        id: 'note-3',
        kind: 'borrowing',
        title: '归还进展',
      },
      {
        body: '你的学习笔记摘要已生成，可继续查看。',
        id: 'note-4',
        kind: 'reminder',
        title: '学习结果更新',
      },
    ];
    jest.clearAllMocks();
  });

  it('defaults to the borrowing tab with actions and a unified borrowing list', () => {
    const view = render(<BorrowingRoute />);

    expect(screen.getByText('借阅')).toBeTruthy();
    expect(screen.getByText('收藏')).toBeTruthy();
    expect(screen.getByText('动态')).toBeTruthy();
    expect(screen.getByText('借阅任务中心')).toBeTruthy();
    expect(view.UNSAFE_getAllByType(ScrollView).some((item) => item.props.testID === 'borrowing-filter-strip')).toBe(true);
    expect(screen.queryByText('只看进行中')).toBeNull();
    expect(screen.queryByText('范围')).toBeNull();
    expect(screen.queryByText('细分')).toBeNull();
    expect(screen.getByText('进行中')).toBeTruthy();
    expect(screen.getByText('进行中借阅')).toBeTruthy();
    expect(screen.queryByText('当前借阅')).toBeNull();
    expect(screen.getByTestId('borrowing-filter-chip-active-shell')).toHaveStyle({
      backgroundColor: '#E9EEF3',
      padding: 2,
    });
    expect(screen.getByTestId('borrowing-filter-chip-all-shell')).toHaveStyle({
      backgroundColor: 'transparent',
      padding: 0,
    });
    expect(screen.queryByText('现在处理')).toBeNull();
    expect(screen.getByText('我的借阅')).toBeTruthy();
    expect(screen.queryByText('统计学习方法')).toBeNull();
    expect(screen.queryByText('配送与取书进度')).toBeNull();
    expect(screen.queryByText('归还处理进展')).toBeNull();
    expect(screen.queryByText('提醒与更新')).toBeNull();
    expect(screen.queryByText('归还申请')).toBeNull();
    expect(screen.queryByText('待确认动作')).toBeNull();
  });

  it('renders a two-book favorites preview with a more action on the favorites tab', () => {
    render(<BorrowingRoute />);

    fireEvent.press(screen.getByText('收藏'));

    expect(screen.getAllByText('书单').length).toBeGreaterThan(0);
    expect(screen.getByTestId('favorites-preview-card')).toBeTruthy();
    expect(screen.getByText('收藏图书')).toBeTruthy();
    expect(screen.getByTestId('favorites-tab-more')).toBeTruthy();
    expect(screen.getByTestId('favorites-preview-row-fav-1')).toBeTruthy();
    expect(screen.getByTestId('favorites-preview-row-fav-2')).toBeTruthy();
    expect(screen.getByText('机器学习')).toBeTruthy();
    expect(screen.getAllByText('统计学习方法').length).toBeGreaterThan(0);
    expect(screen.queryByText('组织行为学')).toBeNull();
    expect(screen.getAllByText('我的书单').length).toBeGreaterThan(0);
    expect(screen.queryByText('系统书单')).toBeNull();
    expect(screen.getAllByText('课程导读').length).toBeGreaterThan(0);
    expect(screen.queryByText('馆藏充足 · 可立即借阅')).toBeNull();
    expect(screen.getByTestId('favorites-booklists-panel')).toBeTruthy();
    expect(screen.getByTestId('favorites-booklist-row-1')).toBeTruthy();
    expect(screen.queryByText(/分类：/)).toBeNull();
    expect(screen.queryByText(/配送目标：/)).toBeNull();
    expect(screen.queryByText(/送达时间：/)).toBeNull();
    expect(screen.queryByText('订单筛选')).toBeNull();
    expect(screen.queryByText('最近动态')).toBeNull();
  });

  it('opens the favorites detail route from the more action', () => {
    render(<BorrowingRoute />);

    fireEvent.press(screen.getByText('收藏'));
    fireEvent.press(screen.getByTestId('favorites-tab-more'));

    expect(mockRouter.push).toHaveBeenCalledWith('/favorites');
  });

  it('shows delivery, return, notification, and history sections on the dynamic tab', () => {
    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(screen.getByText('提醒')).toBeTruthy();
    expect(screen.getByTestId('notification-cart')).toBeTruthy();
    expect(screen.getByText('最近动态')).toBeTruthy();
    expect(screen.getByTestId('borrowing-activity-timeline')).toBeTruthy();
    expect(screen.getAllByText('配送进展').length).toBeGreaterThan(0);
    expect(screen.getByText('归还流程')).toBeTruthy();
    expect(screen.getByText('学习记录')).toBeTruthy();
    expect(screen.getByText('历史借阅')).toBeTruthy();
    expect(screen.getByText('配送提醒')).toBeTruthy();
    expect(screen.getByText('配送状态更新')).toBeTruthy();
    expect(screen.getByText('统计学习方法')).toBeTruthy();
    expect(screen.queryByText('提醒更新')).toBeNull();
    expect(screen.queryByText('订单筛选')).toBeNull();
    expect(screen.queryByText('我的借阅')).toBeNull();
  });

  it('expands and collapses grouped activity items beyond the default two rows', () => {
    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(screen.queryByText('重构')).toBeNull();
    expect(screen.getByText('查看全部 3 条')).toBeTruthy();

    fireEvent.press(screen.getByText('查看全部 3 条'));

    expect(screen.getByText('重构')).toBeTruthy();
    expect(screen.getByText('收起')).toBeTruthy();

    fireEvent.press(screen.getByText('收起'));

    expect(screen.queryByText('重构')).toBeNull();
    expect(screen.getByText('查看全部 3 条')).toBeTruthy();
  });

  it('shows an empty notification cart state when there are no reminders', () => {
    mockNotifications = [];

    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(screen.getByTestId('notification-cart')).toBeTruthy();
    expect(screen.getByText('暂无信息')).toBeTruthy();
    expect(screen.queryByText('配送状态更新')).toBeNull();
  });

  it('dismisses reminder cards from the swipe action', async () => {
    jest.useFakeTimers();

    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));
    fireEvent.press(screen.getByTestId('notification-dismiss-note-1'));

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('notification-card-note-1')).toBeNull();
    });
    expect(mockDismissNotificationMutateAsync).toHaveBeenCalledWith('note-1');
    expect(screen.getByText('3 条待处理')).toBeTruthy();

    jest.useRealTimers();
  });

  it('keeps dismissed reminders hidden after the route remounts', async () => {
    jest.useFakeTimers();

    const view = render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));
    fireEvent.press(screen.getByTestId('notification-dismiss-note-1'));

    act(() => {
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('notification-card-note-1')).toBeNull();
    });
    expect(mockDismissNotificationMutateAsync).toHaveBeenCalledWith('note-1');

    jest.useRealTimers();
    view.unmount();

    render(<BorrowingRoute />);
    await act(async () => {});

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));
    await waitFor(() => {
      expect(screen.queryByTestId('notification-card-note-1')).toBeNull();
    });
  });

  it('shows a sonner toast when a new reminder arrives after the initial load', () => {
    const view = render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    mockNotifications = [
      {
        body: '新的配送异常提醒，请尽快确认。',
        id: 'note-5',
        kind: 'delivery',
        title: '新的配送提醒',
      },
      ...mockNotifications,
    ];

    view.rerender(<BorrowingRoute />);
    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(toast.success).toHaveBeenCalledWith('收到 1 条新提醒');
  });

  it('does not re-toast when the same reminders are refetched with different ids', () => {
    const view = render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));
    (toast.success as jest.Mock).mockClear();

    mockNotifications = mockNotifications.map((item, index) => ({
      ...item,
      id: `refetched-${index + 1}`,
    }));

    view.rerender(<BorrowingRoute />);
    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the selected single-row filter chip active', () => {
    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-filter-chip-dueSoon'));

    expect(screen.getByTestId('borrowing-filter-chip-dueSoon-shell')).toHaveStyle({
      backgroundColor: '#E9EEF3',
      padding: 2,
    });
    expect(screen.getByTestId('borrowing-filter-chip-active-shell')).toHaveStyle({
      backgroundColor: 'transparent',
      padding: 0,
    });
    expect(screen.getByTestId('borrowing-filter-chip-dueSoon-label')).toHaveStyle({
      color: '#8B6442',
    });
  });

  it('keeps borrowing sections mounted with skeletons while loading', () => {
    mockBorrowingLoading = true;

    render(<BorrowingRoute />);

    expect(screen.getByText('订单筛选')).toBeTruthy();
    expect(screen.queryByText('现在处理')).toBeNull();
    expect(screen.getByText('我的借阅')).toBeTruthy();
    expect(screen.getByTestId('borrowing-summary-skeleton')).toBeTruthy();
    expect(screen.queryByText('当前没有进行中的借阅')).toBeNull();
    expect(screen.queryByText('暂时没有待处理任务')).toBeNull();
  });

  it('shows dynamic skeletons without unmounting the tab shell while loading dynamic data', () => {
    mockDynamicLoading = true;

    render(<BorrowingRoute />);

    fireEvent.press(screen.getByTestId('borrowing-tab-dynamic'));

    expect(screen.getByText('动态')).toBeTruthy();
    expect(screen.getByTestId('borrowing-dynamic-skeleton')).toBeTruthy();
    expect(screen.queryByText('配送状态更新')).toBeNull();
  });
});
