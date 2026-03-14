import {
  aiInsightSchema,
  cabinetCompartmentSchema,
  ocrIngestResultSchema,
  shelfActionResultSchema,
} from '@/lib/api/contracts/schemas';
import { createHttpClient } from '@/lib/api/core/http';
import type {
  CabinetCompartment,
  OcrIngestResult,
  ShelfActionResult,
} from '@/lib/api/contracts/types';
import { z } from 'zod';

const compartmentsSchema = z.array(cabinetCompartmentSchema);

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
      return http.post<OcrIngestResult>('/api/ocr/ingest', {
        data: formData,
        params: {
          audio: options?.audio ? 1 : undefined,
          source: options?.source ?? 'app',
        },
        schema: ocrIngestResultSchema,
      });
    },
    storeBook() {
      return http.post<ShelfActionResult>('/api/store', { schema: shelfActionResultSchema });
    },
    takeBook(payload: { cid: number; title?: string }) {
      return http.post<ShelfActionResult>('/api/take', {
        data: payload,
        schema: shelfActionResultSchema,
      });
    },
    takeBookByText(text: string) {
      return http.post<ShelfActionResult>('/api/take_by_text', {
        data: { text },
        schema: shelfActionResultSchema,
      });
    },
  };
}
