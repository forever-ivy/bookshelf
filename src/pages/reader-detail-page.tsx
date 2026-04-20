import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link, useParams } from 'react-router-dom'

import {
  ArrowLeft,
  CalendarClock,
  History,
  MessageSquare,
  Package,
  ScrollText,
  Search,
  Sparkles,
  User,
} from 'lucide-react'
import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAdminReader } from '@/lib/api/management'
import { formatOrderModeLabel } from '@/lib/display-labels'
import { getAdminPageHero } from '@/lib/page-hero'
import type { OrderBundle, ReaderConversation, ReaderRecommendation } from '@/types/domain'
import { formatDateTime } from '@/utils'

const orderColumnHelper = createColumnHelper<OrderBundle>()
const conversationColumnHelper = createColumnHelper<ReaderConversation>()
const recommendationColumnHelper = createColumnHelper<ReaderRecommendation>()
const pageHero = getAdminPageHero('reader-detail')

export function ReaderDetailPage() {
  const params = useParams()
  const readerId = Number(params.readerId)

  const detailQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['admin', 'readers', readerId, 'detail'],
    queryFn: () => getAdminReader(readerId),
  })

  if (detailQuery.isLoading) {
    return <LoadingState label="正在准备读者动态..." />
  }

  if (!detailQuery.data) {
    return <EmptyState title="未找到该读者" description="该读者可能已被移除或编号有误。" />
  }

  const reader = detailQuery.data
  const overview = {
    stats: {
      active_orders_count: reader.active_orders_count ?? 0,
      borrow_history_count: 0,
      recommendation_count: 0,
      conversation_count: 0,
    },
    recent_queries: [],
  }
  const orders: OrderBundle[] = []
  const conversations: ReaderConversation[] = []
  const recommendations: ReaderRecommendation[] = []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderColumns: Array<ColumnDef<OrderBundle, any>> = [
    orderColumnHelper.accessor((row) => row.borrow_order.id, {
      id: 'id',
      header: '订单号',
      cell: (info) => (
        <span className="font-mono text-xs font-bold tracking-tight text-[var(--foreground)] opacity-80">
          #{info.getValue()}
        </span>
      ),
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.status, {
      id: 'status',
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.order_mode, {
      id: 'mode',
      header: '服务类型',
      cell: (info) => (
        <span className="text-xs font-bold text-[var(--muted-foreground)]">
          {formatOrderModeLabel(info.getValue())}
        </span>
      ),
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.created_at, {
      id: 'created_at',
      header: '下单时间',
      cell: (info) => (
        <span className="text-xs font-medium text-[var(--muted-foreground)] opacity-70">
          {formatDateTime(info.getValue())}
        </span>
      ),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationColumns: Array<ColumnDef<ReaderConversation, any>> = [
    conversationColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    conversationColumnHelper.accessor('message_count', {
      header: '轮次',
      cell: (info) => (
        <span className="text-[13px] font-black text-[var(--foreground)] tabular-nums">
          {info.getValue()}
        </span>
      ),
    }),
    conversationColumnHelper.accessor('last_message_preview', {
      header: '最后对话',
      cell: (info) => (
        <p className="max-w-xs truncate text-[13px] font-medium text-[var(--muted-foreground)]">
          {info.getValue() ?? '—'}
        </p>
      ),
    }),
    conversationColumnHelper.accessor('last_message_at', {
      header: '最近活跃',
      cell: (info) => (
        <span className="text-[12px] font-medium text-[var(--muted-foreground)] opacity-60">
          {formatDateTime(info.getValue())}
        </span>
      ),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendationColumns: Array<ColumnDef<ReaderRecommendation, any>> = [
    recommendationColumnHelper.accessor('book_title', {
      header: '书名',
      cell: (info) => <span className="text-[13px] font-bold text-[var(--foreground)]">{info.getValue()}</span>,
    }),
    recommendationColumnHelper.accessor('score', {
      header: '相关度',
      cell: (info) => (
        <span className="text-[13px] font-mono font-black text-[var(--primary)] tabular-nums">
          {(info.getValue() * 100).toFixed(0)}%
        </span>
      ),
    }),
    recommendationColumnHelper.accessor('explanation', {
      header: '推荐上下文',
      cell: (info) => (
        <p className="max-w-md truncate text-[12px] font-medium text-[var(--muted-foreground)] opacity-80">
          {info.getValue() ?? '—'}
        </p>
      ),
    }),
  ]

  return (
    <PageShell
      {...pageHero}
      eyebrow="读者检索"
      title={reader.display_name}
      description={`${reader.college ?? '未分配学院'} · ${reader.major ?? '未分配专业'}`}
      statusLine="实时动态追踪"
    >
      <div className="mb-2">
        <Button
          asChild
          variant="outline"
          className="h-9 gap-2 rounded-full border-[var(--line-subtle)] bg-white/50 px-4 text-[13px] font-bold text-[var(--muted-foreground)] hover:bg-white hover:text-[var(--foreground)] transition-all active:scale-[0.98]"
        >
          <Link to="/readers">
            <ArrowLeft className="size-4" />
            返回读者列表
          </Link>
        </Button>
      </div>

      <MetricStrip
        items={[
          {
            label: '执行中订单',
            value: overview.stats.active_orders_count,
            hint: '当前正在处理中的任务',
            icon: <Package className="size-4" />,
          },
          {
            label: '历史借阅',
            value: overview.stats.borrow_history_count,
            hint: '该读者累计借阅书目总数',
            icon: <History className="size-4" />,
          },
          {
            label: '智能推荐',
            value: overview.stats.recommendation_count,
            hint: '基于 AI 生成的个性化书单建议',
            icon: <Sparkles className="size-4" />,
          },
          {
            label: '对话咨询',
            value: overview.stats.conversation_count,
            hint: '与 AI 助手或人工进行的交互次数',
            icon: <MessageSquare className="size-4" />,
          },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <WorkspacePanel title="读者实时记录" description="汇总展示该读者在平台产生的所有行为记录。">
            <Tabs defaultValue="orders" className="w-full">
              <TabsList className="bg-[var(--surface-panel)] p-1 h-11 mb-6 rounded-full inline-flex">
                <TabsTrigger
                  value="orders"
                  className="rounded-full px-6 text-[13px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--foreground)] transition-all"
                >
                  借阅订单
                </TabsTrigger>
                <TabsTrigger
                  value="conversations"
                  className="rounded-full px-6 text-[13px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--foreground)] transition-all"
                >
                  咨询记录
                </TabsTrigger>
                <TabsTrigger
                  value="recommendations"
                  className="rounded-full px-6 text-[13px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-[var(--foreground)] transition-all"
                >
                  推荐记录
                </TabsTrigger>
              </TabsList>
              <TabsContent value="orders" className="outline-none">
                <DataTable
                  columns={orderColumns}
                  data={orders}
                  emptyTitle="暂无借阅记录"
                  emptyDescription="该读者目前还没有产生任何借阅订单。"
                />
              </TabsContent>
              <TabsContent value="conversations" className="outline-none">
                <DataTable
                  columns={conversationColumns}
                  data={conversations}
                  emptyTitle="暂无咨询历史"
                  emptyDescription="系统未监测到该读者的任何对话咨询记录。"
                />
              </TabsContent>
              <TabsContent value="recommendations" className="outline-none">
                <DataTable
                  columns={recommendationColumns}
                  data={recommendations}
                  emptyTitle="暂无推荐记录"
                  emptyDescription="AI 推荐引擎尚未为该用户生成个性化书目。"
                />
              </TabsContent>
            </Tabs>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <InspectorPanel
            title="读者身份卡片"
            description="核心身份标识与权限状态概览。"
            className="rounded-[1.25rem] bg-white shadow-sm border-[var(--line-subtle)]"
          >
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="group rounded-2xl bg-[var(--surface-panel)] border border-transparent px-4 py-4 transition-all hover:border-[var(--line-subtle)] hover:bg-white hover:shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <User className="size-3.5 text-[var(--muted-foreground)] opacity-60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">读者账号</p>
                  </div>
                  <p className="font-mono text-[14px] font-bold text-[var(--foreground)]">{reader.username}</p>
                </div>
                <div className="group rounded-2xl bg-[var(--surface-panel)] border border-transparent px-4 py-4 transition-all hover:border-[var(--line-subtle)] hover:bg-white hover:shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <ScrollText className="size-3.5 text-[var(--muted-foreground)] opacity-60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">身份类型</p>
                  </div>
                  <p className="text-[14px] font-bold text-[var(--foreground)]">{reader.affiliation_type ?? '未登记'}</p>
                </div>
                <div className="group rounded-2xl bg-[var(--surface-panel)] border border-transparent px-4 py-4 transition-all hover:border-[var(--line-subtle)] hover:bg-white hover:shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <CalendarClock className="size-3.5 text-[var(--muted-foreground)] opacity-60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近活跃</p>
                  </div>
                  <p className="text-[14px] font-bold text-[var(--foreground)]">{formatDateTime(reader.last_active_at)}</p>
                </div>
                <div className="group rounded-2xl bg-[var(--surface-panel)] border border-transparent px-4 py-4 transition-all hover:border-[var(--line-subtle)] hover:bg-white hover:shadow-sm">
                  <div className="flex items-center gap-2.5 mb-2">
                    <Search className="size-3.5 text-[var(--muted-foreground)] opacity-60" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">业务分组</p>
                  </div>
                  <p className="text-[14px] font-bold text-[var(--foreground)]">{reader.segment_code ?? '常规分组'}</p>
                </div>
              </div>

              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4 border border-[var(--line-subtle)]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前借阅限制</p>
                  <StatusBadge status={reader.restriction_status ?? 'none'} />
                </div>
              </div>
            </div>
          </InspectorPanel>

          <WorkspacePanel
            title="偏好与注意项"
            description="基于行为分析得出的注意标记与高频搜索。"
            className="rounded-[1.25rem] bg-white shadow-sm border-[var(--line-subtle)]"
          >
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-1.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">注意标记 (Risk Flags)</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {reader.risk_flags.length ? (
                    reader.risk_flags.map((flag) => (
                      <span key={flag} className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-orange-600 border border-orange-100 italic">
                        #{flag}
                      </span>
                    ))
                  ) : (
                    <p className="text-[13px] font-medium text-[var(--muted-foreground)] opacity-60">暂无任何注意标记或违规记录。</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] p-4">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="size-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">近期搜索关键词</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {overview.recent_queries.length ? (
                    overview.recent_queries.map((query) => (
                      <span key={query} className="inline-flex rounded-full bg-white px-3 py-1 text-[12px] font-bold text-[var(--foreground)] border border-[var(--line-subtle)] shadow-sm">
                        {query}
                      </span>
                    ))
                  ) : (
                    <p className="text-[13px] font-medium text-[var(--muted-foreground)] opacity-60">最近 30 天内没有记录到搜索行为。</p>
                  )}
                </div>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </PageShell>
  )
}
