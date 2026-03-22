import { useQuery } from '@tanstack/react-query'
import { Activity, Bot, Boxes, BookOpenCheck, ChartLine } from 'lucide-react'

import { PageShell } from '@/components/shared/page-shell'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAdminEvents, getAdminOrders, getAdminRobots, getAdminTasks } from '@/lib/api/admin'
import { getInventoryStatus } from '@/lib/api/inventory'
import { formatDateTime } from '@/utils'

export function DashboardPage() {
  const ordersQuery = useQuery({ queryKey: ['admin', 'orders'], queryFn: getAdminOrders })
  const tasksQuery = useQuery({ queryKey: ['admin', 'tasks'], queryFn: getAdminTasks })
  const robotsQuery = useQuery({ queryKey: ['admin', 'robots'], queryFn: getAdminRobots })
  const inventoryQuery = useQuery({ queryKey: ['inventory', 'status'], queryFn: getInventoryStatus })
  const eventsQuery = useQuery({ queryKey: ['admin', 'events', 12], queryFn: () => getAdminEvents(12) })

  const orders = ordersQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const robots = robotsQuery.data ?? []
  const inventory = inventoryQuery.data
  const events = eventsQuery.data ?? []

  const deliveringCount = orders.filter((item) => item.borrow_order.status === 'delivering').length
  const completedCount = orders.filter((item) => item.borrow_order.status === 'completed').length
  const pendingCount = orders.filter((item) => item.borrow_order.status !== 'completed').length

  return (
    <PageShell
      title="Dashboard 总览页"
      description="用统一视角掌握当日借阅履约、库存占用、机器人任务与最近异常动态。"
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5 space-y-6 " >
        <StatCard title="待处理订单" value={pendingCount} hint="未完成借阅单" icon={<BookOpenCheck className="size-5 text-[var(--primary)]" />} />
        <StatCard title="配送中" value={deliveringCount} hint="处于履约链路中的订单" icon={<ChartLine className="size-5 text-[var(--primary)]" />} />
        <StatCard title="已完成" value={completedCount} hint="本地服务返回的完成订单" icon={<Activity className="size-5 text-[var(--secondary)]" />} />
        <StatCard title="机器人任务" value={tasks.length} hint="当前机器人任务总数" icon={<Bot className="size-5 text-[var(--tertiary)]" />} />
        <StatCard
          title="库存占用"
          value={`${inventory?.occupied_slots ?? 0}/${(inventory?.occupied_slots ?? 0) + (inventory?.free_slots ?? 0)}`}
          hint="已占用格口 / 总格口"
          icon={<Boxes className="size-5 text-[var(--primary)]" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>近期履约动态</CardTitle>
            <CardDescription>最近的机器人与订单联动事件。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="flex items-start justify-between rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-md px-5 py-4 transition-all hover:bg-white/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={event.event_type} />
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      机器人 #{event.robot_id} · 任务 #{event.task_id ?? '—'}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {event.metadata?.delivery_target ? `目标位置：${String(event.metadata.delivery_target)}` : '等待更多附加信息'}
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>机器人状态</CardTitle>
            <CardDescription>所有机器人与当前任务的快照。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {robots.map((robot) => (
              <div key={robot.id} className="rounded-2xl border border-white/60 bg-white/40 shadow-sm backdrop-blur-md p-5 transition-all hover:bg-white/60">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{robot.code}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      当前任务：{robot.current_task?.delivery_order_id ?? '空闲'}
                    </p>
                  </div>
                  <StatusBadge status={robot.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
