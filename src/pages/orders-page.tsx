import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminOrders } from '@/lib/api/admin'
import { getAdminPageHero } from '@/lib/page-hero'
import type { OrderBundle } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<OrderBundle>()
const pageHero = getAdminPageHero('orders')

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: getAdminOrders,
  })

  const orders = (ordersQuery.data ?? []).filter((item) =>
    statusFilter === 'all' ? true : item.borrow_order.status === statusFilter,
  )
  const urgentCount = orders.filter((item) => item.borrow_order.priority === 'urgent').length
  const interventionCount = orders.filter((item) => Boolean(item.borrow_order.intervention_status)).length

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Array<ColumnDef<OrderBundle, any>> = [
    columnHelper.accessor((row) => row.borrow_order.id, {
      id: 'id',
      header: '订单号',
      cell: (info) => <span className="font-semibold">#{info.getValue()}</span>,
    }),
    columnHelper.accessor((row) => row.borrow_order.order_mode, {
      id: 'mode',
      header: '模式',
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor((row) => row.borrow_order.status, {
      id: 'status',
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.borrow_order.priority ?? 'normal', {
      id: 'priority',
      header: '优先级',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.borrow_order.intervention_status ?? '—', {
      id: 'intervention_status',
      header: '人工介入',
    }),
    columnHelper.accessor((row) => row.delivery_order?.delivery_target ?? '—', {
      id: 'target',
      header: '目标位置',
    }),
    columnHelper.accessor((row) => row.borrow_order.attempt_count ?? 0, {
      id: 'attempt_count',
      header: '重试次数',
    }),
    columnHelper.accessor((row) => row.borrow_order.created_at, {
      id: 'created_at',
      header: '创建时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: '操作',
      cell: (info) => (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/orders/${info.row.original.borrow_order.id}`}>查看详情</Link>
        </Button>
      ),
    }),
  ]

  return (
    <PageShell
      {...pageHero}
      eyebrow="订单管理"
      title="订单管理"
      description="查看借阅订单和处理状态。"
      statusLine="订单列表"
    >
      <MetricStrip
        items={[
          { label: '订单总数', value: ordersQuery.data?.length ?? 0, hint: '当前拉取到的借阅订单' },
          { label: '当前筛选', value: orders.length, hint: `状态：${statusFilter}` },
          { label: '高优先级', value: urgentCount, hint: 'priority 为 urgent 的订单' },
          { label: '人工处理', value: interventionCount, hint: '有人工处理标记的订单' },
        ]}
        className="xl:grid-cols-4"
      />
      <WorkspacePanel
        title="订单列表"
        description="把订单状态、处理信息和重试情况放在一起。"
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input readOnly value={`订单总数：${ordersQuery.data?.length ?? 0}`} className="sm:w-56" />
            <Input readOnly value={`高优先级：${urgentCount}`} className="sm:w-40" />
            <Input readOnly value={`人工处理：${interventionCount}`} className="sm:w-40" />
            <select
              className="h-11 rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm text-[var(--foreground)]"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">全部</option>
              <option value="created">created</option>
              <option value="awaiting_pick">awaiting_pick</option>
              <option value="picked_from_cabinet">picked_from_cabinet</option>
              <option value="delivering">delivering</option>
              <option value="delivered">delivered</option>
              <option value="completed">completed</option>
            </select>
          </div>
        }
      >
        {ordersQuery.isLoading ? (
          <LoadingState label="加载中" />
        ) : (
          <DataTable columns={columns} data={orders} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
        )}
      </WorkspacePanel>
    </PageShell>
  )
}
