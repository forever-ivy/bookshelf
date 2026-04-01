import type { BookCard, BookCardPage, BookDetail } from '@/lib/api/types';
import { getMockBook, getMockBookDetail, listMockBooks } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { resolveBookDeliveryAvailable, resolveBookEtaLabel } from '@/lib/book-delivery';

export async function listBooks(query?: string, token?: string | null): Promise<BookCard[]> {
  return listBooksPage(query, token).then((payload) => payload.items);
}

export async function listBooksPage(
  query: string | undefined,
  token?: string | null,
  options: { limit?: number; offset?: number } = {}
): Promise<BookCardPage> {
  const limit = clampPageSize(options.limit);
  const offset = clampOffset(options.offset);
  const search = buildSearchParams(query, limit, offset);

  return libraryRequest(`/api/v1/catalog/books${search}`, {
    fallback: () => createFallbackBookCardPage(query, limit, offset),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeBookCardPage(payload, query, limit, offset));
}

export async function searchBooksExplicit(
  query: string,
  token?: string | null,
  options: { limit?: number; offset?: number } = {}
): Promise<BookCardPage> {
  const limit = clampPageSize(options.limit);
  const offset = clampOffset(options.offset);
  const search = buildSearchParams(query, limit, offset);

  return libraryRequest(`/api/v1/catalog/books/search${search}`, {
    fallback: () => createFallbackBookCardPage(query, limit, offset),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeBookCardPage(payload, query, limit, offset));
}

export async function getBook(bookId: number, token?: string | null): Promise<BookDetail> {
  return libraryRequest(`/api/v1/catalog/books/${bookId}`, {
    fallback: () => getMockBookDetail(bookId),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeBookDetail(payload, bookId));
}

export async function getRelatedBooks(bookId: number, token?: string | null): Promise<BookCard[]> {
  return libraryRequest(`/api/v1/catalog/books/${bookId}/related`, {
    fallback: () => getMockBookDetail(bookId)?.relatedBooks ?? [],
    method: 'GET',
    token,
  }).then((payload: any) => (Array.isArray(payload?.items) ? payload.items.map(normalizeBookCard) : []));
}

export function normalizeBookCard(raw: any): BookCard {
  const cabinetLabel = resolveBookLocation(raw);
  const etaMinutes = raw.etaMinutes ?? raw.eta_minutes ?? null;
  const rawEtaLabel = raw.etaLabel ?? raw.eta_label ?? null;
  const deliveryAvailable = resolveBookDeliveryAvailable({
    deliveryAvailable: raw.deliveryAvailable ?? raw.delivery_available,
    etaLabel: rawEtaLabel,
    etaMinutes,
  });

  return {
    id: raw.id,
    author: resolveBookAuthor(raw.author),
    availabilityLabel: raw.availabilityLabel ?? raw.availability_label ?? '馆藏充足 · 可立即借阅',
    cabinetLabel,
    category: raw.category ?? null,
    coverTone: raw.coverTone ?? raw.cover_tone ?? 'blue',
    coverUrl: raw.coverUrl ?? raw.cover_url ?? null,
    deliveryAvailable,
    etaLabel: resolveBookEtaLabel({
      deliveryAvailable,
      etaLabel: rawEtaLabel,
      etaMinutes,
    }),
    etaMinutes,
    matchedFields: raw.matchedFields ?? raw.matched_fields ?? [],
    recommendationReason: raw.recommendationReason ?? raw.recommendation_reason ?? null,
    shelfLabel: raw.shelfLabel ?? raw.shelf_label ?? '主馆 2 楼',
    stockStatus: raw.stockStatus ?? raw.stock_status ?? 'available',
    summary: raw.summary ?? '',
    tags: raw.tags ?? raw.tag_names ?? [],
    title: raw.title ?? '未命名图书',
  };
}

function resolveBookLocation(raw: any) {
  const directLocation =
    raw.cabinetLabel ??
    raw.cabinet_label ??
    raw.locationNote ??
    raw.location_note ??
    raw.location ??
    raw.shelfLabel ??
    raw.shelf_label ??
    raw.slotCode ??
    raw.slot_code;

  if (typeof directLocation === 'string' && directLocation.trim()) {
    return directLocation.trim();
  }

  const storageSlots = raw.storageSlots ?? raw.storage_slots;
  if (Array.isArray(storageSlots)) {
    const firstSlot = storageSlots.find((slot) => typeof slot === 'string' && slot.trim());
    if (firstSlot) {
      return firstSlot.trim();
    }
  }

  return '位置待确认';
}

function resolveBookAuthor(author: unknown) {
  if (typeof author !== 'string') {
    return '佚名';
  }

  const normalized = author.trim();
  if (!normalized || /^nan$/i.test(normalized)) {
    return '佚名';
  }

  return normalized;
}

function normalizeBookCardPage(
  raw: any,
  query: string | undefined,
  limit: number,
  offset: number
): BookCardPage {
  const fallback = createFallbackBookCardPage(query, limit, offset);
  if (!raw) {
    return fallback;
  }

  const items = Array.isArray(raw.items) ? raw.items.map(normalizeBookCard) : fallback.items;
  const total = typeof raw.total === 'number' ? raw.total : items.length;
  const resolvedLimit = typeof raw.limit === 'number' ? raw.limit : limit;
  const resolvedOffset = typeof raw.offset === 'number' ? raw.offset : offset;
  const resolvedQuery =
    typeof raw.query === 'string' ? raw.query : typeof query === 'string' ? query : '';
  const hasMore =
    typeof raw.has_more === 'boolean'
      ? raw.has_more
      : typeof raw.hasMore === 'boolean'
        ? raw.hasMore
        : resolvedOffset + items.length < total;

  return {
    hasMore,
    items,
    limit: resolvedLimit,
    offset: resolvedOffset,
    query: resolvedQuery,
    total,
  };
}

function createFallbackBookCardPage(
  query: string | undefined,
  limit: number,
  offset: number
): BookCardPage {
  const allItems = listMockBooks(query);
  const items = allItems.slice(offset, offset + limit);

  return {
    hasMore: offset + items.length < allItems.length,
    items,
    limit,
    offset,
    query: query ?? '',
    total: allItems.length,
  };
}

function buildSearchParams(query: string | undefined, limit: number, offset: number) {
  const params = new URLSearchParams();
  if (query) {
    params.set('query', query);
  }
  params.set('limit', String(limit));
  params.set('offset', String(offset));
  return `?${params.toString()}`;
}

function clampPageSize(value?: number) {
  if (!Number.isFinite(value)) {
    return 20;
  }

  return Math.min(Math.max(Number(value), 1), 50);
}

function clampOffset(value?: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Number(value));
}

function normalizeBookDetail(raw: any, bookId: number): BookDetail {
  if (!raw) {
    const fallback = getMockBookDetail(bookId);
    if (!fallback) {
      throw new Error('book_not_found');
    }
    return fallback;
  }

  const catalog = normalizeBookCard(raw.catalog ?? raw);
  return {
    catalog: {
      ...catalog,
      contents: raw.catalog?.contents ?? raw.contents ?? ['第 1 章', '第 2 章', '第 3 章'],
      locationNote:
        raw.catalog?.locationNote ??
        raw.catalog?.location_note ??
        raw.locationNote ??
        raw.location_note ??
        (catalog.shelfLabel === catalog.cabinetLabel
          ? catalog.cabinetLabel
          : `${catalog.shelfLabel} · ${catalog.cabinetLabel}`),
    },
    peopleAlsoBorrowed: Array.isArray(raw.peopleAlsoBorrowed ?? raw.people_also_borrowed)
      ? (raw.peopleAlsoBorrowed ?? raw.people_also_borrowed).map(normalizeBookCard)
      : getMockBookDetail(bookId)?.peopleAlsoBorrowed ?? [],
    recommendationReason: raw.recommendationReason ?? raw.recommendation_reason ?? catalog.recommendationReason,
    relatedBooks: Array.isArray(raw.relatedBooks ?? raw.related_books)
      ? (raw.relatedBooks ?? raw.related_books).map(normalizeBookCard)
      : getMockBookDetail(bookId)?.relatedBooks ?? [],
  };
}
