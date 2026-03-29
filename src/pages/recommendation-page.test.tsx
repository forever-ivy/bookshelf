import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { RecommendationPage } from '@/pages/recommendation-page'

const managementApi = vi.hoisted(() => ({
  getAdminBooks: vi.fn(),
  getAdminRecommendationStudio: vi.fn(),
  getAdminRecommendationStudioPublications: vi.fn(),
  saveAdminRecommendationStudioDraft: vi.fn(),
  publishAdminRecommendationStudio: vi.fn(),
  searchAdminRecommendationDebug: vi.fn(),
  getAdminRecommendationDebugDashboard: vi.fn(),
  getAdminRecommendationDebugBookModule: vi.fn(),
}))

vi.mock('@/lib/api/management', () => managementApi)

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

describe('recommendation page', () => {
  it('renders the studio from live recommendation data', async () => {
    const user = userEvent.setup()
    managementApi.getAdminRecommendationStudio.mockResolvedValue({
      live_publication: {
        id: 9,
        version: 3,
        published_by_username: 'admin',
        published_at: '2026-03-27T08:00:00Z',
      },
      draft: {
        today_recommendations: [
          { book_id: 1, custom_explanation: '适合系统设计课同学先看。', source: 'manual_review', rank: 1 },
        ],
        exam_zone: [
          { book_id: 5, custom_explanation: '适合考试周快速补强。', source: 'manual_review', rank: 1 },
        ],
        hot_lists: [
          { id: 'popular-now', title: '本周热门', description: '近期馆内借阅最活跃的图书集合。' },
          { id: 'exam-focus', title: '考试专区', description: '适合考试周快速补强的主题内容。' },
          { id: 'reader-focus', title: '与你相关', description: '结合课程与阅读偏好精选。' },
        ],
        system_booklists: [
          { booklist_id: 11, rank: 1 },
        ],
        explanation_card: {
          title: '为什么这些内容在这里',
          body: '这一版推荐由管理员基于候选池审核发布。',
        },
        placements: [
          { code: 'today_recommendations', name: '今日推荐', status: 'active', placement_type: 'home_feed', rank: 1 },
          { code: 'exam_zone', name: '考试专区', status: 'active', placement_type: 'home_feed', rank: 2 },
          { code: 'hot_lists', name: '热门榜单', status: 'active', placement_type: 'home_feed', rank: 3 },
          { code: 'system_booklists', name: '系统书单', status: 'active', placement_type: 'home_feed', rank: 4 },
        ],
        strategy_weights: {
          content: 0.55,
          behavior: 0.3,
          freshness: 0.15,
        },
      },
      candidates: {
        today_recommendations: [
          {
            book_id: 1,
            title: '智能系统设计',
            author: '程墨',
            available_copies: 2,
            deliverable: true,
            eta_minutes: 15,
            default_explanation: '适合系统设计课同学先看。',
          },
        ],
        exam_zone: [
          {
            book_id: 5,
            title: '概率论速读',
            author: '王老师',
            available_copies: 4,
            deliverable: true,
            eta_minutes: 10,
            default_explanation: '适合考试周快速补强。',
          },
        ],
        system_booklists: [
          { booklist_id: 11, title: 'AI 考试专区', description: '适合考试周快速补强的 AI 主题书单。', book_count: 2 },
        ],
      },
      preview_feed: {
        today_recommendations: [
          { book_id: 1, title: '智能系统设计', author: '程墨', explanation: '适合系统设计课同学先看。', available_copies: 2, deliverable: true, eta_minutes: 15 },
        ],
        exam_zone: [
          { book_id: 5, title: '概率论速读', author: '王老师', explanation: '适合考试周快速补强。', available_copies: 4, deliverable: true, eta_minutes: 10 },
        ],
        quick_actions: [
          { code: 'borrow_now', title: '一键借书', description: '优先查看当前可借并支持配送的图书。', meta: '2 本推荐已准备好', source: 'system_generated' },
        ],
        hot_lists: [
          { id: 'popular-now', title: '本周热门', description: '近期馆内借阅最活跃的图书集合。' },
        ],
        system_booklists: [
          { id: '11', title: 'AI 考试专区', description: '适合考试周快速补强的 AI 主题书单。' },
        ],
        explanation_card: {
          title: '为什么这些内容在这里',
          body: '这一版推荐由管理员基于候选池审核发布。',
        },
      },
    })
    managementApi.getAdminRecommendationStudioPublications.mockResolvedValue({
      items: [
        { id: 9, version: 3, published_by_username: 'admin', published_at: '2026-03-27T08:00:00Z' },
      ],
    })
    managementApi.getAdminBooks.mockResolvedValue({
      items: [
        {
          id: 18,
          title: '系统性能工程',
          author: '周临',
          category_id: 3,
          category: '计算机',
          shelf_status: 'on_shelf',
          isbn: '9787111000018',
          barcode: 'CS-0018',
          tags: [],
          summary: '适合加入推荐候选池的系统类图书。',
          stock_summary: { total_copies: 2, available_copies: 2, reserved_copies: 0 },
        },
      ],
      total: 1,
      page: 1,
      page_size: 8,
    })

    render(
      <TestProviders>
        <RecommendationPage />
      </TestProviders>,
    )

    expect((await screen.findAllByText('智能系统设计')).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: '手机预览' })).toBeInTheDocument()
    expect(screen.getByText('为什么这些内容在这里')).toBeInTheDocument()
    expect(screen.getByText('系统书单')).toBeInTheDocument()
    expect(screen.getByText('AI 考试专区')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '诊断' })).not.toBeInTheDocument()
    expect(screen.queryByText('deepseek-chat')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('搜索图书加入候选'), '系统')
    await user.click(screen.getByRole('button', { name: '搜索并加入' }))

    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenCalledWith({
        page: 1,
        pageSize: 8,
        query: '系统',
        shelfStatus: 'on_shelf',
      })
    })

    const searchResults = await screen.findByTestId('recommendation-search-results')
    await user.click(within(searchResults).getByRole('button', { name: '加入候选池' }))
    expect(await screen.findByText('系统性能工程')).toBeInTheDocument()
  }, 10000)
})
