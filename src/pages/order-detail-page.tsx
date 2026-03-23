import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  completeAdminReturnRequest,
  getAdminOrder,
  getAdminReturnRequests,
  interveneAdminOrder,
  patchAdminOrderState,
  prioritizeAdminOrder,
  receiveAdminReturnRequest,
  retryAdminOrder,
} from '@/lib/api/admin'
import { getAdminPageHero } from '@/lib/page-hero'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('order-detail')

const borrowStatusOptions = ['created', 'awaiting_pick', 'picked_from_cabinet', 'delivering', 'delivered', 'completed']
const deliveryStatusOptions = ['awaiting_pick', 'picked_from_cabinet', 'delivering', 'delivered', 'completed']
const taskStatusOptions = ['assigned', 'carrying', 'arriving', 'returning', 'completed']
const robotStatusOptions = ['idle', 'assigned', 'carrying', 'arriving', 'returning', 'offline']
const priorityOptions = ['urgent', 'high', 'normal', 'low']

type ActiveDialog = 'status' | 'priority' | 'intervention' | 'retry' | 'return' | null

function snapshotValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
}

function SummaryBlock({
  label,
  value,
  meta,
}: {
  label: string
  value: React.ReactNode
  meta?: string
}) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <div className="mt-3">{value}</div>
      {meta ? <p className="mt-3 text-sm text-[var(--muted-foreground)]">{meta}</p> : null}
    </div>
  )
}

function DataBlock({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-2 rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <div className="text-base font-medium text-[var(--foreground)]">{value}</div>
    </div>
  )
}

