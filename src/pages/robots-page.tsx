import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useEffect, useMemo, useState } from 'react'

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminEventsStream } from '@/hooks/use-admin-events-stream'
import { getAdminEvents, getAdminRobots, getAdminTasks, reassignAdminTask } from '@/lib/api/admin'
import { formatFulfillmentPhaseLabel, formatStatusLabel } from '@/lib/display-labels'
import { getAdminPageHero } from '@/lib/page-hero'
import { patchSearchParams, readOptionalSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import type { RobotEvent, RobotTask, RobotUnit } from '@/types/domain'
import { formatDateTime } from '@/utils'

const taskColumnHelper = createColumnHelper<RobotTask>()
const pageHero = getAdminPageHero('robots')
const TASKS_PAGE_SIZE = 20

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
  const [activeTab, setActiveTab] = useState('console')
  const [taskPage, setTaskPage] = useState(1)

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
  const pagedTasks = useMemo(() => {
    const startIndex = (taskPage - 1) * TASKS_PAGE_SIZE
    return visibleTasks.slice(startIndex, startIndex + TASKS_PAGE_SIZE)
  }, [taskPage, visibleTasks])
  const totalTaskPages = Math.max(1, Math.ceil(visibleTasks.length / TASKS_PAGE_SIZE))

  useEffect(() => {
    if (taskPage > totalTaskPages) {
      setTaskPage(totalTaskPages)
    }
  }, [taskPage, totalTaskPages])

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8 space-y-6">
        <div className="border-b border-[var(--line-subtle)] pb-2 flex justify-start">
          <TabsList className="grid w-full max-w-[24rem] grid-cols-3 bg-[var(--surface-container-lowest)] p-1 rounded-full border border-[var(--line-subtle)] shadow-sm">
            <TabsTrigger value="console" className="rounded-full text-[13px] data-[state=active]:bg-white data-[state=active]:text-[var(--foreground)] text-[var(--muted-foreground)]">控制台</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full text-[13px] data-[state=active]:bg-white data-[state=active]:text-[var(--foreground)] text-[var(--muted-foreground)]">任务大厅</TabsTrigger>
            <TabsTrigger value="events" className="rounded-full text-[13px] data-[state=active]:bg-white data-[state=active]:text-[var(--foreground)] text-[var(--muted-foreground)]">全局事件</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="console" className="mt-0 outline-none">
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <WorkspacePanel
              title="监控总览"
              description="查看每个机器人的状态和分配的任务状况。"
              action={
                <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-bright)] pl-3 pr-1 transition-colors hover:bg-[var(--surface-container)] focus-within:border-[var(--line-strong)] focus-within:ring-1 focus-within:ring-[var(--line-strong)] shadow-sm">
                  <span className="text-[12px] text-[var(--muted-foreground)] whitespace-nowrap">筛选</span>
                  <div className="h-3 w-[1px] bg-[var(--line-subtle)]" />
                  <Select
                    value={robotStatusFilter ?? 'all'}
                    onValueChange={(value) =>
                      updateRobotFilters({
                        robot_status: value === 'all' ? undefined : value,
                      })
                    }
                  >
                    <SelectTrigger aria-label="机器人状态筛选" className="h-full w-auto min-w-[5.5rem] border-0 bg-transparent px-1.5 py-0 text-[12px] font-medium text-[var(--foreground)] shadow-none focus:ring-0">
                      <SelectValue placeholder="全部状态" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[1rem]">
                      <SelectItem value="all" className="text-[12px] rounded-lg">全部状态</SelectItem>
                      <SelectItem value="assigned" className="text-[12px] rounded-lg">已分配</SelectItem>
                      <SelectItem value="idle" className="text-[12px] rounded-lg">空闲</SelectItem>
                      <SelectItem value="carrying" className="text-[12px] rounded-lg">配送中</SelectItem>
                      <SelectItem value="offline" className="text-[12px] rounded-lg">离线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                {visibleRobots.map((robot: RobotUnit) => (
                  <div key={robot.id} className="rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-[var(--foreground)]">{robot.code}</p>
                        <p className="mt-1 text-[12px] text-[var(--muted-foreground)]">
                          当前任务：{robot.current_task?.delivery_order_id ?? '空闲'}
                        </p>
                      </div>
                      <StatusBadge status={robot.status} />
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-[var(--surface-container-lowest)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">电量</p>
                        <p className="mt-2 text-[14px] font-bold text-[var(--foreground)]">
                          {robot.battery_level ?? '—'}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-[var(--surface-container-lowest)] p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">最后上报</p>
                        <p className="mt-2 text-[14px] font-bold text-[var(--foreground)]">
                          {formatDateTime(robot.heartbeat_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </WorkspacePanel>

            <InspectorPanel title="改派任务" description="如果某台机器人电量过低或者离线，把任务换给其他人。">
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
                      <SelectTrigger aria-labelledby="reassign-task-label" className="rounded-xl h-11">
                        <SelectValue placeholder="请选择任务" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="unselected-task">请选择任务</SelectItem>
                        {activeTasks.map((task) => (
                          <SelectItem key={task.id} value={String(task.id)}>
                            任务 #{task.id} · 当前机器人 #{task.robot_id} · {formatStatusLabel(task.status)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label id="reassign-robot-label">目标机器人</Label>
                    <Select
                      value={selectedRobotId}
                      onValueChange={setSelectedRobotId}
                    >
                      <SelectTrigger aria-labelledby="reassign-robot-label" className="rounded-xl h-11">
                        <SelectValue placeholder="请选择机器人" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="unselected-robot">请选择机器人</SelectItem>
                        {visibleRobots.map((robot) => (
                          <SelectItem key={robot.id} value={String(robot.id)}>
                            {robot.code} · {formatStatusLabel(robot.status)} · 电量 {robot.battery_level ?? '—'}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="reassign-reason">改派原因</Label>
                    <Input
                      id="reassign-reason"
                      value={reassignReason}
                      onChange={(event) => setReassignReason(event.target.value)}
                      placeholder="例如：原机器人电量过低"
                      className="rounded-xl h-11"
                    />
                  </div>
                  <Button
                    className="w-full mt-6 h-11 rounded-full font-semibold shadow-none bg-[var(--foreground)] text-[var(--background)] hover:opacity-90 transition-opacity"
                    disabled={reassignMutation.isPending || !selectedTaskId || !selectedRobotId}
                    onClick={() => reassignMutation.mutate()}
                  >
                    {reassignMutation.isPending ? '处理中…' : '确认改派'}
                  </Button>
                </>
              )}
            </InspectorPanel>
          </div>
        </TabsContent>

        <TabsContent value="tasks" className="mt-0 outline-none">
          <WorkspacePanel
            title="排队任务大厅"
            description="全览所有任务排队细节、重试次数和异常结果。"
            action={
              <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-bright)] pl-3 pr-1 transition-colors hover:bg-[var(--surface-container)] focus-within:border-[var(--line-strong)] focus-within:ring-1 focus-within:ring-[var(--line-strong)] shadow-sm">
                <span className="text-[12px] text-[var(--muted-foreground)] whitespace-nowrap">筛选</span>
                <div className="h-3 w-[1px] bg-[var(--line-subtle)]" />
                <Select
                  value={taskStatusFilter ?? 'all'}
                  onValueChange={(value) => {
                    setTaskPage(1)
                    updateRobotFilters({
                      task_status: value === 'all' ? undefined : value,
                    })
                  }}
                >
                  <SelectTrigger aria-label="任务状态筛选" className="h-full w-auto min-w-[5.5rem] border-0 bg-transparent px-1.5 py-0 text-[12px] font-medium text-[var(--foreground)] shadow-none focus:ring-0">
                    <SelectValue placeholder="全部任务" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[1rem]">
                    <SelectItem value="all" className="text-[12px] rounded-lg">全部任务</SelectItem>
                    <SelectItem value="assigned" className="text-[12px] rounded-lg">已分配</SelectItem>
                    <SelectItem value="carrying" className="text-[12px] rounded-lg">配送中</SelectItem>
                    <SelectItem value="completed" className="text-[12px] rounded-lg">已完成</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <DataTable
              columns={columns}
              data={pagedTasks}
              emptyTitle="没有找到内容"
              emptyDescription="换个条件再试试。"
              pagination={{
                page: taskPage,
                pageSize: TASKS_PAGE_SIZE,
                total: visibleTasks.length,
                onPageChange: setTaskPage,
              }}
            />
          </WorkspacePanel>
        </TabsContent>

        <TabsContent value="events" className="mt-0 outline-none">
          <WorkspacePanel
            title="全局事件追踪"
            description="时间线上的系统变动流、断线重连、以及派发记录。"
            action={
              <div className="flex h-8 items-center gap-2 rounded-full border border-[var(--line-subtle)] bg-[var(--surface-bright)] pl-3 pr-1 transition-colors hover:bg-[var(--surface-container)] focus-within:border-[var(--line-strong)] focus-within:ring-1 focus-within:ring-[var(--line-strong)] shadow-sm">
                <span className="text-[12px] text-[var(--muted-foreground)] whitespace-nowrap">筛选</span>
                <div className="h-3 w-[1px] bg-[var(--line-subtle)]" />
                <Select
                  value={eventTypeFilter ?? 'all'}
                  onValueChange={(value) =>
                    updateRobotFilters({
                      event_type: value === 'all' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger aria-label="事件类型筛选" className="h-full w-auto min-w-[5.5rem] border-0 bg-transparent px-1.5 py-0 text-[12px] font-medium text-[var(--foreground)] shadow-none focus:ring-0">
                    <SelectValue placeholder="全部事件" />
                  </SelectTrigger>
                  <SelectContent className="rounded-[1rem]">
                    <SelectItem value="all" className="text-[12px] rounded-lg">全部事件</SelectItem>
                    <SelectItem value="order_created" className="text-[12px] rounded-lg">创建订单</SelectItem>
                    <SelectItem value="task_reassigned" className="text-[12px] rounded-lg">任务重分配</SelectItem>
                    <SelectItem value="robot_offline" className="text-[12px] rounded-lg">机器人离线</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            }
          >
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div key={`${event.id}-${event.created_at}`} className="rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.event_type} />
                      <span className="text-[14px] font-bold text-[var(--foreground)]">单元 #{event.robot_id}</span>
                    </div>
                    <span className="text-[12px] text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-3 text-[13px] text-[var(--muted-foreground)] leading-relaxed">
                    任务 #{event.task_id ?? '—'} ·{' '}
                    {event.metadata?.delivery_target
                      ? `送书位置：${String(event.metadata.delivery_target)}`
                      : event.metadata?.reason
                        ? `说明：${String(event.metadata.reason)}`
                        : '还没有更多说明'}
                  </p>
                  {event.metadata?.fulfillment_phase ? (
                    <p className="mt-2 text-[13px] font-semibold text-[var(--foreground)]">
                      {formatFulfillmentPhaseLabel(String(event.metadata.fulfillment_phase))}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </WorkspacePanel>
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
