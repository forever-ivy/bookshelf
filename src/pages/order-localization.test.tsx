import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrderDetailPage } from '@/pages/order-detail-page'
import { OrdersPage } from '@/pages/orders-page'

const adminApi = vi.hoisted(() => ({
  completeAdminReturnRequest: vi.fn(),
  getAdminOrder: vi.fn(),
  getAdminOrders: vi.fn(),
  getAdminReturnRequests: vi.fn(),
  interveneAdminOrder: vi.fn(),
  patchAdminOrderState: vi.fn(),
  prioritizeAdminOrder: vi.fn(),
  receiveAdminReturnRequest: vi.fn(),
  retryAdminOrder: vi.fn(),
}))

vi.mock('@/lib/api/admin', () => adminApi)

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

async function chooseSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  option: string,
  scope: Pick<typeof screen, 'getByRole'> = screen,
) {
  await user.click(scope.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('order localization', () => {
  beforeEach(() => {
    adminApi.getAdminOrders.mockResolvedValue({
      items: [
        {
          borrow_order: {
            id: 12,
            reader_id: 3,
            book_id: 7,
            assigned_copy_id: 18,
            order_mode: 'robot_delivery',
            status: 'delivering',
            priority: 'high',
            attempt_count: 1,
            intervention_status: 'manual_review',
            failure_reason: null,
            created_at: '2026-03-22T09:00:00Z',
          },
          delivery_order: {
            id: 22,
            borrow_order_id: 12,
            delivery_target: '东区自习室 A7',
            eta_minutes: 12,
            status: 'delivering',
            priority: 'high',
          },
          robot_task: {
            id: 32,
            robot_id: 1,
            delivery_order_id: 22,
            status: 'carrying',
            attempt_count: 1,
          },
          robot_unit: {
            id: 1,
            code: 'robot-1',
            status: 'carrying',
            battery_level: 64,
            heartbeat_at: '2026-03-22T10:15:00Z',
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    })
    adminApi.getAdminOrder.mockResolvedValue({
      borrow_order: {
        id: 12,
        reader_id: 3,
        book_id: 7,
        assigned_copy_id: 18,
        order_mode: 'robot_delivery',
        status: 'delivering',
        priority: 'high',
        attempt_count: 1,
        intervention_status: 'manual_review',
        failure_reason: null,
        created_at: '2026-03-22T09:00:00Z',
      },
      delivery_order: {
        id: 22,
        borrow_order_id: 12,
        delivery_target: '东区自习室 A7',
        eta_minutes: 12,
        status: 'delivering',
        priority: 'high',
      },
      robot_task: {
        id: 32,
        robot_id: 1,
        delivery_order_id: 22,
        status: 'carrying',
        attempt_count: 1,
      },
      robot_unit: {
        id: 1,
        code: 'robot-1',
        status: 'carrying',
        battery_level: 64,
        heartbeat_at: '2026-03-22T10:15:00Z',
      },
      robot: {
        id: 1,
        code: 'robot-1',
        status: 'carrying',
        battery_level: 64,
        heartbeat_at: '2026-03-22T10:15:00Z',
      },
    })
    adminApi.getAdminReturnRequests.mockResolvedValue({
      items: [{ id: 99, borrow_order_id: 12, status: 'created', note: '下课后归还', created_at: '2026-03-22T11:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    adminApi.patchAdminOrderState.mockResolvedValue({})
    adminApi.prioritizeAdminOrder.mockResolvedValue({})
    adminApi.interveneAdminOrder.mockResolvedValue({})
    adminApi.retryAdminOrder.mockResolvedValue({})
    adminApi.receiveAdminReturnRequest.mockResolvedValue({})
    adminApi.completeAdminReturnRequest.mockResolvedValue({})
  })

  it('renders Chinese labels in the orders filter and quick detail summary', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '订单' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '订单状态筛选' })).toHaveTextContent('全部')
    await user.click(screen.getByRole('combobox', { name: '订单状态筛选' }))
    expect(await screen.findByRole('option', { name: '已创建' })).toHaveTextContent('已创建')
    expect(screen.getByRole('option', { name: '书柜取书中' })).toHaveTextContent('书柜取书中')
    expect(screen.getByRole('option', { name: '配送中' })).toHaveTextContent('配送中')
    await user.click(screen.getByRole('option', { name: '配送中' }))
    expect(screen.getByRole('combobox', { name: '订单状态筛选' })).toHaveTextContent('配送中')

    await user.click(await screen.findByRole('button', { name: '查看详情' }))

    const quickDetail = await screen.findByRole('dialog', { name: '订单 #12' })
    expect(within(quickDetail).getByText(/模式 机器人送书 · 创建于/)).toBeInTheDocument()
    expect(within(quickDetail).getByText('优先级：优先')).toBeInTheDocument()
    expect(within(quickDetail).getByText('人工跟进：转人工处理')).toBeInTheDocument()
  }, 10000)

  it('renders Chinese labels in status, priority, and return selectors on the detail page', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/orders/12']}>
          <Routes>
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByText('订单 #12')).toBeInTheDocument()
    expect(screen.getByText('机器人送书')).toBeInTheDocument()
    expect(screen.getByText('优先')).toBeInTheDocument()
    expect(screen.getByText('转人工处理')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '改状态' }))
    const statusDialog = await screen.findByRole('dialog', { name: '改状态' })
    const borrowStatusSelect = within(statusDialog).getByRole('combobox', { name: '借阅状态' })
    await chooseSelectOption(user, '借阅状态', '书柜取书中', within(statusDialog))
    expect(borrowStatusSelect).toHaveTextContent('书柜取书中')
    await chooseSelectOption(user, '任务状态', '运输中', within(statusDialog))
    expect(within(statusDialog).getByRole('combobox', { name: '任务状态' })).toHaveTextContent('运输中')
    await user.click(within(statusDialog).getByRole('button', { name: '关闭' }))

    await user.click(screen.getByRole('button', { name: '调整优先级' }))
    const priorityDialog = await screen.findByRole('dialog', { name: '调整优先级' })
    await chooseSelectOption(user, '优先级', '加急', within(priorityDialog))
    expect(within(priorityDialog).getByRole('combobox', { name: '优先级' })).toHaveTextContent('加急')
    await user.click(within(priorityDialog).getByRole('button', { name: '关闭' }))

    await user.click(screen.getAllByRole('button', { name: '处理还书' })[0])
    const returnDialog = await screen.findByRole('dialog', { name: '处理还书' })
    await chooseSelectOption(user, '还书申请', '#99 · 已创建', within(returnDialog))
    expect(within(returnDialog).getByRole('combobox', { name: '还书申请' })).toHaveTextContent('#99 · 已创建')
  }, 10000)
})
