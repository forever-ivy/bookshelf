import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBookshelfApiClient } from '@/lib/api/client';
import { getPreviewCabinetData } from '@/lib/preview-data';
import { useSessionStore } from '@/stores/session-store';

export const cabinetQueryKeys = {
  all(baseUrl: string) {
    return ['cabinet', baseUrl] as const;
  },
  badges(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'badges', memberId] as const;
  },
  booklist(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'booklist', memberId] as const;
  },
  borrowLogs(baseUrl: string, memberId: number, days: number) {
    return [...this.all(baseUrl), 'borrow-logs', memberId, days] as const;
  },
  compartments(baseUrl: string) {
    return [...this.all(baseUrl), 'compartments'] as const;
  },
  currentUser(baseUrl: string) {
    return [...this.all(baseUrl), 'current-user'] as const;
  },
  monthlyReport(baseUrl: string) {
    return [...this.all(baseUrl), 'monthly-report'] as const;
  },
  stats(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'stats', memberId] as const;
  },
  users(baseUrl: string) {
    return [...this.all(baseUrl), 'users'] as const;
  },
  weeklyReport(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'weekly-report', memberId] as const;
  },
};

function useActiveCabinet() {
  const connection = useSessionStore((state) => state.connection);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const baseUrl = connection?.baseUrl ?? '';
  const preview = getPreviewCabinetData();

  return {
    baseUrl,
    client: baseUrl ? createBookshelfApiClient(baseUrl) : null,
    connection,
    enabled: Boolean(baseUrl) || isPreviewMode,
    isPreviewMode,
    preview,
  };
}

export function useUsersQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () => (cabinet.isPreviewMode ? Promise.resolve(cabinet.preview.users) : cabinet.client!.getUsers()),
    queryKey: cabinetQueryKeys.users(cabinet.baseUrl),
  });
}

export function useCurrentUserQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.currentUser)
        : cabinet.client!.getCurrentUser(),
    queryKey: cabinetQueryKeys.currentUser(cabinet.baseUrl),
  });
}

export function useCompartmentsQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.compartments)
        : cabinet.client!.getCompartments(),
    queryKey: cabinetQueryKeys.compartments(cabinet.baseUrl),
  });
}

export function useMemberStatsQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();

  const resolvedMemberId = memberId ?? cabinet.preview.currentUser.id;

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.statsByMember[resolvedMemberId])
        : cabinet.client!.getMemberStats(memberId!),
    queryKey: cabinetQueryKeys.stats(cabinet.baseUrl, memberId ?? -1),
  });
}

export function useMemberBooklistQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();

  const resolvedMemberId = memberId ?? cabinet.preview.currentUser.id;

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.booklistByMember[resolvedMemberId] ?? [])
        : cabinet.client!.getMemberBooklist(memberId!),
    queryKey: cabinetQueryKeys.booklist(cabinet.baseUrl, memberId ?? -1),
  });
}

export function useMemberBadgesQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();

  const resolvedMemberId = memberId ?? cabinet.preview.currentUser.id;

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve({ badges: cabinet.preview.badgesByMember[resolvedMemberId] ?? [] })
        : cabinet.client!.getMemberBadges(memberId!),
    queryKey: cabinetQueryKeys.badges(cabinet.baseUrl, memberId ?? -1),
  });
}

export function useBorrowLogsQuery(memberId?: number | null, days = 30) {
  const cabinet = useActiveCabinet();

  const resolvedMemberId = memberId ?? cabinet.preview.currentUser.id;

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.borrowLogsByMember[resolvedMemberId] ?? [])
        : cabinet.client!.getBorrowLogs(memberId!, days),
    queryKey: cabinetQueryKeys.borrowLogs(cabinet.baseUrl, memberId ?? -1, days),
  });
}

export function useWeeklyReportQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();

  const resolvedMemberId = memberId ?? cabinet.preview.currentUser.id;

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.weeklyReportsByMember[resolvedMemberId])
        : cabinet.client!.getWeeklyReport(memberId!),
    queryKey: cabinetQueryKeys.weeklyReport(cabinet.baseUrl, memberId ?? -1),
  });
}

export function useMonthlyReportQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.monthlyReport)
        : cabinet.client!.getMonthlyReport(),
    queryKey: cabinetQueryKeys.monthlyReport(cabinet.baseUrl),
  });
}

export function useSwitchUserMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const setCurrentMemberId = useSessionStore((state) => state.setCurrentMemberId);

  return useMutation({
    mutationFn: async (memberId: number) =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.users.find((user) => user.id === memberId) ?? null)
        : cabinet.client!.switchUser(memberId),
    onSuccess: async (_, memberId) => {
      if (!cabinet.baseUrl) {
        return;
      }

      setCurrentMemberId(memberId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.currentUser(cabinet.baseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.stats(cabinet.baseUrl, memberId),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.booklist(cabinet.baseUrl, memberId),
        }),
      ]);
    },
  });
}
