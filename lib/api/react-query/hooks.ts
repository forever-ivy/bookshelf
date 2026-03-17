import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createBookshelfApiClient } from '@/lib/api/client';
import type {
  BookDraft,
  FamilyDraft,
  MemberDraft,
  ReadingEventDraft,
} from '@/lib/api/contracts/types';
import { getPreviewCabinetData } from '@/lib/app/preview-data';
import { useSessionStore } from '@/stores/session-store';

export const cabinetQueryKeys = {
  all(baseUrl: string) {
    return ['cabinet', baseUrl] as const;
  },
  badges(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'badges', memberId] as const;
  },
  account(baseUrl: string, accountId: number) {
    return [...this.all(baseUrl), 'account', accountId] as const;
  },
  accountUsers(baseUrl: string, accountId: number) {
    return [...this.account(baseUrl, accountId), 'users'] as const;
  },
  accounts(baseUrl: string) {
    return [...this.all(baseUrl), 'accounts'] as const;
  },
  booklist(baseUrl: string, memberId: number) {
    return [...this.all(baseUrl), 'booklist', memberId] as const;
  },
  booklistActions(baseUrl: string, memberId: number) {
    return [...this.booklist(baseUrl, memberId), 'actions'] as const;
  },
  book(baseUrl: string, bookId: number) {
    return [...this.all(baseUrl), 'book', bookId] as const;
  },
  books(baseUrl: string, filters?: string) {
    return filters
      ? ([...this.all(baseUrl), 'books', filters] as const)
      : ([...this.all(baseUrl), 'books'] as const);
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
  families(baseUrl: string) {
    return [...this.all(baseUrl), 'families'] as const;
  },
  family(baseUrl: string, familyId: number | 'current') {
    return [...this.all(baseUrl), 'family', familyId] as const;
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
  readingEvents(baseUrl: string, filters?: string) {
    return filters
      ? ([...this.all(baseUrl), 'reading-events', filters] as const)
      : ([...this.all(baseUrl), 'reading-events'] as const);
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

function serializeFilters(filters?: Record<string, unknown>) {
  if (!filters || Object.keys(filters).length === 0) {
    return undefined;
  }

  return JSON.stringify(filters);
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

async function invalidateBooksQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
  bookId?: number,
) {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.books(baseUrl),
    }),
  ];

  if (bookId != null) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: cabinetQueryKeys.book(baseUrl, bookId),
      })
    );
  }

  await Promise.all(tasks);
}

async function invalidateFamilyQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
  familyId?: number,
) {
  const tasks = [
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.families(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.family(baseUrl, 'current'),
    }),
  ];

  if (familyId != null) {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: cabinetQueryKeys.family(baseUrl, familyId),
      })
    );
  }

  await Promise.all(tasks);
}

async function invalidateReadingEventQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.readingEvents(baseUrl),
    }),
    queryClient.invalidateQueries({
      queryKey: cabinetQueryKeys.monthlyReport(baseUrl),
    }),
  ]);
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

export function useAccountsQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.accounts)
        : cabinet.client!.getAccounts(),
    queryKey: cabinetQueryKeys.accounts(cabinet.baseUrl),
  });
}

export function useAccountQuery(accountId?: number | null) {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled && Boolean(accountId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(
            cabinet.preview.accounts.find((account) => account.id === accountId) ?? null
          )
        : cabinet.client!.getAccount(accountId!),
    queryKey: cabinetQueryKeys.account(cabinet.baseUrl, accountId ?? -1),
  });
}

export function useAccountUsersQuery(accountId?: number | null) {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled && Boolean(accountId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(
            cabinet.preview.familyDetail.members.map((member) => ({
              account_id: accountId!,
              avatar: member.avatar,
              color: member.color,
              name: member.name,
              relation_type: member.role === 'parent' ? 'owner' : 'member',
              role: member.role,
              user_id: member.id,
            }))
          )
        : cabinet.client!.getAccountUsers(accountId!),
    queryKey: cabinetQueryKeys.accountUsers(cabinet.baseUrl, accountId ?? -1),
  });
}

export function useFamiliesQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.families)
        : cabinet.client!.getFamilies(),
    queryKey: cabinetQueryKeys.families(cabinet.baseUrl),
  });
}

