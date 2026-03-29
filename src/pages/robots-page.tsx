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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdminEventsStream } from '@/hooks/use-admin-events-stream'
import { getAdminEvents, getAdminRobots, getAdminTasks, reassignAdminTask } from '@/lib/api/admin'
import { formatStatusLabel } from '@/lib/display-labels'
import { getAdminPageHero } from '@/lib/page-hero'
import { patchSearchParams, readOptionalSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import type { RobotEvent, RobotTask, RobotUnit } from '@/types/domain'
import { formatDateTime } from '@/utils'

const taskColumnHelper = createColumnHelper<RobotTask>()
const pageHero = getAdminPageHero('robots')

export function RobotsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const robotStatusFilter = readOptionalSearchParam(searchParams, 'robot_status')
  const taskStatusFilter = readOptionalSearchParam(searchParams, 'task_status')
  const eventTypeFilter = readOptionalSearchParam(searchParams, 'event_type')
  const robotsQuery = useQuery({ queryKey: ['admin', 'robots'], queryFn: getAdminRobots })
  const tasksQuery = useQuery({ queryKey: ['admin', 'tasks'], queryFn: getAdminTasks })
  const eventsQuery = useQuery({ queryKey: ['admin', 'events', 20], queryFn: () => getAdminEvents(20) })
  const [liveEvents, setLiveEvents] = useState<RobotEvent[] | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedRobotId, setSelectedRobotId] = useState('')
  const [reassignReason, setReassignReason] = useState('')

  const tasks = tasksQuery.data ?? []
  const robots = robotsQuery.data ?? []
  const visibleRobots = useMemo(
    () => robots.filter((robot) => (robotStatusFilter ? robot.status === robotStatusFilter : true)),
    [robotStatusFilter, robots],
  )
  const visibleTasks = useMemo(
    () => tasks.filter((task) => (taskStatusFilter ? task.status === taskStatusFilter : true)),
    [taskStatusFilter, tasks],
  )
  const activeTasks = useMemo(
    () => visibleTasks.filter((task) => task.status !== 'completed'),
    [visibleTasks],
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
  const filteredEvents = useMemo(
    () => visibleEvents.filter((event) => (eventTypeFilter ? event.event_type === eventTypeFilter : true)),
    [eventTypeFilter, visibleEvents],
  )

  function updateRobotFilters(patch: Record<string, string | undefined>) {
    setSearchParams(patchSearchParams(searchParams, patch), { replace: true })
  }

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
    return <LoadingState label="正在载入数据" />
  }

  return (
    <PageShell
      {...pageHero}
      eyebrow="机器人"
      title="机器人"
      description="查看机器人状态、任务和最新记录。"
      statusLine="机器人列表"
    >
      <MetricStrip
        items={[
          { label: '机器人数量', value: visibleRobots.length, hint: '符合当前条件的机器人数量' },
          { label: '在线数量', value: visibleRobots.filter((robot) => robot.status !== 'offline').length, hint: '现在在线的机器人' },
          { label: '处理中任务', value: activeTasks.length, hint: '还没完成的任务' },
          { label: '最近事件', value: filteredEvents.length, hint: '最近 20 条记录' },
        ]}
        className="xl:grid-cols-4"
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <WorkspacePanel
            title="机器人列表"
            description="查看每台机器人的状态、电量、最后上报时间和当前任务。"
            action={
              <Select
                value={robotStatusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateRobotFilters({
                    robot_status: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="机器人状态筛选" className="w-[10rem]">
                  <SelectValue placeholder="全部状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="assigned">已分配</SelectItem>
                  <SelectItem value="idle">空闲</SelectItem>
                  <SelectItem value="carrying">配送中</SelectItem>
                  <SelectItem value="offline">离线</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              {visibleRobots.map((robot: RobotUnit) => (
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
                      <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最后上报</p>
                      <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                        {formatDateTime(robot.heartbeat_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </WorkspacePanel>
          <WorkspacePanel
            title="任务列表"
            description="把任务状态、重试次数和异常说明放在一起看。"
            action={
              <Select
                value={taskStatusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateRobotFilters({
                    task_status: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="任务状态筛选" className="w-[10rem]">
                  <SelectValue placeholder="全部任务" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部任务</SelectItem>
                  <SelectItem value="assigned">已分配</SelectItem>
                  <SelectItem value="carrying">配送中</SelectItem>
                  <SelectItem value="completed">已完成</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <DataTable columns={columns} data={visibleTasks} emptyTitle="没有找到内容" emptyDescription="换个条件再试试。" />
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <InspectorPanel title="改派任务" description="机器人电量低、离线或卡住时，可以把任务换给别的机器人。">
              {activeTasks.length === 0 || visibleRobots.length === 0 ? (
                <EmptyState title="没有找到内容" description="换个条件再试试。" />
              ) : (
                <>
                  <div className="space-y-2">
                    <Label id="reassign-task-label">任务</Label>
                    <Select
                      value={selectedTaskId}
                      onValueChange={setSelectedTaskId}
                    >
                      <SelectTrigger aria-labelledby="reassign-task-label">
                        <SelectValue placeholder="请选择任务" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unselected-task">请选择任务</SelectItem>
                        {activeTasks.map((task) => (
                          <SelectItem key={task.id} value={String(task.id)}>
                            任务 #{task.id} · 当前机器人 #{task.robot_id} · {formatStatusLabel(task.status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label id="reassign-robot-label">目标机器人</Label>
                    <Select
                      value={selectedRobotId}
                      onValueChange={setSelectedRobotId}
                    >
                      <SelectTrigger aria-labelledby="reassign-robot-label">
                        <SelectValue placeholder="请选择机器人" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unselected-robot">请选择机器人</SelectItem>
                        {visibleRobots.map((robot) => (
                          <SelectItem key={robot.id} value={String(robot.id)}>
                            {robot.code} · {formatStatusLabel(robot.status)} · 电量 {robot.battery_level ?? '—'}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reassign-reason">改派原因</Label>
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
                    {reassignMutation.isPending ? '处理中…' : '确认改派'}
                  </Button>
                </>
              )}
          </InspectorPanel>

          <WorkspacePanel
            title="事件记录"
            description="这里会合并历史记录和刚收到的新消息。"
            action={
              <Select
                value={eventTypeFilter ?? 'all'}
                onValueChange={(value) =>
                  updateRobotFilters({
                    event_type: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="事件类型筛选" className="w-[10rem]">
                  <SelectValue placeholder="全部事件" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部事件</SelectItem>
                  <SelectItem value="order_created">创建订单</SelectItem>
                  <SelectItem value="task_reassigned">任务重分配</SelectItem>
                  <SelectItem value="robot_offline">机器人离线</SelectItem>
                </SelectContent>
              </Select>
            }
          >
            <div className="space-y-3">
              {filteredEvents.map((event) => (
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
                      ? `送书位置：${String(event.metadata.delivery_target)}`
                      : event.metadata?.reason
                        ? `说明：${String(event.metadata.reason)}`
                        : '还没有更多说明'}
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
