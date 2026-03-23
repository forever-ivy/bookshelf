import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ReaderDetailPage } from '@/pages/reader-detail-page'

const managementApi = vi.hoisted(() => ({
  getAdminReader: vi.fn(),
}))

const readersApi = vi.hoisted(() => ({
  getReaderOverview: vi.fn(),
  getReaderOrders: vi.fn(),
  getReaderConversations: vi.fn(),
  getReaderRecommendations: vi.fn(),
}))

vi.mock('@/lib/api/management', () => managementApi)
vi.mock('@/lib/api/readers', () => readersApi)

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

describe('reader detail page', () => {
  beforeEach(() => {
    managementApi.getAdminReader.mockResolvedValue({
      id: 1,
      account_id: 10,
      username: 'reader-01',
      display_name: '林栀',
      college: '信息学院',
      major: '智能科学',
      affiliation_type: 'student',
      active_orders_count: 2,
      last_active_at: '2026-03-22T10:00:00Z',
      restriction_status: 'limited',
      risk_flags: ['overdue', 'manual_review'],
      segment_code: 'ai_power_user',
    })
    readersApi.getReaderOverview.mockResolvedValue({
      stats: {
        active_orders_count: 2,
        borrow_history_count: 9,
        recommendation_count: 4,
        conversation_count: 3,
      },
      recent_queries: ['AI 系统', '机器人调度'],
    })
    readersApi.getReaderOrders.mockResolvedValue([
      {
        borrow_order: {
          id: 12,
          status: 'delivering',
          order_mode: 'robot_delivery',
          created_at: '2026-03-22T09:00:00Z',
        },
      },
    ])
    readersApi.getReaderConversations.mockResolvedValue([
      {
        id: 1,
        status: 'active',
        message_count: 8,
        last_message_preview: '我想找 AI 相关的新书',
        last_message_at: '2026-03-22T10:00:00Z',
      },
    ])
    readersApi.getReaderRecommendations.mockResolvedValue([
      {
        id: 1,
        book_title: '智能系统设计',
        query_text: 'AI 系统',
        score: 0.93,
        created_at: '2026-03-22T09:05:00Z',
      },
    ])
  })

  it('renders the reader detail workspace with a path back to readers index', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/readers/1']}>
          <Routes>
            <Route path="/readers/:readerId" element={<ReaderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByText('林栀')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '记录' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '读者信息' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '偏好与标签' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回读者索引' })).toHaveAttribute('href', '/readers')
    expect(await screen.findAllByText(/AI 系统/)).not.toHaveLength(0)
    expect(screen.getByText('overdue / manual_review')).toBeInTheDocument()
  })
})
