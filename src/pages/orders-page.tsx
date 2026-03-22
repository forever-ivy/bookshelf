import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getAdminOrders } from '@/lib/api/admin'
import type { OrderBundle } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<OrderBundle>()

export function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all')
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: getAdminOrders,
  })

  const orders = (ordersQuery.data ?? []).filter((item) =>
    statusFilter === 'all' ? true : item.borrow_order.status === statusFilter,
  )

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
    columnHelper.accessor((row) => row.delivery_order?.delivery_target ?? '—', {
      id: 'target',
      header: '目标位置',
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
      title="借阅订单页"
      description="按履约状态筛选所有借阅单，并进入详情页做人工纠正。"
      actions={
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input readOnly value={`当前订单总数：${ordersQuery.data?.length ?? 0}`} className="sm:w-56" />
          <select
            className="h-11 rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm text-[var(--foreground)]"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">全部状态</option>
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
        <LoadingState label="正在加载借阅订单…" />
      ) : (
        <DataTable columns={columns} data={orders} emptyTitle="没有匹配的订单" emptyDescription="调整状态筛选后再试一次。" />
      )}
    </PageShell>
  )
}
