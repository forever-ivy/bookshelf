import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'

import {
  filledPrimaryActionButtonClassName,
  tonalPrimaryActionButtonClassName,
} from '@/components/shared/action-button-styles'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getAdminOrder, getAdminOrders, interveneAdminOrder, prioritizeAdminOrder, retryAdminOrder } from '@/lib/api/admin'
import {
  formatInterventionStatusLabel,
  formatOrderModeLabel,
  formatPriorityLabel,
  formatStatusLabel,
} from '@/lib/display-labels'
import { getAdminPageHero } from '@/lib/page-hero'
import { patchSearchParams, readOptionalSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import type { OrderBundle } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<OrderBundle>()
const pageHero = getAdminPageHero('orders')
type ActiveQuickDialog = 'detail' | 'priority' | 'intervention' | 'retry' | null
const ORDERS_PAGE_SIZE = 20

function snapshotValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
}

export function OrdersPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const statusFilter = readOptionalSearchParam(searchParams, 'status') ?? 'all'
  const priorityFilter = readOptionalSearchParam(searchParams, 'priority') ?? 'all'
  const interventionFilter = readOptionalSearchParam(searchParams, 'intervention_status') ?? 'all'
  const [page, setPage] = useState(1)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [activeQuickDialog, setActiveQuickDialog] = useState<ActiveQuickDialog>(null)
  const [priorityDraft, setPriorityDraft] = useState('urgent')
  const [interventionDraft, setInterventionDraft] = useState('manual_review')
  const [failureReasonDraft, setFailureReasonDraft] = useState('')
  const [retryNote, setRetryNote] = useState('')
  const ordersQuery = useQuery({
    queryKey: ['admin', 'orders', statusFilter, priorityFilter, interventionFilter, page],
    queryFn: () =>
      getAdminOrders({
        page,
        pageSize: ORDERS_PAGE_SIZE,
        status: statusFilter === 'all' ? undefined : statusFilter,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        interventionStatus: interventionFilter === 'all' ? undefined : interventionFilter,
      }),
  })
  const detailQuery = useQuery({
    enabled: Number.isFinite(selectedOrderId),
    queryKey: ['admin', 'order', selectedOrderId],
    queryFn: () => getAdminOrder(selectedOrderId as number),
  })

  const orders = ordersQuery.data?.items ?? []
  const filteredTotal = ordersQuery.data?.total ?? 0
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

  function updateFilters(patch: Record<string, string | undefined>) {
    setPage(1)
    setSearchParams(
      patchSearchParams(searchParams, patch),
      { replace: true },
    )
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
      header: '取书方式',
      cell: (info) => formatOrderModeLabel(info.getValue()),
    }),
    columnHelper.accessor((row) => row.borrow_order.status, {
      id: 'status',
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.accessor((row) => row.borrow_order.priority ?? 'normal', {
      id: 'priority',
      header: '优先级',
      cell: (info) => <StatusBadge status={info.getValue()} label={formatPriorityLabel(info.getValue())} />,
    }),
    columnHelper.accessor((row) => row.borrow_order.intervention_status ?? '—', {
      id: 'intervention_status',
      header: '人工跟进',
      cell: (info) => formatInterventionStatusLabel(info.getValue()),
    }),
    columnHelper.accessor((row) => row.delivery_order?.delivery_target ?? '—', {
      id: 'target',
      header: '送书位置',
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
      eyebrow="订单"
      title="订单"
      description="查看借书订单现在处理到哪一步。"
      statusLine="订单列表"
    >
      <MetricStrip
        items={[
          { label: '订单总数', value: filteredTotal, hint: '符合当前条件的订单数量' },
          { label: '当前状态', value: filteredTotal, hint: `正在查看：${statusFilter === 'all' ? '全部' : formatStatusLabel(statusFilter)}` },
          { label: '加急订单', value: urgentCount, hint: '当前这一页里的加急单' },
          { label: '人工跟进', value: interventionCount, hint: '当前这一页里需要人工跟进的订单' },
        ]}
        className="xl:grid-cols-4"
      />
      <WorkspacePanel
        title="订单列表"
        description="把状态、优先级、人工跟进和重试次数放在一起看。"
        action={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input readOnly value={`订单总数：${filteredTotal}`} className="sm:w-56" />
            <Input readOnly value={`高优先级：${urgentCount}`} className="sm:w-40" />
            <Input readOnly value={`人工跟进：${interventionCount}`} className="sm:w-40" />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                updateFilters({
                  status: value === 'all' ? undefined : value,
                })
              }}
            >
              <SelectTrigger aria-label="订单状态筛选" className="sm:w-[10rem]">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="created">{formatStatusLabel('created')}</SelectItem>
                <SelectItem value="awaiting_pick">{formatStatusLabel('awaiting_pick')}</SelectItem>
                <SelectItem value="picked_from_cabinet">{formatStatusLabel('picked_from_cabinet')}</SelectItem>
                <SelectItem value="delivering">{formatStatusLabel('delivering')}</SelectItem>
                <SelectItem value="delivered">{formatStatusLabel('delivered')}</SelectItem>
                <SelectItem value="completed">{formatStatusLabel('completed')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-2 py-2">
              <span className="px-2 text-xs font-medium text-[var(--muted-foreground)]">优先级</span>
              <ToggleGroup
                type="single"
                value={priorityFilter}
                aria-label="优先级筛选"
                onValueChange={(value) => {
                  if (!value) {
                    return
                  }
                  updateFilters({
                    priority: value === 'all' ? undefined : value,
                  })
                }}
              >
                {[
                  ['all', '全部'],
                  ['normal', formatPriorityLabel('normal')],
                  ['high', formatPriorityLabel('high')],
                  ['urgent', formatPriorityLabel('urgent')],
                ].map(([value, label]) => (
                  <ToggleGroupItem key={value} value={value}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-2 py-2">
              <span className="px-2 text-xs font-medium text-[var(--muted-foreground)]">人工跟进</span>
              <ToggleGroup
                type="single"
                value={interventionFilter}
                aria-label="人工跟进筛选"
                onValueChange={(value) => {
                  if (!value) {
                    return
                  }
                  updateFilters({
                    intervention_status: value === 'all' ? undefined : value,
                  })
                }}
              >
                {[
                  ['all', '全部'],
                  ['manual_review', formatInterventionStatusLabel('manual_review')],
                  ['escalated', formatInterventionStatusLabel('escalated')],
                  ['resolved', formatInterventionStatusLabel('resolved')],
                ].map(([value, label]) => (
                  <ToggleGroupItem key={value} value={value}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          </div>
        }
      >
        {ordersQuery.isLoading ? (
          <LoadingState label="正在载入" />
        ) : (
          <DataTable
            columns={columns}
            data={orders}
            emptyTitle="没有找到内容"
            emptyDescription="换个条件再试试。"
            pagination={{
              page: ordersQuery.data?.page ?? page,
              pageSize: ordersQuery.data?.page_size ?? ORDERS_PAGE_SIZE,
              total: filteredTotal,
              onPageChange: setPage,
            }}
          />
        )}
      </WorkspacePanel>

      <Dialog open={activeQuickDialog === 'detail'} onOpenChange={(open) => setActiveQuickDialog(open ? 'detail' : null)}>
        <DialogContent className="w-[min(880px,calc(100vw-2rem))]">
          <DialogHeader>
            <DialogTitle>{selectedOrderId ? `订单 #${selectedOrderId}` : '订单详情'}</DialogTitle>
            <DialogDescription>先看清订单现在的情况，再决定是直接处理，还是打开完整页面。</DialogDescription>
          </DialogHeader>

          {detailQuery.isLoading ? (
            <div className="py-10">
              <LoadingState label="正在载入" />
            </div>
          ) : !detailBundle ? (
            <div className="py-10">
              <EmptyState title="没有找到内容" description="换个条件再试试。" />
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
                    模式 {formatOrderModeLabel(detailBundle.borrow_order.order_mode)} · 创建于 {formatDateTime(detailBundle.borrow_order.created_at)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">送书位置和机器人</p>
                  <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                    {detailBundle.delivery_order?.delivery_target ?? '柜前自取'}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    机器人 {detailBundle.robot_unit?.code ?? '未分配'} · 任务 #{snapshotValue(detailBundle.robot_task?.id)}
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">处理情况</p>
                  <div className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
                    <p>优先级：{formatPriorityLabel(detailBundle.borrow_order.priority ?? detailBundle.delivery_order?.priority)}</p>
                    <p>人工跟进：{formatInterventionStatusLabel(detailBundle.borrow_order.intervention_status)}</p>
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
                    <p className="text-sm text-[var(--muted-foreground)]">常用操作放在这里，更细的内容再打开完整页面。</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="outline"
                      className={tonalPrimaryActionButtonClassName}
                      onClick={() => openActionDialog('priority')}
                    >
                      调整优先级
                    </Button>
                    <Button
                      variant="outline"
                      className={tonalPrimaryActionButtonClassName}
                      onClick={() => openActionDialog('intervention')}
                    >
                      人工跟进
                    </Button>
                    <Button
                      variant="outline"
                      className={tonalPrimaryActionButtonClassName}
                      onClick={() => openActionDialog('retry')}
                    >
                      重新处理
                    </Button>
                    <Button asChild variant="ghost" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                      <Link to={`/orders/${detailBundle.borrow_order.id}`}>打开完整页面</Link>
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
            <DialogDescription>修改这个订单的处理优先级。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label id="quick-order-priority-label">优先级</Label>
            <Select
              value={priorityDraft}
              onValueChange={setPriorityDraft}
            >
              <SelectTrigger aria-labelledby="quick-order-priority-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['urgent', 'high', 'normal', 'low'].map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatPriorityLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="default" className={filledPrimaryActionButtonClassName} onClick={returnToDetailDialog}>
              返回订单信息
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
            <DialogTitle>人工跟进</DialogTitle>
            <DialogDescription>记录为什么要改成人工处理，以及现在处理到哪一步。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label id="quick-intervention-status-label">处理情况</Label>
              <Select
                value={interventionDraft}
                onValueChange={setInterventionDraft}
              >
                <SelectTrigger aria-labelledby="quick-intervention-status-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['manual_review', 'escalated', 'resolved'].map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatInterventionStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quick-failure-reason">处理说明</Label>
              <Textarea
                id="quick-failure-reason"
                value={failureReasonDraft}
                onChange={(event) => setFailureReasonDraft(event.target.value)}
                placeholder="写清楚为什么要改成人工处理"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="default" className={filledPrimaryActionButtonClassName} onClick={returnToDetailDialog}>
              返回订单信息
            </Button>
            <Button disabled={interventionMutation.isPending} onClick={() => interventionMutation.mutate()}>
              {interventionMutation.isPending ? '提交中…' : '保存处理情况'}
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
            <DialogTitle>重新处理</DialogTitle>
            <DialogDescription>填好备注后，系统会重新处理这个订单。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="quick-retry-note">重试备注</Label>
            <Textarea
              id="quick-retry-note"
              value={retryNote}
              onChange={(event) => setRetryNote(event.target.value)}
              placeholder="例如：已确认通道恢复，可以重新派单"
            />
          </div>
          <DialogFooter>
            <Button variant="default" className={filledPrimaryActionButtonClassName} onClick={returnToDetailDialog}>
              返回订单信息
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
