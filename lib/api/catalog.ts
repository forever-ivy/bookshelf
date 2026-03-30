import type { BookCard, BookDetail } from '@/lib/api/types';
import { getMockBook, getMockBookDetail, listMockBooks } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';

export async function listBooks(query?: string, token?: string | null): Promise<BookCard[]> {
  const search = query ? `?query=${encodeURIComponent(query)}` : '';
  return libraryRequest(`/api/v1/catalog/books${search}`, {
    fallback: () => listMockBooks(query),
    method: 'GET',
    token,
  }).then((payload: any) =>
    Array.isArray(payload?.items)
      ? payload.items.map(normalizeBookCard)
      : listMockBooks(query)
  );
}

export async function searchBooksExplicit(query: string, token?: string | null): Promise<BookCard[]> {
  const search = `?query=${encodeURIComponent(query)}`;

  return libraryRequest(`/api/v1/catalog/books/search${search}`, {
    fallback: () => listMockBooks(query),
    method: 'GET',
    token,
  }).then((payload: any) =>
    Array.isArray(payload?.items)
      ? payload.items.map(normalizeBookCard)
      : listMockBooks(query)
  );
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
  return {
    id: raw.id,
    author: raw.author ?? '未知作者',
    availabilityLabel: raw.availabilityLabel ?? raw.availability_label ?? '馆藏充足 · 可立即借阅',
    cabinetLabel: raw.cabinetLabel ?? raw.cabinet_label ?? raw.location ?? '默认书柜',
    category: raw.category ?? null,
    coverTone: raw.coverTone ?? raw.cover_tone ?? 'blue',
    coverUrl: raw.coverUrl ?? raw.cover_url ?? null,
    deliveryAvailable: raw.deliveryAvailable ?? raw.delivery_available ?? Boolean(raw.eta_minutes ?? raw.etaMinutes),
    etaLabel: raw.etaLabel ?? raw.eta_label ?? (raw.eta_minutes ? `${raw.eta_minutes} 分钟可送达` : '到柜自取'),
    etaMinutes: raw.etaMinutes ?? raw.eta_minutes ?? null,
    matchedFields: raw.matchedFields ?? raw.matched_fields ?? [],
    recommendationReason: raw.recommendationReason ?? raw.recommendation_reason ?? null,
    shelfLabel: raw.shelfLabel ?? raw.shelf_label ?? '主馆 2 楼',
    stockStatus: raw.stockStatus ?? raw.stock_status ?? 'available',
    summary: raw.summary ?? '',
    tags: raw.tags ?? raw.tag_names ?? [],
    title: raw.title ?? '未命名图书',
  };
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
        `${catalog.shelfLabel} · ${catalog.cabinetLabel}`,
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