export function OrderDetailPage() {
  const params = useParams()
  const orderId = Number(params.orderId)
  const queryClient = useQueryClient()

  const orderQuery = useQuery({
    enabled: Number.isFinite(orderId),
    queryKey: ['admin', 'order', orderId],
    queryFn: () => getAdminOrder(orderId),
  })
  const returnRequestsQuery = useQuery({
    enabled: Number.isFinite(orderId),
    queryKey: ['admin', 'return-requests', orderId],
    queryFn: () => getAdminReturnRequests({ borrow_order_id: orderId }),
  })

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const [selectedReturnRequestId, setSelectedReturnRequestId] = useState<number | null>(null)
  const [draftStatuses, setDraftStatuses] = useState<{
    borrowStatus?: string
    deliveryStatus?: string
    taskStatus?: string
    robotStatus?: string
  }>({})
  const [priorityDraft, setPriorityDraft] = useState('urgent')
  const [interventionDraft, setInterventionDraft] = useState('manual_review')
  const [failureReasonDraft, setFailureReasonDraft] = useState('')
  const [retryNote, setRetryNote] = useState('')
  const [returnCabinetId, setReturnCabinetId] = useState('cabinet-001')
  const [returnSlotCode, setReturnSlotCode] = useState('A01')
  const [returnNote, setReturnNote] = useState('')

  function closeDialog() {
    setActiveDialog(null)
  }

  function syncBundle(bundle: Awaited<ReturnType<typeof getAdminOrder>>) {
    setDraftStatuses({})
    queryClient.setQueryData(['admin', 'order', orderId], bundle)
    void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'robots'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
    void queryClient.invalidateQueries({ queryKey: ['admin', 'return-requests', orderId] })
  }

  const patchMutation = useMutation({
    mutationFn: () =>
      patchAdminOrderState(orderId, {
        borrow_status: draftStatuses.borrowStatus ?? orderQuery.data?.borrow_order.status,
        delivery_status: draftStatuses.deliveryStatus ?? orderQuery.data?.delivery_order?.status,
        task_status: draftStatuses.taskStatus ?? orderQuery.data?.robot_task?.status,
        robot_status: draftStatuses.robotStatus ?? orderQuery.data?.robot_unit?.status,
      }),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      closeDialog()
    },
  })

  const priorityMutation = useMutation({
    mutationFn: () => prioritizeAdminOrder(orderId, priorityDraft),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      closeDialog()
    },
  })

  const interventionMutation = useMutation({
    mutationFn: () =>
      interveneAdminOrder(orderId, {
        intervention_status: interventionDraft,
        failure_reason: failureReasonDraft || undefined,
      }),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setFailureReasonDraft('')
      closeDialog()
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => retryAdminOrder(orderId, retryNote || undefined),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setRetryNote('')
      closeDialog()
    },
  })

  const receiveReturnMutation = useMutation({
    mutationFn: (returnRequestId: number) => receiveAdminReturnRequest(returnRequestId, returnNote || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'return-requests', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
      setReturnNote('')
      closeDialog()
    },
  })

  const completeReturnMutation = useMutation({
    mutationFn: (returnRequestId: number) =>
      completeAdminReturnRequest(returnRequestId, {
        cabinet_id: returnCabinetId,
        slot_code: returnSlotCode || undefined,
        note: returnNote || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'return-requests', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'order', orderId] })
      setReturnNote('')
      closeDialog()
    },
  })

  if (orderQuery.isLoading) {
    return <LoadingState label="加载中" />
  }

  if (!orderQuery.data) {
    return <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
  }

  const bundle = orderQuery.data
  const returnRequests = returnRequestsQuery.data?.items ?? []
  const activeReturnRequest =
    returnRequests.find((returnRequest) => returnRequest.id === selectedReturnRequestId) ?? returnRequests[0] ?? null

  function openReturnDialog(returnRequestId?: number) {
    if (returnRequestId) {
      setSelectedReturnRequestId(returnRequestId)
    } else if (returnRequests[0]) {
      setSelectedReturnRequestId(returnRequests[0].id)
    }
    setActiveDialog('return')
  }

  return (
    <PageShell
      {...pageHero}
      eyebrow="订单"
      title={`订单 #${bundle.borrow_order.id}`}
      description="查看订单状态、配送信息和处理记录。"
      statusLine="订单详情"
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="secondary">
          <Link to="/orders">返回订单列表</Link>
        </Button>
        <Button
          variant="secondary"
          className="bg-[var(--primary)] text-white shadow-none hover:bg-[var(--primary-container)]"
          onClick={() => setActiveDialog('status')}
        >
          修改状态
        </Button>
        <Button
          variant="secondary"
          className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
          onClick={() => setActiveDialog('priority')}
        >
          调整优先级
        </Button>
        <Button
          variant="secondary"
          className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
          onClick={() => setActiveDialog('intervention')}
        >
          人工处理
        </Button>
        <Button
          variant="secondary"
          className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
          onClick={() => setActiveDialog('retry')}
        >
          重试订单
        </Button>
        {returnRequests.length > 0 ? (
          <Button
            variant="secondary"
            className="bg-[rgba(33,73,140,0.08)] text-[var(--primary)] shadow-none hover:bg-[rgba(33,73,140,0.14)]"
            onClick={() => openReturnDialog()}
          >
            处理归还
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>当前状态</CardTitle>
            <CardDescription>把订单、配送、任务和机器人状态收在同一块，先看清当前阶段，再决定是否处理。</CardDescription>
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            创建时间：{formatDateTime(bundle.borrow_order.created_at)}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryBlock label="借阅状态" value={<StatusBadge status={bundle.borrow_order.status} />} />
          <SummaryBlock
            label="配送状态"
            value={<StatusBadge status={bundle.delivery_order?.status ?? 'none'} />}
            meta={`目标：${bundle.delivery_order?.delivery_target ?? '柜前自取'}`}
          />
          <SummaryBlock
            label="任务状态"
            value={<StatusBadge status={bundle.robot_task?.status ?? 'none'} />}
            meta={`任务号：${bundle.robot_task?.id ?? '—'}`}
          />
          <SummaryBlock
            label="机器人状态"
            value={<StatusBadge status={bundle.robot_unit?.status ?? 'none'} />}
            meta={`机器人：${bundle.robot_unit?.code ?? '—'}`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>订单信息</CardTitle>
            <CardDescription>查看当前订单的基础信息和履约目标。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DataBlock label="订单模式" value={snapshotValue(bundle.borrow_order.order_mode)} />
            <DataBlock label="目标位置" value={snapshotValue(bundle.delivery_order?.delivery_target ?? '柜前自取')} />
            <DataBlock label="读者 ID" value={snapshotValue(bundle.borrow_order.reader_id)} />
            <DataBlock label="图书 ID" value={snapshotValue(bundle.borrow_order.book_id)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>处理摘要</CardTitle>
            <CardDescription>这里展示处理优先级、人工处理状态和最近的异常信息。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DataBlock label="优先级" value={snapshotValue(bundle.borrow_order.priority ?? bundle.delivery_order?.priority)} />
            <DataBlock label="重试次数" value={snapshotValue(bundle.borrow_order.attempt_count ?? 0)} />
            <DataBlock label="人工处理状态" value={snapshotValue(bundle.borrow_order.intervention_status)} />
            <DataBlock
              label="异常原因"
              value={
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  {snapshotValue(bundle.borrow_order.failure_reason ?? bundle.delivery_order?.failure_reason)}
                </p>
              }
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>归还信息</CardTitle>
            <CardDescription>集中查看归还申请状态，需要处理时再进入单独的归还 modal。</CardDescription>
          </div>
          {returnRequests.length > 0 ? (
            <Button variant="secondary" onClick={() => openReturnDialog()}>
              处理归还
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {returnRequests.length === 0 ? (
            <EmptyState title="暂无记录" description="当前检视条件下无可用数据。" />
          ) : (
            <div className="space-y-4">
              {returnRequests.map((returnRequest) => (
                <div
                  key={returnRequest.id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-[var(--foreground)]">归还申请 #{returnRequest.id}</p>
                      <StatusBadge status={returnRequest.status} />
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      提交时间：{formatDateTime(returnRequest.created_at)}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">备注：{snapshotValue(returnRequest.note)}</p>
                  </div>
                  <Button variant="outline" onClick={() => openReturnDialog(returnRequest.id)}>
                    处理归还
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={activeDialog === 'status'} onOpenChange={(open) => setActiveDialog(open ? 'status' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改状态</DialogTitle>
            <DialogDescription>只在需要人工纠正时修改状态，保存后会同步刷新订单、任务和机器人信息。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="borrow-status">借阅状态</Label>
              <select
                id="borrow-status"
                className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
                value={draftStatuses.borrowStatus ?? bundle.borrow_order.status}
                onChange={(event) => setDraftStatuses((current) => ({ ...current, borrowStatus: event.target.value }))}
              >
                {borrowStatusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery-status">配送状态</Label>
              <select
                id="delivery-status"
                className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
                value={draftStatuses.deliveryStatus ?? bundle.delivery_order?.status ?? ''}
                onChange={(event) => setDraftStatuses((current) => ({ ...current, deliveryStatus: event.target.value }))}
              >
                <option value="">不修改</option>
                {deliveryStatusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-status">任务状态</Label>
              <select
                id="task-status"
                className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
                value={draftStatuses.taskStatus ?? bundle.robot_task?.status ?? ''}
                onChange={(event) => setDraftStatuses((current) => ({ ...current, taskStatus: event.target.value }))}
              >
                <option value="">不修改</option>
                {taskStatusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="robot-status">机器人状态</Label>
              <select
                id="robot-status"
                className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
                value={draftStatuses.robotStatus ?? bundle.robot_unit?.status ?? ''}
                onChange={(event) => setDraftStatuses((current) => ({ ...current, robotStatus: event.target.value }))}
              >
                <option value="">不修改</option>
                {robotStatusOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={patchMutation.isPending} onClick={() => patchMutation.mutate()}>
              {patchMutation.isPending ? '提交中…' : '保存状态'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'priority'} onOpenChange={(open) => setActiveDialog(open ? 'priority' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>调整优先级</DialogTitle>
            <DialogDescription>修改当前订单的处理优先级，适合处理加急或需要降级的单据。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="order-priority">优先级</Label>
            <select
              id="order-priority"
              className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
              value={priorityDraft}
              onChange={(event) => setPriorityDraft(event.target.value)}
            >
              {priorityOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={priorityMutation.isPending} onClick={() => priorityMutation.mutate()}>
              {priorityMutation.isPending ? '更新中…' : '保存优先级'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'intervention'} onOpenChange={(open) => setActiveDialog(open ? 'intervention' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>人工处理</DialogTitle>
            <DialogDescription>记录人工接管状态和原因，便于后续排查和回看。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="intervention-status">人工处理状态</Label>
              <Input
                id="intervention-status"
                value={interventionDraft}
                onChange={(event) => setInterventionDraft(event.target.value)}
                placeholder="manual_review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="failure-reason">原因说明</Label>
              <Textarea
                id="failure-reason"
                value={failureReasonDraft}
                onChange={(event) => setFailureReasonDraft(event.target.value)}
                placeholder="描述卡顿、阻塞或识别失败的原因"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={interventionMutation.isPending} onClick={() => interventionMutation.mutate()}>
              {interventionMutation.isPending ? '提交中…' : '提交处理'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'retry'} onOpenChange={(open) => setActiveDialog(open ? 'retry' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重试订单</DialogTitle>
            <DialogDescription>记录本次重试的备注，保存后会重新发起该订单的处理链路。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="retry-note">重试备注</Label>
            <Textarea
              id="retry-note"
              value={retryNote}
              onChange={(event) => setRetryNote(event.target.value)}
              placeholder="例如：恢复后重新派单"
            />
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
              {retryMutation.isPending ? '重试中…' : '确认重试'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'return'} onOpenChange={(open) => setActiveDialog(open ? 'return' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>处理归还</DialogTitle>
            <DialogDescription>归还流程单独处理，避免把入库字段常驻在详情页里。</DialogDescription>
          </DialogHeader>
          {!activeReturnRequest ? (
            <EmptyState title="暂无记录" description="当前检视条件下无可用数据。" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="return-request">归还申请</Label>
                  <select
                    id="return-request"
                    className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white px-4 text-base md:text-sm"
                    value={String(activeReturnRequest.id)}
                    onChange={(event) => setSelectedReturnRequestId(Number(event.target.value))}
                  >
                    {returnRequests.map((returnRequest) => (
                      <option key={returnRequest.id} value={returnRequest.id}>
                        #{returnRequest.id} · {returnRequest.status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>当前状态</Label>
                  <div className="flex h-11 items-center rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-bright)] px-4">
                    <StatusBadge status={activeReturnRequest.status} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-cabinet">入库书柜</Label>
                  <Input
                    id="return-cabinet"
                    value={returnCabinetId}
                    onChange={(event) => setReturnCabinetId(event.target.value)}
                    placeholder="cabinet-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-slot">入库仓位</Label>
                  <Input
                    id="return-slot"
                    value={returnSlotCode}
                    onChange={(event) => setReturnSlotCode(event.target.value)}
                    placeholder="A01"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="return-note">处理备注</Label>
                <Textarea
                  id="return-note"
                  value={returnNote}
                  onChange={(event) => setReturnNote(event.target.value)}
                  placeholder="例如：已回收并完成入库"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={receiveReturnMutation.isPending || activeReturnRequest.status !== 'created'}
                  onClick={() => receiveReturnMutation.mutate(activeReturnRequest.id)}
                >
                  {receiveReturnMutation.isPending ? '处理中…' : '接收归还'}
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  disabled={completeReturnMutation.isPending || !['created', 'received'].includes(activeReturnRequest.status)}
                  onClick={() => completeReturnMutation.mutate(activeReturnRequest.id)}
                >
                  {completeReturnMutation.isPending ? '处理中…' : '完成入库'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
