import { useQuery } from '@tanstack/react-query'
import { Activity, Bot, ChartColumnIncreasing, Flame, MapPinned, PackageCheck } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { SectionIntro } from '@/components/shared/section-intro'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { getAdminDashboardHeatmap, getAdminDashboardOverview } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'

const pageHero = getAdminPageHero('dashboard')
const dashboardHeroCopy = {
  eyebrow: '',
  title: '总览',
  description: '查看今日借阅、配送进度和服务状态。',
  heroLayout: 'stacked' as const,
}

export function DashboardPage() {
  const overviewQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'overview'],
    queryFn: getAdminDashboardOverview,
  })
  const heatmapQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'heatmap'],
    queryFn: getAdminDashboardHeatmap,
  })

  if (overviewQuery.isLoading || heatmapQuery.isLoading) {
    return (
      <PageShell
        {...pageHero}
        {...dashboardHeroCopy}
      >
        <LoadingState label="加载中" />
      </PageShell>
    )
  }

  const overview = overviewQuery.data
  const heatmap = heatmapQuery.data?.items ?? []

  if (!overview) {
    return (
      <PageShell
        {...pageHero}
        {...dashboardHeroCopy}
      >
        <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
      </PageShell>
    )
  }

  return (
    <PageShell
      {...pageHero}
      {...dashboardHeroCopy}
    >
      <MetricStrip
        items={[
          {
            label: '今日借阅',
            value: overview.today_borrow_count,
            hint: '当天新增的借阅单',
            icon: <Activity className="size-5" />,
          },
          {
            label: '进行中配送',
            value: overview.active_delivery_task_count,
            hint: '当前仍在处理的配送单',
            icon: <PackageCheck className="size-5" />,
          },
          {
            label: '在线机器人',
            value: `${overview.robots.online}/${overview.robots.total}`,
            hint: '在线数量 / 总数量',
            icon: <Bot className="size-5" />,
          },
          {
            label: '待处理警告',
            value: overview.cabinets.total,
            hint: `${overview.alerts.open ?? 0} 条待处理记录`,
            icon: <ChartColumnIncreasing className="size-5" />,
          },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <WorkspacePanel
          title="热门图书"
          description="按借阅次数统计当前最受关注的图书。"
        >
          {overview.top_books.length === 0 ? (
            <EmptyState title="暂无数据" description="数据还不够，稍后会自动展示热门图书。" />
          ) : (
            <div className="space-y-3">
              {overview.top_books.map((book, index) => (
                <div
                  key={book.book_id}
                  className="grid gap-4 border-b border-[var(--line-subtle)] py-4 last:border-b-0 first:pt-0 last:pb-0 md:grid-cols-[auto_1fr_auto]"
                >
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-[var(--line-subtle)] bg-[rgba(33,73,140,0.05)] text-sm font-semibold text-[var(--foreground)]">
                    {index + 1}
                  </span>
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--foreground)]">{book.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{book.author ?? '作者待补充'}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{book.borrow_count}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">借阅次数</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel
          title="区域热度映射"
          description="按区域汇总借阅需求"
          tone="muted"
        >
          {heatmap.length === 0 ? (
            <EmptyState title="暂无数据" description="数据还不够，稍后会自动展示区域热度。" />
          ) : (
            <div className="space-y-3">
              {heatmap.map((item) => (
                <div key={item.area} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <MapPinned className="mt-0.5 size-4 text-[var(--primary)]" />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{item.area}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{item.locations.join(' / ') || '未标注位置'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{item.demand_count}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">热度</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>

      <SectionIntro
        eyebrow="状态"
        title="服务状态"
        description="查看配送进度、书柜状态和告警概览"
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WorkspacePanel title="配送与设备状态" description="快速了解当前是否有需要留意的异常">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">在线机器人</p>
              <p className="mt-3 text-[2.6rem] font-semibold tracking-[-0.07em] text-[var(--foreground)]">{overview.robots.online}</p>
              <div className="mt-4">
                <StatusBadge status={overview.robots.offline > 0 ? 'offline' : 'active'} />
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">待处理警告</p>
              <p className="mt-3 text-[2.6rem] font-semibold tracking-[-0.07em] text-[var(--foreground)]">{overview.alerts.open}</p>
              <div className="mt-4">
                <StatusBadge status={overview.alerts.open > 0 ? 'error' : 'active'} />
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="书柜状态" description="按状态拆分书柜数量，方便查看设备压力">
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(overview.cabinets.status_breakdown).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-4 py-4">
                <div className="flex items-center gap-3">
                  <Flame className="size-4 text-[var(--primary)]" />
                  <StatusBadge status={status} />
                </div>
                <span className="text-xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{count}</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>
    </PageShell>
  )
}
