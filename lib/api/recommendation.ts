import type { RecommendationDashboard, RecommendationFeed, BookCard, RecommendationModule } from '@/lib/api/types';
import { getMockHomeFeed, listMockBooks } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { resolveBookEtaLabel } from '@/lib/book-delivery';
import { listBooks } from '@/lib/api/catalog';

export async function getHomeFeed(token?: string | null): Promise<RecommendationFeed> {
  return libraryRequest('/api/v1/recommendation/home-feed', {
    fallback: getMockHomeFeed,
    method: 'GET',
    token,
  }).then((payload: any) => normalizeHomeFeed(payload));
}

export async function searchRecommendations(
  query: string,
  token?: string | null,
  options: { limit?: number } = {}
): Promise<BookCard[]> {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Number(options.limit)) : 5;

  return libraryRequest('/api/v1/recommendation/search', {
    body: JSON.stringify({ limit, query }),
    fallback: async () => listMockBooks(query).slice(0, limit),
    method: 'POST',
    token,
  }).then(async (payload: any) => {
    if (Array.isArray(payload?.results)) {
      return payload.results.map(normalizeSearchResult);
    }

    return listBooks(query, token).then((items) => items.slice(0, limit));
  });
}

export async function getRecommendationDashboard(token?: string | null): Promise<RecommendationDashboard> {
  return libraryRequest('/api/v1/recommendation/me/dashboard', {
    fallback: async () => ({
      focus_book: null,
      history_books: [],
      modules: {
        collaborative: { error: null, ok: false, results: [], source_book: null },
        hybrid: { error: null, ok: false, results: [], source_book: null },
        similar: { error: null, ok: false, results: [], source_book: null },
      },
      personalized: [],
      reader_id: null,
      suggested_queries: [],
    }),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeRecommendationDashboard(payload));
}

export async function getPersonalizedRecommendations(
  token?: string | null,
  options: { historyLimit?: number; limit?: number } = {}
): Promise<BookCard[]> {
  const search = new URLSearchParams();
  if (options.limit) {
    search.set('limit', String(options.limit));
  }
  if (options.historyLimit) {
    search.set('history_limit', String(options.historyLimit));
  }
  const suffix = search.size ? `?${search.toString()}` : '';

  return libraryRequest(`/api/v1/recommendation/me/personalized${suffix}`, {
    fallback: async () => getMockHomeFeed().todayRecommendations,
    method: 'GET',
    token,
  }).then((payload: any) => normalizeRecommendationResultList(payload));
}

export async function getSimilarBooks(
  bookId: number,
  token?: string | null,
  limit = 5
): Promise<BookCard[]> {
  return getBookRecommendationList(`/api/v1/recommendation/books/${bookId}/similar?limit=${limit}`, token);
}

export async function getCollaborativeBooks(
  bookId: number,
  token?: string | null,
  limit = 5
): Promise<BookCard[]> {
  return getBookRecommendationList(`/api/v1/recommendation/books/${bookId}/collaborative?limit=${limit}`, token);
}

export async function getHybridBooks(
  bookId: number,
  token?: string | null,
  limit = 5
): Promise<BookCard[]> {
  return getBookRecommendationList(`/api/v1/recommendation/books/${bookId}/hybrid?limit=${limit}`, token);
}

function normalizeSearchResult(raw: any): BookCard {
  const cabinetLabel = resolveRecommendationLocation(raw);
  const availableCopies =
    typeof raw.available_copies === 'number'
      ? raw.available_copies
      : typeof raw.availableCopies === 'number'
        ? raw.availableCopies
        : 0;
  const etaMinutes = raw.eta_minutes ?? raw.etaMinutes ?? null;
  const deliveryAvailable = Boolean(raw.deliverable);

  return {
    id: raw.book_id ?? raw.id,
    author: resolveRecommendationAuthor(raw.author),
    availabilityLabel: resolveRecommendationAvailabilityLabel({
      availableCopies,
      deliverable: raw.deliverable,
    }),
    cabinetLabel,
    category: raw.category ?? null,
    coverTone: raw.cover_tone ?? 'blue',
    coverUrl: raw.cover_url ?? null,
    deliveryAvailable,
    etaLabel: resolveBookEtaLabel({
      deliveryAvailable,
      etaMinutes,
    }),
    etaMinutes,
    matchedFields: raw.evidence?.matched_fields ?? [],
    recommendationReason: raw.explanation ?? null,
    shelfLabel: raw.shelf_label ?? '主馆 2 楼',
    stockStatus: availableCopies > 0 ? 'available' : 'limited',
    summary: raw.summary ?? '',
    tags: raw.tags ?? [],
    title: raw.title ?? raw.result_title ?? '未命名图书',
  };
}

function resolveRecommendationAvailabilityLabel({
  availableCopies,
  deliverable,
}: {
  availableCopies: number;
  deliverable: unknown;
}) {
  if (deliverable) {
    return '可立即借阅';
  }

  if (availableCopies > 0) {
    return '可到柜自取';
  }

  return '暂不可借';
}

function resolveRecommendationLocation(raw: any) {
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

function resolveRecommendationAuthor(author: unknown) {
  if (typeof author !== 'string') {
    return '佚名';
  }

  const normalized = author.trim();
  if (!normalized || /^nan$/i.test(normalized)) {
    return '佚名';
  }

  return normalized;
}

function normalizeRecommendationDashboard(payload: any): RecommendationDashboard {
  return {
    focusBook: normalizeRecommendationSourceBook(payload?.focus_book ?? payload?.focusBook ?? null),
    historyBooks: Array.isArray(payload?.history_books ?? payload?.historyBooks)
      ? (payload.history_books ?? payload.historyBooks).map(normalizeRecommendationSourceBook)
      : [],
    modules: {
      collaborative: normalizeRecommendationModule(payload?.modules?.collaborative),
      hybrid: normalizeRecommendationModule(payload?.modules?.hybrid),
      similar: normalizeRecommendationModule(payload?.modules?.similar),
    },
    personalized: Array.isArray(payload?.personalized)
      ? payload.personalized.map(normalizeSearchResult)
      : [],
    readerId: payload?.reader_id ?? payload?.readerId ?? null,
    suggestedQueries: Array.isArray(payload?.suggested_queries ?? payload?.suggestedQueries)
      ? (payload.suggested_queries ?? payload.suggestedQueries)
      : [],
  };
}

function normalizeRecommendationResultList(payload: any): BookCard[] {
  if (Array.isArray(payload?.results)) {
    return payload.results.map(normalizeSearchResult);
  }

  return [];
}

function normalizeRecommendationModule(raw: any): RecommendationModule {
  return {
    error: raw?.error ?? null,
    ok: Boolean(raw?.ok),
    results: Array.isArray(raw?.results) ? raw.results.map(normalizeSearchResult) : [],
    sourceBook: normalizeRecommendationSourceBook(raw?.source_book ?? raw?.sourceBook ?? null),
  };
}

function normalizeRecommendationSourceBook(raw: any) {
  if (!raw) {
    return null;
  }

  return {
    bookId: raw.book_id ?? raw.bookId ?? null,
    title: raw.title ?? null,
  };
}

async function getBookRecommendationList(path: string, token?: string | null) {
  return libraryRequest(path, {
    fallback: async () => [],
    method: 'GET',
    token,
  }).then((payload: any) => normalizeRecommendationResultList(payload));
}

function normalizeHomeFeed(payload: any): RecommendationFeed {
  const mock = getMockHomeFeed();
  if (!payload) {
    return mock;
  }

  const normalizeQuickAction = (raw: any) => ({
    code: raw.code ?? 'borrow_now',
    description: raw.description ?? '',
    meta: raw.meta ?? '',
    source: 'system_generated' as const,
    title: raw.title ?? '快捷入口',
  });

  return {
    examZone: Array.isArray(payload.exam_zone) ? payload.exam_zone.map(normalizeSearchResult) : mock.examZone,
    explanationCard: payload.explanation_card ?? payload.explanationCard ?? mock.explanationCard,
    hotLists: payload.hot_lists ?? payload.hotLists ?? mock.hotLists,
    quickActions:
      Array.isArray(payload.quick_actions) || Array.isArray(payload.quickActions)
        ? (payload.quick_actions ?? payload.quickActions).map(normalizeQuickAction)
        : mock.quickActions,
    systemBooklists: payload.system_booklists ?? payload.systemBooklists ?? mock.systemBooklists,
    todayRecommendations:
      Array.isArray(payload.today_recommendations) || Array.isArray(payload.todayRecommendations)
        ? (payload.today_recommendations ?? payload.todayRecommendations).map(normalizeSearchResult)
        : mock.todayRecommendations,
  };
}
