import { useQuery } from '@tanstack/react-query'
import { BarChart3, BookOpenText, Bot, TrendingUp, Users } from 'lucide-react'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { SectionIntro } from '@/components/shared/section-intro'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  getAdminBorrowTrends,
  getAdminCabinetTurnover,
  getAdminCollegePreferences,
  getAdminPopularBooks,
  getAdminRetention,
  getAdminRobotEfficiency,
  getAdminTimePeaks,
} from '@/lib/api/analytics'

const pageHero = getAdminPageHero('analytics')

export function AnalyticsPage() {
  const borrowTrendsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'borrow-trends'],
    queryFn: () => getAdminBorrowTrends(7),
  })
  const collegePreferencesQuery = useQuery({
    queryKey: ['admin', 'analytics', 'college-preferences'],
    queryFn: getAdminCollegePreferences,
  })
  const timePeaksQuery = useQuery({
    queryKey: ['admin', 'analytics', 'time-peaks'],
    queryFn: () => getAdminTimePeaks(7),
  })
  const popularBooksQuery = useQuery({
    queryKey: ['admin', 'analytics', 'popular-books'],
    queryFn: () => getAdminPopularBooks(5),
  })
  const cabinetTurnoverQuery = useQuery({
    queryKey: ['admin', 'analytics', 'cabinet-turnover'],
    queryFn: () => getAdminCabinetTurnover(7),
  })
  const robotEfficiencyQuery = useQuery({
    queryKey: ['admin', 'analytics', 'robot-efficiency'],
    queryFn: getAdminRobotEfficiency,
  })
  const retentionQuery = useQuery({
    queryKey: ['admin', 'analytics', 'retention'],
    queryFn: getAdminRetention,
  })

  const isLoading =
    borrowTrendsQuery.isLoading ||
    collegePreferencesQuery.isLoading ||
    timePeaksQuery.isLoading ||
    popularBooksQuery.isLoading ||
    cabinetTurnoverQuery.isLoading ||
    robotEfficiencyQuery.isLoading ||
    retentionQuery.isLoading

  if (isLoading) {
    return (
      <PageShell
        {...pageHero}
        eyebrow="数据分析"
        title="数据分析"
        description="查看借阅、偏好、库存和设备数据。"
        statusLine="借阅走势"
      >
        <LoadingState label="加载中" />
      </PageShell>
    )
  }

  const borrowTrends = borrowTrendsQuery.data
  const collegePreferences = collegePreferencesQuery.data
  const timePeaks = timePeaksQuery.data
  const popularBooks = popularBooksQuery.data
  const cabinetTurnover = cabinetTurnoverQuery.data
  const robotEfficiency = robotEfficiencyQuery.data
  const retention = retentionQuery.data

  if (!borrowTrends || !collegePreferences || !timePeaks || !popularBooks || !cabinetTurnover || !robotEfficiency || !retention) {
    return (
      <PageShell
        {...pageHero}
        eyebrow="数据分析"
        title="数据分析"
        description="查看借阅、偏好、库存和设备数据。"
        statusLine="借阅走势"
      >
        <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
      </PageShell>
    )
  }

  return (
    <PageShell
      {...pageHero}
      eyebrow="数据分析"
      title="数据分析"
      description="查看借阅、偏好、库存和设备数据。"
      statusLine="借阅走势"
    >
      <MetricStrip
        items={[
          {
            label: '近 7 日借阅',
            value: borrowTrends.summary.total_orders,
            hint: `高峰日 ${borrowTrends.summary.peak_day ?? '—'}`,
            icon: <BookOpenText className="size-5" />,
          },
          {
            label: '高峰时段',
            value: timePeaks.summary.peak_hour ?? '—',
            hint: `峰值 ${timePeaks.summary.peak_count} 单`,
            icon: <TrendingUp className="size-5" />,
          },
          {
            label: '活跃读者',
            value: retention.summary.active_readers_7d,
            hint: '最近 7 日活跃读者数',
            icon: <Users className="size-5" />,
          },
          {
            label: '留存率',
            value: `${retention.summary.retention_rate_7d}%`,
            hint: `${retention.summary.retained_readers_7d} 位读者持续活跃`,
            icon: <BarChart3 className="size-5" />,
          },
        ]}
        className="xl:grid-cols-4"
      />

      <SectionIntro
        eyebrow="分析"
        title="数据分区"
        description="按偏好、预测、周转和设备效率拆开查看。"
      />

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.92fr]">
        <WorkspacePanel
          title="学院偏好"
          description="查看不同学院的主要借阅分类偏好。"
        >
          <div className="space-y-3">
            {collegePreferences.items.map((item) => (
              <div key={item.college} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-[var(--foreground)]">{item.college}</p>
                  <span className="text-sm text-[var(--muted-foreground)]">{item.total_orders} 单</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                  {item.categories.map((category) => `${category.category} (${category.count})`).join(' / ')}
                </p>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="热门图书"
          description="查看可能继续升温的图书。"
          tone="muted"
        >
          <div className="space-y-3">
            {popularBooks.items.map((book) => (
              <div key={book.book_id} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{book.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">借阅 {book.borrow_count} 次</p>
                  </div>
                  <span className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{book.prediction_score}</span>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <WorkspacePanel title="书柜周转" description="按书柜查看库存事件和周转强度。">
          <div className="space-y-3">
            {cabinetTurnover.items.map((item) => (
              <div key={item.cabinet_id} className="flex items-center justify-between rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{item.cabinet_id}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{item.cabinet_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{item.turnover_rate}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">周转率</p>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>

        <WorkspacePanel title="机器人效率" description="查看机器人任务完成率和任务压力。">
          <div className="space-y-3">
            {robotEfficiency.items.map((robot) => (
              <div key={robot.robot_id} className="flex items-center justify-between rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <Bot className="size-4 text-[var(--primary)]" />
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{robot.code}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">进行中任务 {robot.active_tasks}</p>
                  </div>
                </div>
                <span className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{robot.completion_rate}%</span>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </div>

      <WorkspacePanel title="借阅趋势" description="展示每日借阅量。">
        <div className="grid gap-3 md:grid-cols-3">
          {borrowTrends.items.map((item) => (
            <div key={item.date} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
              <p className="text-sm text-[var(--muted-foreground)]">{item.date}</p>
              <p className="mt-2 text-[2rem] font-semibold tracking-[-0.06em] text-[var(--foreground)]">{item.count}</p>
            </div>
          ))}
        </div>
      </WorkspacePanel>
    </PageShell>
  )
}
