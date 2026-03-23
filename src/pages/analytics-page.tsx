import { useQuery } from '@tanstack/react-query'
import { BookOpenText, Bot, Clock3, Gauge, Users } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { SectionIntro } from '@/components/shared/section-intro'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
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

const analyticsChartColors = {
  lakeBlue: '#4a8dff',
  aqua: '#28d4e5',
  mint: '#1fc6a6',
  coral: '#ff7a59',
  amber: '#f2b746',
} as const

const borrowTrendChartConfig = {
  count: { label: '借阅量', color: analyticsChartColors.lakeBlue },
} satisfies ChartConfig

const timePeakChartConfig = {
  count: { label: '借阅量', color: analyticsChartColors.mint },
} satisfies ChartConfig

const collegePreferenceChartConfig = {
  total_orders: { label: '借阅单量', color: analyticsChartColors.mint },
} satisfies ChartConfig

const popularBooksChartConfig = {
  borrow_count: { label: '借阅次数', color: analyticsChartColors.coral },
  prediction_score: { label: '预测分', color: analyticsChartColors.amber },
} satisfies ChartConfig

const cabinetTurnoverChartConfig = {
  turnover_rate: { label: '周转率', color: analyticsChartColors.amber },
} satisfies ChartConfig

const retentionChartConfig = {
  retention: { label: '留存率', color: analyticsChartColors.aqua },
} satisfies ChartConfig

const robotPalette = [analyticsChartColors.lakeBlue, analyticsChartColors.mint, analyticsChartColors.coral]

function formatShortDate(date: string) {
  return date.length >= 10 ? date.slice(5) : date
}