export function useFamilyQuery() {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: async () => {
      if (cabinet.isPreviewMode) {
        return cabinet.preview.familyDetail;
      }

      const families = await cabinet.client!.getFamilies();
      const activeFamily = families[0];
      if (!activeFamily) {
        return null;
      }

      return cabinet.client!.getFamily(activeFamily.id);
    },
    queryKey: cabinetQueryKeys.family(cabinet.baseUrl, 'current'),
  });
}

export function useBooksQuery(
  query: { category?: string; limit?: number; q?: string; stored_only?: boolean } = {}
) {
  const cabinet = useActiveCabinet();
  const filterKey = serializeFilters(query);

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () => {
      if (cabinet.isPreviewMode) {
        return Promise.resolve(
          cabinet.preview.books.filter((book) => {
            if (query.category && book.category !== query.category) {
              return false;
            }
            if (query.stored_only && !book.is_on_shelf) {
              return false;
            }
            if (!query.q) {
              return true;
            }

            const needle = query.q.toLowerCase();
            return (
              book.title.toLowerCase().includes(needle) ||
              (book.author ?? '').toLowerCase().includes(needle)
            );
          })
        );
      }

      return cabinet.client!.listBooks(query);
    },
    queryKey: cabinetQueryKeys.books(cabinet.baseUrl, filterKey),
  });
}

export function useBookQuery(bookId?: number | null) {
  const cabinet = useActiveCabinet();

  return useQuery({
    enabled: cabinet.enabled && Boolean(bookId),
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.books.find((book) => book.id === bookId) ?? null)
        : cabinet.client!.getBook(bookId!),
    queryKey: cabinetQueryKeys.book(cabinet.baseUrl, bookId ?? -1),
  });
}

export function useReadingEventsQuery(
  query: Record<string, string | number | boolean | null | undefined> = {}
) {
  const cabinet = useActiveCabinet();
  const filterKey = serializeFilters(query);

  return useQuery({
    enabled: cabinet.enabled,
    queryFn: () =>
      cabinet.isPreviewMode
        ? Promise.resolve(cabinet.preview.readingEvents)
        : cabinet.client!.getReadingEvents(query),
    queryKey: cabinetQueryKeys.readingEvents(cabinet.baseUrl, filterKey),
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

export function useUpdateFamilyMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { familyId: number; payload: FamilyDraft }) => {
      if (cabinet.isPreviewMode) {
        return Promise.resolve({
          family: {
            ...cabinet.preview.familySummary,
            ...input.payload,
          },
        });
      }

      return cabinet.client!.updateFamily(input.familyId, input.payload);
    },
    onSuccess: async (_, input) => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateFamilyQueries(queryClient, cabinet.baseUrl, input.familyId);
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

export function useCreateBookMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BookDraft) => {
      if (cabinet.isPreviewMode) {
        return Promise.resolve({
          book: {
            id: Date.now(),
            title: payload.title ?? '预览图书',
          },
          id: Date.now(),
        });
      }

      return cabinet.client!.createBook(payload);
    },
    onSuccess: async (result) => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateBooksQueries(queryClient, cabinet.baseUrl, result.book.id);
    },
  });
}

export function useUpdateBookMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { bookId: number; payload: BookDraft }) => {
      if (cabinet.isPreviewMode) {
        return Promise.resolve({
          book: {
            ...cabinet.preview.books.find((book) => book.id === input.bookId),
            ...input.payload,
            id: input.bookId,
            title: input.payload.title ?? '预览图书',
          },
        });
      }

      return cabinet.client!.updateBook(input.bookId, input.payload);
    },
    onSuccess: async (result) => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateBooksQueries(queryClient, cabinet.baseUrl, result.book.id);
    },
  });
}

export function useCreateReadingEventMutation() {
  const cabinet = useActiveCabinet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReadingEventDraft) => {
      if (cabinet.isPreviewMode) {
        return Promise.resolve({
          event: {
            book_id: payload.book_id ?? null,
            book_title: null,
            event_time: payload.event_time ?? new Date().toISOString(),
            event_type: payload.event_type,
            id: Date.now(),
            metadata_json: payload.metadata_json ?? null,
            source: payload.source ?? 'preview',
            user_id: payload.user_id ?? null,
            user_name: null,
          },
          id: Date.now(),
        });
      }

      return cabinet.client!.createReadingEvent(payload);
    },
    onSuccess: async () => {
      if (!cabinet.baseUrl) {
        return;
      }

      await invalidateReadingEventQueries(queryClient, cabinet.baseUrl);
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
