import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { STORAGE_KEYS } from '@/constants/constant'
import { SessionProvider } from '@/providers/session-provider'

import { Topbar } from './topbar'

const adminApi = vi.hoisted(() => ({
  getAdminOrders: vi.fn(),
}))

const managementApi = vi.hoisted(() => ({
  getAdminBooks: vi.fn(),
  getAdminReaders: vi.fn(),
}))

vi.mock('@/lib/api/admin', () => adminApi)
vi.mock('@/lib/api/management', () => managementApi)

function TestProviders({ children }: PropsWithChildren) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
    </QueryClientProvider>
  )
}

function CurrentLocation() {
  const location = useLocation()
  return <div data-testid="current-location">{`${location.pathname}${location.search}`}</div>
}

function renderTopbar() {
  window.localStorage.setItem(
    STORAGE_KEYS.ACCOUNT,
    JSON.stringify({
      id: 1,
      username: 'admin',
      role: 'admin',
      permission_codes: ['dashboard.view', 'books.manage', 'orders.manage', 'readers.manage', 'alerts.manage'],
    }),
  )

  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <TestProviders>
        <Topbar />
        <CurrentLocation />
      </TestProviders>
    </MemoryRouter>,
  )
}

describe('Topbar global search', () => {
  beforeEach(() => {
    managementApi.getAdminBooks.mockResolvedValue({
      items: [
        {
          id: 7,
          title: '智能图书馆运营实战',
          author: '馆务创新组',
          summary: '围绕馆藏运营的实践手册。',
          availability_label: '可借',
          cabinet_label: '东区一层',
          cover_tone: 'blue',
          delivery_available: true,
          eta_label: '12 分钟',
          eta_minutes: 12,
          shelf_label: '东区一层',
          stock_status: 'available',
          tags: [],
        },
      ],
      total: 1,
      page: 1,
      page_size: 5,
    })
    managementApi.getAdminReaders.mockResolvedValue({
      items: [
        {
          id: 9,
          account_id: 4,
          username: 'reader.zhang',
          display_name: '张一凡',
          affiliation_type: 'student',
          college: '计算机学院',
          major: '人工智能',
          grade_year: '2027',
          active_orders_count: 2,
          last_active_at: '2026-03-29T10:00:00Z',
          restriction_status: 'none',
          restriction_until: null,
          risk_flags: [],
          segment_code: 'ai-heavy',
        },
      ],
      total: 1,
      page: 1,
      page_size: 5,
    })
    adminApi.getAdminOrders.mockResolvedValue({
      items: [
        {
          borrow_order: {
            id: 12,
            reader_id: 9,
            book_id: 7,
            assigned_copy_id: 18,
            order_mode: 'robot_delivery',
            status: 'delivering',
            priority: 'high',
            attempt_count: 1,
            intervention_status: null,
            failure_reason: null,
            created_at: '2026-03-29T09:00:00Z',
          },
          delivery_order: {
            id: 22,
            borrow_order_id: 12,
            delivery_target: '东区自习室 A7',
            eta_minutes: 10,
            status: 'delivering',
            priority: 'high',
          },
          robot_task: null,
          robot_unit: null,
          robot: null,
        },
      ],
      total: 1,
      page: 1,
      page_size: 5,
    })
  })

  it('opens the command palette with the keyboard shortcut and shows shortcuts', async () => {
    renderTopbar()

    fireEvent.keyDown(window, { key: 'k', metaKey: true })

    expect(await screen.findByRole('dialog', { name: '全局搜索' })).toBeInTheDocument()
    expect(screen.getByText('快捷跳转')).toBeInTheDocument()
    expect(screen.getByText('图书管理')).toBeInTheDocument()
    expect(screen.getByText('警告中心')).toBeInTheDocument()
  })

  it('searches across books, readers, and orders, then navigates from a result', async () => {
    const user = userEvent.setup()
    renderTopbar()

    await user.click(screen.getByPlaceholderText('搜索图书、订单、读者与告警'))

    const dialog = await screen.findByRole('dialog', { name: '全局搜索' })
    const searchInput = within(dialog).getByPlaceholderText('搜索图书、订单、读者与告警')

    await user.type(searchInput, '智能')

    await waitFor(() => {
      expect(managementApi.getAdminBooks).toHaveBeenCalledWith({
        query: '智能',
        page: 1,
        pageSize: 5,
      })
      expect(managementApi.getAdminReaders).toHaveBeenCalledWith({
        query: '智能',
        page: 1,
        pageSize: 5,
      })
      expect(adminApi.getAdminOrders).toHaveBeenCalledWith({
        query: '智能',
        page: 1,
        pageSize: 5,
      })
    })

    expect(await screen.findByText('智能图书馆运营实战')).toBeInTheDocument()
    expect(screen.getByText('张一凡')).toBeInTheDocument()
    expect(screen.getByText('订单 #12')).toBeInTheDocument()

    await user.click(screen.getByText('订单 #12'))

    await waitFor(() => {
      expect(screen.getByTestId('current-location')).toHaveTextContent('/orders/12')
    })
  })
})
