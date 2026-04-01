import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockRouteParams: Record<string, string> = { bookId: '1' };
let mockBorrowLoading = false;
let mockOrderLoading = false;
let mockReturnLoading = false;

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
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
    useLocalSearchParams: () => mockRouteParams,
    usePathname: () => '/workspace-detail',
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/use-app-session', () => ({
  useAppSession: () => ({
    bootstrapStatus: 'ready',
    clearSession: jest.fn(),
    identity: { accountId: 1, profileId: 1, role: 'reader' },
    isAuthenticated: true,
    onboarding: { completed: true, needsInterestSelection: false, needsProfileBinding: false },
    profile: null,
    token: 'reader-token',
  }),
}));

jest.mock('@/hooks/use-library-app-data', () => ({
  useBookDetailQuery: () => ({
    data: mockBorrowLoading
      ? undefined
      : {
          catalog: {
            cabinetLabel: '智能书柜 A-03',
            etaLabel: '18 分钟可送达',
            id: 1,
            title: '机器学习从零到一',
          },
        },
    isError: false,
    isFetching: mockBorrowLoading,
  }),
  useCreateBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useCancelBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useRenewBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useReturnRequestMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useOrderDetailQuery: () => ({
    data: mockOrderLoading
      ? undefined
      : {
          book: { title: '机器学习从零到一' },
          dueDateLabel: '4 月 2 日前归还',
          id: 201,
          mode: 'robot_delivery',
          note: '已送达阅览室',
          renewable: true,
          status: 'active',
          statusLabel: '借阅中',
          timeline: [],
        },
    isError: false,
    isFetching: mockOrderLoading,
  }),
  useReturnRequestDetailQuery: () => ({
    data: mockReturnLoading
      ? undefined
      : {
          order: {
            book: { title: '机器学习从零到一' },
            dueDateLabel: '4 月 2 日前归还',
            id: 201,
            timeline: [],
          },
          returnRequest: {
            id: 301,
            note: '等待馆内处理',
            status: 'pending',
          },
        },
    isError: false,
    isFetching: mockReturnLoading,
  }),
}));

import BorrowRoute from '@/app/borrow/[bookId]';
import OrderDetailRoute from '@/app/orders/[orderId]';
import ReturnRequestDetailRoute from '@/app/returns/[returnRequestId]';

describe('secondary detail loading states', () => {
  beforeEach(() => {
    mockBorrowLoading = false;
    mockOrderLoading = false;
    mockReturnLoading = false;
    mockRouteParams = { bookId: '1' };
  });

  it('renders a stable borrow-order skeleton while the book detail is loading', () => {
    mockBorrowLoading = true;
    mockRouteParams = { bookId: '1' };

    render(<BorrowRoute />);

    expect(screen.getByTestId('borrow-route-skeleton')).toBeTruthy();
    expect(screen.queryByText('确认借阅')).toBeNull();
  });

  it('renders a stable order-detail skeleton while the order query is loading', () => {
    mockOrderLoading = true;
    mockRouteParams = { orderId: '201' };

    render(<OrderDetailRoute />);

    expect(screen.getByTestId('order-detail-skeleton')).toBeTruthy();
    expect(screen.queryByText('机器学习从零到一')).toBeNull();
  });

  it('renders a stable return-detail skeleton while the return query is loading', () => {
    mockReturnLoading = true;
    mockRouteParams = { returnRequestId: '301' };

    render(<ReturnRequestDetailRoute />);

    expect(screen.getByText('履约时间线')).toBeTruthy();
    expect(screen.getByTestId('return-detail-skeleton')).toBeTruthy();
    expect(screen.queryByText('归还请求 #301')).toBeNull();
  });
});
