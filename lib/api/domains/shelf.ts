import { aiInsightSchema, cabinetCompartmentSchema, messageSchema } from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type { CabinetCompartment } from '@/lib/api/contracts/types';
import { z } from 'zod';

const compartmentsSchema = z.array(cabinetCompartmentSchema);
const shelfActionSchema = z.object({
  ai_reply: z.string().optional(),
  message: z.string().optional(),
  reply: z.string().optional(),
});

export function createShelfApi(baseUrl: string) {
  const http = createHttpClient(baseUrl);

  return {
    getAiInsight() {
      return http.get<{ insight: string }>('/api/ai_insight', { schema: aiInsightSchema });
    },
    getCompartments() {
      return http.get<CabinetCompartment[]>('/api/compartments', { schema: compartmentsSchema });
    },
    ocrIngest(formData: FormData, options?: { audio?: boolean; source?: string }) {
      return http.post('/api/ocr/ingest', {
        data: formData,
        params: {
          audio: options?.audio ? 1 : undefined,
          source: options?.source ?? 'app',
        },
      });
    },
    storeBook() {
      return http.post('/api/store', { schema: shelfActionSchema });
    },
    takeBook(payload: { cid: number; title?: string }) {
      return http.post('/api/take', {
        data: payload,
        schema: shelfActionSchema,
      });
    },
    takeBookByText(text: string) {
      return http.post('/api/take_by_text', {
        data: { text },
      });
    },
  };
}
