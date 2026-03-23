import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

function snapshotValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }
  return String(value)
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
    onSuccess: syncBundle,
  })

  const priorityMutation = useMutation({
    mutationFn: () => prioritizeAdminOrder(orderId, priorityDraft),
    onSuccess: syncBundle,
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
    },
  })

  const retryMutation = useMutation({
    mutationFn: () => retryAdminOrder(orderId, retryNote || undefined),
    onSuccess: (bundle) => {
      syncBundle(bundle)
      setRetryNote('')
    },
  })

  const receiveReturnMutation = useMutation({
    mutationFn: (returnRequestId: number) => receiveAdminReturnRequest(returnRequestId, returnNote || undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'return-requests', orderId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'audit-logs'] })
      setReturnNote('')
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

  return (
    <PageShell
      {...pageHero}
      eyebrow="订单"
      title={`订单 #${bundle.borrow_order.id}`}
      description="查看订单状态、配送信息和处理记录。"
      statusLine="订单详情"
    >
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>订单快照</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">借阅状态</p>
                <div className="mt-3">
                  <StatusBadge status={bundle.borrow_order.status} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">创建：{formatDateTime(bundle.borrow_order.created_at)}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">配送状态</p>
                <div className="mt-3">
                  <StatusBadge status={bundle.delivery_order?.status ?? 'none'} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  目标：{bundle.delivery_order?.delivery_target ?? '柜前自取'}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">轨迹节点</p>
                <div className="mt-3">
                  <StatusBadge status={bundle.robot_task?.status ?? 'none'} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">任务号：{bundle.robot_task?.id ?? '—'}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">机器人</p>
                <div className="mt-3">
                  <StatusBadge status={bundle.robot_unit?.status ?? 'none'} />
                </div>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">编号：{bundle.robot_unit?.code ?? '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>处理信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/60 bg-white/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">优先级</p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                  {snapshotValue(bundle.borrow_order.priority ?? bundle.delivery_order?.priority)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">重试次数</p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                  {snapshotValue(bundle.borrow_order.attempt_count ?? 0)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">人工处理状态</p>
                <p className="mt-3 text-lg font-semibold text-[var(--foreground)]">
                  {snapshotValue(bundle.borrow_order.intervention_status)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/60 bg-white/40 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">异常原因</p>
                <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                  {snapshotValue(bundle.borrow_order.failure_reason ?? bundle.delivery_order?.failure_reason)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>归还处理</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {returnRequests.length === 0 ? (
                <EmptyState title="暂无记录" description="当前检视条件下无可用数据。" />
              ) : (
                returnRequests.map((returnRequest) => (
                  <div key={returnRequest.id} className="space-y-4 rounded-2xl border border-white/60 bg-white/40 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">归还申请 #{returnRequest.id}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                          提交时间：{formatDateTime(returnRequest.created_at)} · 备注：{returnRequest.note ?? '—'}
                        </p>
                      </div>
                      <StatusBadge status={returnRequest.status} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`return-cabinet-${returnRequest.id}`}>入库书柜</Label>
                        <Input
                          id={`return-cabinet-${returnRequest.id}`}
                          value={returnCabinetId}
                          onChange={(event) => setReturnCabinetId(event.target.value)}
                          placeholder="cabinet-001"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`return-slot-${returnRequest.id}`}>入库仓位</Label>
                        <Input
                          id={`return-slot-${returnRequest.id}`}
                          value={returnSlotCode}
                          onChange={(event) => setReturnSlotCode(event.target.value)}
                          placeholder="A01"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`return-note-${returnRequest.id}`}>处理备注</Label>
                      <Textarea
                        id={`return-note-${returnRequest.id}`}
                        value={returnNote}
                        onChange={(event) => setReturnNote(event.target.value)}
                        placeholder="例如：已回收并完成入库"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        disabled={receiveReturnMutation.isPending || returnRequest.status !== 'created'}
                        onClick={() => receiveReturnMutation.mutate(returnRequest.id)}
                      >
                        {receiveReturnMutation.isPending ? '处理中…' : '接收归还'}
                      </Button>
                      <Button
                        disabled={completeReturnMutation.isPending || !['created', 'received'].includes(returnRequest.status)}
                        onClick={() => completeReturnMutation.mutate(returnRequest.id)}
                      >
                        {completeReturnMutation.isPending ? '处理中…' : '完成入库'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>状态修改</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="borrow-status">借阅状态</Label>
                <select
                  id="borrow-status"
                  className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                  value={draftStatuses.borrowStatus ?? bundle.borrow_order.status}
                  onChange={(event) => setDraftStatuses((current) => ({ ...current, borrowStatus: event.target.value }))}
                >
                  {['created', 'awaiting_pick', 'picked_from_cabinet', 'delivering', 'delivered', 'completed'].map((value) => (
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
                  className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                  value={draftStatuses.deliveryStatus ?? bundle.delivery_order?.status ?? ''}
                  onChange={(event) => setDraftStatuses((current) => ({ ...current, deliveryStatus: event.target.value }))}
                >
                  <option value="">不修改</option>
                  {['awaiting_pick', 'picked_from_cabinet', 'delivering', 'delivered', 'completed'].map((value) => (
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
                  className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                  value={draftStatuses.taskStatus ?? bundle.robot_task?.status ?? ''}
                  onChange={(event) => setDraftStatuses((current) => ({ ...current, taskStatus: event.target.value }))}
                >
                  <option value="">不修改</option>
                  {['assigned', 'carrying', 'arriving', 'returning', 'completed'].map((value) => (
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
                  className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                  value={draftStatuses.robotStatus ?? bundle.robot_unit?.status ?? ''}
                  onChange={(event) => setDraftStatuses((current) => ({ ...current, robotStatus: event.target.value }))}
                >
                  <option value="">不修改</option>
                  {['idle', 'assigned', 'carrying', 'arriving', 'returning', 'offline'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <Button className="w-full" disabled={patchMutation.isPending} onClick={() => patchMutation.mutate()}>
                {patchMutation.isPending ? '提交中…' : '保存修改'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>处理操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4">
                <Label htmlFor="order-priority">优先级</Label>
                <select
                  id="order-priority"
                  className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                  value={priorityDraft}
                  onChange={(event) => setPriorityDraft(event.target.value)}
                >
                  {['urgent', 'high', 'normal', 'low'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <Button className="w-full" disabled={priorityMutation.isPending} onClick={() => priorityMutation.mutate()}>
                  {priorityMutation.isPending ? '更新中…' : '更新优先级'}
                </Button>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4">
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
                <Button className="w-full" disabled={interventionMutation.isPending} onClick={() => interventionMutation.mutate()}>
                  {interventionMutation.isPending ? '提交中…' : '提交处理'}
                </Button>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/60 bg-white/40 p-4">
                <div className="space-y-2">
                  <Label htmlFor="retry-note">重试备注</Label>
                  <Textarea
                    id="retry-note"
                    value={retryNote}
                    onChange={(event) => setRetryNote(event.target.value)}
                    placeholder="例如：恢复后重新派单"
                  />
                </div>
                <Button className="w-full" disabled={retryMutation.isPending} onClick={() => retryMutation.mutate()}>
                  {retryMutation.isPending ? '重试中…' : '重试订单'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
