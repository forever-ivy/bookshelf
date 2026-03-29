import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  filledPrimaryActionButtonClassName,
  tonalPrimaryActionButtonClassName,
} from '@/components/shared/action-button-styles'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
import {
  formatInterventionStatusLabel,
  formatOrderModeLabel,
  formatPriorityLabel,
  formatStatusLabel,
} from '@/lib/display-labels'
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
    return <LoadingState label="正在载入" />
  }

  if (!orderQuery.data) {
    return <EmptyState title="没有找到内容" description="换个条件再试试。" />
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
      description="查看这个订单现在到哪一步了。"
      statusLine="订单详情"
    >
      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          variant="default"
          className={filledPrimaryActionButtonClassName}
        >
          <Link to="/orders">返回订单列表</Link>
        </Button>
        <Button
          variant="outline"
          className={tonalPrimaryActionButtonClassName}
          onClick={() => setActiveDialog('status')}
        >
          改状态
        </Button>
        <Button
          variant="outline"
          className={tonalPrimaryActionButtonClassName}
          onClick={() => setActiveDialog('priority')}
        >
          调整优先级
        </Button>
        <Button
          variant="outline"
          className={tonalPrimaryActionButtonClassName}
          onClick={() => setActiveDialog('intervention')}
        >
          人工跟进
        </Button>
        <Button
          variant="outline"
          className={tonalPrimaryActionButtonClassName}
          onClick={() => setActiveDialog('retry')}
        >
          重新处理
        </Button>
        {returnRequests.length > 0 ? (
          <Button
            variant="outline"
            className={tonalPrimaryActionButtonClassName}
            onClick={() => openReturnDialog()}
          >
            处理还书
          </Button>
        ) : null}
      </div>

      <Card>
        <CardHeader className="gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <CardTitle>当前状态</CardTitle>
            <CardDescription>把订单、送书、任务和机器人状态放在一起，方便先看清情况。</CardDescription>
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
            <CardDescription>查看这笔订单的基本信息和送书位置。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DataBlock label="取书方式" value={formatOrderModeLabel(bundle.borrow_order.order_mode)} />
            <DataBlock label="送书位置" value={snapshotValue(bundle.delivery_order?.delivery_target ?? '柜前自取')} />
            <DataBlock label="读者编号" value={snapshotValue(bundle.borrow_order.reader_id)} />
            <DataBlock label="图书编号" value={snapshotValue(bundle.borrow_order.book_id)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>处理情况</CardTitle>
            <CardDescription>这里会显示优先级、人工跟进情况和最近的异常说明。</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <DataBlock label="优先级" value={formatPriorityLabel(bundle.borrow_order.priority ?? bundle.delivery_order?.priority)} />
            <DataBlock label="重试次数" value={snapshotValue(bundle.borrow_order.attempt_count ?? 0)} />
            <DataBlock label="人工跟进情况" value={formatInterventionStatusLabel(bundle.borrow_order.intervention_status)} />
            <DataBlock
              label="异常说明"
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
            <CardTitle>还书申请</CardTitle>
            <CardDescription>这里集中显示还书申请，需要处理时再打开单独窗口。</CardDescription>
          </div>
          {returnRequests.length > 0 ? (
            <Button variant="secondary" onClick={() => openReturnDialog()}>
              处理还书
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {returnRequests.length === 0 ? (
            <EmptyState title="没有找到记录" description="换个条件再试试。" />
          ) : (
            <div className="space-y-4">
              {returnRequests.map((returnRequest) => (
                <div
                  key={returnRequest.id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-base font-semibold text-[var(--foreground)]">还书申请 #{returnRequest.id}</p>
                      <StatusBadge status={returnRequest.status} />
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      提交时间：{formatDateTime(returnRequest.created_at)}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">备注：{snapshotValue(returnRequest.note)}</p>
                  </div>
                  <Button variant="outline" onClick={() => openReturnDialog(returnRequest.id)}>
                    处理还书
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
            <DialogTitle>改状态</DialogTitle>
            <DialogDescription>只在需要人工纠正时再改，保存后会同步更新订单、任务和机器人状态。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label id="borrow-status-label">借阅状态</Label>
              <Select
                value={draftStatuses.borrowStatus ?? bundle.borrow_order.status}
                onValueChange={(value) => setDraftStatuses((current) => ({ ...current, borrowStatus: value }))}
              >
                <SelectTrigger aria-labelledby="borrow-status-label">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {borrowStatusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label id="delivery-status-label">配送状态</Label>
              <Select
                value={draftStatuses.deliveryStatus ?? bundle.delivery_order?.status ?? 'unchanged'}
                onValueChange={(value) =>
                  setDraftStatuses((current) => ({
                    ...current,
                    deliveryStatus: value === 'unchanged' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger aria-labelledby="delivery-status-label">
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">保持不变</SelectItem>
                  {deliveryStatusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label id="task-status-label">任务状态</Label>
              <Select
                value={draftStatuses.taskStatus ?? bundle.robot_task?.status ?? 'unchanged'}
                onValueChange={(value) =>
                  setDraftStatuses((current) => ({
                    ...current,
                    taskStatus: value === 'unchanged' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger aria-labelledby="task-status-label">
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">保持不变</SelectItem>
                  {taskStatusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label id="robot-status-label">机器人状态</Label>
              <Select
                value={draftStatuses.robotStatus ?? bundle.robot_unit?.status ?? 'unchanged'}
                onValueChange={(value) =>
                  setDraftStatuses((current) => ({
                    ...current,
                    robotStatus: value === 'unchanged' ? undefined : value,
                  }))
                }
              >
                <SelectTrigger aria-labelledby="robot-status-label">
                  <SelectValue placeholder="保持不变" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">保持不变</SelectItem>
                  {robotStatusOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {formatStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogDescription>修改这个订单的处理优先级。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label id="order-priority-label">优先级</Label>
            <Select
              value={priorityDraft}
              onValueChange={setPriorityDraft}
            >
              <SelectTrigger aria-labelledby="order-priority-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {formatPriorityLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <DialogTitle>人工跟进</DialogTitle>
            <DialogDescription>记录为什么要改成人工处理，以及现在处理到哪一步。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label id="intervention-status-label">处理情况</Label>
              <Select
                value={interventionDraft}
                onValueChange={setInterventionDraft}
              >
                <SelectTrigger aria-labelledby="intervention-status-label">
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
              <Label htmlFor="failure-reason">处理说明</Label>
              <Textarea
                id="failure-reason"
                value={failureReasonDraft}
                onChange={(event) => setFailureReasonDraft(event.target.value)}
                placeholder="写清楚为什么要改成人工处理"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full sm:w-auto" disabled={interventionMutation.isPending} onClick={() => interventionMutation.mutate()}>
              {interventionMutation.isPending ? '提交中…' : '保存处理情况'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'retry'} onOpenChange={(open) => setActiveDialog(open ? 'retry' : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重新处理</DialogTitle>
            <DialogDescription>写好备注后，系统会重新处理这个订单。</DialogDescription>
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
            <DialogTitle>处理还书</DialogTitle>
            <DialogDescription>在这里确认收到图书，并填写放回位置。</DialogDescription>
          </DialogHeader>
          {!activeReturnRequest ? (
            <EmptyState title="没有找到记录" description="换个条件再试试。" />
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label id="return-request-label">还书申请</Label>
                  <Select
                    value={String(activeReturnRequest.id)}
                    onValueChange={(value) => setSelectedReturnRequestId(Number(value))}
                  >
                    <SelectTrigger aria-labelledby="return-request-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {returnRequests.map((returnRequest) => (
                        <SelectItem key={returnRequest.id} value={String(returnRequest.id)}>
                          #{returnRequest.id} · {formatStatusLabel(returnRequest.status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>当前状态</Label>
                  <div className="flex h-11 items-center rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-bright)] px-4">
                    <StatusBadge status={activeReturnRequest.status} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-cabinet">放回书柜</Label>
                  <Input
                    id="return-cabinet"
                    value={returnCabinetId}
                    onChange={(event) => setReturnCabinetId(event.target.value)}
                    placeholder="cabinet-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="return-slot">放回格口</Label>
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
                  placeholder="例如：已收到图书，已经放回书柜"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={receiveReturnMutation.isPending || activeReturnRequest.status !== 'created'}
                  onClick={() => receiveReturnMutation.mutate(activeReturnRequest.id)}
                >
                  {receiveReturnMutation.isPending ? '处理中…' : '确认收到'}
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