function formatHour(hour?: number | null) {
  if (hour === null || hour === undefined) {
    return '—'
  }

  return `${String(hour).padStart(2, '0')}:00`
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

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
        statusLine="分析简报"
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
        statusLine="分析简报"
      >
        <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
      </PageShell>
    )
  }

  const borrowTrendData = borrowTrends.items.map((item) => ({
    ...item,
    label: formatShortDate(item.date),
  }))

  const collegePreferenceData = [...collegePreferences.items]
    .sort((first, second) => second.total_orders - first.total_orders)
    .map((item) => ({
      ...item,
      category_summary: item.categories.map((category) => `${category.category} (${category.count})`).join(' / '),
    }))

  const popularBooksData = popularBooks.items.map((item) => ({
    ...item,
    short_title: item.title.length > 8 ? `${item.title.slice(0, 8)}…` : item.title,
  }))

  const cabinetTurnoverData = [...cabinetTurnover.items]
    .sort((first, second) => second.turnover_rate - first.turnover_rate)
    .map((item) => ({
      ...item,
      label: item.cabinet_id,
    }))

  const timePeakData = timePeaks.items.map((item) => ({
    ...item,
    label: formatHour(item.hour),
  }))

  const retentionRate = clampPercent(retention.summary.retention_rate_7d)

  return (
    <PageShell
      {...pageHero}
      eyebrow="数据分析"
      title="数据分析"
      description="查看借阅、偏好、库存和设备数据。"
      statusLine="分析简报"
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
            value: formatHour(timePeaks.summary.peak_hour),
            hint: `峰值 ${timePeaks.summary.peak_count} 单`,
            icon: <Clock3 className="size-5" />,
          },
          {
            label: '活跃读者',
            value: retention.summary.active_readers_7d,
            hint: '最近 7 日活跃读者数',
            icon: <Users className="size-5" />,
          },
          {
            label: '留存率',
            value: formatPercent(retentionRate),
            hint: `${retention.summary.retained_readers_7d} 位读者持续活跃`,
            icon: <Gauge className="size-5" />,
          },
        ]}
        className="xl:grid-cols-4"
      />

      <SectionIntro
        eyebrow="分析"
        title="分析简报"
        description="用趋势、分布与效率图表查看近期借阅节奏、学院偏好与设备表现。"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel
          title="借阅趋势总览"
          description="近 7 日借阅量变化与峰值日对比。"
          action={<span className="text-sm text-[var(--muted-foreground)]">总计 {borrowTrends.summary.total_orders} 单</span>}
        >
          <div className="space-y-4">
            <ChartContainer config={borrowTrendChartConfig}>
              <AreaChart data={borrowTrendData} margin={{ left: 4, right: 12, top: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="borrowTrendFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-count)" stopOpacity={0.36} />
                    <stop offset="100%" stopColor="var(--color-count)" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={34} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--line-strong)', strokeDasharray: '4 4' }}
                  content={<ChartTooltipContent labelFormatter={(label) => `日期 ${label ?? ''}`} />}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-count)"
                  strokeWidth={2.5}
                  fill="url(#borrowTrendFill)"
                />
              </AreaChart>
            </ChartContainer>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                <p className="text-sm text-[var(--muted-foreground)]">峰值日期</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {borrowTrends.summary.peak_day ?? '—'}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                <p className="text-sm text-[var(--muted-foreground)]">峰值借阅量</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {borrowTrends.summary.peak_count}
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                <p className="text-sm text-[var(--muted-foreground)]">观测天数</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {borrowTrends.items.length}
                </p>
              </div>
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="时段与留存洞察"
          description="高峰借阅时段与 7 日活跃留存概览。"
          tone="muted"
        >
          <div className="space-y-4">
            <ChartContainer config={timePeakChartConfig} className="h-[190px]">
              <BarChart data={timePeakData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <ChartTooltip
                  cursor={{ fill: 'rgba(33,73,140,0.06)' }}
                  content={<ChartTooltipContent labelFormatter={(label) => `时段 ${label ?? ''}`} />}
                />
                <Bar dataKey="count" fill="var(--color-count)" radius={[10, 10, 4, 4]} />
              </BarChart>
            </ChartContainer>

            <div className="grid gap-4 md:grid-cols-[0.86fr_1.14fr]">
              <div className="relative rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                <ChartContainer config={retentionChartConfig} className="h-[220px] border-none bg-transparent p-0">
                  <RadialBarChart
                    data={[{ name: '留存率', retention: retentionRate }]}
                    innerRadius="72%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar
                      dataKey="retention"
                      cornerRadius={14}
                      fill="var(--color-retention)"
                      background={{ fill: 'rgba(33,73,140,0.12)' }}
                    />
                  </RadialBarChart>
                </ChartContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[2rem] font-semibold tracking-[-0.05em] text-[var(--foreground)]">{formatPercent(retentionRate)}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">7 日留存</p>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                  <p className="text-sm text-[var(--muted-foreground)]">高峰时段</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    {formatHour(timePeaks.summary.peak_hour)}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">峰值 {timePeaks.summary.peak_count} 单</p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4">
                  <p className="text-sm text-[var(--muted-foreground)]">活跃读者</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                    {retention.summary.active_readers_7d}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    留存 {retention.summary.retained_readers_7d} / 总读者 {retention.summary.total_readers}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <WorkspacePanel
          title="学院借阅偏好"
          description="按学院查看借阅单量，并保留主要分类偏好。"
        >
          <div className="space-y-4">
            <ChartContainer config={collegePreferenceChartConfig} className="h-[340px]">
              <BarChart data={collegePreferenceData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="college"
                  tickLine={false}
                  axisLine={false}
                  width={88}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="total_orders" fill="var(--color-total_orders)" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="grid gap-3 md:grid-cols-2">
              {collegePreferenceData.map((item) => (
                <div
                  key={item.college}
                  className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-[var(--foreground)]">{item.college}</p>
                    <span className="text-sm text-[var(--muted-foreground)]">{item.total_orders} 单</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{item.category_summary}</p>
                </div>
              ))}
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="热门书目热度"
          description="借阅热度与预测分并排观察，辅助下一步推荐判断。"
          tone="muted"
        >
          <div className="space-y-4">
            <ChartContainer config={popularBooksChartConfig}>
              <ComposedChart data={popularBooksData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="short_title" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} width={30} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (name === '预测分' ? Number(value).toFixed(1) : value)}
                    />
                  }
                />
                <Legend content={<ChartLegendContent />} />
                <Bar
                  yAxisId="left"
                  dataKey="borrow_count"
                  fill="var(--color-borrow_count)"
                  radius={[10, 10, 4, 4]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="prediction_score"
                  stroke="var(--color-prediction_score)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: 'var(--color-prediction_score)' }}
                />
              </ComposedChart>
            </ChartContainer>

            <div className="space-y-3">
              {popularBooks.items.map((book) => (
                <div
                  key={book.book_id}
                  className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{book.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted-foreground)]">借阅 {book.borrow_count} 次</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{book.prediction_score}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">预测分</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </WorkspacePanel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <WorkspacePanel
          title="书柜周转对比"
          description="按书柜查看库存事件与周转强度。"
        >
          <div className="space-y-4">
            <ChartContainer config={cabinetTurnoverChartConfig}>
              <BarChart data={cabinetTurnoverData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="label" tickLine={false} axisLine={false} width={92} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent formatter={(value, name) => (name === '周转率' ? Number(value).toFixed(2) : value)} />
                  }
                />
                <Bar dataKey="turnover_rate" fill="var(--color-turnover_rate)" radius={[0, 12, 12, 0]} />
              </BarChart>
            </ChartContainer>

            <div className="space-y-3">
              {cabinetTurnover.items.map((item) => (
                <div
                  key={item.cabinet_id}
                  className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4"
                >
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{item.cabinet_id}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{item.cabinet_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{item.turnover_rate}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">周转率</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </WorkspacePanel>

        <WorkspacePanel
          title="机器人执行效率"
          description="按机器人查看任务完成率与当前任务压力。"
          tone="muted"
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {robotEfficiency.items.map((robot, index) => {
              const robotRate = clampPercent(robot.completion_rate)
              const robotColor = robotPalette[index % robotPalette.length]
              const robotChartConfig = {
                completion_rate: { label: '完成率', color: robotColor },
              } satisfies ChartConfig

              return (
                <div
                  key={robot.robot_id}
                  className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-container-lowest)] px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Bot className="size-4 text-[var(--primary)]" />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{robot.code}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">进行中任务 {robot.active_tasks}</p>
                      </div>
                    </div>
                    <span className="text-sm text-[var(--muted-foreground)]">{robot.total_tasks} 项</span>
                  </div>

                  <div className="relative mt-4">
                    <ChartContainer config={robotChartConfig} className="h-[210px] border-none bg-transparent p-0">
                      <RadialBarChart
                        data={[{ name: '完成率', completion_rate: robotRate }]}
                        innerRadius="72%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar
                          dataKey="completion_rate"
                          cornerRadius={14}
                          fill="var(--color-completion_rate)"
                          background={{ fill: 'rgba(24,24,20,0.08)' }}
                        />
                      </RadialBarChart>
                    </ChartContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-[1.8rem] font-semibold tracking-[-0.05em] text-[var(--foreground)]">{formatPercent(robotRate)}</p>
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">完成率</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </WorkspacePanel>
      </div>
    </PageShell>
  )
}
