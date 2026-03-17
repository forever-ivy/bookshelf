import {
  familyDetailSchema,
  familySummarySchema,
  familyWriteResultSchema,
  monthlyReportSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type {
  FamilyDetail,
  FamilyDraft,
  FamilySummary,
  MonthlyReport,
} from '@/lib/api/contracts/types';
import { z } from 'zod';

const familiesSchema = z.array(familySummarySchema);

export function createFamilyApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    createFamily(payload: { family_name: string; owner_account_id?: number | null }) {
      return http.post<{ family: FamilySummary; id?: number }>('/api/families', {
        data: payload,
        schema: familyWriteResultSchema,
      });
    },
    deleteFamily(familyId: number) {
      return http.delete<null>(`/api/families/${familyId}`);
    },
    getFamily(familyId: number) {
      return http.get<FamilyDetail>(`/api/families/${familyId}`, { schema: familyDetailSchema });
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
      return http.get<FamilySummary[]>('/api/families', { schema: familiesSchema });
    },
    updateFamily(familyId: number, payload: FamilyDraft) {
      return http.put<{ family: FamilySummary; id?: number }>(`/api/families/${familyId}`, {
        data: payload,
        schema: familyWriteResultSchema,
      });
    },
  };
}
