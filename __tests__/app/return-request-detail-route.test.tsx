import { render, screen } from '@testing-library/react-native';
import React from 'react';

let mockRouteParams: Record<string, string> = { returnRequestId: '301' };
let mockDetailData: any = {
  order: {
    book: { author: 'Ian Goodfellow', id: 1, title: 'Deep Learning' },
    dueDateLabel: '4 月 9 日前归还',
    id: 201,
    mode: 'robot_delivery',
    status: 'dueSoon',
    statusLabel: '即将到期',
    timeline: [
      { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
      { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
      { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
    ],
  },
  returnRequest: {
    borrowOrderId: 201,
    id: 301,
    note: '等待馆内处理',
    status: 'created',
  },
};

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockRouteParams,
}));

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
  useReturnRequestDetailQuery: () => ({
    data: mockDetailData,
    isError: false,
    isFetching: false,
  }),
}));

import ReturnRequestDetailRoute from '@/app/returns/[returnRequestId]';

describe('return request detail route', () => {
  beforeEach(() => {
    mockRouteParams = { returnRequestId: '301' };
    mockDetailData = {
      order: {
        book: { author: 'Ian Goodfellow', id: 1, title: 'Deep Learning' },
        dueDateLabel: '4 月 9 日前归还',
        id: 201,
        mode: 'robot_delivery',
        status: 'dueSoon',
        statusLabel: '即将到期',
        timeline: [
          { completed: true, label: '待取书', timestamp: '2026-03-20T12:00:00.000Z' },
          { completed: true, label: '机器人配送中', timestamp: '2026-03-20T12:18:00.000Z' },
          { completed: true, label: '已送达', timestamp: '2026-03-20T12:33:00.000Z' },
        ],
      },
      returnRequest: {
        borrowOrderId: 201,
        id: 301,
        note: '等待馆内处理',
        status: 'created',
      },
    };
  });

  it('renders return progress together with the unified borrowing journey', () => {
    render(<ReturnRequestDetailRoute />);

    expect(screen.getByText('已发起归还请求')).toBeTruthy();
    expect(screen.getByText('馆内已收到你的归还申请，接下来会安排确认与入库处理。')).toBeTruthy();
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

  it('shows a success illustration when the return request is completed', () => {
    mockDetailData = {
      ...mockDetailData,
      returnRequest: {
        ...mockDetailData.returnRequest,
        status: 'completed',
      },
    };

    render(<ReturnRequestDetailRoute />);

    expect(screen.getByText('归还已完成')).toBeTruthy();
    expect(screen.getByTestId('return-request-success-artwork')).toBeTruthy();
  });
});
