import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { useAdminEventsStream } from '@/hooks/use-admin-events-stream'
import { getAdminEvents } from '@/lib/api/admin'
import type { RobotEvent } from '@/types/domain'
import { formatDateTime } from '@/utils'

export function EventsPage() {
  const eventsQuery = useQuery({ queryKey: ['admin', 'events', 100], queryFn: () => getAdminEvents(100) })
  const [events, setEvents] = useState<RobotEvent[] | null>(null)

  useAdminEventsStream({
    enabled: true,
    onEvent: (event) => {
      setEvents((current) => [
        {
          id: Number(event.id ?? Date.now()),
          robot_id: Number(event.robot_id ?? 0),
          task_id: event.task_id ? Number(event.task_id) : null,
          event_type: String(event.event_type ?? 'unknown'),
          metadata: (event as { metadata?: Record<string, unknown> }).metadata ?? event,
          created_at: typeof event.created_at === 'string' ? event.created_at : new Date().toISOString(),
        },
        ...(current ?? eventsQuery.data ?? []),
      ].slice(0, 100))
    },
  })

  const visibleEvents = events ?? eventsQuery.data ?? []

  return (
    <PageShell title="事件与审计页" description="高密度追踪最近事件流，便于定位机器人执行、订单推进和后台异常。">
      {visibleEvents.length === 0 ? (
        <EmptyState title="当前没有事件" description="启动后端并触发一次机器人或订单动作后，这里会实时出现事件流。" />
      ) : (
        <div className="grid gap-4">
          {visibleEvents.map((event) => (
            <div key={`${event.id}-${event.created_at}`} className="rounded-2xl border border-[rgba(193,198,214,0.18)] bg-white/84 p-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={event.event_type} />
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">
                      机器人 #{event.robot_id} · 任务 #{event.task_id ?? '—'}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {event.metadata?.borrow_order_id ? `借阅单 #${String(event.metadata.borrow_order_id)}` : '暂无借阅单关联信息'}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
