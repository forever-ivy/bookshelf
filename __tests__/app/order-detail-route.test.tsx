import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockRouteParams: Record<string, string> = { orderId: '201' };
let mockOrderData: any = {
  book: { author: 'Ian Goodfellow', id: 1, title: 'Deep Learning' },
  cancellable: false,
  dueDateLabel: '4 月 9 日前归还',
  id: 201,
  mode: 'robot_delivery',
  note: '已送达阅览室',
  renewable: true,
  returnable: false,
  status: 'renewable',
  statusLabel: '可续借',
  timeline: [
    { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
    { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
    { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
  ],
};

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
    usePathname: () => '/orders/201',
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
  useCancelBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useOrderDetailQuery: () => ({
    data: mockOrderData,
    isError: false,
    isFetching: false,
  }),
  useRenewBorrowOrderMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
  useReturnRequestMutation: () => ({
    isPending: false,
    mutateAsync: jest.fn(),
  }),
}));

import OrderDetailRoute from '@/app/orders/[orderId]';

describe('order detail route', () => {
  beforeEach(() => {
    mockRouteParams = { orderId: '201' };
    mockOrderData = {
      book: { author: 'Ian Goodfellow', id: 1, title: 'Deep Learning' },
      cancellable: false,
      dueDateLabel: '4 月 9 日前归还',
      id: 201,
      mode: 'robot_delivery',
      note: '已送达阅览室',
      renewable: true,
      returnable: false,
      status: 'renewable',
      statusLabel: '可续借',
      timeline: [
        { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
        { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
        { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
      ],
    };
  });

  it('renders a unified journey with a highlighted current borrowing stage', () => {
    render(<OrderDetailRoute />);

    expect(screen.getByTestId('delivery-tracking-hero')).toBeTruthy();
    expect(screen.getByText('剩余距离')).toBeTruthy();
    expect(screen.getByText('预计送达')).toBeTruthy();
    expect(screen.getAllByText('借阅中').length).toBeGreaterThan(0);
    expect(screen.getByText('下单')).toBeTruthy();
    expect(screen.getByText('处理中')).toBeTruthy();
    expect(screen.getByText('配送中')).toBeTruthy();
    expect(screen.getByText('已归还')).toBeTruthy();
    expect(screen.queryByText('配送 / 出书中')).toBeNull();
    expect(screen.queryByText('待取书')).toBeNull();
    expect(screen.queryByText('机器人配送中')).toBeNull();
    expect(screen.queryByText('已送达')).toBeNull();
  });

  it('renders cancelled orders as a standalone exception state', () => {
    mockOrderData = {
      ...mockOrderData,
      cancellable: false,
      renewable: false,
      status: 'cancelled',
      statusLabel: '已取消',
      timeline: [{ completed: true, label: '已取消' }],
    };

    render(<OrderDetailRoute />);

    expect(screen.getByText('借阅已取消')).toBeTruthy();
    expect(screen.getByText('该借阅订单已取消，没有进入后续借阅与归还流程。')).toBeTruthy();
    expect(screen.queryByText('已归还')).toBeNull();
  });

  it('does not render the delivery tracking hero for cabinet pickup orders', () => {
    mockOrderData = {
      ...mockOrderData,
      mode: 'cabinet_pickup',
      note: '请前往主馆一层书柜取书',
      status: 'active',
      statusLabel: '待取书',
      timeline: [{ completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' }],
    };

    render(<OrderDetailRoute />);

    expect(screen.queryByTestId('delivery-tracking-hero')).toBeNull();
    expect(screen.queryByText('剩余距离')).toBeNull();
    expect(screen.queryByText('预计送达')).toBeNull();
  });
});
