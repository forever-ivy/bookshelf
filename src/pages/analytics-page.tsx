import { useState } from 'react'

import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BookOpenText, CalendarDays, Clock3, Gauge, Users } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  ChartContainer,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  getAdminBorrowTrends,
  getAdminCollegePreferences,
  getAdminPopularBooks,
  getAdminRetention,
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
} satisfies ChartConfig

const retentionChartConfig = {
  retention: { label: '留存率', color: analyticsChartColors.aqua },
} satisfies ChartConfig
const ANALYTICS_WINDOW_DAYS = 7

function formatShortDate(date: string) {
  return date.length >= 10 ? date.slice(5) : date
}

function getTodayInputValue() {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

function shiftDateString(dateValue: string, days: number) {
  const date = parseDateString(dateValue)
  date.setDate(date.getDate() + days)
  return formatDateString(date)
}

function parseDateString(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function formatDateString(date: Date) {
  return format(date, 'yyyy-MM-dd')
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
  const [anchorDate, setAnchorDate] = useState(getTodayInputValue)
  const windowStart = shiftDateString(anchorDate, -(ANALYTICS_WINDOW_DAYS - 1))
  const selectedAnchorDate = parseDateString(anchorDate)
  const maxAnchorDate = parseDateString(getTodayInputValue())

  const borrowTrendsQuery = useQuery({
    queryKey: ['admin', 'analytics', 'borrow-trends', ANALYTICS_WINDOW_DAYS, anchorDate],
    queryFn: () => getAdminBorrowTrends(ANALYTICS_WINDOW_DAYS, anchorDate),
  })
  const collegePreferencesQuery = useQuery({
    queryKey: ['admin', 'analytics', 'college-preferences', ANALYTICS_WINDOW_DAYS, anchorDate],
    queryFn: () => getAdminCollegePreferences(ANALYTICS_WINDOW_DAYS, anchorDate),
  })
  const timePeaksQuery = useQuery({
    queryKey: ['admin', 'analytics', 'time-peaks', ANALYTICS_WINDOW_DAYS, anchorDate],
    queryFn: () => getAdminTimePeaks(ANALYTICS_WINDOW_DAYS, anchorDate),
  })
  const popularBooksQuery = useQuery({
    queryKey: ['admin', 'analytics', 'popular-books', 5, ANALYTICS_WINDOW_DAYS, anchorDate],
    queryFn: () => getAdminPopularBooks(5, ANALYTICS_WINDOW_DAYS, anchorDate),
  })
  const retentionQuery = useQuery({
    queryKey: ['admin', 'analytics', 'retention', anchorDate],
    queryFn: () => getAdminRetention(anchorDate),
  })

  const isLoading =
    borrowTrendsQuery.isLoading ||
    collegePreferencesQuery.isLoading ||
    timePeaksQuery.isLoading ||
    popularBooksQuery.isLoading ||
    retentionQuery.isLoading

  if (isLoading) {
    return (
      <PageShell
        {...pageHero}
        eyebrow="统计"
        title="借阅统计"
        description="查看借书趋势、读者活跃情况和热门图书。"
        statusLine="借阅统计"
      >
        <LoadingState label="正在载入" />
      </PageShell>
    )
  }

  const borrowTrends = borrowTrendsQuery.data
  const collegePreferences = collegePreferencesQuery.data
  const timePeaks = timePeaksQuery.data
  const popularBooks = popularBooksQuery.data
  const retention = retentionQuery.data

  if (!borrowTrends || !collegePreferences || !timePeaks || !popularBooks || !retention) {
    return (
      <PageShell
        {...pageHero}
        eyebrow="统计"
        title="借阅统计"
        description="查看借书趋势、读者活跃情况和热门图书。"
        statusLine="借阅统计"
      >
        <EmptyState title="没有找到内容" description="换个条件再试试。" />
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

  const timePeakData = timePeaks.items.map((item) => ({
    ...item,
    label: formatHour(item.hour),
  }))

  const retentionRate = clampPercent(retention.summary.retention_rate_7d)

  return (
    <PageShell
      {...pageHero}
      eyebrow="统计"
      title="借阅统计"
      description="查看借书趋势、读者活跃情况和热门图书。"
      statusLine="借阅统计"
    >
      <div className="grid gap-4 rounded-[1.6rem] border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-5 py-5 md:grid-cols-[1fr_220px] md:items-end">
        <div className="space-y-1">
          <p className="text-sm font-medium text-[var(--foreground)]">分析观察日</p>
          <p className="text-sm leading-6 text-[var(--muted-foreground)]">
            当前查看 {anchorDate} 的统计结果，时间范围是 {windowStart} 到 {anchorDate}。
          </p>
        </div>
        <div className="space-y-2">
          <Label id="analytics-anchor-date-label" className="block text-sm text-[var(--muted-foreground)]">
            选择日期
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="analytics-anchor-date"
                type="button"
                variant="secondary"
                className="w-full justify-between rounded-2xl"
                aria-labelledby="analytics-anchor-date-label analytics-anchor-date-value"
              >
                <span id="analytics-anchor-date-value">{anchorDate}</span>
                <CalendarDays data-icon="inline-end" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-3">
              <Calendar
                mode="single"
                selected={selectedAnchorDate}
                month={selectedAnchorDate}
                disabled={{ after: maxAnchorDate }}
                onSelect={(date) => {
                  if (date) {
                    setAnchorDate(formatDateString(date))
                  }
                }}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

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
        eyebrow="统计"
        title="统计看板"
        description="用图表看看最近借书变化、读者活跃情况和热门图书。"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <WorkspacePanel
          title="近 7 天借书趋势"
          description="看看近 7 天借书数量怎么变化，哪一天最多。"
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
          title="高峰时段和活跃情况"
          description="看看一天里什么时候最忙，以及近 7 天有多少读者还在使用。"
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
          title="各学院借书情况"
          description="按学院看看借书数量和常借的分类。"
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
          title="热门图书"
          description="按借出次数看看哪些图书最受欢迎。"
          tone="muted"
        >
          <div className="space-y-4">
            <ChartContainer config={popularBooksChartConfig}>
              <BarChart data={popularBooksData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="short_title" tickLine={false} axisLine={false} tickMargin={10} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend content={<ChartLegendContent />} />
                <Bar
                  dataKey="borrow_count"
                  fill="var(--color-borrow_count)"
                  radius={[10, 10, 4, 4]}
                />
              </BarChart>
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
                  <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{book.borrow_count}</p>
                </div>
              ))}
            </div>
          </div>
        </WorkspacePanel>
      </div>

    </PageShell>
  )
}
