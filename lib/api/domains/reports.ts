import {
  monthlyReportSchema,
  readingEventSchema,
  readingEventWriteResultSchema,
  weeklyReportSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type {
  MonthlyReport,
  ReadingEvent,
  ReadingEventDraft,
  WeeklyReport,
} from '@/lib/api/contracts/types';
import { z } from 'zod';

const readingEventsSchema = z.array(readingEventSchema);

export function createReportsApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createReadingEvent(payload: ReadingEventDraft) {
      return http.post<{ event: ReadingEvent; id: number }>('/api/reading_events', {
        data: payload,
        schema: readingEventWriteResultSchema,
      });
    },
    getMonthlyReport() {
      return http.get<MonthlyReport>('/api/family/monthly_report', {
        schema: monthlyReportSchema,
        timeoutMs: 20_000,
      });
    },
    getReadingEvents(query: Record<string, string | number | boolean | null | undefined> = {}) {
      return http.get<ReadingEvent[]>('/api/reading_events', {
        params: query,
        schema: readingEventsSchema,
      });
    },
    getWeeklyReport(userId: number) {
      return http.get<WeeklyReport>(`/api/users/${userId}/weekly_report`, {
        schema: weeklyReportSchema,
        timeoutMs: 20_000,
      });
    },
  };
}
