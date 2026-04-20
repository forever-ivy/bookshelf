import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ReaderDetailPage } from '@/pages/reader-detail-page'

const managementApi = vi.hoisted(() => ({
  getAdminReader: vi.fn(),
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
  })

  it('renders the reader detail workspace with a path back to readers index', async () => {
    const user = userEvent.setup()

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
    expect(screen.getByRole('heading', { name: '读者实时记录' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '读者身份卡片' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '偏好与注意项' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回读者列表' })).toHaveAttribute('href', '/readers')
    expect(screen.getByText('#overdue')).toBeInTheDocument()
    expect(screen.getByText('#manual_review')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '推荐记录' }))

    expect(await screen.findByText('暂无推荐记录')).toBeInTheDocument()
  })

  it('still renders reader detail when overview side queries fail', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/readers/537']}>
          <Routes>
            <Route path="/readers/:readerId" element={<ReaderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByText('林栀')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '读者身份卡片' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回读者列表' })).toHaveAttribute('href', '/readers')
    expect(screen.getByText('暂无借阅记录')).toBeInTheDocument()
  })
})
