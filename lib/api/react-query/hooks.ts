import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBookshelfApiClient } from '@/lib/api/client';
import type { MemberDraft } from '@/lib/api/contracts/types';
import { getPreviewCabinetData } from '@/lib/app/preview-data';
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
  booklistActions(baseUrl: string, memberId: number) {
    return [...this.booklist(baseUrl, memberId), 'actions'] as const;
  },
  borrowLogs(baseUrl: string, memberId: number, days: number) {
    return [...this.all(baseUrl), 'borrow-logs', memberId, days] as const;
  },
  borrowLogsByMember(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'borrow-logs', memberId] as const;
  },
  compartments(baseUrl: string) {
    return [...this.all(baseUrl), 'compartments'] as const;
  },
  currentUser(baseUrl: string) {
    return [...this.all(baseUrl), 'current-user'] as const;
  },
  goal(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'goal', memberId] as const;
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
  user(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'user', memberId] as const;
  },
  weeklyReport(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'weekly-report', memberId] as const;
  },
};

function useActiveCabinet() {
  const connection = useSessionStore((state) => state.connection);
  const authToken = useSessionStore((state) => state.authToken);
  const isPreviewMode = useSessionStore((state) => state.isPreviewMode);
  const baseUrl = connection?.baseUrl ?? '';
  const preview = getPreviewCabinetData();

  return {
    authToken,
    baseUrl,
    client: baseUrl ? createBookshelfApiClient(baseUrl) : null,
    connection,
    enabled: (Boolean(baseUrl) && Boolean(authToken)) || isPreviewMode,
    isPreviewMode,
    preview,
  };
}

function resolveMemberId(memberId: number | null | undefined, previewMemberId: number) {
  return memberId ?? previewMemberId;
}

async function invalidateMemberQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
  memberId: number,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.users(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.currentUser(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.user(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.goal(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.stats(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.booklist(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.badges(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.borrowLogsByMember(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.weeklyReport(baseUrl, memberId),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.monthlyReport(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.compartments(baseUrl),
    }),
  ]);
}

async function invalidateShelfMutationQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
  memberId?: number | null,
) {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.compartments(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.monthlyReport(baseUrl),
    }),
  ];

  if (memberId) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: cabinetQueryKeys.booklist(baseUrl, memberId),
      }),
      queryClient.invalidateQueries({
        queryKey: cabinetQueryKeys.borrowLogsByMember(baseUrl, memberId),
      }),
      queryClient.invalidateQueries({
        queryKey: cabinetQueryKeys.weeklyReport(baseUrl, memberId),
      })
    );
  }

  await Promise.all(tasks);
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

  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

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

  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

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

  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

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

  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

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

  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

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

export function useGoalQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.goalsByMember[resolvedMemberId])
        : cabinet.client!.getGoal(memberId!),
    queryKey: cabinetQueryKeys.goal(cabinet.baseUrl, memberId ?? -1),
  });
}

export function useUserQuery(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const resolvedMemberId = resolveMemberId(memberId, cabinet.preview.currentUser.id);

  return useQuery({
    enabled: cabinet.enabled && Boolean(memberId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(
            cabinet.preview.users.find((user) => user.id === resolvedMemberId) ?? null
          )
        : cabinet.client!.getUser(memberId!),
    queryKey: cabinetQueryKeys.user(cabinet.baseUrl, memberId ?? -1),
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

export function useSetGoalMutation(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const fallbackMemberId = useSessionStore((state) => state.currentMemberId);
  const resolvedMemberId = resolveMemberId(
    memberId ?? fallbackMemberId,
    cabinet.preview.currentUser.id
  );

  return useMutation({
    mutationFn: async (weeklyTarget: number) =>
      cabinet.isPreviewMode
        ? Promise.resolve({ user_id: resolvedMemberId, weekly_target: weeklyTarget })
        : cabinet.client!.setGoal(resolvedMemberId, weeklyTarget),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.goal(cabinet.baseUrl, resolvedMemberId),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.stats(cabinet.baseUrl, resolvedMemberId),
        }),
      ]);
    },
  });
}

export function useAddBooklistItemMutation(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const fallbackMemberId = useSessionStore((state) => state.currentMemberId);
  const resolvedMemberId = resolveMemberId(
    memberId ?? fallbackMemberId,
    cabinet.preview.currentUser.id
  );

  return useMutation({
    mutationFn: async (payload: {
      assigned_by_user_id?: number | null;
      book_id?: number | null;
      note?: string;
      title: string;
    }) =>
      cabinet.isPreviewMode
        ? Promise.resolve({ id: Date.now() })
        : cabinet.client!.addBooklistItem(resolvedMemberId, payload),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateMemberQueries(queryClient, cabinet.baseUrl, resolvedMemberId);
    },
  });
}

