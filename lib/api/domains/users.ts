import {
  badgeSummarySchema,
  booklistItemSchema,
  borrowLogSchema,
  memberStatsSchema,
  memberGoalSchema,
  memberSummarySchema,
  userAccountRelationSchema,
  weeklyReportSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type {
  BadgeSummary,
  BooklistItem,
  BorrowLog,
  MemberDraft,
  MemberGoal,
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
const booklistCreateSchema = z.object({
  id: z.number(),
});
const okSchema = z.null();
const updateUserSchema = z.object({
  user: memberSummarySchema,
});

export function createUsersApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    addBooklistItem(userId: number, payload: { assigned_by_user_id?: number | null; book_id?: number | null; note?: string; title: string }) {
      return http.post<{ id: number }>(`/api/users/${userId}/booklist`, {
        data: payload,
        schema: booklistCreateSchema,
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
      return http.get<MemberGoal>(`/api/users/${userId}/goal`, {
        schema: memberGoalSchema,
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
      return http.post<MemberGoal>(`/api/users/${userId}/goal`, {
        data: { weekly_target: weeklyTarget },
        schema: memberGoalSchema,
      });
    },
    updateUser(userId: number, payload: MemberDraft) {
      return http.put<{ user: MemberSummary }>(`/api/users/${userId}`, {
        data: payload,
        schema: updateUserSchema,
      });
    },
  };
}
