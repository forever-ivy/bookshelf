import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockBorrowingLoading = false;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

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
    useRouter: () => ({
      push: jest.fn(),
    }),
  };
});

jest.mock('@/providers/profile-sheet-provider', () => ({
  useProfileSheet: () => ({
    openProfileSheet: jest.fn(),
  }),
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
    data: mockBorrowingLoading ? undefined : [],
    isFetching: mockBorrowingLoading,
  }),
}));

import BorrowingRoute from '@/app/(tabs)/borrowing';

describe('BorrowingRoute', () => {
  beforeEach(() => {
    mockBorrowingLoading = false;
  });

  it('renders the borrowing page as a task center', () => {
    render(<BorrowingRoute />);

    expect(screen.getByText('借阅任务中心')).toBeTruthy();
    expect(screen.getByText('进行中借阅')).toBeTruthy();
    expect(screen.getByText('即将到期 / 需处理')).toBeTruthy();
    expect(screen.getByText('配送与取书进度')).toBeTruthy();
    expect(screen.getByText('历史借阅')).toBeTruthy();
    expect(screen.queryByText('归还申请')).toBeNull();
    expect(screen.queryByText('待确认动作')).toBeNull();
  });

  it('keeps borrowing sections mounted with skeletons while loading', () => {
    mockBorrowingLoading = true;

    render(<BorrowingRoute />);

    expect(screen.getByText('订单筛选')).toBeTruthy();
    expect(screen.getByText('进行中借阅')).toBeTruthy();
    expect(screen.getByText('即将到期 / 需处理')).toBeTruthy();
    expect(screen.getByText('配送与取书进度')).toBeTruthy();
    expect(screen.getByText('历史借阅')).toBeTruthy();
    expect(screen.getByTestId('borrowing-summary-skeleton')).toBeTruthy();
    expect(screen.queryByText('当前没有进行中的借阅')).toBeNull();
    expect(screen.queryByText('暂时没有待处理任务')).toBeNull();
  });
});