export function useDeleteBooklistItemMutation(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const fallbackMemberId = useSessionStore((state) => state.currentMemberId);
  const resolvedMemberId = resolveMemberId(
    memberId ?? fallbackMemberId,
    cabinet.preview.currentUser.id
  );

  return useMutation({
    mutationFn: async (booklistId: number) =>
      cabinet.isPreviewMode
        ? Promise.resolve(null)
        : cabinet.client!.deleteBooklistItem(resolvedMemberId, booklistId),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateMemberQueries(queryClient, cabinet.baseUrl, resolvedMemberId);
    },
  });
}

export function useMarkBooklistDoneMutation(memberId?: number | null) {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const fallbackMemberId = useSessionStore((state) => state.currentMemberId);
  const resolvedMemberId = resolveMemberId(
    memberId ?? fallbackMemberId,
    cabinet.preview.currentUser.id
  );

  return useMutation({
    mutationFn: async (booklistId: number) =>
      cabinet.isPreviewMode
        ? Promise.resolve(null)
        : cabinet.client!.markBooklistDone(resolvedMemberId, booklistId),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateMemberQueries(queryClient, cabinet.baseUrl, resolvedMemberId);
    },
  });
}

export function useCreateUserMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MemberDraft) =>
      cabinet.isPreviewMode
        ? Promise.resolve({
            id: Date.now(),
            user: {
              id: Date.now(),
              name: payload.name ?? '预览读者',
              role: payload.role ?? 'child',
            },
          })
        : cabinet.client!.createUser(payload),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.users(cabinet.baseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.currentUser(cabinet.baseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.monthlyReport(cabinet.baseUrl),
        }),
      ]);
    },
  });
}

export function useUpdateUserMutation(defaultMemberId?: number | null) {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const fallbackMemberId = useSessionStore((state) => state.currentMemberId);

  return useMutation({
    mutationFn: async (input: { memberId?: number | null; payload: MemberDraft }) => {
      const resolvedMemberId = resolveMemberId(
        input.memberId ?? defaultMemberId ?? fallbackMemberId,
        cabinet.preview.currentUser.id
      );

      if (cabinet.isPreviewMode) {
        return Promise.resolve({
          user: {
            id: resolvedMemberId,
            name: input.payload.name ?? '预览读者',
            role: input.payload.role ?? 'child',
          },
        });
      }

      return cabinet.client!.updateUser(resolvedMemberId, input.payload);
    },
    onSuccess: async (_, input) => {
      if (!cabinet.baseUrl) {
        return;
      }

      const resolvedMemberId = resolveMemberId(
        input.memberId ?? defaultMemberId ?? fallbackMemberId,
        cabinet.preview.currentUser.id
      );

      await invalidateMemberQueries(queryClient, cabinet.baseUrl, resolvedMemberId);
    },
  });
}

export function useDeleteUserMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const currentMemberId = useSessionStore((state) => state.currentMemberId);
  const setCurrentMemberId = useSessionStore((state) => state.setCurrentMemberId);

  return useMutation({
    mutationFn: async (memberId: number) =>
      cabinet.isPreviewMode ? Promise.resolve(null) : cabinet.client!.deleteUser(memberId),
    onSuccess: async (_, memberId) => {
      if (!cabinet.baseUrl) {
        return;
      }

      if (currentMemberId === memberId) {
        setCurrentMemberId(null);
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.users(cabinet.baseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.currentUser(cabinet.baseUrl),
        }),
        queryClient.invalidateQueries({
          queryKey: cabinetQueryKeys.monthlyReport(cabinet.baseUrl),
        }),
      ]);
    },
  });
}

export function useTakeBookMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const currentMemberId = useSessionStore((state) => state.currentMemberId);

  return useMutation({
    mutationFn: async (payload: { cid: number; title?: string }) =>
      cabinet.isPreviewMode
        ? Promise.resolve({
            ai_reply: payload.title ? `已经为你打开《${payload.title}》所在格口。` : '已经打开格口。',
          })
        : cabinet.client!.takeBook(payload),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateShelfMutationQueries(queryClient, cabinet.baseUrl, currentMemberId);
    },
  });
}

export function useTakeBookByTextMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const currentMemberId = useSessionStore((state) => state.currentMemberId);

  return useMutation({
    mutationFn: async (text: string) =>
      cabinet.isPreviewMode
        ? Promise.resolve({
            ai_reply: `预览模式里已经帮你为“${text}”准备了取书反馈。`,
          })
        : cabinet.client!.takeBookByText(text),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateShelfMutationQueries(queryClient, cabinet.baseUrl, currentMemberId);
    },
  });
}

export function useOcrIngestMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();
  const currentMemberId = useSessionStore((state) => state.currentMemberId);

  return useMutation({
    mutationFn: async (input: { formData: FormData; audio?: boolean }) =>
      cabinet.isPreviewMode
        ? Promise.resolve({
            ai_reply: '预览模式中已经完成了一次示例存书。',
            reply: '书已经稳稳地回到家庭书架。',
          })
        : cabinet.client!.ocrIngest(input.formData, { audio: input.audio }),
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateShelfMutationQueries(queryClient, cabinet.baseUrl, currentMemberId);
    },
  });
}
