import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { getAdminOrder, patchAdminOrderState } from '@/lib/api/admin'
import { formatDateTime } from '@/utils'

export function OrderDetailPage() {
  const params = useParams()
  const orderId = Number(params.orderId)
  const queryClient = useQueryClient()
  const orderQuery = useQuery({
    enabled: Number.isFinite(orderId),
    queryKey: ['admin', 'order', orderId],
    queryFn: () => getAdminOrder(orderId),
  })

  const [draftStatuses, setDraftStatuses] = useState<{
    borrowStatus?: string
    deliveryStatus?: string
    taskStatus?: string
    robotStatus?: string
  }>({})

  const patchMutation = useMutation({
    mutationFn: () =>
      patchAdminOrderState(orderId, {
        borrow_status: draftStatuses.borrowStatus ?? orderQuery.data?.borrow_order.status,
        delivery_status: draftStatuses.deliveryStatus ?? orderQuery.data?.delivery_order?.status,
        task_status: draftStatuses.taskStatus ?? orderQuery.data?.robot_task?.status,
        robot_status: draftStatuses.robotStatus ?? orderQuery.data?.robot_unit?.status,
      }),
    onSuccess: (bundle) => {
      setDraftStatuses({})
      queryClient.setQueryData(['admin', 'order', orderId], bundle)
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] })
      queryClient.invalidateQueries({ queryKey: ['admin', 'robots'] })
    },
  })

  if (orderQuery.isLoading) {
    return <LoadingState label="正在加载订单详情…" />
  }

  if (!orderQuery.data) {
    return <EmptyState title="订单不存在" description="请回到订单列表重新选择一个有效订单。" />
  }

  const bundle = orderQuery.data

  return (
    <PageShell title={`订单 #${bundle.borrow_order.id}`} description="查看借阅、配送和机器人联动状态，并进行人工修正。">
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
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">机器人任务</p>
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
        </div>

        <Card>
          <CardHeader>
            <CardTitle>状态纠正</CardTitle>
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
              {patchMutation.isPending ? '提交中…' : '提交修正'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
