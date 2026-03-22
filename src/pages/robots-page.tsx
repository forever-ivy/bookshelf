import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAdminEventsStream } from '@/hooks/use-admin-events-stream'
import { getAdminEvents, getAdminRobots, getAdminTasks } from '@/lib/api/admin'
import type { RobotEvent, RobotTask, RobotUnit } from '@/types/domain'
import { formatDateTime } from '@/utils'

const taskColumnHelper = createColumnHelper<RobotTask>()

export function RobotsPage() {
  const robotsQuery = useQuery({ queryKey: ['admin', 'robots'], queryFn: getAdminRobots })
  const tasksQuery = useQuery({ queryKey: ['admin', 'tasks'], queryFn: getAdminTasks })
  const eventsQuery = useQuery({ queryKey: ['admin', 'events', 20], queryFn: () => getAdminEvents(20) })
  const [liveEvents, setLiveEvents] = useState<RobotEvent[] | null>(null)

  useAdminEventsStream({
    enabled: true,
    onEvent: (event) => {
      setLiveEvents((current) => [
        {
          id: Number(event.id ?? Date.now()),
          robot_id: Number(event.robot_id ?? 0),
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
    taskColumnHelper.accessor('updated_at', {
      header: '更新时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  if (robotsQuery.isLoading && tasksQuery.isLoading && eventsQuery.isLoading) {
    return <LoadingState label="正在连接机器人监控中心…" />
  }

  return (
    <PageShell title="机器人监控页" description="查看机器人当前任务、履约阶段与来自后端 SSE 的实时事件。">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {(robotsQuery.data ?? []).map((robot: RobotUnit) => (
              <div key={robot.id} className="rounded-2xl border border-[rgba(193,198,214,0.18)] bg-white/85 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--foreground)]">{robot.code}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                      当前任务：{robot.current_task?.delivery_order_id ?? '空闲'}
                    </p>
                  </div>
                  <StatusBadge status={robot.status} />
                </div>
              </div>
            ))}
          </div>
          <DataTable columns={columns} data={tasksQuery.data ?? []} emptyTitle="没有机器人任务" emptyDescription="当前没有配送任务进入机器人队列。" />
        </div>

        <div className="rounded-2xl border border-[rgba(193,198,214,0.18)] bg-white/80 p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">实时事件流</h2>
            <p className="text-sm text-[var(--muted-foreground)]">自动合并历史事件和当前 SSE 推送。</p>
          </div>
          <div className="space-y-3">
            {visibleEvents.map((event) => (
              <div key={`${event.id}-${event.created_at}`} className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.event_type} />
                    <span className="text-sm font-medium text-[var(--foreground)]">机器人 #{event.robot_id}</span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  任务 #{event.task_id ?? '—'} · {event.metadata?.delivery_target ? `目标：${String(event.metadata.delivery_target)}` : '等待更多元数据'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
