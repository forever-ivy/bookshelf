import {
  badgeSummarySchema,
  booklistItemSchema,
  borrowLogSchema,
  memberStatsSchema,
  memberSummarySchema,
  userAccountRelationSchema,
  weeklyReportSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type {
  BadgeSummary,
  BooklistItem,
  BorrowLog,
  MemberStats,
  MemberSummary,
  WeeklyReport,
} from '@/lib/api/contracts/types';
import { z } from 'zod';

const memberSummaryListSchema = z.array(memberSummarySchema);
const nullableMemberSummarySchema = memberSummarySchema.nullable();
const borrowLogListSchema = z.array(borrowLogSchema);
const booklistSchema = z.array(booklistItemSchema);
const badgesEnvelopeSchema = z.object({
  badges: z.array(badgeSummarySchema),
});
const userAccountRelationListSchema = z.array(userAccountRelationSchema);
const goalSchema = z.object({
  user_id: z.number(),
  weekly_target: z.number(),
});
const booklistCreateSchema = z.object({
  id: z.number(),
});
const okSchema = z.null();
const createUserSchema = z.object({
  id: z.number(),
  user: memberSummarySchema,
});
const updateUserSchema = z.object({
  user: memberSummarySchema,
});

type UserDraft = {
  age?: number | null;
  avatar?: string;
  birth_date?: string | null;
  color?: string;
  family_id?: number | null;
  gender?: string | null;
  grade_level?: string | null;
  interests?: string | null;
  name?: string;
  pin?: string;
  reading_level?: string | null;
  role?: string;
};

export function createUsersApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    addBooklistItem(userId: number, payload: { assigned_by_user_id?: number | null; book_id?: number | null; note?: string; title: string }) {
      return http.post<{ id: number }>(`/api/users/${userId}/booklist`, {
        data: payload,
        schema: booklistCreateSchema,
      });
    },
    createUser(payload: UserDraft) {
      return http.post<{ id: number; user: MemberSummary }>('/api/users', {
        data: payload,
        schema: createUserSchema,
      });
    },
    deleteBooklistItem(userId: number, booklistId: number) {
      return http.delete<null>(`/api/users/${userId}/booklist/${booklistId}`, { schema: okSchema });
    },
    deleteUser(userId: number) {
      return http.delete<null>(`/api/users/${userId}`, { schema: okSchema });
    },
    getBorrowLogs(memberId: number, days = 30) {
      return http.get<BorrowLog[]>(`/api/users/${memberId}/borrow_logs`, {
        params: { days },
        schema: borrowLogListSchema,
      });
    },
    getCurrentUser() {
      return http.get<MemberSummary | null>('/api/users/current', {
        schema: nullableMemberSummarySchema,
      });
    },
    getGoal(userId: number) {
      return http.get<{ user_id: number; weekly_target: number }>(`/api/users/${userId}/goal`, {
        schema: goalSchema,
      });
    },
    getMemberBadges(memberId: number) {
      return http.get<{ badges: BadgeSummary[] }>(`/api/users/${memberId}/badges`, {
        schema: badgesEnvelopeSchema,
      });
    },
    getMemberBooklist(memberId: number) {
      return http.get<BooklistItem[]>(`/api/users/${memberId}/booklist`, {
        schema: booklistSchema,
      });
    },
    getMemberStats(memberId: number) {
      return http.get<MemberStats>(`/api/users/${memberId}/stats`, {
        schema: memberStatsSchema,
      });
    },
    getUser(userId: number) {
      return http.get<MemberSummary>(`/api/users/${userId}`, {
        schema: memberSummarySchema,
      });
    },
    getUserAccounts(userId: number) {
      return http.get(`/api/users/${userId}/accounts`, { schema: userAccountRelationListSchema });
    },
    getUsers() {
      return http.get<MemberSummary[]>('/api/users', { schema: memberSummaryListSchema });
    },
    getWeeklyReport(memberId: number) {
      return http.get<WeeklyReport>(`/api/users/${memberId}/weekly_report`, {
        schema: weeklyReportSchema,
        timeoutMs: 20_000,
      });
    },
    markBooklistDone(userId: number, booklistId: number) {
      return http.post<null>(`/api/users/${userId}/booklist/${booklistId}/done`, {
        schema: okSchema,
      });
    },
    setGoal(userId: number, weeklyTarget: number) {
      return http.post<{ user_id: number; weekly_target: number }>(`/api/users/${userId}/goal`, {
        data: { weekly_target: weeklyTarget },
        schema: goalSchema,
      });
    },
    switchUser(userId: number) {
      return http.post<MemberSummary | null>('/api/users/switch', {
        data: { user_id: userId },
        schema: nullableMemberSummarySchema,
      });
    },
    updateUser(userId: number, payload: UserDraft) {
      return http.put<{ user: MemberSummary }>(`/api/users/${userId}`, {
        data: payload,
        schema: updateUserSchema,
      });
    },
  };
}
