jest.mock('@/lib/api/client', () => ({
  libraryRequest: jest.fn(),
}));

import { libraryRequest } from '@/lib/api/client';
import { getBook, listBooks, listBooksPage, listCatalogCategories, searchBooksExplicit } from '@/lib/api/catalog';
import { searchRecommendations } from '@/lib/api/recommendation';

describe('catalog contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps official category names onto catalog list cards without exposing classification codes', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 7,
          title: '智能系统设计',
          author: '程墨',
          category: '人工智能',
          classification_code: 'TP18',
          summary: '系统化管理 AI 服务。',
        },
      ],
    });

    const result = await listBooks(undefined, 'reader-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: 7,
        category: '人工智能',
      }),
    ]);
    expect(result[0]).not.toHaveProperty('classificationCode');
  });

  it('keeps detail payloads aligned with the same category semantics', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      id: 11,
      title: '环境风险治理',
      author: '周朔',
      category: '环境科学、安全科学',
      classification_code: 'X913.4',
      summary: '聚焦环境安全与风险治理实践。',
    });

    const result = await getBook(11, 'reader-token');

    expect(result.catalog).toMatchObject({
      id: 11,
      category: '环境科学、安全科学',
    });
    expect(result.catalog).not.toHaveProperty('classificationCode');
  });

  it('propagates official category names through recommendation search results without exposing classification codes', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      results: [
        {
          book_id: 13,
          title: '机器人系统调度',
          author: '乔远',
          category: '人工智能',
          classification_code: 'TP242',
          explanation: '与你最近的借阅主题高度相关。',
          summary: '面向馆内配送与任务分发的调度实践。',
          available_copies: 2,
          deliverable: true,
        },
      ],
    });

    const result = await searchRecommendations('调度', 'reader-token');

    expect(result).toEqual([
      expect.objectContaining({
        id: 13,
        category: '人工智能',
      }),
    ]);
    expect(result[0]).not.toHaveProperty('classificationCode');
  });

  it('passes through a caller-provided recommendation page size instead of hard-coding five results', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      results: [],
    });

    await searchRecommendations('调度', 'reader-token', { limit: 10 });

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/recommendation/search',
      expect.objectContaining({
        body: JSON.stringify({
          limit: 10,
          query: '调度',
        }),
        method: 'POST',
        token: 'reader-token',
      })
    );
  });

  it('uses the explicit search endpoint when the app requests a required query search', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 21,
          title: '知识治理',
        },
      ],
      total: 1,
      limit: 20,
      offset: 0,
      has_more: false,
    });

    const result = await searchBooksExplicit('知识治理', 'reader-token', { limit: 20, offset: 0 });

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/catalog/books/search?query=%E7%9F%A5%E8%AF%86%E6%B2%BB%E7%90%86&limit=20&offset=0',
      expect.objectContaining({
        method: 'GET',
        token: 'reader-token',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        hasMore: false,
        limit: 20,
        offset: 0,
        total: 1,
      })
    );
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 21, title: '知识治理' }));
  });

  it('maps paginated catalog list responses into a reusable search page shape', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 31,
          title: '安全工程案例',
          author: '王岭',
          category: '环境科学、安全科学',
        },
      ],
      total: 42,
      limit: 20,
      offset: 20,
      has_more: true,
      query: '安全',
    });

    const result = await listBooksPage('安全', 'reader-token', { limit: 20, offset: 20 });

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/catalog/books?query=%E5%AE%89%E5%85%A8&limit=20&offset=20',
      expect.objectContaining({
        method: 'GET',
        token: 'reader-token',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        hasMore: true,
        limit: 20,
        offset: 20,
        query: '安全',
        total: 42,
      })
    );
    expect(result.items[0]).toEqual(expect.objectContaining({ id: 31, title: '安全工程案例' }));
  });

  it('passes category filters through to the paginated catalog endpoint', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
      has_more: false,
      query: '',
    });

    await listBooksPage(undefined, 'reader-token', { category: '人工智能', limit: 20, offset: 0 });

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/catalog/books?category=%E4%BA%BA%E5%B7%A5%E6%99%BA%E8%83%BD&limit=20&offset=0',
      expect.objectContaining({
        method: 'GET',
        token: 'reader-token',
      })
    );
  });

  it('fetches reader-visible category chips from the dedicated catalog categories endpoint', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        { id: 3, name: '人工智能' },
        { id: 5, name: '管理学' },
      ],
      total: 2,
    });

    const result = await listCatalogCategories('reader-token');

    expect(libraryRequest).toHaveBeenCalledWith(
      '/api/v1/catalog/categories',
      expect.objectContaining({
        method: 'GET',
        token: 'reader-token',
      })
    );
    expect(result).toEqual([
      { id: 3, name: '人工智能' },
      { id: 5, name: '管理学' },
    ]);
    expect(result[0]).not.toHaveProperty('code');
  });

  it('uses location-oriented fallbacks instead of the fake default cabinet label', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 58,
          title: '帝国主义论',
          author: '列宁',
          location_note: '东区主书柜 A058',
        },
        {
          id: 59,
          title: '设计中的设计',
          author: null,
          shelf_label: '主馆 4 楼人文社科区',
        },
        {
          id: 60,
          title: '资本论',
          author: '马克思',
        },
      ],
    });

    const result = await listBooks(undefined, 'reader-token');

    expect(result[0]).toEqual(
      expect.objectContaining({
        cabinetLabel: '东区主书柜 A058',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        author: '佚名',
        cabinetLabel: '主馆 4 楼人文社科区',
      })
    );
    expect(result[2]).toEqual(
      expect.objectContaining({
        cabinetLabel: '位置待确认',
      })
    );
  });

  it('sanitizes NaN-like summaries before they reach reader-facing cards', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 63,
          title: '民族理论导论',
          author: '李原',
          summary: 'NaN',
        },
        {
          id: 64,
          title: '边疆社会研究',
          author: '赵青',
          summary: 'nan',
        },
      ],
    });

    const result = await listBooks(undefined, 'reader-token');

    expect(result[0]).toEqual(
      expect.objectContaining({
        summary: '',
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        summary: '',
      })
    );
  });

  it('collapses delivery eta text into a generic 可送达 label for reader-facing cards', async () => {
    (libraryRequest as jest.Mock).mockResolvedValue({
      items: [
        {
          id: 61,
          title: '配送策略设计',
          author: '何川',
          eta_minutes: 15,
        },
        {
          id: 62,
          title: '书柜系统',
          author: '孟原',
          eta_label: '明早可达',
          delivery_available: true,
        },
      ],
    });

    const result = await listBooks(undefined, 'reader-token');

    expect(result[0]).toEqual(
      expect.objectContaining({
        etaLabel: '可送达',
        etaMinutes: 15,
      })
    );
    expect(result[1]).toEqual(
      expect.objectContaining({
        etaLabel: '可送达',
      })
    );
  });
});
