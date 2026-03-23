import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useMemo, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdminEventsStream } from '@/hooks/use-admin-events-stream'
import { getAdminEvents, getAdminRobots, getAdminTasks, reassignAdminTask } from '@/lib/api/admin'
import { getAdminPageHero } from '@/lib/page-hero'
import type { RobotEvent, RobotTask, RobotUnit } from '@/types/domain'
import { formatDateTime } from '@/utils'

const taskColumnHelper = createColumnHelper<RobotTask>()
const pageHero = getAdminPageHero('robots')

export function RobotsPage() {
  const queryClient = useQueryClient()
  const robotsQuery = useQuery({ queryKey: ['admin', 'robots'], queryFn: getAdminRobots })
  const tasksQuery = useQuery({ queryKey: ['admin', 'tasks'], queryFn: getAdminTasks })
  const eventsQuery = useQuery({ queryKey: ['admin', 'events', 20], queryFn: () => getAdminEvents(20) })
  const [liveEvents, setLiveEvents] = useState<RobotEvent[] | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedRobotId, setSelectedRobotId] = useState('')
  const [reassignReason, setReassignReason] = useState('')

  const tasks = tasksQuery.data ?? []
  const robots = robotsQuery.data ?? []
  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status !== 'completed'),
    [tasks],
  )

  const reassignMutation = useMutation({
    mutationFn: () =>
      reassignAdminTask(Number(selectedTaskId), {
        robot_id: Number(selectedRobotId),
        reason: reassignReason || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tasks'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'robots'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] })
      setReassignReason('')
    },
  })

  useAdminEventsStream({
    enabled: true,
    onEvent: (event) => {
      setLiveEvents((current) => [
        {
          id: Number(event.id ?? Date.now()),
          robot_id: Number(event.robot_id ?? event.next_robot_id ?? 0),
          task_id: event.task_id ? Number(event.task_id) : null,
          event_type: String(event.event_type ?? 'unknown'),
          metadata: (event as { metadata?: Record<string, unknown> }).metadata ?? event,
          created_at: typeof event.created_at === 'string' ? event.created_at : new Date().toISOString(),
        },
        ...(current ?? eventsQuery.data ?? []),
      ].slice(0, 20))
    },
  })

  const visibleEvents = liveEvents ?? eventsQuery.data ?? []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Array<ColumnDef<RobotTask, any>> = [
    taskColumnHelper.accessor('id', { header: '任务号' }),
    taskColumnHelper.accessor('robot_id', { header: '机器人' }),
    taskColumnHelper.accessor('delivery_order_id', { header: '配送单' }),
    taskColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    taskColumnHelper.accessor('attempt_count', {
      header: '重试',
      cell: (info) => info.getValue() ?? 0,
    }),
    taskColumnHelper.accessor('failure_reason', {
      header: '异常说明',
      cell: (info) => info.getValue() ?? '—',
    }),
    taskColumnHelper.accessor('updated_at', {
      header: '更新时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  if (robotsQuery.isLoading && tasksQuery.isLoading && eventsQuery.isLoading) {
    return <LoadingState label="数据装载中" />
  }

  return (
    <PageShell
      {...pageHero}
      eyebrow="机器人管理"
      title="机器人管理"
      description="查看设备状态、任务和事件。"
      statusLine="机器人列表"
    >
      <MetricStrip
        items={[
          { label: '机器人数量', value: robots.length, hint: '当前接入系统的机器人' },
          { label: '在线数量', value: robots.filter((robot) => robot.status !== 'offline').length, hint: '当前在线的机器人' },
          { label: '进行中任务', value: activeTasks.length, hint: '尚未完成的任务' },
          { label: '最近事件', value: visibleEvents.length, hint: '最近 20 条记录' },
        ]}
        className="xl:grid-cols-4"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <WorkspacePanel title="机器人列表" description="按机器人查看状态、电量、心跳和当前任务。">
            <div className="grid gap-4 md:grid-cols-2">
              {robots.map((robot: RobotUnit) => (
                <div key={robot.id} className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{robot.code}</p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        当前任务：{robot.current_task?.delivery_order_id ?? '空闲'}
                      </p>
                    </div>
                    <StatusBadge status={robot.status} />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">电量</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        {robot.battery_level ?? '—'}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-container-low)] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">心跳</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        {formatDateTime(robot.heartbeat_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
          <WorkspacePanel title="任务列表" description="把任务状态、重试次数和异常原因放在一起。">
            <DataTable columns={columns} data={tasks} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <InspectorPanel title="任务重分配" description="机器人低电量、离线或受阻时，可以手动切换执行机器人。">
              {activeTasks.length === 0 || robots.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reassign-task">任务</Label>
                    <select
                      id="reassign-task"
                      className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                      value={selectedTaskId}
                      onChange={(event) => setSelectedTaskId(event.target.value)}
                    >
                      <option value="">选择任务</option>
                      {activeTasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          任务 #{task.id} · 当前机器人 #{task.robot_id} · {task.status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reassign-robot">目标机器人</Label>
                    <select
                      id="reassign-robot"
                      className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                      value={selectedRobotId}
                      onChange={(event) => setSelectedRobotId(event.target.value)}
                    >
                      <option value="">选择机器人</option>
                      {robots.map((robot) => (
                        <option key={robot.id} value={robot.id}>
                          {robot.code} · {robot.status} · 电量 {robot.battery_level ?? '—'}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reassign-reason">重分配原因</Label>
                    <Input
                      id="reassign-reason"
                      value={reassignReason}
                      onChange={(event) => setReassignReason(event.target.value)}
                      placeholder="例如：原机器人电量过低"
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={reassignMutation.isPending || !selectedTaskId || !selectedRobotId}
                    onClick={() => reassignMutation.mutate()}
                  >
                    {reassignMutation.isPending ? '处理中…' : '执行重分配'}
                  </Button>
                </>
              )}
          </InspectorPanel>

          <WorkspacePanel title="事件记录" description="自动合并历史事件和当前推送。">
            <div className="space-y-3">
              {visibleEvents.map((event) => (
                <div key={`${event.id}-${event.created_at}`} className="rounded-[1.35rem] bg-[var(--surface-container-low)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.event_type} />
                      <span className="text-sm font-medium text-[var(--foreground)]">单元 #{event.robot_id}</span>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                    任务 #{event.task_id ?? '—'} ·{' '}
                    {event.metadata?.delivery_target
                      ? `目标：${String(event.metadata.delivery_target)}`
                      : event.metadata?.reason
                        ? `原因：${String(event.metadata.reason)}`
                        : '等待更多元数据'}
                  </p>
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </PageShell>
  )
}
