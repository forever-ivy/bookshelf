import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { AlertsPage } from '@/pages/alerts-page'
import { AnalyticsPage } from '@/pages/analytics-page'
import { BooksPage } from '@/pages/books-page'
import { DashboardPage } from '@/pages/dashboard-page'
import { InventoryPage } from '@/pages/inventory-page'
import { ReadersPage } from '@/pages/readers-page'
import { RecommendationPage } from '@/pages/recommendation-page'
import { SystemPage } from '@/pages/system-page'

const managementApi = vi.hoisted(() => ({
  getAdminDashboardOverview: vi.fn(),
  getAdminDashboardHeatmap: vi.fn(),
  getAdminBooks: vi.fn(),
  createAdminBook: vi.fn(),
  updateAdminBook: vi.fn(),
  setAdminBookStatus: vi.fn(),
  getAdminCategories: vi.fn(),
  createAdminCategory: vi.fn(),
  getAdminTags: vi.fn(),
  createAdminTag: vi.fn(),
  getAdminAlerts: vi.fn(),
  getAdminAuditLogs: vi.fn(),
  getAdminCabinets: vi.fn(),
  getAdminCabinetSlots: vi.fn(),
  getAdminInventoryRecords: vi.fn(),
  getAdminInventoryAlerts: vi.fn(),
  applyAdminInventoryCorrection: vi.fn(),
  getAdminReaders: vi.fn(),
  getAdminReader: vi.fn(),
  updateAdminReader: vi.fn(),
  getAdminRecommendationStudio: vi.fn(),
  searchAdminRecommendationDebug: vi.fn(),
  getAdminRecommendationDebugDashboard: vi.fn(),
  getAdminRecommendationDebugBookModule: vi.fn(),
  saveAdminRecommendationStudioDraft: vi.fn(),
  publishAdminRecommendationStudio: vi.fn(),
  getAdminRecommendationStudioPublications: vi.fn(),
  ackAdminAlert: vi.fn(),
  resolveAdminAlert: vi.fn(),
  getAdminSystemSettings: vi.fn(),
  getAdminSystemPermissions: vi.fn(),
  getAdminSystemRoles: vi.fn(),
  getAdminSystemAdmins: vi.fn(),
  upsertAdminSystemSetting: vi.fn(),
  upsertAdminSystemRole: vi.fn(),
}))

const analyticsApi = vi.hoisted(() => ({
  getAdminBorrowTrends: vi.fn(),
  getAdminCollegePreferences: vi.fn(),
  getAdminTimePeaks: vi.fn(),
  getAdminPopularBooks: vi.fn(),
  getAdminCabinetTurnover: vi.fn(),
  getAdminRobotEfficiency: vi.fn(),
  getAdminRetention: vi.fn(),
}))

vi.mock('@/lib/api/management', () => managementApi)
vi.mock('@/lib/api/analytics', () => analyticsApi)

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function LocationSearchProbe() {
  const location = useLocation()
  return <output data-testid="location-search">{location.search}</output>
}

async function chooseSelectOption(
  label: string,
  option: string,
  scope: Pick<typeof screen, 'getByRole'> = screen,
) {
  const user = userEvent.setup()
  await user.click(scope.getByRole('combobox', { name: label }))
  await user.click(screen.getByRole('option', { name: option }))
}

