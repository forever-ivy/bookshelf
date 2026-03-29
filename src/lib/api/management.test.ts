import { beforeEach, describe, expect, it, vi } from 'vitest'

const http = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
}

vi.mock('@/lib/http', () => ({ http }))

describe('management api contract', () => {
  beforeEach(() => {
    http.get.mockReset()
    http.post.mockReset()
    http.patch.mockReset()
    http.put.mockReset()
  })

  it('keeps recommendation studio endpoints aligned with the current service routes', async () => {
    http.get
      .mockResolvedValueOnce({
        data: {
          live_publication: null,
          draft: {
            today_recommendations: [],
            exam_zone: [],
            hot_lists: [],
            system_booklists: [],
            explanation_card: { title: 'why', body: 'because' },
          },
          candidates: {
            today_recommendations: [],
            exam_zone: [],
            system_booklists: [],
          },
          preview_feed: {
            today_recommendations: [],
            exam_zone: [],
            quick_actions: [],
            hot_lists: [],
            system_booklists: [],
            explanation_card: { title: 'why', body: 'because' },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ version: 1 }],
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [{ id: 3, display_name: 'Alice' }],
        },
      })
    http.put.mockResolvedValueOnce({
      data: {
        draft: {
          today_recommendations: [{ book_id: 1 }],
          exam_zone: [{ book_id: 2 }],
          hot_lists: [],
          system_booklists: [],
          explanation_card: { title: 'why', body: 'because' },
        },
        preview_feed: {
          today_recommendations: [{ book_id: 1, title: 'Book A' }],
          exam_zone: [{ book_id: 2, title: 'Book B' }],
          quick_actions: [],
          hot_lists: [],
          system_booklists: [],
          explanation_card: { title: 'why', body: 'because' },
        },
      },
    })
    http.post.mockResolvedValueOnce({
      data: {
        publication: { version: 1, published_by_username: 'admin' },
        preview_feed: {
          today_recommendations: [{ book_id: 1, title: 'Book A' }],
          exam_zone: [{ book_id: 2, title: 'Book B' }],
          quick_actions: [],
          hot_lists: [],
          system_booklists: [],
          explanation_card: { title: 'why', body: 'because' },
        },
      },
    })

    const {
      getAdminReaders,
      getAdminRecommendationStudio,
      getAdminRecommendationStudioPublications,
      publishAdminRecommendationStudio,
      saveAdminRecommendationStudioDraft,
    } = await import('@/lib/api/management')

    await expect(getAdminRecommendationStudio()).resolves.toEqual({
      live_publication: null,
      draft: {
        today_recommendations: [],
        exam_zone: [],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      },
      candidates: {
        today_recommendations: [],
        exam_zone: [],
        system_booklists: [],
      },
      preview_feed: {
        today_recommendations: [],
        exam_zone: [],
        quick_actions: [],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      },
    })
    await expect(
      saveAdminRecommendationStudioDraft({
        today_recommendations: [{ book_id: 1 }],
        exam_zone: [{ book_id: 2 }],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      }),
    ).resolves.toEqual({
      draft: {
        today_recommendations: [{ book_id: 1 }],
        exam_zone: [{ book_id: 2 }],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      },
      preview_feed: {
        today_recommendations: [{ book_id: 1, title: 'Book A' }],
        exam_zone: [{ book_id: 2, title: 'Book B' }],
        quick_actions: [],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      },
    })
    await expect(publishAdminRecommendationStudio()).resolves.toEqual({
      publication: { version: 1, published_by_username: 'admin' },
      preview_feed: {
        today_recommendations: [{ book_id: 1, title: 'Book A' }],
        exam_zone: [{ book_id: 2, title: 'Book B' }],
        quick_actions: [],
        hot_lists: [],
        system_booklists: [],
        explanation_card: { title: 'why', body: 'because' },
      },
    })
    await expect(getAdminRecommendationStudioPublications()).resolves.toEqual({
      items: [{ version: 1 }],
    })
    await expect(getAdminReaders({ query: 'alice', page: 2, pageSize: 10 })).resolves.toEqual({
      items: [{ id: 3, display_name: 'Alice' }],
    })

    expect(http.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/recommendation/studio')
    expect(http.put).toHaveBeenCalledWith('/api/v1/admin/recommendation/studio/draft', {
      today_recommendations: [{ book_id: 1 }],
      exam_zone: [{ book_id: 2 }],
      hot_lists: [],
      system_booklists: [],
      explanation_card: { title: 'why', body: 'because' },
    })
    expect(http.post).toHaveBeenCalledWith('/api/v1/admin/recommendation/studio/publish')
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/recommendation/studio/publications')
    expect(http.get).toHaveBeenNthCalledWith(3, '/api/v1/admin/readers', {
      query: 'alice',
      page: 2,
      page_size: 10,
    })
  })

  it('defaults preview quick actions to system-generated entries', async () => {
    http.get.mockResolvedValueOnce({
      data: {
        live_publication: null,
        draft: {
          today_recommendations: [],
          exam_zone: [],
          hot_lists: [],
          system_booklists: [],
          explanation_card: { title: 'why', body: 'because' },
        },
        candidates: {
          today_recommendations: [],
          exam_zone: [],
          system_booklists: [],
        },
        preview_feed: {
          today_recommendations: [],
          exam_zone: [],
          quick_actions: [
            {
              code: 'borrow_now',
              description: '优先查看当前可借并支持配送的图书。',
              meta: '3 本推荐已准备好',
              title: '一键借书',
            },
          ],
          hot_lists: [],
          system_booklists: [],
          explanation_card: { title: 'why', body: 'because' },
        },
      },
    })

    const { getAdminRecommendationStudio } = await import('@/lib/api/management')

    await expect(getAdminRecommendationStudio()).resolves.toMatchObject({
      preview_feed: {
        quick_actions: [
          {
            code: 'borrow_now',
            source: 'system_generated',
          },
        ],
      },
    })
  })

  it('passes explicit pagination params and filters for books, categories, tags, alerts, and readers', async () => {
    http.get
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          page: 2,
          page_size: 50,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 1,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          page: 3,
          page_size: 20,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          page: 1,
          page_size: 20,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 0,
          page: 4,
          page_size: 20,
        },
      })

    const { getAdminAlerts, getAdminBooks, getAdminCategories, getAdminReaders, getAdminTags } = await import('@/lib/api/management')

    await expect(getAdminBooks({ query: '智能', page: 2, pageSize: 50, categoryId: 7, shelfStatus: 'on_shelf' })).resolves.toEqual({
      items: [],
      total: 0,
      page: 2,
      page_size: 50,
    })
    await expect(getAdminCategories({ page: 1, pageSize: 1, query: '人工', status: 'active' })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      page_size: 1,
    })
    await expect(getAdminTags({ page: 3, pageSize: 20, query: '热门' })).resolves.toEqual({
      items: [],
      total: 0,
      page: 3,
      page_size: 20,
    })
    await expect(getAdminAlerts({ status: 'open', severity: 'critical' })).resolves.toEqual({
      items: [],
      total: 0,
      page: 1,
      page_size: 20,
    })
    await expect(getAdminReaders({ query: 'alice', page: 4, pageSize: 20, restrictionStatus: 'limited', segmentCode: 'vip' })).resolves.toEqual({
      items: [],
      total: 0,
      page: 4,
      page_size: 20,
    })

    expect(http.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/books', {
      query: '智能',
      page: 2,
      page_size: 50,
      shelf_status: 'on_shelf',
      category_id: 7,
    })
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/categories', {
      query: '人工',
      status: 'active',
      page: 1,
      page_size: 1,
    })
    expect(http.get).toHaveBeenNthCalledWith(3, '/api/v1/admin/tags', {
      query: '热门',
      page: 3,
      page_size: 20,
    })
    expect(http.get).toHaveBeenNthCalledWith(4, '/api/v1/admin/alerts', {
      status: 'open',
      severity: 'critical',
    })
    expect(http.get).toHaveBeenNthCalledWith(5, '/api/v1/admin/readers', {
      query: 'alice',
      restriction_status: 'limited',
      segment_code: 'vip',
      page: 4,
      page_size: 20,
    })
  })

  it('passes explicit pagination params for inventory and readers queries', async () => {
    http.get
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 30,
          page: 2,
          page_size: 20,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 12,
          page: 3,
          page_size: 10,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 8,
          page: 1,
          page_size: 5,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: [],
          total: 1,
          page: 4,
          page_size: 20,
        },
      })

    const {
      getAdminCabinetSlots,
      getAdminInventoryAlerts,
      getAdminInventoryRecords,
      getAdminReaders,
    } = await import('@/lib/api/management')

    await expect(getAdminCabinetSlots('cabinet-east', { page: 2, pageSize: 20 })).resolves.toEqual({
      items: [],
      total: 30,
      page: 2,
      page_size: 20,
    })
    await expect(
      getAdminInventoryRecords({ cabinetId: 'cabinet-east', page: 3, pageSize: 10 }),
    ).resolves.toEqual({
      items: [],
      total: 12,
      page: 3,
      page_size: 10,
    })
    await expect(
      getAdminInventoryAlerts({ status: 'open', sourceId: 'cabinet-east', page: 1, pageSize: 5 }),
    ).resolves.toEqual({
      items: [],
      total: 8,
      page: 1,
      page_size: 5,
    })
    await expect(getAdminReaders({ query: 'demo', page: 4, pageSize: 20, segmentCode: 'vip' })).resolves.toEqual({
      items: [],
      total: 1,
      page: 4,
      page_size: 20,
    })

    expect(http.get).toHaveBeenNthCalledWith(1, '/api/v1/admin/cabinets/cabinet-east/slots', {
      page: 2,
      page_size: 20,
      status: undefined,
    })
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/v1/admin/inventory/records', {
      cabinet_id: 'cabinet-east',
      event_type: undefined,
      page: 3,
      page_size: 10,
    })
    expect(http.get).toHaveBeenNthCalledWith(3, '/api/v1/admin/inventory/alerts', {
      status: 'open',
      source_id: 'cabinet-east',
      page: 1,
      page_size: 5,
    })
    expect(http.get).toHaveBeenNthCalledWith(4, '/api/v1/admin/readers', {
      query: 'demo',
      restriction_status: undefined,
      segment_code: 'vip',
      page: 4,
      page_size: 20,
    })
  })

  it('keeps recommendation debug endpoints aligned with the admin service routes', async () => {
    http.post.mockResolvedValueOnce({
      data: {
        query: 'AI 系统',
        context: { reader_id: 3 },
        ranking: { enabled: false },
        results: [
          {
            book_id: 7,
            title: '智能系统设计',
            explanation: '课程相关度高',
            provider_note: 'provider',
          },
        ],
        runtime: {
          llm_provider: 'openai-compatible',
          llm_model: 'deepseek-chat',
          embedding_provider: 'hash',
          embedding_model: 'text-embedding-3-small',
          recommendation_ml_enabled: true,
          provider_note: 'provider',
        },
      },
    })
    http.get
      .mockResolvedValueOnce({
        data: {
          reader_id: 3,
          focus_book: { book_id: 7, title: '智能系统设计' },
          personalized: [],
          modules: {},
          suggested_queries: ['AI 系统'],
          runtime: {
            llm_provider: 'openai-compatible',
            llm_model: 'deepseek-chat',
            embedding_provider: 'hash',
            embedding_model: 'text-embedding-3-small',
            recommendation_ml_enabled: true,
            provider_note: 'personalized',
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          source_book: { book_id: 7, title: '智能系统设计' },
          ranking: { enabled: true },
          results: [
            {
              book_id: 8,
              title: '推荐系统实践',
              explanation: '相似读者经常一起借阅',
              provider_note: 'hybrid',
            },
          ],
          runtime: {
            llm_provider: 'openai-compatible',
            llm_model: 'deepseek-chat',
            embedding_provider: 'hash',
            embedding_model: 'text-embedding-3-small',
            recommendation_ml_enabled: true,
            provider_note: 'hybrid',
          },
        },
      })

    const {
      getAdminRecommendationDebugBookModule,
      getAdminRecommendationDebugDashboard,
      searchAdminRecommendationDebug,
    } = await import('@/lib/api/management')

    await expect(
      searchAdminRecommendationDebug({
        readerId: 3,
        query: 'AI 系统',
        limit: 4,
      }),
    ).resolves.toMatchObject({
      runtime: {
        llm_model: 'deepseek-chat',
        provider_note: 'provider',
      },
    })
    await expect(getAdminRecommendationDebugDashboard(3, { limit: 6, historyLimit: 2 })).resolves.toMatchObject({
      runtime: {
        provider_note: 'personalized',
      },
    })
    await expect(
      getAdminRecommendationDebugBookModule(3, 7, {
        mode: 'hybrid',
        limit: 4,
      }),
    ).resolves.toMatchObject({
      runtime: {
        provider_note: 'hybrid',
      },
    })

    expect(http.post).toHaveBeenCalledWith('/api/v1/admin/recommendation/debug/search', {
      reader_id: 3,
      query: 'AI 系统',
      limit: 4,
    })
    expect(http.get).toHaveBeenNthCalledWith(
      1,
      '/api/v1/admin/recommendation/debug/readers/3/dashboard',
      {
        limit: 6,
        history_limit: 2,
      },
    )
    expect(http.get).toHaveBeenNthCalledWith(
      2,
      '/api/v1/admin/recommendation/debug/readers/3/books/7',
      {
        mode: 'hybrid',
        limit: 4,
      },
    )
  })

})
