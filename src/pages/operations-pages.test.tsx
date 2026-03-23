import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OrderDetailPage } from '@/pages/order-detail-page'
import { RobotsPage } from '@/pages/robots-page'

const adminApi = vi.hoisted(() => ({
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

describe('operations pages', () => {
  beforeEach(() => {
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
        metadata: { delivery_target: '东区自习室 A7' },
        created_at: '2026-03-22T10:00:00Z',
      },
    ])
    adminApi.reassignAdminTask.mockResolvedValue({
      task: { id: 32, robot_id: 2, delivery_order_id: 22, status: 'assigned' },
      robot: { id: 2, code: 'robot-2', status: 'assigned', battery_level: 91 },
    })
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

    await user.click(screen.getByRole('button', { name: '更新优先级' }))
    expect(adminApi.prioritizeAdminOrder).toHaveBeenCalledWith(12, 'urgent')

    await user.type(screen.getByLabelText('异常说明'), '通道拥堵')
    await user.click(screen.getByRole('button', { name: '提交人工介入' }))
    expect(adminApi.interveneAdminOrder).toHaveBeenCalledWith(12, {
      intervention_status: 'manual_review',
      failure_reason: '通道拥堵',
    })

    await user.type(screen.getByLabelText('重试备注'), '人工确认后重新派单')
    await user.click(screen.getByRole('button', { name: '失败订单重试' }))
    expect(adminApi.retryAdminOrder).toHaveBeenCalledWith(12, '人工确认后重新派单')

    await user.type(screen.getByLabelText('归还处理备注'), '机器人已完成回收')
    await user.click(screen.getByRole('button', { name: '接收归还' }))
    expect(adminApi.receiveAdminReturnRequest).toHaveBeenCalledWith(99, '机器人已完成回收')

    await user.clear(screen.getByLabelText('归还处理备注'))
    await user.type(screen.getByLabelText('归还处理备注'), '书柜识别成功并完成上架')
    await user.click(screen.getByRole('button', { name: '完成入库' }))
    expect(adminApi.completeAdminReturnRequest).toHaveBeenCalledWith(99, {
      cabinet_id: 'cabinet-001',
      slot_code: 'A01',
      note: '书柜识别成功并完成上架',
    })
  })

  it('renders robots workspace and supports task reassignment', async () => {
    const user = userEvent.setup()

    render(
      <TestProviders>
        <RobotsPage />
      </TestProviders>,
    )

    expect(await screen.findByText('机器人调度管理')).toBeInTheDocument()
    expect(await screen.findByText('robot-1')).toBeInTheDocument()
    expect(screen.getByText('91%')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('任务'), '32')
    await user.selectOptions(screen.getByLabelText('目标机器人'), '2')
    await user.type(screen.getByLabelText('重分配原因'), '原机器人电量过低')
    await user.click(screen.getByRole('button', { name: '执行任务重分配' }))

    expect(adminApi.reassignAdminTask).toHaveBeenCalledWith(32, {
      robot_id: 2,
      reason: '原机器人电量过低',
    })
  })
})
