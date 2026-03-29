import { useQuery } from '@tanstack/react-query'
import { Activity, Bot, ChartColumnIncreasing, Flame, MapPinned, PackageCheck } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { SectionIntro } from '@/components/shared/section-intro'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { getAdminCabinets, getAdminDashboardHeatmap, getAdminDashboardOverview } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'

const pageHero = getAdminPageHero('dashboard')
const dashboardHeroCopy = {
  eyebrow: '',
  title: '首页',
  description: '查看今天的借书情况、送书进度和书柜状态。',
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
  const cabinetsQuery = useQuery({
    queryKey: ['admin', 'dashboard', 'cabinets'],
    queryFn: () => getAdminCabinets(),
  })

  if (overviewQuery.isLoading || heatmapQuery.isLoading || cabinetsQuery.isLoading) {
    return (
      <PageShell
        {...pageHero}
        {...dashboardHeroCopy}
      >
        <LoadingState label="正在载入" />
      </PageShell>
    )
  }

  const overview = overviewQuery.data
  const heatmap = heatmapQuery.data?.items ?? []
  const cabinets = cabinetsQuery.data?.items ?? []

  if (!overview) {
    return (
      <PageShell
        {...pageHero}
        {...dashboardHeroCopy}
      >
        <EmptyState title="没有找到内容" description="换个条件再试试。" />
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
            hint: '今天新提交的借书单',
            icon: <Activity className="size-5" />,
          },
          {
            label: '送书中',
            value: overview.active_delivery_task_count,
            hint: '现在还在处理的送书单',
            icon: <PackageCheck className="size-5" />,
          },
          {
            label: '在线机器人',
            value: `${overview.robots.online}/${overview.robots.total}`,
            hint: '前面是在线，后面是总数',
            icon: <Bot className="size-5" />,
          },
          {
            label: '书柜总数',
            value: overview.cabinets.total,
            hint: `还有 ${overview.alerts.open ?? 0} 条异常待处理`,
            icon: <ChartColumnIncreasing className="size-5" />,
          },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <WorkspacePanel
          title="借得最多的图书"
          description="按借阅次数查看最近最常被借走的图书。"
        >
          {overview.top_books.length === 0 ? (
            <EmptyState title="没有找到内容" description="现在还没有足够数据，稍后会自动显示。" />
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
                    <p className="text-sm text-[var(--muted-foreground)]">{book.author ?? '暂未填写作者'}</p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{book.borrow_count}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">借出次数</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>

        <WorkspacePanel
          title="借书最集中的区域"
          description="看看哪些区域最近借书更多。"
          tone="muted"
        >
          {heatmap.length === 0 ? (
            <EmptyState title="没有找到内容" description="现在还没有足够数据，稍后会自动显示。" />
          ) : (
            <div className="space-y-3">
              {heatmap.map((item) => (
                <div key={item.area} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <MapPinned className="mt-0.5 size-4 text-[var(--primary)]" />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{item.area}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">{item.locations.join(' / ') || '还没填写位置'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{item.demand_count}</p>
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">借书次数</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>

      <SectionIntro
        eyebrow="运行情况"
        title="当前情况"
        description="看送书、机器人和书柜现在是什么状态。"
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <WorkspacePanel title="送书和机器人" description="先看机器人是否在线，以及现在还有多少异常没处理。">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">在线机器人</p>
              <p className="mt-3 text-[2.6rem] font-semibold tracking-[-0.07em] text-[var(--foreground)]">{overview.robots.online}</p>
              <div className="mt-4">
                <StatusBadge status={overview.robots.offline > 0 ? 'offline' : 'active'} />
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">待处理异常</p>
              <p className="mt-3 text-[2.6rem] font-semibold tracking-[-0.07em] text-[var(--foreground)]">{overview.alerts.open}</p>
              <div className="mt-4">
                <StatusBadge status={overview.alerts.open > 0 ? 'error' : 'active'} />
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="书柜情况" description="逐个看看书柜现在能不能用、占了多少格口，还有多少异常。">
          {cabinets.length === 0 ? (
            <EmptyState title="没有找到内容" description="换个条件再试试。" />
          ) : (
            <div className="space-y-3">
              {cabinets.map((cabinet) => (
                <div
                  key={cabinet.id}
                  className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.3)] px-5 py-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <Flame className="mt-1 size-4 text-[var(--primary)]" />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{cabinet.name}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                          {cabinet.location ?? '还没填写位置'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                      <StatusBadge status={cabinet.status} />
                      <span className="rounded-full border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]">
                        已占用 {cabinet.occupied_slots}/{cabinet.slot_total}
                      </span>
                      <span className="text-sm text-[var(--muted-foreground)]">异常 {cabinet.open_alert_count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </WorkspacePanel>
      </div>
    </PageShell>
  )
}
