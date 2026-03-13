import { readingEventSchema, weeklyReportSchema, monthlyReportSchema } from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import { z } from 'zod';

const readingEventsSchema = z.array(readingEventSchema);

export function createReportsApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createReadingEvent(payload: Record<string, unknown>) {
      return http.post('/api/reading_events', {
        data: payload,
      });
    },
    getMonthlyReport() {
      return http.get('/api/family/monthly_report', {
        schema: monthlyReportSchema,
        timeoutMs: 20_000,
      });
    },
    getReadingEvents(query: Record<string, string | number | boolean | null | undefined> = {}) {
      return http.get('/api/reading_events', {
        params: query,
        schema: readingEventsSchema,
      });
    },
    getWeeklyReport(userId: number) {
      return http.get(`/api/users/${userId}/weekly_report`, {
        schema: weeklyReportSchema,
        timeoutMs: 20_000,
      });
    },
  };
}
