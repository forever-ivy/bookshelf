import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
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
  getAdminRecommendationPlacements: vi.fn(),
  createAdminRecommendationPlacement: vi.fn(),
  getAdminTopicBooklists: vi.fn(),
  createAdminTopicBooklist: vi.fn(),
  getAdminRecommendationInsights: vi.fn(),
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
      shelf_status: 'on_shelf',
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
    managementApi.getAdminCabinetSlots.mockResolvedValue({
      items: [{ id: 1, cabinet_id: 'cabinet-east', slot_code: 'A01', status: 'occupied', current_copy_id: 12, copy_inventory_status: 'stored', book_id: 1, book_title: '智能系统设计', book_author: '程墨' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminInventoryRecords.mockResolvedValue({
      items: [{ id: 1, cabinet_id: 'cabinet-east', cabinet_name: '东区书柜', event_type: 'book_stored', slot_code: 'A01', book_id: 1, book_title: '智能系统设计', copy_id: 12, created_at: '2026-03-22T08:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.getAdminInventoryAlerts.mockResolvedValue({
      items: [{ id: 3, title: '库存异常', status: 'open', severity: 'warning', source_type: 'inventory', created_at: '2026-03-22T07:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.applyAdminInventoryCorrection.mockResolvedValue({
      cabinet_id: 'cabinet-east',
      book_id: 1,
      stock: { total_copies: 2, available_copies: 1, reserved_copies: 0 },
      event: { id: 10, event_type: 'manual_correction', slot_code: 'A01', created_at: '2026-03-22T09:30:00Z' },
    })
    managementApi.getAdminReaders.mockResolvedValue({
      items: [
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
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
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
    managementApi.getAdminRecommendationPlacements.mockResolvedValue({
      items: [{ id: 1, code: 'homepage-hero', name: '首页主推荐位', status: 'active', placement_type: 'homepage', config_json: { weight: 0.6 } }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.createAdminRecommendationPlacement.mockResolvedValue({
      id: 2,
      code: 'homepage-secondary',
      name: '首页次级推荐位',
      status: 'active',
      placement_type: 'homepage',
      config_json: { weight: 0.2 },
    })
    managementApi.getAdminTopicBooklists.mockResolvedValue({
      items: [{ id: 1, slug: 'ai-special', title: 'AI 专题书单', status: 'published', audience_segment: 'ai_power_user', item_count: 1, books: [{ book_id: 1, title: '智能系统设计', rank_position: 1 }] }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    managementApi.createAdminTopicBooklist.mockResolvedValue({
      id: 2,
      slug: 'ops-special',
      title: '运营专题',
      status: 'draft',
      audience_segment: 'ops',
      item_count: 1,
      books: [{ book_id: 1, title: '智能系统设计', rank_position: 1 }],
    })
    managementApi.getAdminRecommendationInsights.mockResolvedValue({
      summary: {
        total_recommendations: 12,
        view_count: 8,
        conversion_count: 3,
        click_through_rate: 66.7,
        conversion_rate: 37.5,
        placement_count: 1,
        topic_count: 1,
      },
      hot_tags: [{ tag_id: 1, tag_name: '热门', recommendation_count: 8 }],
      top_queries: [{ query_text: 'AI 系统', count: 3 }],
      strategy_weights: { content: 0.5, behavior: 0.3, freshness: 0.2 },
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

    expect(await screen.findByText('运营快照')).toBeInTheDocument()
    expect(screen.getByText('当日系统状态')).toBeInTheDocument()
    expect(await screen.findByText('今日借阅量')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('智能系统设计')).toBeInTheDocument()
    expect(screen.getByText('东区')).toBeInTheDocument()
  })

  it('renders the books workspace with books, categories, and tags tabs', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByText('图书管理')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '馆藏目录' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '当前图书检视' })).toBeInTheDocument()
    expect(await screen.findAllByText('智能系统设计')).not.toHaveLength(0)

    await user.click(screen.getByRole('tab', { name: '分类管理' }))
    expect(await screen.findByText('人工智能')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '标签管理' }))
    expect(await screen.findByText('热门')).toBeInTheDocument()
  })

  it('creates and edits books, categories, and tags from the books workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <BooksPage />
      </TestProviders>,
    )

    expect(await screen.findByText('图书管理')).toBeInTheDocument()

    await user.type(screen.getByLabelText('新书标题'), '机器人路径规划')
    await user.type(screen.getByLabelText('新书作者'), '乔远')
    await user.type(screen.getByLabelText('新书分类 ID'), '1')
    await user.type(screen.getByLabelText('新书标签 ID 列表'), '1')
    await user.type(screen.getByLabelText('新书 ISBN'), '9787111000003')
    await user.type(screen.getByLabelText('新书条码'), 'AI-0003')
    await user.type(screen.getByLabelText('新书简介'), '调度与路径规划实战。')
    await user.click(screen.getByRole('button', { name: '录入新书' }))

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
    await user.clear(screen.getByLabelText('编辑书名'))
    await user.type(screen.getByLabelText('编辑书名'), '智能系统设计（新版）')
    await user.clear(screen.getByLabelText('编辑简介'))
    await user.type(screen.getByLabelText('编辑简介'), '更新后的图书简介。')
    await user.click(screen.getByRole('button', { name: '保存图书编辑' }))

    expect(managementApi.updateAdminBook).toHaveBeenCalledWith(1, {
      title: '智能系统设计（新版）',
      author: '程墨',
      category_id: 1,
      tag_ids: [1],
      isbn: '9787111000001',
      barcode: 'AI-0001',
      summary: '更新后的图书简介。',
      shelf_status: 'on_shelf',
    })

    await user.selectOptions(screen.getByLabelText('上架状态切换'), 'off_shelf')
    await user.click(screen.getByRole('button', { name: '仅更新上架状态' }))
    expect(managementApi.setAdminBookStatus).toHaveBeenCalledWith(1, 'off_shelf')

    await user.type(screen.getByLabelText('分类编码'), 'robot')
    await user.type(screen.getByLabelText('分类名称'), '机器人')
    await user.click(screen.getByRole('button', { name: '创建分类' }))
    expect(managementApi.createAdminCategory).toHaveBeenCalledWith({
      code: 'robot',
      name: '机器人',
      description: undefined,
      status: 'active',
    })

    await user.type(screen.getByLabelText('标签编码'), 'robotics')
    await user.type(screen.getByLabelText('标签名称'), '机器人专题')
    await user.type(screen.getByLabelText('标签说明'), '机器人与调度书目')
    await user.click(screen.getByRole('button', { name: '创建标签' }))
    expect(managementApi.createAdminTag).toHaveBeenCalledWith({
      code: 'robotics',
      name: '机器人专题',
      description: '机器人与调度书目',
    })
  })

  it('renders alerts and audit logs in separate tabs', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <AlertsPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '警告管理' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '待处理警告' })).toBeInTheDocument()
    expect(await screen.findByText('机器人异常')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '审计日志' }))
    expect(await screen.findByRole('heading', { name: '审计回放' })).toBeInTheDocument()
    expect(await screen.findByText('管理后台手动更新图书简介')).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { name: '警告管理' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '警告管理' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '审计日志' })).toBeInTheDocument()
    expect(await screen.findByText('管理后台手动更新图书简介')).toBeInTheDocument()
    expect(managementApi.getAdminAlerts).not.toHaveBeenCalled()
  })

  it('renders analytics summaries from the new analytics endpoints', async () => {
    render(
      <TestProviders>
        <AnalyticsPage />
      </TestProviders>,
    )

    expect(await screen.findByText('分析简报')).toBeInTheDocument()
    expect(screen.getByText('本周借阅走势')).toBeInTheDocument()
    expect(await screen.findByText('数据分析')).toBeInTheDocument()
    expect(await screen.findByText('信息学院')).toBeInTheDocument()
    expect(await screen.findAllByText('75%')).not.toHaveLength(0)
    expect(screen.getByText('cabinet-001')).toBeInTheDocument()
  })

  it('renders the inventory workspace with cabinets, slots, records, and alerts', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <InventoryPage />
      </TestProviders>,
    )

    expect(await screen.findByText('库存与书柜管理')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '作业概览' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '库存校正台' })).toBeInTheDocument()
    expect(await screen.findByText('东区书柜')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '仓位明细' }))
    expect(await screen.findByText('A01')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '库存警告' }))
    expect(await screen.findByText('库存异常')).toBeInTheDocument()
  })

  it('renders the upgraded readers workspace from admin reader APIs', async () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <ReadersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByText('用户管理')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '读者索引' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '画像编辑台' })).toBeInTheDocument()
    expect(await screen.findAllByText('林栀')).not.toHaveLength(0)
    expect(screen.getByText('ai_power_user')).toBeInTheDocument()
    expect(screen.getByText('overdue / high_frequency')).toBeInTheDocument()
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

    expect(await screen.findByText('用户管理')).toBeInTheDocument()
    expect(await screen.findAllByText('reader-01')).not.toHaveLength(0)
    await user.click(screen.getByRole('button', { name: '编辑画像' }))
    await user.clear(screen.getByLabelText('限制状态'))
    await user.type(screen.getByLabelText('限制状态'), 'blacklist')
    await user.clear(screen.getByLabelText('限制到期'))
    await user.type(screen.getByLabelText('限制到期'), '2026-04-05T10:00:00Z')
    await user.clear(screen.getByLabelText('用户分群'))
    await user.type(screen.getByLabelText('用户分群'), 'risk_watch')
    await user.clear(screen.getByLabelText('风险标签'))
    await user.type(screen.getByLabelText('风险标签'), 'overdue, manual_review')
    await user.click(screen.getByRole('button', { name: '保存画像设置' }))

    expect(managementApi.updateAdminReader).toHaveBeenCalledWith(1, {
      restriction_status: 'blacklist',
      restriction_until: '2026-04-05T10:00:00Z',
      segment_code: 'risk_watch',
      risk_flags: ['overdue', 'manual_review'],
    })
  })

  it('renders recommendation placements, topics, and insight tabs', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect(await screen.findByText('推荐与内容运营')).toBeInTheDocument()
    expect(screen.getByText('推荐编排')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '推荐位编排' })).toBeInTheDocument()
    expect(await screen.findByText('首页主推荐位')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '专题书单' }))
    expect(await screen.findByText('AI 专题书单')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '运营指标' }))
    expect(await screen.findByText('热门')).toBeInTheDocument()
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('saves recommendation strategy weights when the admin can edit system settings', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNT,
      JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'admin',
        role_codes: ['ops-manager'],
        permission_codes: ['recommendation.manage', 'system.settings.manage'],
      }),
    )

    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect(await screen.findByText('推荐与内容运营')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: '运营指标' }))
    const contentInput = await screen.findByLabelText('content')
    fireEvent.change(contentInput, { target: { value: '0.7' } })
    await user.click(screen.getByRole('button', { name: '保存策略权重' }))

    expect(managementApi.upsertAdminSystemSetting).toHaveBeenCalledWith('recommendation.weights', {
      value_type: 'json',
      value_json: {
        content: 0.7,
        behavior: 0.3,
        freshness: 0.2,
      },
      description: '推荐策略权重',
    })
  })

  it('renders recommendation workspace as read-only for limited admins', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      STORAGE_KEYS.ACCOUNT,
      JSON.stringify({
        id: 2,
        username: 'ops-viewer',
        role: 'admin',
        role_codes: ['dashboard-viewer'],
        permission_codes: ['dashboard.view'],
      }),
    )

    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect(await screen.findByText('推荐与内容运营')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '创建推荐位' })).toBeDisabled()
    expect(screen.getByText('当前账号缺少 `recommendation.manage`，创建推荐位操作已只读。')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '专题书单' }))
    expect(screen.getByRole('button', { name: '创建书单' })).toBeDisabled()

    await user.click(screen.getByRole('tab', { name: '运营指标' }))
    expect(screen.getByRole('button', { name: '保存策略权重' })).toBeDisabled()
    expect(screen.getByText('当前账号缺少 `system.settings.manage`，只能查看策略权重，不能直接修改。')).toBeInTheDocument()
  })

  it('renders and saves the system configuration workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <SystemPage />
      </TestProviders>,
    )

    expect(await screen.findByText('系统配置')).toBeInTheDocument()
    expect(screen.getByText('治理与权限')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '配置台账' })).toBeInTheDocument()
    expect(await screen.findByText('borrow.rules')).toBeInTheDocument()

    const jsonField = await screen.findByLabelText('JSON 值')
    fireEvent.change(jsonField, { target: { value: '{"max_days":45,"max_count":8}' } })
    await user.click(screen.getByRole('button', { name: '保存系统配置' }))

    expect(managementApi.upsertAdminSystemSetting).toHaveBeenCalledWith('borrow.rules', {
      value_type: 'json',
      value_json: { max_days: 45, max_count: 8 },
      description: '借阅规则',
    })

    await user.click(screen.getByRole('tab', { name: '角色权限' }))
    expect(await screen.findByRole('heading', { name: '角色编辑台' })).toBeInTheDocument()
    expect(await screen.findByText('运营管理员')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('权限编码列表'))
    await user.type(screen.getByLabelText('权限编码列表'), 'dashboard.view,alerts.manage')
    await user.click(screen.getByRole('button', { name: '保存角色权限' }))

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

    expect(await screen.findByText('系统配置')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '配置编辑' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '角色权限' })).toBeInTheDocument()
    expect(await screen.findByText('运营管理员')).toBeInTheDocument()
    expect(managementApi.getAdminSystemSettings).not.toHaveBeenCalled()
  })
})
