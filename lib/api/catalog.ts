import type { BookCard, BookCardPage, BookDetail, CatalogCategory } from '@/lib/api/types';
import { getMockBook, getMockBookDetail, listMockBooks } from '@/lib/api/mock';
import { libraryRequest } from '@/lib/api/client';
import { resolveBookDeliveryAvailable, resolveBookEtaLabel } from '@/lib/book-delivery';

type ReaderVisibleCategoryGroup = {
  classificationRoots?: string[];
  containsMatches?: string[];
  exactMatches?: string[];
  id: string;
  name: string;
};

const READER_VISIBLE_CATEGORY_GROUPS: ReaderVisibleCategoryGroup[] = [
  {
    containsMatches: ['儿童', '少儿', '童书', '绘本', '启蒙', '亲子', '幼儿', '宝宝'],
    id: 'children-picture-books',
    name: '童书绘本',
  },
  {
    containsMatches: ['漫画', 'comic', 'comics', 'manga', 'manhua', '动漫', '二次元', '耽美', '轻小说'],
    exactMatches: ['bl', 'bl漫画', 'dc', 'marvel', 'tb'],
    id: 'comics-light-novels',
    name: '漫画轻小说',
  },
  {
    classificationRoots: ['I'],
    containsMatches: ['文学', '小说', '散文', '诗歌', '戏剧', '随笔', '故事', '传记', '言情', '武侠', '推理', '科幻', '奇幻'],
    exactMatches: ['priest'],
    id: 'literature-fiction',
    name: '文学小说',
  },
  {
    classificationRoots: ['A', 'B', 'C', 'D', 'E', 'K', 'Z'],
    containsMatches: ['哲学', '宗教', '历史', '地理', '社会', '政治', '法律', '军事', '文化', '纪实'],
    id: 'humanities-social-sciences',
    name: '人文社科',
  },
  {
    classificationRoots: ['F'],
    containsMatches: ['经济', '管理', '商业', '财务', '金融', '投资', '营销', 'mba', '企业', '创业'],
    id: 'economics-management',
    name: '经济管理',
  },
  {
    classificationRoots: ['G', 'H'],
    containsMatches: ['教育', '考试', '教辅', '教材', '英语', '语文', '词汇', '语言', '文字', '留学', '学习'],
    id: 'education-language',
    name: '教育语言',
  },
  {
    classificationRoots: ['N', 'O', 'P', 'Q', 'S', 'T', 'U', 'V', 'X'],
    containsMatches: ['人工智能', '计算机', '编程', '软件', '网络', '算法', '数据', '科学', '科技', '工程', '工业技术', '环境', '交通', '农业', '化学', '物理', '数学', '生物', '地球科学', '天文'],
    exactMatches: ['ai'],
    id: 'science-tech',
    name: '科学技术',
  },
  {
    classificationRoots: ['J'],
    containsMatches: ['艺术', '设计', '美术', '摄影', '音乐', '影视', '电影', '建筑'],
    id: 'art-design',
    name: '艺术设计',
  },
  {
    classificationRoots: ['R'],
    containsMatches: ['医学', '医药', '卫生', '健康', '养生', '心理', '育儿', '家庭', '旅行', '美食', '烹饪', '时尚', '健身', '生活'],
    id: 'life-health',
    name: '生活健康',
  },
  {
    containsMatches: ['期刊', '论文', '学报', '报告', 'conference', 'proceedings', 'thesis', 'dissertation'],
    id: 'journals-papers',
    name: '期刊论文',
  },
];

export async function listBooks(query?: string, token?: string | null): Promise<BookCard[]> {
  return listBooksPage(query, token).then((payload) => payload.items);
}

export async function listBooksPage(
  query: string | undefined,
  token?: string | null,
  options: { category?: string | null; limit?: number; offset?: number } = {}
): Promise<BookCardPage> {
  const limit = clampPageSize(options.limit);
  const offset = clampOffset(options.offset);
  const search = buildSearchParams(query, limit, offset, options.category);

  return libraryRequest(`/api/v1/catalog/books${search}`, {
    fallback: () => createFallbackBookCardPage(query, limit, offset),
    method: 'GET',
    token,
  }).then((payload: any) => normalizeBookCardPage(payload, query, limit, offset));
}

export async function searchBooksExplicit(
  query: string,
  token?: string | null,
  options: { category?: string | null; limit?: number; offset?: number } = {}
): Promise<BookCardPage> {
  const limit = clampPageSize(options.limit);
  const offset = clampOffset(options.offset);
  const search = buildSearchParams(query, limit, offset, options.category);

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

export async function listCatalogCategories(token?: string | null): Promise<CatalogCategory[]> {
  return libraryRequest('/api/v1/catalog/categories', {
    fallback: createFallbackCatalogCategories,
    method: 'GET',
    token,
  }).then((payload: any) => normalizeCatalogCategories(payload));
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
    summary: resolveBookSummary(raw.summary),
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

function resolveBookSummary(summary: unknown) {
  if (typeof summary !== 'string') {
    return '';
  }

  const normalized = summary.trim();
  if (!normalized || /^nan$/i.test(normalized)) {
    return '';
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

function normalizeCatalogCategories(raw: any): CatalogCategory[] {
  const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : null;
  if (!items) {
    return createFallbackCatalogCategories();
  }

  return items.map(normalizeCatalogCategory);
}

function normalizeCatalogCategory(raw: any): CatalogCategory {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const id = raw?.id ?? name;

  if (!name || (typeof id !== 'string' && typeof id !== 'number')) {
    throw new Error('catalog_categories_invalid_payload');
  }

  return {
    id,
    name,
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

function createFallbackCatalogCategories(): CatalogCategory[] {
  const seenGroupIds = new Set<string>();
  const groups = listMockBooks(undefined)
    .map((book) => resolveReaderVisibleCategoryGroup(book.category))
    .filter((group): group is ReaderVisibleCategoryGroup => Boolean(group))
    .filter((group) => {
      if (seenGroupIds.has(group.id)) {
        return false;
      }
      seenGroupIds.add(group.id);
      return true;
    });

  return groups;
}

function buildSearchParams(
  query: string | undefined,
  limit: number,
  offset: number,
  category?: string | null
) {
  const params = new URLSearchParams();
  if (query) {
    params.set('query', query);
  }
  if (category?.trim()) {
    params.set('category', category.trim());
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

function resolveReaderVisibleCategoryGroup(value: unknown): CatalogCategory | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const group of READER_VISIBLE_CATEGORY_GROUPS) {
    if (group.exactMatches?.includes(normalized)) {
      return { id: group.id, name: group.name };
    }
  }

  for (const group of READER_VISIBLE_CATEGORY_GROUPS) {
    if (group.containsMatches?.some((token) => normalized.includes(token))) {
      return { id: group.id, name: group.name };
    }
  }

  const classificationRoot = extractClassificationRoot(normalized);
  if (!classificationRoot) {
    return null;
  }

  const matchedGroup = READER_VISIBLE_CATEGORY_GROUPS.find((group) =>
    group.classificationRoots?.includes(classificationRoot)
  );

  return matchedGroup ? { id: matchedGroup.id, name: matchedGroup.name } : null;
}

function extractClassificationRoot(value: string) {
  const match = value.toUpperCase().match(/[A-Z]/);
  return match?.[0] ?? null;
}
