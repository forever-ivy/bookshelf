import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CatalogPage } from '@/pages/catalog-page'

const catalogApi = vi.hoisted(() => ({
  getBooks: vi.fn(),
}))

vi.mock('@/lib/api/catalog', () => catalogApi)

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

describe('catalog page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogApi.getBooks.mockResolvedValue({
      items: [
        {
          id: 1,
          title: '智能系统设计',
          author: '程墨',
          category: '人工智能',
          available_copies: 2,
          delivery_available: true,
          stock_status: 'available',
        },
      ],
      total: 1,
    })
  })

  it('keeps the shared data table rendering without pagination chrome on catalog listings', async () => {
    render(
      <TestProviders>
        <CatalogPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '图书目录' })).toBeInTheDocument()
    expect(catalogApi.getBooks).toHaveBeenCalledWith(undefined)
    expect(await screen.findByRole('columnheader', { name: '书名' })).toBeInTheDocument()
    expect(await screen.findByText('智能系统设计')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: '分页导航' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('按书名、作者、ISBN 搜索...'), {
      target: { value: 'AI' },
    })

    await waitFor(() => {
      expect(catalogApi.getBooks).toHaveBeenLastCalledWith('AI')
    })
  })
})
