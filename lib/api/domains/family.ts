import { familyDetailSchema, familySummarySchema, monthlyReportSchema } from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type { MonthlyReport } from '@/lib/api/contracts/types';
import { z } from 'zod';

const familiesSchema = z.array(familySummarySchema);

export function createFamilyApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createFamily(payload: { family_name: string; owner_account_id?: number | null }) {
      return http.post('/api/families', {
        data: payload,
      });
    },
    deleteFamily(familyId: number) {
      return http.delete<null>(`/api/families/${familyId}`);
    },
    getFamily(familyId: number) {
      return http.get(`/api/families/${familyId}`, { schema: familyDetailSchema });
    },
    getFamilyStats() {
      return http.get('/api/family/stats');
    },
    getMonthlyReport() {
      return http.get<MonthlyReport>('/api/family/monthly_report', {
        schema: monthlyReportSchema,
        timeoutMs: 20_000,
      });
    },
    getFamilies() {
      return http.get('/api/families', { schema: familiesSchema });
    },
    updateFamily(familyId: number, payload: { family_name?: string; owner_account_id?: number | null }) {
      return http.put(`/api/families/${familyId}`, {
        data: payload,
      });
    },
  };
}