describe('management pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    managementApi.getAdminDashboardOverview.mockResolvedValue({
      today_borrow_count: 12,
      active_delivery_task_count: 4,
      robots: { online: 3, offline: 1, total: 4 },
      cabinets: { total: 2, status_breakdown: { active: 1, maintenance: 1 } },
      top_books: [{ book_id: 1, title: '智能系统设计', author: '程墨', borrow_count: 6 }],
      alerts: { open: 2, total: 5 },
    })
    managementApi.getAdminDashboardHeatmap.mockResolvedValue({
      items: [{ area: '东区', demand_count: 8, cabinet_count: 1, locations: ['东区 一层'] }],
    })
    managementApi.getAdminBooks.mockResolvedValue({
      items: [
        {
          id: 1,
          title: '智能系统设计',
          author: '程墨',
          category_id: 1,
          category: '人工智能',
          shelf_status: 'on_shelf',
          isbn: '9787111000001',
          barcode: 'AI-0001',
          tags: [{ id: 1, code: 'hot', name: '热门' }],
          stock_summary: { total_copies: 3, available_copies: 2, reserved_copies: 1 },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.createAdminBook.mockResolvedValue({
      id: 2,
      title: '机器人路径规划',
      author: '乔远',
      category: '人工智能',
      category_id: 1,
      shelf_status: 'draft',
      isbn: '9787111000003',
      barcode: 'AI-0003',
      summary: '调度与路径规划实战。',
      tags: [{ id: 1, code: 'hot', name: '热门' }],
      stock_summary: { total_copies: 0, available_copies: 0, reserved_copies: 0 },
    })
    managementApi.updateAdminBook.mockResolvedValue({
      id: 1,
      title: '智能系统设计（新版）',
      author: '程墨',
      category: '人工智能',
      category_id: 1,
      shelf_status: 'off_shelf',
      isbn: '9787111000001',
      barcode: 'AI-0001',
      summary: '更新后的图书简介。',
      tags: [{ id: 1, code: 'hot', name: '热门' }],
      stock_summary: { total_copies: 3, available_copies: 2, reserved_copies: 1 },
    })
    managementApi.setAdminBookStatus.mockResolvedValue({
      id: 1,
      title: '智能系统设计',
      author: '程墨',
      category: '人工智能',
      category_id: 1,
      shelf_status: 'off_shelf',
      isbn: '9787111000001',
      barcode: 'AI-0001',
      summary: '系统化管理 AI 服务。',
      tags: [{ id: 1, code: 'hot', name: '热门' }],
      stock_summary: { total_copies: 3, available_copies: 2, reserved_copies: 1 },
    })
    managementApi.getAdminCategories.mockResolvedValue({
      items: [{ id: 1, code: 'ai', name: '人工智能', status: 'active' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.createAdminCategory.mockResolvedValue({
      id: 2,
      code: 'robot',
      name: '机器人',
      status: 'active',
    })
    managementApi.getAdminTags.mockResolvedValue({
      items: [{ id: 1, code: 'hot', name: '热门' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.createAdminTag.mockResolvedValue({
      id: 2,
      code: 'robotics',
      name: '机器人专题',
      description: '机器人与调度书目',
    })
    managementApi.getAdminAlerts.mockResolvedValue({
      items: [{ id: 1, title: '机器人异常', status: 'open', severity: 'critical', source_type: 'robot', created_at: '2026-03-22T10:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminAuditLogs.mockResolvedValue({
      items: [{ id: 99, action: 'update_book', target_type: 'book', target_id: 1, note: '管理后台手动更新图书简介', created_at: '2026-03-22T09:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminCabinets.mockResolvedValue({
      items: [
        {
          id: 'cabinet-east',
          name: '东区书柜',
          location: '东区 一层',
          status: 'active',
          slot_total: 12,
          occupied_slots: 7,
          free_slots: 5,
          slot_status_breakdown: { occupied: 7, empty: 5 },
          total_copies: 18,
          available_copies: 11,
          reserved_copies: 2,
          open_alert_count: 1,
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    const cabinetSlots = [
      {
        id: 1,
        cabinet_id: 'cabinet-east',
        slot_code: 'A01',
        status: 'occupied',
        current_copy_id: 12,
        copy_inventory_status: 'stored',
        book_id: 1,
        book_title: '智能系统设计',
        book_author: '程墨',
      },
    ]
    const inventoryRecords = [
      {
        id: 1,
        cabinet_id: 'cabinet-east',
        cabinet_name: '东区书柜',
        event_type: 'book_stored',
        slot_code: 'A01',
        book_id: 1,
        book_title: '智能系统设计',
        copy_id: 12,
        created_at: '2026-03-22T08:00:00Z',
      },
    ]
    const inventoryAlerts = [
      {
        id: 3,
        title: '库存异常',
        status: 'open',
        severity: 'warning',
        source_type: 'inventory',
        source_id: 'cabinet-east',
        created_at: '2026-03-22T07:00:00Z',
      },
    ]

    managementApi.getAdminCabinetSlots.mockImplementation(
      (_cabinetId: string, params?: { page?: number; pageSize?: number; status?: string }) =>
        Promise.resolve({
          items: cabinetSlots,
          total: 42,
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 20,
        }),
    )
    managementApi.getAdminInventoryRecords.mockImplementation(
      (params?: { cabinetId?: string; eventType?: string; page?: number; pageSize?: number }) =>
        Promise.resolve({
          items: inventoryRecords,
          total: 42,
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 20,
        }),
    )
    managementApi.getAdminInventoryAlerts.mockImplementation(
      (params?: { status?: string; sourceId?: string; page?: number; pageSize?: number }) =>
        Promise.resolve({
          items: inventoryAlerts.filter((alert) => (params?.sourceId ? alert.source_id === params.sourceId : true)),
          total: 24,
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 20,
        }),
    )
    managementApi.applyAdminInventoryCorrection.mockResolvedValue({
      cabinet_id: 'cabinet-east',
      book_id: 1,
      stock: { total_copies: 2, available_copies: 1, reserved_copies: 0 },
      event: { id: 10, event_type: 'manual_correction', slot_code: 'A01', created_at: '2026-03-22T09:30:00Z' },
    })
    const readers = [
      {
        id: 1,
        account_id: 10,
        username: 'reader-01',
        display_name: '林栀',
        college: '信息学院',
        major: '智能科学',
        active_orders_count: 2,
        last_active_at: '2026-03-22T10:00:00Z',
        restriction_status: 'limited',
        restriction_until: '2026-03-29T10:00:00Z',
        risk_flags: ['overdue', 'high_frequency'],
        preference_profile_json: { favorite_categories: ['人工智能'] },
        segment_code: 'ai_power_user',
      },
      {
        id: 2,
        account_id: 11,
        username: 'reader-02',
        display_name: '周朔',
        college: '信息学院',
        major: '数据科学',
        active_orders_count: 0,
        last_active_at: '2026-03-22T08:30:00Z',
        restriction_status: 'none',
        restriction_until: null,
        risk_flags: [],
        preference_profile_json: { favorite_categories: ['推荐系统'] },
        segment_code: 'cold_start',
      },
    ]

    managementApi.getAdminReaders.mockImplementation(
      (params?: { query?: string; page?: number; pageSize?: number; restrictionStatus?: string; segmentCode?: string }) => {
        const query = params?.query?.toLowerCase().trim()
        const filteredReaders = query
          ? readers.filter(
              (reader) =>
                reader.username.toLowerCase().includes(query) ||
                reader.display_name.toLowerCase().includes(query) ||
                (reader.college ?? '').toLowerCase().includes(query) ||
                (reader.segment_code ?? '').toLowerCase().includes(query),
            )
          : readers

        return Promise.resolve({
          items: filteredReaders,
          total: query ? filteredReaders.length : 41,
          page: params?.page ?? 1,
          page_size: params?.pageSize ?? 20,
        })
      },
    )
    managementApi.updateAdminReader.mockResolvedValue({
      id: 1,
      account_id: 10,
      username: 'reader-01',
      display_name: '林栀',
      college: '信息学院',
      major: '智能科学',
      active_orders_count: 2,
      last_active_at: '2026-03-22T10:00:00Z',
      restriction_status: 'blacklist',
      restriction_until: '2026-04-05T10:00:00Z',
      risk_flags: ['overdue', 'manual_review'],
      preference_profile_json: { favorite_categories: ['人工智能'] },
      segment_code: 'risk_watch',
    })
    const studioDraft = {
      today_recommendations: [
        { book_id: 1, custom_explanation: '本周重点推荐，适合系统设计课同学先看。', source: 'manual_review', rank: 1 },
        { book_id: 3, custom_explanation: '推荐系统专题的核心参考书。', source: 'manual_review', rank: 2 },
        { book_id: 4, custom_explanation: '适合继续追读调度与系统方向。', source: 'manual_review', rank: 3 },
      ],
      exam_zone: [
        { book_id: 5, custom_explanation: '适合考试周快速补强。', source: 'manual_review', rank: 1 },
        { book_id: 6, custom_explanation: '适合作为课程冲刺补充阅读。', source: 'manual_review', rank: 2 },
        { book_id: 7, custom_explanation: '适合考前最后一轮回顾。', source: 'manual_review', rank: 3 },
      ],
      hot_lists: [
        { id: 'popular-now', title: '本周热门', description: '近期馆内借阅最活跃的图书集合。' },
        { id: 'exam-focus', title: '考试专区', description: '适合考试周快速补强的主题内容。' },
        { id: 'reader-focus', title: '与你相关', description: '结合课程与阅读偏好精选。' },
      ],
      system_booklists: [
        { booklist_id: 11, rank: 1 },
        { booklist_id: 12, rank: 2 },
        { booklist_id: 13, rank: 3 },
      ],
      explanation_card: {
        title: '为什么这些内容在这里',
        body: '这一版推荐由管理员基于候选池审核发布，优先保证课程相关性和可借性。',
      },
      placements: [
        { code: 'today_recommendations', name: '今日推荐', status: 'active', placement_type: 'home_feed', rank: 1 },
        { code: 'exam_zone', name: '考试专区', status: 'active', placement_type: 'home_feed', rank: 2 },
        { code: 'hot_lists', name: '热门榜单', status: 'paused', placement_type: 'home_feed', rank: 3 },
        { code: 'system_booklists', name: '系统书单', status: 'active', placement_type: 'home_feed', rank: 4 },
      ],
      strategy_weights: {
        content: 0.55,
        behavior: 0.3,
        freshness: 0.15,
      },
    }
    const studioFixture = {
      live_publication: {
        id: 9,
        version: 3,
        published_by_username: 'admin',
        published_at: '2026-03-27T08:00:00Z',
        payload: studioDraft,
      },
      draft: studioDraft,
      candidates: {
        today_recommendations: [
          { book_id: 1, title: '智能系统设计', author: '程墨', available_copies: 2, deliverable: true, eta_minutes: 15, default_explanation: '适合系统设计课同学先看。', signals: { content: 0.78, behavior: 0.72, freshness: 0.42, blended: 0.69 } },
          { book_id: 3, title: '推荐系统实践', author: '项亮', available_copies: 3, deliverable: true, eta_minutes: 12, default_explanation: '推荐系统专题的核心参考书。', signals: { content: 0.74, behavior: 0.63, freshness: 0.46, blended: 0.63 } },
          { book_id: 4, title: '机器人系统调度', author: '乔远', available_copies: 2, deliverable: true, eta_minutes: 15, default_explanation: '适合继续追读调度与系统方向。', signals: { content: 0.68, behavior: 0.58, freshness: 0.49, blended: 0.59 } },
          { book_id: 8, title: '数据库系统导论', author: '李明', available_copies: 1, deliverable: false, eta_minutes: null, default_explanation: '系统课程基础延伸阅读。', signals: { content: 0.62, behavior: 0.44, freshness: 0.61, blended: 0.53 } },
        ],
        exam_zone: [
          { book_id: 5, title: '概率论速读', author: '王老师', available_copies: 4, deliverable: true, eta_minutes: 10, default_explanation: '适合考试周快速补强。', signals: { content: 0.71, behavior: 0.57, freshness: 0.55, blended: 0.61 } },
          { book_id: 6, title: '算法复习手册', author: '沈言', available_copies: 2, deliverable: true, eta_minutes: 14, default_explanation: '适合作为课程冲刺补充阅读。', signals: { content: 0.67, behavior: 0.61, freshness: 0.52, blended: 0.6 } },
          { book_id: 7, title: '操作系统速览', author: '陆明', available_copies: 1, deliverable: false, eta_minutes: null, default_explanation: '适合考前最后一轮回顾。', signals: { content: 0.6, behavior: 0.48, freshness: 0.64, blended: 0.55 } },
        ],
        system_booklists: [
          { booklist_id: 11, title: 'AI 考试专区', description: '适合考试周快速补强的 AI 主题书单。', book_count: 2 },
          { booklist_id: 12, title: '系统课程专题', description: '系统设计与数据库课程延伸阅读。', book_count: 2 },
          { booklist_id: 13, title: '算法复习', description: '适合刷题前查漏补缺。', book_count: 1 },
        ],
      },
      preview_feed: {
        today_recommendations: [
          { book_id: 1, title: '智能系统设计', author: '程墨', explanation: '本周重点推荐，适合系统设计课同学先看。', available_copies: 2, deliverable: true, eta_minutes: 15 },
          { book_id: 3, title: '推荐系统实践', author: '项亮', explanation: '推荐系统专题的核心参考书。', available_copies: 3, deliverable: true, eta_minutes: 12 },
          { book_id: 4, title: '机器人系统调度', author: '乔远', explanation: '适合继续追读调度与系统方向。', available_copies: 2, deliverable: true, eta_minutes: 15 },
        ],
        exam_zone: [
          { book_id: 5, title: '概率论速读', author: '王老师', explanation: '适合考试周快速补强。', available_copies: 4, deliverable: true, eta_minutes: 10 },
          { book_id: 6, title: '算法复习手册', author: '沈言', explanation: '适合作为课程冲刺补充阅读。', available_copies: 2, deliverable: true, eta_minutes: 14 },
          { book_id: 7, title: '操作系统速览', author: '陆明', explanation: '适合考前最后一轮回顾。', available_copies: 1, deliverable: false, eta_minutes: null },
        ],
        quick_actions: [
          { code: 'borrow_now', title: '一键借书', description: '优先查看当前可借并支持配送的图书。', meta: '3 本推荐已准备好' },
        ],
        hot_lists: studioDraft.hot_lists,
        system_booklists: [
          { id: '11', title: 'AI 考试专区', description: '适合考试周快速补强的 AI 主题书单。' },
          { id: '12', title: '系统课程专题', description: '系统设计与数据库课程延伸阅读。' },
          { id: '13', title: '算法复习', description: '适合刷题前查漏补缺。' },
        ],
        explanation_card: studioDraft.explanation_card,
      },
    }
    managementApi.getAdminRecommendationStudio.mockResolvedValue(studioFixture)
    managementApi.searchAdminRecommendationDebug.mockResolvedValue({
      query: 'AI 系统',
      context: { reader_id: 1 },
      ranking: { enabled: true, mode: 'search' },
      results: [
        {
          book_id: 1,
          title: '智能系统设计',
          explanation: '课程相关度高，且当前可借。',
          provider_note: 'provider',
          evidence: { retrieval_mode: 'metadata_query_match' },
          available_copies: 2,
          deliverable: true,
          eta_minutes: 15,
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
    })
    managementApi.getAdminRecommendationDebugDashboard.mockResolvedValue({
      reader_id: 1,
      focus_book: { book_id: 1, title: '智能系统设计' },
      personalized: [
        {
          book_id: 3,
          title: '推荐系统实践',
          explanation: '结合最近借阅历史精选。',
          provider_note: 'personalized',
        },
      ],
      modules: {
        similar: { ok: true, results: [] },
        collaborative: { ok: true, results: [] },
        hybrid: { ok: true, results: [] },
      },
      suggested_queries: ['AI 系统'],
      runtime: {
        llm_provider: 'openai-compatible',
        llm_model: 'deepseek-chat',
        embedding_provider: 'hash',
        embedding_model: 'text-embedding-3-small',
        recommendation_ml_enabled: true,
        provider_note: 'personalized',
      },
    })
    managementApi.getAdminRecommendationDebugBookModule.mockResolvedValue({
      source_book: { book_id: 1, title: '智能系统设计' },
      ranking: { enabled: true, mode: 'hybrid' },
      results: [
        {
          book_id: 4,
          title: '机器人系统调度',
          explanation: '相似读者常一起借阅。',
          provider_note: 'hybrid',
          evidence: { retrieval_mode: 'hybrid_book_recommendation' },
          available_copies: 2,
          deliverable: true,
          eta_minutes: 15,
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
    })
    managementApi.getAdminRecommendationStudioPublications.mockResolvedValue({
      items: [
        { id: 9, version: 3, published_by_username: 'admin', published_at: '2026-03-27T08:00:00Z' },
        { id: 8, version: 2, published_by_username: 'admin', published_at: '2026-03-26T08:00:00Z' },
      ],
    })
    managementApi.saveAdminRecommendationStudioDraft.mockImplementation(async (payload: typeof studioDraft) => ({
      draft: payload,
      preview_feed: {
        ...studioFixture.preview_feed,
        today_recommendations:
          payload.placements.find((item) => item.code === 'today_recommendations')?.status === 'paused'
            ? []
            : studioFixture.preview_feed.today_recommendations,
        exam_zone:
          payload.placements.find((item) => item.code === 'exam_zone')?.status === 'paused'
            ? []
            : studioFixture.preview_feed.exam_zone,
        hot_lists: payload.hot_lists,
        system_booklists:
          payload.placements.find((item) => item.code === 'system_booklists')?.status === 'paused'
            ? []
            : studioFixture.preview_feed.system_booklists,
        hot_lists:
          payload.placements.find((item) => item.code === 'hot_lists')?.status === 'paused'
            ? []
            : payload.hot_lists,
        explanation_card: payload.explanation_card,
      },
    }))
    managementApi.publishAdminRecommendationStudio.mockResolvedValue({
      publication: { id: 10, version: 4, published_by_username: 'admin', published_at: '2026-03-27T09:30:00Z' },
      preview_feed: studioFixture.preview_feed,
    })
    managementApi.getAdminSystemSettings.mockResolvedValue({
      items: [
        {
          id: 1,
          setting_key: 'borrow.rules',
          value_type: 'json',
          value_json: { max_days: 30, max_count: 5 },
          description: '借阅规则',
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.upsertAdminSystemSetting.mockResolvedValue({
      id: 1,
      setting_key: 'borrow.rules',
      value_type: 'json',
      value_json: { max_days: 45, max_count: 8 },
      description: '借阅规则',
    })
    managementApi.getAdminSystemPermissions.mockResolvedValue({
      items: [
        { id: 1, code: 'dashboard.view', name: '查看总览', description: '查看总览大屏与关键运营指标' },
        { id: 2, code: 'alerts.manage', name: '处理警告', description: '确认和解决系统警告' },
      ],
      total: 2,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminSystemRoles.mockResolvedValue({
      items: [
        {
          id: 1,
          code: 'ops-manager',
          name: '运营管理员',
          description: '负责运营和警告处理',
          permission_codes: ['dashboard.view', 'alerts.manage'],
          assigned_admin_ids: [1],
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminSystemAdmins.mockResolvedValue({
      items: [{ id: 1, username: 'admin', role_codes: ['ops-manager'] }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.upsertAdminSystemRole.mockResolvedValue({
      id: 1,
      code: 'ops-manager',
      name: '运营管理员',
      description: '负责运营和警告处理',
      permission_codes: ['dashboard.view', 'alerts.manage'],
      assigned_admin_ids: [1],
    })
    analyticsApi.getAdminBorrowTrends.mockResolvedValue({
      items: [{ date: '2026-03-22', count: 5 }],
      summary: { total_orders: 5, peak_day: '2026-03-22', peak_count: 5 },
    })
    analyticsApi.getAdminCollegePreferences.mockResolvedValue({
      items: [{ college: '信息学院', total_orders: 2, categories: [{ category: '人工智能', count: 2 }] }],
      summary: { total_colleges: 1 },
    })
    analyticsApi.getAdminTimePeaks.mockResolvedValue({
      items: [{ hour: 10, count: 3 }],
      summary: { peak_hour: 10, peak_count: 3 },
    })
    analyticsApi.getAdminPopularBooks.mockResolvedValue({
      items: [{ book_id: 1, title: '智能系统设计', borrow_count: 6, prediction_score: 5.1 }],
      summary: { total_ranked_books: 1 },
    })
    analyticsApi.getAdminCabinetTurnover.mockResolvedValue({
      items: [{ cabinet_id: 'cabinet-001', cabinet_name: '东区主书柜', turnover_rate: 2.5 }],
      summary: { total_cabinets: 1 },
    })
    analyticsApi.getAdminRobotEfficiency.mockResolvedValue({
      items: [{ robot_id: 1, code: 'BOT-01', completion_rate: 75, total_tasks: 4, active_tasks: 1 }],
      summary: { total_robots: 1 },
    })
    analyticsApi.getAdminRetention.mockResolvedValue({
      summary: { total_readers: 4, active_readers_7d: 4, retained_readers_7d: 3, retention_rate_7d: 75 },
    })
  })

  it('renders the upgraded dashboard metrics from management APIs', async () => {
    render(
      <TestProviders>
        <DashboardPage />
      </TestProviders>,
    )

    expect(screen.getByRole('heading', { name: '首页' })).toBeInTheDocument()
    expect(screen.getByText('查看今天的借书情况、送书进度和书柜状态。')).toBeInTheDocument()
    expect(await screen.findByText('今日借阅')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('智能系统设计')).toBeInTheDocument()
    expect(screen.getByText('东区')).toBeInTheDocument()
    expect(screen.getByText('东区书柜')).toBeInTheDocument()
    expect(screen.getByText('已占用 7/12')).toBeInTheDocument()
  })

  it('renders the books workspace with books, categories, and tags tabs', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '图书列表' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新增图书' })).toBeInTheDocument()
    expect(await screen.findAllByText('智能系统设计')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: '编辑此书' }).parentElement).not.toHaveClass('flex-wrap')
    expect(screen.getByRole('button', { name: '编辑此书' }).parentElement).toHaveClass('items-center')

    await user.click(screen.getByRole('tab', { name: '分类' }))
    expect(await screen.findByText('人工智能')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '标签' }))
    expect(await screen.findByText('热门')).toBeInTheDocument()
  })

  it('requests paginated books, resets search to page one, and only defers the full tags table until tabs are opened', async () => {
    const user = userEvent.setup()

    managementApi.getAdminBooks.mockReset()
    managementApi.getAdminBooks
      .mockResolvedValueOnce({
        items: [
        {
          id: 1,
          title: '智能系统设计',
          author: '程墨',
          category_id: 1,
          category: '人工智能',
          shelf_status: 'on_shelf',
          isbn: '9787111000001',
          barcode: 'AI-0001',
          tags: [{ id: 1, code: 'hot', name: '热门' }],
            stock_summary: { total_copies: 3, available_copies: 2, reserved_copies: 1 },
          },
        ],
        total: 120,
        page: 1,
        page_size: 50,
      })
      .mockResolvedValueOnce({
        items: [
        {
          id: 2,
          title: '机器人系统调度',
          author: '乔远',
          category_id: 1,
          category: '人工智能',
          shelf_status: 'on_shelf',
          isbn: '9787111000003',
          barcode: 'AI-0003',
          tags: [{ id: 1, code: 'hot', name: '热门' }],
            stock_summary: { total_copies: 4, available_copies: 1, reserved_copies: 1 },
          },
        ],
        total: 120,
        page: 2,
        page_size: 50,
      })
      .mockResolvedValueOnce({
        items: [
        {
          id: 2,
          title: '机器人系统调度',
          author: '乔远',
          category_id: 1,
          category: '人工智能',
          shelf_status: 'on_shelf',
          isbn: '9787111000003',
          barcode: 'AI-0003',
          tags: [{ id: 1, code: 'hot', name: '热门' }],
            stock_summary: { total_copies: 4, available_copies: 1, reserved_copies: 1 },
          },
        ],
        total: 1,
        page: 1,
        page_size: 50,
      })
    managementApi.getAdminCategories.mockReset().mockResolvedValue({
      items: [{ id: 1, code: 'ai', name: '人工智能', status: 'active' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminTags.mockReset().mockResolvedValue({
      items: [{ id: 1, code: 'hot', name: '热门' }],
      total: 1,
      page: 1,
      page_size: 20,
    })

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    expect(managementApi.getAdminBooks).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      query: undefined,
    })
    expect(managementApi.getAdminCategories).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(managementApi.getAdminTags).toHaveBeenCalledWith({ page: 1, pageSize: 1 })
    expect(screen.queryByRole('columnheader', { name: '分类号' })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('link', { name: '下一页' }))
    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 50,
        query: undefined,
      })
    })
    expect(await screen.findByText('机器人系统调度')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('按书名、作者、ISBN 搜索...'), {
      target: { value: '调度' },
    })
    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 50,
        query: '调度',
      })
    })
    expect(screen.getByText('图书总数').parentElement?.parentElement).toHaveTextContent('120')

    await chooseSelectOption('上架状态筛选', '已上架')
    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 50,
        query: '调度',
        shelfStatus: 'on_shelf',
      })
    })
    expect(screen.getByText('图书总数').parentElement?.parentElement).toHaveTextContent('120')

    await user.click(screen.getByRole('tab', { name: '分类' }))
    await waitFor(() => {
      expect(managementApi.getAdminCategories).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })
    })

    await user.click(screen.getByRole('tab', { name: '标签' }))
    await waitFor(() => {
      expect(managementApi.getAdminTags).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })
    })
  })

  it('prefetches the full category list for the books filter before the first open', async () => {
    const user = userEvent.setup()

    managementApi.getAdminCategories.mockReset().mockImplementation((params?: { page?: number; pageSize?: number }) =>
      Promise.resolve({
        items:
          (params?.pageSize ?? 20) === 1
            ? [{ id: 1, code: 'ai', name: '人工智能', status: 'active' }]
            : [
                { id: 1, code: 'ai', name: '人工智能', status: 'active' },
                { id: 2, code: 'transport', name: '交通运输', status: 'active' },
              ],
        total: 2,
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 20,
      }),
    )

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    await waitFor(() => {
      expect(managementApi.getAdminCategories).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    })

    await user.click(screen.getByRole('combobox', { name: '分类筛选' }))
    expect(await screen.findByRole('option', { name: '交通运输' })).toBeInTheDocument()
  })

  it('keeps the searched books table on the same constrained layout as the default list', async () => {
    managementApi.getAdminBooks.mockReset()
    managementApi.getAdminBooks
      .mockResolvedValueOnce({
        items: [
          {
            id: 1,
            title: '智能系统设计',
            author: '程墨',
            category_id: 1,
            category: '人工智能',
            shelf_status: 'on_shelf',
            isbn: '9787111000001',
            barcode: 'AI-0001',
            tags: [{ id: 1, code: 'hot', name: '热门' }],
            stock_summary: { total_copies: 3, available_copies: 2, reserved_copies: 1 },
          },
        ],
        total: 7359,
        page: 1,
        page_size: 50,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 9,
            title: '安全生产事故安全分析第版',
            author: '注册安全工程师执业资格考试命题研究中心编',
            category_id: 21,
            category: '环境科学、安全科学',
            shelf_status: 'on_shelf',
            isbn: null,
            barcode: 'SAFE-0009',
            tags: [],
            stock_summary: { total_copies: 1, available_copies: 1, reserved_copies: 0 },
          },
        ],
        total: 5,
        page: 1,
        page_size: 50,
      })

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    expect(await screen.findByText('智能系统设计')).toBeInTheDocument()
    expect(screen.getByText('智能系统设计').closest('table')).toHaveClass('table-fixed')

    fireEvent.change(screen.getByPlaceholderText('按书名、作者、ISBN 搜索...'), {
      target: { value: '安全' },
    })

    const searchedTitle = await screen.findByText('安全生产事故安全分析第版')
    expect(searchedTitle.closest('table')).toHaveClass('table-fixed')
    expect(searchedTitle).toHaveClass('truncate')
    expect(screen.getByText('注册安全工程师执业资格考试命题研究中心编')).toHaveClass('truncate')
    expect(screen.getByText('环境科学、安全科学')).toHaveClass('truncate')
  })

  it('keeps pinyin composition visible in the books search input and commits after composition ends', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/books']}>
          <Routes>
            <Route
              path="/books"
              element={
                <>
                  <BooksPage />
                  <LocationSearchProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()

    const input = screen.getByPlaceholderText('按书名、作者、ISBN 搜索...')

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'jiqi' } })

    expect(input).toHaveValue('jiqi')
    expect(screen.getByTestId('location-search').textContent).not.toContain('q=')
    expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      query: undefined,
    })

    fireEvent.change(input, { target: { value: '机器' } })

    expect(input).toHaveValue('机器')
    expect(screen.getByTestId('location-search').textContent).not.toContain('q=')
    expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 50,
      query: undefined,
    })

    fireEvent.compositionEnd(input)

    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 50,
        query: '机器',
      })
    })
    expect(screen.getByTestId('location-search').textContent).toContain('q=%E6%9C%BA%E5%99%A8')
    expect(input).toHaveValue('机器')
  })

  it('hydrates book filters from the URL and enters the entity catalog view', async () => {
    const user = userEvent.setup()

    managementApi.getAdminBooks.mockReset().mockResolvedValue({
      items: [
        {
          id: 1,
          title: '智能系统设计',
          author: '程墨',
          category_id: 1,
          category: '人工智能',
          shelf_status: 'on_shelf',
          isbn: '9787111000001',
          barcode: 'AI-0001',
          summary: '系统化管理 AI 服务。',
          tags: [{ id: 1, code: 'hot', name: '热门' }],
          stock_summary: { total_copies: 2, available_copies: 1, reserved_copies: 1 },
          copies: [
            {
              id: 12,
              cabinet_id: 'cabinet-east',
              cabinet_name: '东区书柜',
              cabinet_location: '东区 一层',
              slot_code: 'A01',
              inventory_status: 'stored',
              available_for_borrow: true,
              updated_at: '2026-03-22T08:00:00Z',
            },
            {
              id: 13,
              cabinet_id: 'cabinet-west',
              cabinet_name: '西区书柜',
              cabinet_location: '西区 一层',
              slot_code: 'B03',
              inventory_status: 'reserved',
              available_for_borrow: false,
              updated_at: '2026-03-22T09:00:00Z',
            },
          ],
        },
      ],
      total: 1,
      page: 1,
      page_size: 50,
    })

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/books?q=系统&shelf_status=on_shelf&category_id=1']}>
          <Routes>
            <Route
              path="/books"
              element={
                <>
                  <BooksPage />
                  <LocationSearchProbe />
                </>
              }
            />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    expect(managementApi.getAdminBooks).toHaveBeenCalledWith({
      page: 1,
      pageSize: 50,
      query: '系统',
      shelfStatus: 'on_shelf',
      categoryId: 1,
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '编辑此书' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: '查看详情' }))

    expect(await screen.findByRole('heading', { name: '智能系统设计' })).toBeInTheDocument()
    expect(screen.getByText('图书信息')).toBeInTheDocument()
    expect(screen.getByText('ISBN')).toBeInTheDocument()
    expect(screen.getByText('9787111000001')).toBeInTheDocument()
    expect(screen.getByText('条码')).toBeInTheDocument()
    expect(screen.getByText('AI-0001')).toBeInTheDocument()
    expect(screen.getByText('简介')).toBeInTheDocument()
    expect(screen.getByText('系统化管理 AI 服务。')).toBeInTheDocument()
    expect(screen.getByText('程墨')).toBeInTheDocument()
    expect(screen.getByText('东区书柜 · A01')).toBeInTheDocument()
    expect(screen.getByText('西区书柜 · B03')).toBeInTheDocument()
    expect(screen.getByTestId('location-search').textContent).toContain('book_id=1')

    await user.click(screen.getByRole('button', { name: '返回图书列表' }))

    expect(await screen.findByRole('button', { name: '查看详情' })).toBeInTheDocument()
    expect(screen.getByTestId('location-search').textContent).not.toContain('book_id=1')
    expect(screen.getByTestId('location-search').textContent).toContain('shelf_status=on_shelf')
  })

  it('creates and edits books, categories, and tags from the books workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '新增图书' }))
    const createDialog = await screen.findByRole('dialog', { name: '新增图书' })
    await user.type(within(createDialog).getByLabelText('书名'), '机器人路径规划')
    await user.type(within(createDialog).getByLabelText('作者'), '乔远')
    await chooseSelectOption('分类', '人工智能', within(createDialog))
    await user.click(within(createDialog).getByRole('button', { name: '热门' }))
    await user.type(within(createDialog).getByLabelText('ISBN'), '9787111000003')
    await user.type(within(createDialog).getByLabelText('条码'), 'AI-0003')
    await user.type(within(createDialog).getByLabelText('简介'), '调度与路径规划实战。')
    await user.click(within(createDialog).getByRole('button', { name: '新增图书' }))

    expect(managementApi.createAdminBook).toHaveBeenCalledWith({
      title: '机器人路径规划',
      author: '乔远',
      category_id: 1,
      tag_ids: [1],
      isbn: '9787111000003',
      barcode: 'AI-0003',
      summary: '调度与路径规划实战。',
      shelf_status: 'draft',
    })

    await user.click(screen.getByRole('button', { name: '编辑此书' }))
    const editSheet = await screen.findByRole('dialog', { name: '编辑图书' })
    expect(within(editSheet).queryByLabelText('分类号')).not.toBeInTheDocument()
    await user.clear(within(editSheet).getByLabelText('书名'))
    await user.type(within(editSheet).getByLabelText('书名'), '智能系统设计（新版）')
    await user.clear(within(editSheet).getByLabelText('简介'))
    await user.type(within(editSheet).getByLabelText('简介'), '更新后的图书简介。')
    await chooseSelectOption('上架状态', '已下架', within(editSheet))
    await user.click(within(editSheet).getByRole('button', { name: '保存修改' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '编辑图书' })).not.toBeInTheDocument()
    })

    expect(managementApi.updateAdminBook).toHaveBeenCalledWith(1, {
      title: '智能系统设计（新版）',
      author: '程墨',
      category_id: 1,
      tag_ids: [1],
      isbn: '9787111000001',
      barcode: 'AI-0001',
      summary: '更新后的图书简介。',
      shelf_status: 'off_shelf',
    })
    expect((await screen.findAllByText('已下架')).length).toBeGreaterThan(0)
    expect(screen.queryByText('off_shelf')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '管理分类和标签' }))
    const taxonomyDialog = await screen.findByRole('dialog', { name: '分类和标签' })
    expect(taxonomyDialog).toHaveClass('max-h-[calc(100vh-2rem)]')
    expect(taxonomyDialog).toHaveClass('overflow-hidden')
    const categoryListSection = within(taxonomyDialog).getByRole('heading', { name: '现有分类' }).closest('section')
    expect(categoryListSection).toHaveClass('min-h-0')
    expect(within(taxonomyDialog).getByTestId('taxonomy-categories-list')).toBeInTheDocument()
    await user.type(within(taxonomyDialog).getByLabelText('分类名称'), '机器人')
    await user.click(within(taxonomyDialog).getByRole('button', { name: '创建分类' }))
    expect(managementApi.createAdminCategory).toHaveBeenCalledWith({
      code: expect.stringMatching(/^category-/),
      name: '机器人',
      description: undefined,
      status: 'active',
    })

    await user.click(within(taxonomyDialog).getByRole('tab', { name: '标签' }))
    await user.type(within(taxonomyDialog).getByLabelText('标签名称'), '机器人专题')
    await user.type(within(taxonomyDialog).getByLabelText('标签说明'), '机器人与调度书目')
    await user.click(within(taxonomyDialog).getByRole('button', { name: '创建标签' }))
    expect(managementApi.createAdminTag).toHaveBeenCalledWith({
      code: expect.stringMatching(/^tag-/),
      name: '机器人专题',
      description: '机器人与调度书目',
    })
  }, 15_000)

  it('supports quick shelf status changes from the book editor drawer', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书管理' })).toBeInTheDocument()
    expect(await screen.findAllByText('智能系统设计')).not.toHaveLength(0)

    await user.click(await screen.findByRole('button', { name: '编辑此书' }))
    const editSheet = await screen.findByRole('dialog', { name: '编辑图书' })
    await user.click(within(editSheet).getByRole('button', { name: '快速下架' }))

    await waitFor(() => {
      expect(managementApi.setAdminBookStatus).toHaveBeenCalledWith(1, 'off_shelf')
    })
    expect((await screen.findAllByText('已下架')).length).toBeGreaterThan(0)
  })

  it('renders alerts and audit logs in separate tabs', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <AlertsPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '异常' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '异常列表' })).toBeInTheDocument()
    expect(await screen.findByText('机器人异常')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '操作记录' }))
    expect(await screen.findByRole('heading', { name: '操作记录' })).toBeInTheDocument()
    expect(await screen.findByText('管理后台手动更新图书简介')).toBeInTheDocument()
  }, 10_000)

  it('hydrates reader and audit filters from the URL', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/readers?q=%E6%9E%97&restriction_status=limited&segment_code=ai_power_user']}>
          <Routes>
            <Route path="/readers" element={<ReadersPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '读者' })).toBeInTheDocument()
    expect(managementApi.getAdminReaders).toHaveBeenCalledWith({
      query: '林',
      restrictionStatus: 'limited',
      segmentCode: 'ai_power_user',
      page: 1,
      pageSize: 20,
    })

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/alerts?tab=audit&action=update_book&target_type=book']}>
          <Routes>
            <Route path="/alerts" element={<AlertsPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findAllByRole('heading', { name: '异常' })).not.toHaveLength(0)
    await waitFor(() => {
      expect(managementApi.getAdminAuditLogs).toHaveBeenLastCalledWith({
        action: 'update_book',
        target_type: 'book',
      })
    })
  })

  it('renders the audit workspace for audit viewers without loading alert handling actions', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNT,
      JSON.stringify({
        id: 8,
        username: 'audit-viewer',
        role: 'admin',
        role_codes: ['audit-viewer'],
        permission_codes: ['system.audit.view'],
      }),
    )

    render(
      <TestProviders>
        <AlertsPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '异常' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '异常' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '操作记录' })).toBeInTheDocument()
    expect(await screen.findByText('管理后台手动更新图书简介')).toBeInTheDocument()
    expect(managementApi.getAdminAlerts).not.toHaveBeenCalled()
  })

  it('renders analytics summaries from the new analytics endpoints', async () => {
    render(
      <TestProviders>
        <AnalyticsPage />
      </TestProviders>,
    )

    expect(await screen.findByText('借阅统计')).toBeInTheDocument()
    const anchorDateTrigger = await screen.findByRole('button', { name: /选择日期/ })
    expect(anchorDateTrigger).toHaveTextContent(/\d{4}-\d{2}-\d{2}/)
    expect(await screen.findByRole('heading', { name: '近 7 天借书趋势' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '各学院借书情况' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '热门图书' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '高峰时段和活跃情况' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '书柜周转对比' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '机器人执行效率' })).not.toBeInTheDocument()
    expect(screen.queryByText('预测分')).not.toBeInTheDocument()
    expect(await screen.findAllByText('信息学院')).not.toHaveLength(0)
    expect(await screen.findAllByText('75%')).not.toHaveLength(0)
    expect(analyticsApi.getAdminBorrowTrends).toHaveBeenCalledWith(7, expect.any(String))
    expect(analyticsApi.getAdminCollegePreferences).toHaveBeenCalledWith(7, expect.any(String))
    expect(analyticsApi.getAdminTimePeaks).toHaveBeenCalledWith(7, expect.any(String))
    expect(analyticsApi.getAdminPopularBooks).toHaveBeenCalledWith(5, 7, expect.any(String))
    expect(analyticsApi.getAdminCabinetTurnover).not.toHaveBeenCalled()
    expect(analyticsApi.getAdminRobotEfficiency).not.toHaveBeenCalled()
    expect(analyticsApi.getAdminRetention).toHaveBeenCalledWith(expect.any(String))
  })

  it('renders the inventory overview with cabinet cards only', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/inventory']}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/cabinets/:cabinetId" element={<InventoryPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '库存管理' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '书柜列表' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '库存调整' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: '查看书柜' })).not.toHaveLength(0)
    expect(screen.queryByRole('button', { name: '调整东区书柜库存' })).not.toBeInTheDocument()
    expect(await screen.findByText('东区书柜')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '书柜明细' })).not.toBeInTheDocument()
    expect(screen.queryByText('A01')).not.toBeInTheDocument()
  })

  it('hydrates inventory board filters from the URL for cabinet detail views', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/inventory/cabinets/cabinet-east?tab=records&event_type=book_stored']}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/cabinets/:cabinetId" element={<InventoryPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '东区书柜' })).toBeInTheDocument()
    await waitFor(() => {
      expect(managementApi.getAdminInventoryRecords).toHaveBeenCalledWith({
        cabinetId: 'cabinet-east',
        eventType: 'book_stored',
        page: 1,
        pageSize: 20,
      })
    })
  })

  it('renders cabinet detail as a switchable secondary board', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/inventory/cabinets/cabinet-east']}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/cabinets/:cabinetId" element={<InventoryPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '东区书柜' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回书柜列表' })).toHaveAttribute('href', '/inventory')
    expect(screen.getByRole('link', { name: '返回书柜列表' })).toHaveClass('!text-white')
    expect(screen.getByRole('tab', { name: '格口' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '记录' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '异常' })).toBeInTheDocument()
    expect(await screen.findByText('A01')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '记录' }))
    expect(await screen.findByText('入柜')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '异常' }))
    expect(await screen.findByText('库存异常')).toBeInTheDocument()
    expect(screen.getByText('待处理')).toBeInTheDocument()
  })

  it('submits manual inventory corrections and refreshes the cabinet board', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/inventory/cabinets/cabinet-east']}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/cabinets/:cabinetId" element={<InventoryPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '东区书柜' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '手动修正' }))
    const correctionDialog = await screen.findByRole('dialog', { name: '手动修正库存' })
    await user.type(within(correctionDialog).getByLabelText('图书编号'), '1')
    await user.type(within(correctionDialog).getByLabelText('格口编号'), 'A01')
    await user.type(within(correctionDialog).getByLabelText('修正说明'), '盘点修正')
    await user.type(within(correctionDialog).getByLabelText('总库存变化'), '-1')
    await user.type(within(correctionDialog).getByLabelText('可借库存变化'), '-1')
    await user.type(within(correctionDialog).getByLabelText('预留库存变化'), '0')
    await user.click(within(correctionDialog).getByRole('button', { name: '保存修正' }))

    await waitFor(() => {
      expect(managementApi.applyAdminInventoryCorrection).toHaveBeenCalledWith({
        cabinet_id: 'cabinet-east',
        book_id: 1,
        slot_code: 'A01',
        reason: '盘点修正',
        total_delta: -1,
        available_delta: -1,
        reserved_delta: 0,
      })
    })
    await waitFor(() => {
      expect(managementApi.getAdminCabinetSlots).toHaveBeenCalledTimes(2)
    })
  })

  it('paginates inventory board tabs with the shared shadcn footer', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/inventory/cabinets/cabinet-east']}>
          <Routes>
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/cabinets/:cabinetId" element={<InventoryPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '东区书柜' })).toBeInTheDocument()
    expect(await screen.findByText('A01')).toBeInTheDocument()
    expect(await screen.findByRole('navigation', { name: '翻页' })).toBeInTheDocument()
    expect(managementApi.getAdminCabinetSlots).toHaveBeenCalledWith('cabinet-east', { page: 1, pageSize: 20 })

    await user.click(await screen.findByRole('link', { name: '下一页' }))
    await waitFor(() => {
      expect(managementApi.getAdminCabinetSlots).toHaveBeenLastCalledWith('cabinet-east', { page: 2, pageSize: 20 })
    })

    await user.click(screen.getByRole('tab', { name: '记录' }))
    await waitFor(() => {
      expect(managementApi.getAdminInventoryRecords).toHaveBeenLastCalledWith({
        cabinetId: 'cabinet-east',
        page: 1,
        pageSize: 20,
      })
    })

    await user.click(screen.getByRole('tab', { name: '异常' }))
    await waitFor(() => {
      expect(managementApi.getAdminInventoryAlerts).toHaveBeenLastCalledWith({
        status: 'open',
        sourceId: 'cabinet-east',
        page: 1,
        pageSize: 20,
      })
    })
  })

  it('renders the upgraded readers workspace from admin reader APIs', async () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <ReadersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '读者' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '读者列表' })).toBeInTheDocument()
    expect(await screen.findByRole('navigation', { name: '翻页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '读者信息' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '读者摘要' })).not.toBeInTheDocument()
    expect(await screen.findAllByText('林栀')).not.toHaveLength(0)
    expect(screen.getByText('ai_power_user')).toBeInTheDocument()
    expect(screen.getByText('逾期 / 借阅频繁')).toBeInTheDocument()

    await userEvent.click(screen.getAllByRole('button', { name: '编辑资料' })[0])
    const editorDrawer = await screen.findByRole('dialog', { name: '编辑读者资料' })
    expect(within(editorDrawer).getByText('林栀')).toBeInTheDocument()
    expect(within(editorDrawer).getByText('reader-01')).toBeInTheDocument()
    expect(within(editorDrawer).getByText('借阅偏好')).toBeInTheDocument()
  })

  it('updates reader restrictions and segment from the readers workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter>
          <ReadersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '读者' })).toBeInTheDocument()
    expect(await screen.findAllByText('reader-01')).not.toHaveLength(0)
    await user.click(screen.getAllByRole('button', { name: '编辑资料' })[0])
    const editorDrawer = await screen.findByRole('dialog', { name: '编辑读者资料' })
    await user.clear(within(editorDrawer).getByLabelText('限制状态'))
    await user.type(within(editorDrawer).getByLabelText('限制状态'), 'blacklist')
    await user.clear(within(editorDrawer).getByLabelText('限制到期'))
    await user.type(within(editorDrawer).getByLabelText('限制到期'), '2026-04-05T10:00:00Z')
    await user.clear(within(editorDrawer).getByLabelText('分组'))
    await user.type(within(editorDrawer).getByLabelText('分组'), 'risk_watch')
    await user.clear(within(editorDrawer).getByLabelText('注意标记'))
    await user.type(within(editorDrawer).getByLabelText('注意标记'), 'overdue, manual_review')
    await user.click(within(editorDrawer).getByRole('button', { name: '保存读者资料' }))

    expect(managementApi.updateAdminReader).toHaveBeenCalledWith(1, {
      restriction_status: 'blacklist',
      restriction_until: '2026-04-05T10:00:00Z',
      segment_code: 'risk_watch',
      risk_flags: ['overdue', 'manual_review'],
    })
  })

  it('paginates readers and resets back to the first page after search changes', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter>
          <ReadersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '读者' })).toBeInTheDocument()
    expect(await screen.findByRole('navigation', { name: '翻页' })).toBeInTheDocument()
    expect(managementApi.getAdminReaders).toHaveBeenCalledWith({
      query: undefined,
      restrictionStatus: undefined,
      segmentCode: undefined,
      page: 1,
      pageSize: 20,
    })

    await user.click(await screen.findByRole('link', { name: '下一页' }))
    await waitFor(() => {
      expect(managementApi.getAdminReaders).toHaveBeenLastCalledWith({
        query: undefined,
        restrictionStatus: undefined,
        segmentCode: undefined,
        page: 2,
        pageSize: 20,
      })
    })

    await user.type(screen.getByPlaceholderText('搜索账号、姓名、学院或分组'), 'reader-02')
    await waitFor(() => {
      expect(managementApi.getAdminReaders).toHaveBeenLastCalledWith({
        query: 'reader-02',
        restrictionStatus: undefined,
        segmentCode: undefined,
        page: 1,
        pageSize: 20,
      })
    })
  })

  it('renders the recommendation studio with draft sections and preview', async () => {
    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '推荐页面' })).toBeInTheDocument()
    const titlePanel = screen.getByTestId('page-shell-title-panel')
    expect(within(titlePanel).queryByRole('button', { name: '保存草稿' })).not.toBeInTheDocument()
    expect(within(titlePanel).queryByRole('button', { name: '发布到首页' })).not.toBeInTheDocument()

    const primaryColumn = screen.getByTestId('recommendation-primary-column')
    const secondaryColumn = screen.getByTestId('recommendation-secondary-column')
    const actionBar = screen.getByTestId('recommendation-action-bar')
    const controlDeck = screen.getByTestId('recommendation-control-deck')
    const kanbanBoard = screen.getByTestId('recommendation-kanban-board')

    expect(within(controlDeck).getByRole('heading', { name: '首页栏目' })).toBeInTheDocument()
    expect(within(controlDeck).getByRole('heading', { name: '推荐方式' })).toBeInTheDocument()
    expect(within(controlDeck).queryByRole('heading', { name: '版位控制' })).not.toBeInTheDocument()
    expect(within(controlDeck).queryByRole('heading', { name: '策略权重' })).not.toBeInTheDocument()
    expect(within(controlDeck).queryByText('content')).not.toBeInTheDocument()
    expect(within(controlDeck).queryByText('behavior')).not.toBeInTheDocument()
    expect(within(controlDeck).queryByText('freshness')).not.toBeInTheDocument()
    expect(within(controlDeck).getByLabelText('今日推荐显示')).toBeInTheDocument()
    expect(within(controlDeck).getByLabelText('考试专区显示')).toBeInTheDocument()
    expect(within(controlDeck).getByRole('radio', { name: '相关图书优先' })).toBeInTheDocument()
    expect(within(controlDeck).getByRole('radio', { name: '借阅热度' })).toBeInTheDocument()
    expect(within(controlDeck).getByRole('radio', { name: '新书补位' })).toBeInTheDocument()
    expect(within(controlDeck).getByRole('radio', { name: '相关图书优先' })).toHaveAttribute('aria-checked', 'true')
    expect(within(primaryColumn).getByRole('heading', { name: '推荐看板' })).toBeInTheDocument()
    expect(within(kanbanBoard).getByRole('heading', { name: '候选书池' })).toBeInTheDocument()
    expect(within(kanbanBoard).getByRole('heading', { name: '今日推荐' })).toBeInTheDocument()
    expect(within(kanbanBoard).getByRole('heading', { name: '考试专区' })).toBeInTheDocument()
    expect(within(primaryColumn).getByText('把图书拖到对应栏目里，右侧会同步显示手机效果。')).toBeInTheDocument()
    expect(within(primaryColumn).getByRole('button', { name: /编辑页面内容/ })).toBeInTheDocument()
    expect(within(secondaryColumn).getByRole('heading', { name: '手机预览' })).toBeInTheDocument()
    expect(within(secondaryColumn).getByTestId('recommendation-phone-preview')).toBeInTheDocument()
    expect(within(secondaryColumn).getByRole('heading', { name: '发布状态' })).toBeInTheDocument()
    expect(within(actionBar).getByRole('button', { name: '还原改动' })).toBeInTheDocument()
    expect(within(actionBar).getByRole('button', { name: '保存草稿' })).toBeInTheDocument()
    expect(within(actionBar).getByRole('button', { name: '发布到首页' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '诊断' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '运行搜索诊断' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '运行 dashboard 诊断' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '运行模块诊断' })).not.toBeInTheDocument()
    expect(screen.getAllByText('智能系统设计')).not.toHaveLength(0)
  })

  it('saves the edited draft and publishes the current feed', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '推荐页面' })).toBeInTheDocument()
    const actionBar = await screen.findByTestId('recommendation-action-bar')
    await user.click(screen.getByRole('radio', { name: '新书补位' }))
    expect(screen.getByRole('radio', { name: '新书补位' })).toHaveAttribute('aria-checked', 'true')
    await chooseSelectOption('考试专区显示', '暂停')
    await user.click(screen.getByRole('button', { name: /编辑页面内容/ }))
    const configSheet = await screen.findByRole('dialog', { name: '编辑页面内容' })
    await user.clear(within(configSheet).getByLabelText('说明标题'))
    await user.type(within(configSheet).getByLabelText('说明标题'), '本周为什么这样配')
    await user.clear(within(configSheet).getByLabelText('热门榜单 1 标题'))
    await user.type(within(configSheet).getByLabelText('热门榜单 1 标题'), '馆内热读')
    await user.click(within(configSheet).getByRole('button', { name: '完成编辑' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '编辑页面内容' })).not.toBeInTheDocument()
    })
    await user.click(within(actionBar).getByRole('button', { name: '保存草稿' }))

    await waitFor(() => {
      expect(managementApi.saveAdminRecommendationStudioDraft).toHaveBeenCalledWith(
        expect.objectContaining({
          explanation_card: expect.objectContaining({
            title: '本周为什么这样配',
          }),
          hot_lists: expect.arrayContaining([
            expect.objectContaining({
              title: '馆内热读',
            }),
          ]),
          placements: expect.arrayContaining([
            expect.objectContaining({
              code: 'exam_zone',
              status: 'paused',
            }),
          ]),
          strategy_weights: expect.objectContaining({
            content: 0.25,
            behavior: 0.25,
            freshness: 0.5,
          }),
        }),
      )
    })

    await user.click(within(actionBar).getByRole('button', { name: '发布到首页' }))

    await waitFor(() => {
      expect(managementApi.publishAdminRecommendationStudio).toHaveBeenCalledTimes(1)
    })
  }, 10000)

  it('renders and saves the system configuration workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <SystemPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '系统设置' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '系统参数' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '编辑参数' })).toBeInTheDocument()
    expect(await screen.findByText('borrow.rules')).toBeInTheDocument()

    const jsonField = await screen.findByLabelText('参数内容')
    fireEvent.change(jsonField, { target: { value: '{"max_days":45,"max_count":8}' } })
    await user.click(screen.getByRole('button', { name: '保存参数' }))

    expect(managementApi.upsertAdminSystemSetting).toHaveBeenCalledWith('borrow.rules', {
      value_type: 'json',
      value_json: { max_days: 45, max_count: 8 },
      description: '借阅规则',
    })

    await user.click(screen.getByRole('tab', { name: '角色' }))
    expect(await screen.findByRole('heading', { name: '编辑角色' })).toBeInTheDocument()
    expect(await screen.findByText('运营管理员')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('权限列表'))
    await user.type(screen.getByLabelText('权限列表'), 'dashboard.view,alerts.manage')
    await user.click(screen.getByRole('button', { name: '保存角色' }))

    expect(managementApi.upsertAdminSystemRole).toHaveBeenCalledWith('ops-manager', {
      name: '运营管理员',
      description: '负责运营和警告处理',
      permission_codes: ['dashboard.view', 'alerts.manage'],
      admin_ids: [1],
    })
  })

  it('renders the role management workspace for role admins without loading system settings', async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNT,
      JSON.stringify({
        id: 9,
        username: 'role-admin',
        role: 'admin',
        role_codes: ['role-admin'],
        permission_codes: ['system.roles.manage'],
      }),
    )

    render(
      <TestProviders>
        <SystemPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '系统设置' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '配置' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '角色' })).toBeInTheDocument()
    expect(await screen.findByText('运营管理员')).toBeInTheDocument()
    expect(managementApi.getAdminSystemSettings).not.toHaveBeenCalled()
  })
})
