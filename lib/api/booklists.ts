import type { BooklistSummary } from '@/lib/api/types';
import { createMockBooklist, listMockBooklists } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { normalizeBookCard } from '@/lib/api/catalog';

export async function listBooklists(token?: string | null): Promise<{ customItems: BooklistSummary[]; systemItems: BooklistSummary[] }> {
  return libraryRequest('/api/v1/booklists', {
    fallback: () => ({ customItems: listMockBooklists().filter((item) => item.source === 'custom'), systemItems: listMockBooklists().filter((item) => item.source === 'system') }),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeBooklists(payload, token));
}

export async function createBooklist(
  input: { bookIds: number[]; description?: string | null; title: string },
  token?: string | null
): Promise<BooklistSummary> {
  return libraryRequest('/api/v1/booklists', {
    body: JSON.stringify({
      book_ids: input.bookIds,
      description: input.description,
      title: input.title,
    }),
    fallback: async () => createMockBooklist(input.title, input.description ?? null, input.bookIds),
    method: 'POST',
    token,
  }).then((payload: any) => normalizeBooklist(payload, token));
}

function normalizeBooklists(payload: any, token?: string | null) {
  if (payload?.custom_items || payload?.system_items) {
    return {
      customItems: (payload.custom_items ?? payload.customItems ?? []).map((item: any) => normalizeBooklist(item, token)),
      systemItems: (payload.system_items ?? payload.systemItems ?? []).map((item: any) => normalizeBooklist(item, token)),
    };
  }

  const fallback = listMockBooklists();
  return {
    customItems: fallback.filter((item) => item.source === 'custom'),
    systemItems: fallback.filter((item) => item.source === 'system'),
  };
}

function normalizeBooklist(raw: any, token?: string | null): BooklistSummary {
  void token;
  if (!raw) {
    throw new Error('booklist_not_found');
  }

  if (Array.isArray(raw.books) || Array.isArray(raw.items)) {
    return {
      books: (raw.books ?? raw.items).map(normalizeBookCard),
      description: raw.description ?? null,
      id: String(raw.id),
      source: raw.source ?? (Array.isArray(raw.books) ? 'custom' : 'system'),
      title: raw.title,
    };
  }

  return {
    books: [],
    description: raw.description ?? null,
    id: String(raw.id ?? raw.slug ?? raw.code),
    source: raw.source ?? 'system',
    title: raw.title ?? '未命名书单',
  };
}
