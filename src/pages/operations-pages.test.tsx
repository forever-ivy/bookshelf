import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrderDetailPage } from '@/pages/order-detail-page'
import { OrdersPage } from '@/pages/orders-page'
import { RobotsPage } from '@/pages/robots-page'

const adminApi = vi.hoisted(() => ({
  getAdminOrders: vi.fn(),
  getAdminOrder: vi.fn(),
  patchAdminOrderState: vi.fn(),
  prioritizeAdminOrder: vi.fn(),
  interveneAdminOrder: vi.fn(),
  retryAdminOrder: vi.fn(),
  getAdminReturnRequests: vi.fn(),
  receiveAdminReturnRequest: vi.fn(),
  completeAdminReturnRequest: vi.fn(),
  getAdminTasks: vi.fn(),
  getAdminRobots: vi.fn(),
  getAdminEvents: vi.fn(),
  reassignAdminTask: vi.fn(),
}))

vi.mock('@/lib/api/admin', () => adminApi)
vi.mock('@/hooks/use-admin-events-stream', () => ({
  useAdminEventsStream: vi.fn(),
}))

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
  await user.click(screen.getByRole('option', { name: option }))
}

describe('operations pages', () => {
  beforeEach(() => {
    const orderItems = [
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
          intervention_status: null,
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
        fulfillment_phase: 'dispatch_started',
        robot: {
          id: 1,
          code: 'robot-1',
          status: 'carrying',
          battery_level: 64,
          heartbeat_at: '2026-03-22T10:15:00Z',
        },
      },
    ]

    adminApi.getAdminOrders.mockImplementation((
      params?: { page?: number; pageSize?: number; status?: string; priority?: string; interventionStatus?: string },
    ) =>
      Promise.resolve({
        items: orderItems.filter((item) => (params?.status ? item.borrow_order.status === params.status : true)),
        total: params?.status ? 24 : 42,
        page: params?.page ?? 1,
        page_size: params?.pageSize ?? 20,
      }),
    )
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
        intervention_status: null,
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
      fulfillment_phase: 'dispatch_started',
      robot: {
        id: 1,
        code: 'robot-1',
        status: 'carrying',
        battery_level: 64,
        heartbeat_at: '2026-03-22T10:15:00Z',
      },
    })
    adminApi.patchAdminOrderState.mockResolvedValue({
      borrow_order: { id: 12, status: 'delivered' },
      delivery_order: { id: 22, status: 'delivered' },
      robot_task: { id: 32, status: 'arriving' },
      robot_unit: { id: 1, status: 'arriving' },
      robot: { id: 1, status: 'arriving' },
    })
    adminApi.prioritizeAdminOrder.mockResolvedValue({
      borrow_order: { id: 12, status: 'delivering', priority: 'urgent' },
      delivery_order: { id: 22, status: 'delivering', priority: 'urgent' },
      robot_task: { id: 32, status: 'carrying' },
      robot_unit: { id: 1, status: 'carrying' },
      robot: { id: 1, status: 'carrying' },
    })
    adminApi.interveneAdminOrder.mockResolvedValue({
      borrow_order: { id: 12, status: 'delivering', intervention_status: 'manual_review', failure_reason: '通道拥堵' },
      delivery_order: { id: 22, status: 'delivering', intervention_status: 'manual_review', failure_reason: '通道拥堵' },
      robot_task: { id: 32, status: 'carrying' },
      robot_unit: { id: 1, status: 'carrying' },
      robot: { id: 1, status: 'carrying' },
    })
    adminApi.retryAdminOrder.mockResolvedValue({
      borrow_order: { id: 12, status: 'created', attempt_count: 2 },
      delivery_order: { id: 22, status: 'awaiting_pick' },
      robot_task: { id: 32, status: 'assigned' },
      robot_unit: { id: 1, status: 'assigned' },
      robot: { id: 1, status: 'assigned' },
    })
    adminApi.getAdminReturnRequests.mockResolvedValue({
      items: [{ id: 99, borrow_order_id: 12, status: 'created', note: '下课后归还', created_at: '2026-03-22T11:00:00Z' }],
      total: 1,
      page: 1,
      page_size: 20,
    })
    adminApi.receiveAdminReturnRequest.mockResolvedValue({
      id: 99,
      borrow_order_id: 12,
      status: 'received',
      note: '机器人已完成回收',
    })
    adminApi.completeAdminReturnRequest.mockResolvedValue({
      id: 99,
      borrow_order_id: 12,
      status: 'completed',
      note: '书柜识别成功并完成上架',
    })
    adminApi.getAdminTasks.mockResolvedValue([
      {
        id: 32,
        robot_id: 1,
        delivery_order_id: 22,
        status: 'assigned',
        attempt_count: 1,
        failure_reason: null,
      },
    ])
    adminApi.getAdminRobots.mockResolvedValue([
      {
        id: 1,
        code: 'robot-1',
        status: 'assigned',
        battery_level: 32,
        heartbeat_at: '2026-03-22T10:15:00Z',
        current_task: { id: 32, robot_id: 1, delivery_order_id: 22, status: 'assigned' },
      },
      {
        id: 2,
        code: 'robot-2',
        status: 'idle',
        battery_level: 91,
        heartbeat_at: '2026-03-22T10:18:00Z',
        current_task: null,
      },
    ])
    adminApi.getAdminEvents.mockResolvedValue([
      {
        id: 1,
        robot_id: 1,
        task_id: 32,
        event_type: 'order_created',
        metadata: { delivery_target: '东区自习室 A7', fulfillment_phase: 'dispatch_started' },
        created_at: '2026-03-22T10:00:00Z',
      },
    ])
    adminApi.reassignAdminTask.mockResolvedValue({
      task: { id: 32, robot_id: 2, delivery_order_id: 22, status: 'assigned' },
      robot: { id: 2, code: 'robot-2', status: 'assigned', battery_level: 91 },
    })
  })

  it('opens a quick order detail sheet from the orders workspace', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '订单' })).toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: '查看详情' }))

    const quickDetail = await screen.findByRole('dialog', { name: '订单 #12' })
    expect(quickDetail).toBeInTheDocument()
    expect(within(quickDetail).getByText('东区自习室 A7')).toBeInTheDocument()
    expect(within(quickDetail).getByRole('link', { name: '打开完整页面' })).toHaveAttribute('href', '/orders/12')
  }, 10000)

  it('shows the operator fulfillment summary on the orders surfaces', async () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByText('机器人发出')).toBeInTheDocument()

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/orders/12']}>
          <Routes>
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
          </Routes>
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findAllByText('机器人发出')).not.toHaveLength(0)
  }, 10000)

  it('keeps the orders toolbar wrapping and shows localized created times', async () => {
    render(
      <TestProviders>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '订单' })).toBeInTheDocument()

    const toolbar = screen.getByTestId('orders-toolbar')
    const filterGrid = screen.getByTestId('orders-toolbar-filter-grid')
    expect(toolbar).toHaveClass('w-full')
    expect(toolbar).toHaveClass('xl:max-w-[38rem]')
    expect(toolbar).toHaveClass('xl:ml-auto')
    expect(filterGrid).toHaveClass('xl:grid-cols-3')
    expect(filterGrid).toHaveClass('xl:justify-items-end')
    expect(within(filterGrid).getByText('状态')).toBeInTheDocument()
    expect(within(filterGrid).getByText('优先级')).toBeInTheDocument()
    expect(within(filterGrid).getByText('人工跟进')).toBeInTheDocument()
    expect(within(filterGrid).getByRole('combobox', { name: '订单状态筛选' })).toBeInTheDocument()
    expect(within(filterGrid).getByRole('combobox', { name: '优先级筛选' })).toBeInTheDocument()
    expect(within(filterGrid).getByRole('combobox', { name: '人工跟进筛选' })).toBeInTheDocument()
    expect(screen.queryByDisplayValue(/订单总数：/)).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue(/高优先级：/)).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue(/人工跟进：/)).not.toBeInTheDocument()
    expect(await screen.findByText('2026/03/22 17:00')).toBeInTheDocument()
  })

  it('paginates orders and resets back to the first page when filters change', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <MemoryRouter>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '订单' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: '查看详情' })).toBeInTheDocument()
    expect(adminApi.getAdminOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: undefined,
      priority: undefined,
      interventionStatus: undefined,
    })

    await user.click(await screen.findByRole('link', { name: '下一页' }))
    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenLastCalledWith({
        page: 2,
        pageSize: 20,
        status: undefined,
        priority: undefined,
        interventionStatus: undefined,
      })
    })

    await chooseSelectOption(user, '订单状态筛选', '配送中')
    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        status: 'delivering',
        priority: undefined,
        interventionStatus: undefined,
      })
    })

    await chooseSelectOption(user, '优先级筛选', '优先')
    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        status: 'delivering',
        priority: 'high',
        interventionStatus: undefined,
      })
    })
    expect(screen.getByRole('combobox', { name: '优先级筛选' })).toHaveTextContent('优先')

    await chooseSelectOption(user, '人工跟进筛选', '转人工处理')
    await waitFor(() => {
      expect(adminApi.getAdminOrders).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        status: 'delivering',
        priority: 'high',
        interventionStatus: 'manual_review',
      })
    })
    expect(screen.getByRole('combobox', { name: '人工跟进筛选' })).toHaveTextContent('转人工处理')
  })

  it('hydrates order filters from the URL and filters robot views locally', async () => {
    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/orders?status=delivering&priority=high&intervention_status=manual_review']}>
          <OrdersPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '订单' })).toBeInTheDocument()
    expect(adminApi.getAdminOrders).toHaveBeenCalledWith({
      page: 1,
      pageSize: 20,
      status: 'delivering',
      priority: 'high',
      interventionStatus: 'manual_review',
    })

    render(
      <TestProviders>
        <MemoryRouter initialEntries={['/robots?robot_status=assigned&task_status=assigned&event_type=order_created']}>
          <RobotsPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findAllByRole('heading', { name: '机器人' })).not.toHaveLength(0)
    expect(screen.getByText('robot-1')).toBeInTheDocument()
    expect(screen.queryByText('robot-2')).not.toBeInTheDocument()
    expect(screen.getByText('新建订单')).toBeInTheDocument()
  })

  it('lets admins prioritize, intervene, and retry an order', async () => {
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
    expect(screen.getByRole('link', { name: '返回订单列表' })).toHaveAttribute('href', '/orders')
    expect(screen.getByRole('link', { name: '返回订单列表' })).toHaveClass('!text-white')

    await user.click(screen.getByRole('button', { name: '改状态' }))
    const statusDialog = await screen.findByRole('dialog', { name: '改状态' })
    await chooseSelectOption(user, '借阅状态', '已送达', within(statusDialog))
    await user.click(within(statusDialog).getByRole('button', { name: '保存状态' }))
    expect(adminApi.patchAdminOrderState).toHaveBeenCalledWith(12, {
      borrow_status: 'delivered',
      delivery_status: 'delivering',
      task_status: 'carrying',
      robot_status: 'carrying',
    })

    await user.click(screen.getByRole('button', { name: '调整优先级' }))
    const priorityDialog = await screen.findByRole('dialog', { name: '调整优先级' })
    await user.click(within(priorityDialog).getByRole('button', { name: '保存优先级' }))
    expect(adminApi.prioritizeAdminOrder).toHaveBeenCalledWith(12, 'urgent')

    await user.click(screen.getByRole('button', { name: '人工跟进' }))
    const interventionDialog = await screen.findByRole('dialog', { name: '人工跟进' })
    await user.type(within(interventionDialog).getByLabelText('处理说明'), '通道拥堵')
    await user.click(within(interventionDialog).getByRole('button', { name: '保存处理情况' }))
    expect(adminApi.interveneAdminOrder).toHaveBeenCalledWith(12, {
      intervention_status: 'manual_review',
      failure_reason: '通道拥堵',
    })

    await user.click(screen.getByRole('button', { name: '重新处理' }))
    const retryDialog = await screen.findByRole('dialog', { name: '重新处理' })
    await user.type(within(retryDialog).getByLabelText('重试备注'), '人工确认后重新派单')
    await user.click(within(retryDialog).getByRole('button', { name: '确认重试' }))
    expect(adminApi.retryAdminOrder).toHaveBeenCalledWith(12, '人工确认后重新派单')

    await user.click(screen.getAllByRole('button', { name: '处理还书' })[0])
    const returnDialog = await screen.findByRole('dialog', { name: '处理还书' })
    await user.type(within(returnDialog).getByLabelText('处理备注'), '机器人已完成回收')
    await user.click(within(returnDialog).getByRole('button', { name: '确认收到' }))
    expect(adminApi.receiveAdminReturnRequest).toHaveBeenCalledWith(99, '机器人已完成回收')

    await user.click(screen.getAllByRole('button', { name: '处理还书' })[0])
    const returnDialogAgain = await screen.findByRole('dialog', { name: '处理还书' })
    await user.type(within(returnDialogAgain).getByLabelText('处理备注'), '书柜识别成功并完成上架')
    await user.click(within(returnDialogAgain).getByRole('button', { name: '完成入库' }))
    expect(adminApi.completeAdminReturnRequest).toHaveBeenCalledWith(99, {
      cabinet_id: 'cabinet-001',
      slot_code: 'A01',
      note: '书柜识别成功并完成上架',
    })
  }, 10_000)

  it('renders robots workspace and supports task reassignment', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <RobotsPage />
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '机器人' })).toBeInTheDocument()
    expect(await screen.findByText('robot-1')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()

    await chooseSelectOption(user, '任务', '任务 #32 · 当前机器人 #1 · 已分配')
    await chooseSelectOption(user, '目标机器人', 'robot-2 · 空闲 · 电量 91%')
    await user.type(screen.getByLabelText('改派原因'), '原机器人电量过低')
    await user.click(screen.getByRole('button', { name: '确认改派' }))

    expect(adminApi.reassignAdminTask).toHaveBeenCalledWith(32, {
      robot_id: 2,
      reason: '原机器人电量过低',
    })
  })

  it('paginates robot tasks inside the task hall workspace', async () => {
    const user = userEvent.setup()

    adminApi.getAdminTasks.mockResolvedValue(
      Array.from({ length: 21 }, (_, index) => ({
        id: index + 1,
        robot_id: (index % 3) + 1,
        delivery_order_id: 1000 + index + 1,
        status: 'assigned',
        attempt_count: 1,
        failure_reason: `reason-${String(index + 1).padStart(2, '0')}`,
        updated_at: `2026-03-22T10:${String(index).padStart(2, '0')}:00Z`,
      })),
    )

    render(
      <TestProviders>
        <MemoryRouter>
          <RobotsPage />
        </MemoryRouter>
      </TestProviders>,
    )

    expect(await screen.findByRole('heading', { name: '机器人' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '任务大厅' }))

    expect(await screen.findByRole('navigation', { name: '翻页' })).toBeInTheDocument()
    expect(
      screen.getByText((_, node) => node?.textContent?.replace(/\s+/g, '') === '第1页，共2页，合计21条'),
    ).toBeInTheDocument()
    expect(screen.getByText('reason-01')).toBeInTheDocument()
    expect(screen.getByText('reason-20')).toBeInTheDocument()
    expect(screen.queryByText('reason-21')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '下一页' }))

    await waitFor(() => {
      expect(
        screen.getByText((_, node) => node?.textContent?.replace(/\s+/g, '') === '第2页，共2页，合计21条'),
      ).toBeInTheDocument()
    })
    expect(screen.getByText('reason-21')).toBeInTheDocument()
    expect(screen.queryByText('reason-01')).not.toBeInTheDocument()
  })

  it('shows the operator fulfillment summary on the robots event feed', async () => {
    render(
      <TestProviders>
        <RobotsPage />
      </TestProviders>,
    )

    expect(await screen.findByText('机器人发出')).toBeInTheDocument()
  })
})
