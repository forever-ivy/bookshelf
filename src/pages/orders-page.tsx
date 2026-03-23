import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAdminOrder, getAdminOrders, interveneAdminOrder, prioritizeAdminOrder, retryAdminOrder } from '@/lib/api/admin'
import { getAdminPageHero } from '@/lib/page-hero'
import type { OrderBundle } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<OrderBundle>()
const pageHero = getAdminPageHero('orders')
type ActiveQuickDialog = 'detail' | 'priority' | 'intervention' | 'retry' | null

function snapshotValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [activeQuickDialog, setActiveQuickDialog] = useState<ActiveQuickDialog>(null)
  const [priorityDraft, setPriorityDraft] = useState('urgent')
  const [interventionDraft, setInterventionDraft] = useState('manual_review')
  const [failureReasonDraft, setFailureReasonDraft] = useState('')
  const [retryNote, setRetryNote] = useState('')
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: getAdminOrders,
  })
  const detailQuery = useQuery({
    enabled: Number.isFinite(selectedOrderId),
    queryKey: ['admin', 'order', selectedOrderId],
    queryFn: () => getAdminOrder(selectedOrderId as number),
  })

  const orders = (ordersQuery.data ?? []).filter((item) =>
    statusFilter === 'all' ? true : item.borrow_order.status === statusFilter,
  )
  const urgentCount = orders.filter((item) => item.borrow_order.priority === 'urgent').length
  const interventionCount = orders.filter((item) => Boolean(item.borrow_order.intervention_status)).length
  const detailBundle = detailQuery.data

  useEffect(() => {
    if (!detailBundle) {
      return
    }
    setPriorityDraft(detailBundle.borrow_order.priority ?? detailBundle.delivery_order?.priority ?? 'urgent')
    setInterventionDraft(detailBundle.borrow_order.intervention_status ?? 'manual_review')
    setFailureReasonDraft(detailBundle.borrow_order.failure_reason ?? detailBundle.delivery_order?.failure_reason ?? '')
    setRetryNote('')
  }, [detailBundle])

  function syncBundle(bundle: OrderBundle) {
    queryClient.setQueryData(['admin', 'order', bundle.borrow_order.id], bundle)
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'order', bundle.borrow_order.id] })
  }

  const priorityMutation = useMutation({
    mutationFn: () => prioritizeAdminOrder(selectedOrderId as number, priorityDraft),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setActiveQuickDialog('detail')
    },
  })

  const interventionMutation = useMutation({
    mutationFn: () =>
      interveneAdminOrder(selectedOrderId as number, {
        intervention_status: interventionDraft,
        failure_reason: failureReasonDraft.trim() || undefined,
      }),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setActiveQuickDialog('detail')
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => retryAdminOrder(selectedOrderId as number, retryNote.trim() || undefined),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setRetryNote('')
      setActiveQuickDialog('detail')
    },
  })

  function openDetailDialog(orderId: number) {
    setSelectedOrderId(orderId)
    setActiveQuickDialog('detail')
  }

  function openActionDialog(nextDialog: Exclude<ActiveQuickDialog, 'detail' | null>) {
    setActiveQuickDialog(nextDialog)
  }

  function returnToDetailDialog() {
    setActiveQuickDialog(selectedOrderId ? 'detail' : null)
  }

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
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            openDetailDialog(info.row.original.borrow_order.id)
          }}
        >
          查看详情
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

      <Dialog open={activeQuickDialog === 'detail'} onOpenChange={(open) => setActiveQuickDialog(open ? 'detail' : null)}>
        <DialogContent className="w-[min(880px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{selectedOrderId ? `订单 #${selectedOrderId}` : '订单详情'}</DialogTitle>
            <DialogDescription>先快速看清当前状态，再决定是直接处理，还是进入完整详情页。</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="py-10">
              <LoadingState label="加载中" />
            </div>
          ) : !detailBundle ? (
            <div className="py-10">
              <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">当前状态</p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] pb-3">
                      <span className="text-sm text-[var(--muted-foreground)]">借阅</span>
                      <StatusBadge status={detailBundle.borrow_order.status} />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] pb-3">
                      <span className="text-sm text-[var(--muted-foreground)]">配送</span>
                      <StatusBadge status={detailBundle.delivery_order?.status ?? 'none'} />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-[var(--muted-foreground)]">任务</span>
                      <StatusBadge status={detailBundle.robot_task?.status ?? 'none'} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    模式 {detailBundle.borrow_order.order_mode} · 创建于 {formatDateTime(detailBundle.borrow_order.created_at)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">目标与运力</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                    {detailBundle.delivery_order?.delivery_target ?? '柜前自取'}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    机器人 {detailBundle.robot_unit?.code ?? '未分配'} · 任务 #{snapshotValue(detailBundle.robot_task?.id)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">处理摘要</p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                    <p>优先级：{snapshotValue(detailBundle.borrow_order.priority ?? detailBundle.delivery_order?.priority)}</p>
                    <p>人工处理：{snapshotValue(detailBundle.borrow_order.intervention_status)}</p>
                    <p>重试次数：{snapshotValue(detailBundle.borrow_order.attempt_count ?? 0)}</p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">异常原因</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted-foreground)]">
                    {snapshotValue(detailBundle.borrow_order.failure_reason ?? detailBundle.delivery_order?.failure_reason)}
                  </p>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-container-low)] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">快速操作</p>
                    <p className="text-sm text-[var(--muted-foreground)]">常用处理放在这里，深处理再进入完整详情。</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="secondary"
                      className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
                      onClick={() => openActionDialog('priority')}
                    >
                      调整优先级
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
                      onClick={() => openActionDialog('intervention')}
                    >
                      人工处理
                    </Button>
                    <Button
                      variant="secondary"
                      className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
                      onClick={() => openActionDialog('retry')}
                    >
                      重试订单
                    </Button>
                    <Button asChild variant="ghost" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <Link to={`/orders/${detailBundle.borrow_order.id}`}>进入完整详情</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeQuickDialog === 'priority'}
        onOpenChange={(open) => setActiveQuickDialog(open ? 'priority' : selectedOrderId ? 'detail' : null)}
      >
        <DialogContent className="w-[min(560px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>调整优先级</DialogTitle>
            <DialogDescription>快速修改当前订单的优先级。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quick-order-priority">优先级</Label>
            <select
              id="quick-order-priority"
              className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base sm:text-sm"
              value={priorityDraft}
              onChange={(event) => setPriorityDraft(event.target.value)}
            >
              {['urgent', 'high', 'normal', 'low'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={returnToDetailDialog}>
              返回摘要
            </Button>
            <Button disabled={priorityMutation.isPending} onClick={() => priorityMutation.mutate()}>
              {priorityMutation.isPending ? '更新中…' : '更新优先级'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeQuickDialog === 'intervention'}
        onOpenChange={(open) => setActiveQuickDialog(open ? 'intervention' : selectedOrderId ? 'detail' : null)}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>人工处理</DialogTitle>
            <DialogDescription>记录人工接管状态和异常说明。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-intervention-status">人工处理状态</Label>
              <Input
                id="quick-intervention-status"
                value={interventionDraft}
                onChange={(event) => setInterventionDraft(event.target.value)}
                placeholder="manual_review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-failure-reason">异常说明</Label>
              <Textarea
                id="quick-failure-reason"
                value={failureReasonDraft}
                onChange={(event) => setFailureReasonDraft(event.target.value)}
                placeholder="描述当前为什么需要人工介入"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={returnToDetailDialog}>
              返回摘要
            </Button>
            <Button disabled={interventionMutation.isPending} onClick={() => interventionMutation.mutate()}>
              {interventionMutation.isPending ? '提交中…' : '提交人工处理'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={activeQuickDialog === 'retry'}
        onOpenChange={(open) => setActiveQuickDialog(open ? 'retry' : selectedOrderId ? 'detail' : null)}
      >
        <DialogContent className="w-[min(640px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>重试订单</DialogTitle>
            <DialogDescription>填写备注后重新发起当前订单的处理流程。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quick-retry-note">重试备注</Label>
            <Textarea
              id="quick-retry-note"
              value={retryNote}
              onChange={(event) => setRetryNote(event.target.value)}
              placeholder="例如：人工确认通道恢复后重新派单"
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={returnToDetailDialog}>
              返回摘要
            </Button>
            <Button disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
              {retryMutation.isPending ? '处理中…' : '重试订单'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
