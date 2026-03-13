import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  useBorrowLogsQuery,
  useCurrentUserQuery,
  useMonthlyReportQuery,
  useSwitchUserMutation,
} from '@/lib/api/react-query/hooks';
import { createConnectionProfile } from '@/lib/app/connection';
import { sessionStore } from '@/stores/session-store';

const originalFetch = global.fetch;
let activeQueryClient: QueryClient | null = null;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        gcTime: Infinity,
        retry: false,
      },
      queries: {
        gcTime: Infinity,
        retry: false,
      },
    },
  });
  activeQueryClient = queryClient;

  return function QueryWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('api hooks', () => {
  beforeEach(() => {
    sessionStore.setState({
      connection: createConnectionProfile('https://cabinet.example.com', 'Living Room'),
      currentMemberId: 3,
      hasConnection: true,
      hydrated: true,
      isPreviewMode: false,
    });
  });

  afterEach(async () => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
    activeQueryClient?.clear();
    activeQueryClient = null;
    await act(async () => {
      sessionStore.getState().clearSession();
    });
  });

  it('loads the current user for the home surface', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { id: 3, name: '陈一诺' } }),
    }) as typeof fetch;

    const { result } = renderHook(() => useCurrentUserQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ id: 3, name: '陈一诺' });
  });

  it('loads normalized borrow logs for the library surface', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: [{ action: 'take', action_time: '2026-03-13T10:00:00', title: '海边的灯塔' }],
      }),
    }) as typeof fetch;

    const { result } = renderHook(() => useBorrowLogsQuery(3), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { action: 'take', action_time: '2026-03-13T10:00:00', title: '海边的灯塔' },
    ]);
  });

  it('loads the monthly report for the reports surface', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          most_active: '陈一诺',
          summary: '这个月大家读了很多故事和科普书。',
          top_category: '科普',
          total_books: 12,
        },
      }),
    }) as typeof fetch;

    const { result } = renderHook(() => useMonthlyReportQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      most_active: '陈一诺',
      summary: '这个月大家读了很多故事和科普书。',
      top_category: '科普',
      total_books: 12,
    });
  });

  it('updates the active member when the switch mutation succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, data: { id: 8, name: 'Milo' } }),
    }) as typeof fetch;

    const { result } = renderHook(() => useSwitchUserMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(8);
    });

    expect(sessionStore.getState().currentMemberId).toBe(8);
  });
});
