import type { BooklistSummary } from '@/lib/api/types';
import { LibraryApiError, libraryRequest } from '@/lib/api/client';
import { normalizeBookCard } from '@/lib/api/catalog';

export async function listBooklists(token?: string | null): Promise<{ customItems: BooklistSummary[]; systemItems: BooklistSummary[] }> {
  return libraryRequest('/api/v1/booklists', {
    fallback: throwServiceNotConfigured,
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
    fallback: throwServiceNotConfigured,
    method: 'POST',
    token,
  }).then((payload: any) => normalizeBooklist(payload, token));
}

function normalizeBooklists(payload: any, token?: string | null) {
  const collectionPayload = payload?.data ?? payload;

  if (collectionPayload?.custom_items || collectionPayload?.system_items || collectionPayload?.customItems || collectionPayload?.systemItems) {
    return {
      customItems: (collectionPayload.custom_items ?? collectionPayload.customItems ?? []).map((item: any) => normalizeBooklist(item, token)),
      systemItems: (collectionPayload.system_items ?? collectionPayload.systemItems ?? []).map((item: any) => normalizeBooklist(item, token)),
    };
  }

  const flatItems = resolveFlatBooklistItems(collectionPayload);
  if (flatItems) {
    return {
      customItems: flatItems.filter((item) => item.source === 'custom'),
      systemItems: flatItems.filter((item) => item.source !== 'custom'),
    };
  }

  throw invalidBooklistsPayload(payload);
}

function resolveFlatBooklistItems(payload: any, token?: string | null) {
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
      ? payload
      : null;

  if (!items) {
    return null;
  }

  return items.map((item: any) => normalizeBooklist(item, token));
}

function normalizeBooklist(raw: any, token?: string | null): BooklistSummary {
  void token;
  if (!raw) {
    throw invalidBooklistsPayload(raw);
  }

  const id = raw.id ?? raw.slug ?? raw.code;
  if (id === undefined || id === null) {
    throw invalidBooklistsPayload(raw);
  }

  const source = raw.source === 'custom' ? 'custom' : 'system';
  const books = resolveBooklistBooks(raw);

  return {
    books,
    description: sanitizeBooklistDescription(raw.description),
    id: String(id),
    source,
    title: raw.title ?? '未命名书单',
  };
}

function resolveBooklistBooks(raw: any) {
  const books = raw.books ?? raw.items ?? raw.book_items ?? raw.bookItems;
  if (!Array.isArray(books)) {
    return [];
  }

  return books.map(normalizeBookCard);
}

function sanitizeBooklistDescription(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value
    .replace(/\s*\[reader_[^\]\n]*seed_[^\]\n]*\]\s*/gi, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleaned || null;
}

function invalidBooklistsPayload(details: unknown) {
  return new LibraryApiError('booklists_invalid_payload', {
    code: 'booklists_invalid_payload',
    details,
    status: 500,
  });
}

function throwServiceNotConfigured(): never {
  throw new LibraryApiError('library_service_not_configured', {
    code: 'service_not_configured',
  });
}
