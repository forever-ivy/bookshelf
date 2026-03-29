import type { RecommendationFeed, BookCard } from '@/lib/api/types';
import { getMockHomeFeed, listMockBooks } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { listBooks } from '@/lib/api/catalog';

export async function getHomeFeed(token?: string | null): Promise<RecommendationFeed> {
  return libraryRequest('/api/v1/recommendation/home-feed', {
    fallback: getMockHomeFeed,
    method: 'GET',
    token,
  }).then((payload: any) => normalizeHomeFeed(payload));
}

export async function searchRecommendations(query: string, token?: string | null): Promise<BookCard[]> {
  return libraryRequest('/api/v1/recommendation/search', {
    body: JSON.stringify({ limit: 5, query }),
    fallback: async () => listMockBooks(query),
    method: 'POST',
    token,
  }).then(async (payload: any) => {
    if (Array.isArray(payload?.results)) {
      return payload.results.map(normalizeSearchResult);
    }

    return listBooks(query, token);
  });
}

function normalizeSearchResult(raw: any): BookCard {
  return {
    id: raw.book_id ?? raw.id,
    author: raw.author ?? '未知作者',
    availabilityLabel: raw.deliverable ? '可立即借阅' : '暂不可借',
    cabinetLabel: raw.cabinet_label ?? '默认书柜',
    category: raw.category ?? null,
    coverTone: raw.cover_tone ?? 'blue',
    coverUrl: raw.cover_url ?? null,
    deliveryAvailable: Boolean(raw.deliverable),
    etaLabel: raw.eta_minutes ? `${raw.eta_minutes} 分钟可送达` : '到柜自取',
    etaMinutes: raw.eta_minutes ?? null,
    matchedFields: raw.evidence?.matched_fields ?? [],
    recommendationReason: raw.explanation ?? null,
    shelfLabel: raw.shelf_label ?? '主馆 2 楼',
    stockStatus: raw.available_copies > 0 ? 'available' : 'limited',
    summary: raw.summary ?? '',
    tags: raw.tags ?? [],
    title: raw.title ?? raw.result_title ?? '未命名图书',
  };
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
