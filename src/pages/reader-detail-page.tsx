import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link, useParams } from 'react-router-dom'

import { filledPrimaryActionButtonClassName } from '@/components/shared/action-button-styles'
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
import { formatOrderModeLabel, formatRiskFlagList } from '@/lib/display-labels'
import { getAdminReader } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { getReaderConversations, getReaderOrders, getReaderOverview, getReaderRecommendations } from '@/lib/api/readers'
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
    queryKey: ['readers', readerId, 'detail'],
    queryFn: () => getAdminReader(readerId),
  })
  const overviewQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['readers', readerId, 'overview'],
    queryFn: () => getReaderOverview(readerId),
  })
  const ordersQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['readers', readerId, 'orders'],
    queryFn: () => getReaderOrders(readerId),
  })
  const conversationsQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['readers', readerId, 'conversations'],
    queryFn: () => getReaderConversations(readerId),
  })
  const recommendationsQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['readers', readerId, 'recommendations'],
    queryFn: () => getReaderRecommendations(readerId),
  })

  if (detailQuery.isLoading || overviewQuery.isLoading) {
    return <LoadingState label="正在载入" />
  }

  if (!detailQuery.data || !overviewQuery.data) {
    return <EmptyState title="没有找到内容" description="换个条件再试试。" />
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderColumns: Array<ColumnDef<OrderBundle, any>> = [
    orderColumnHelper.accessor((row) => row.borrow_order.id, {
      id: 'id',
      header: '订单号',
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.status, {
      id: 'status',
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.order_mode, {
      id: 'mode',
      header: '模式',
      cell: (info) => formatOrderModeLabel(info.getValue()),
    }),
    orderColumnHelper.accessor((row) => row.borrow_order.created_at, {
      id: 'created_at',
      header: '创建时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conversationColumns: Array<ColumnDef<ReaderConversation, any>> = [
    conversationColumnHelper.accessor('status', {
      header: '会话状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    conversationColumnHelper.accessor('message_count', { header: '消息数' }),
    conversationColumnHelper.accessor('last_message_preview', {
      header: '最后一条消息',
      cell: (info) => info.getValue() ?? '—',
    }),
    conversationColumnHelper.accessor('last_message_at', {
      header: '最后活跃',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendationColumns: Array<ColumnDef<ReaderRecommendation, any>> = [
    recommendationColumnHelper.accessor('book_title', { header: '推荐书目' }),
    recommendationColumnHelper.accessor('query_text', { header: '查询词' }),
    recommendationColumnHelper.accessor('score', { header: '分数' }),
    recommendationColumnHelper.accessor('provider_note', {
      header: '来源',
      cell: (info) => info.getValue() ?? '—',
    }),
    recommendationColumnHelper.accessor('explanation', {
      header: '推荐理由',
      cell: (info) => info.getValue() ?? '—',
    }),
    recommendationColumnHelper.accessor('created_at', {
      header: '推荐时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  const overview = overviewQuery.data

  return (
    <PageShell
      {...pageHero}
      eyebrow="读者"
      title={detailQuery.data.display_name}
      description={`${detailQuery.data.college ?? '暂未填写学院'} · ${detailQuery.data.major ?? '暂未填写专业'}`}
      statusLine="读者信息"
    >
      <div className="flex flex-wrap gap-3">
        <Button
          asChild
          variant="default"
          className={filledPrimaryActionButtonClassName}
        >
          <Link to="/readers">返回读者列表</Link>
        </Button>
      </div>

      <MetricStrip
        items={[
          { label: '处理中订单', value: overview.stats.active_orders_count, hint: '现在还在处理的借阅数量' },
          { label: '借阅记录', value: overview.stats.borrow_history_count, hint: '累计借阅记录数' },
          { label: '推荐记录', value: overview.stats.recommendation_count, hint: '推荐和点击记录' },
          { label: '咨询记录', value: overview.stats.conversation_count, hint: '搜索和咨询次数' },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <WorkspacePanel title="记录" description="把借阅、咨询和推荐记录放在一起看。">
            <Tabs defaultValue="orders">
              <TabsList>
                <TabsTrigger value="orders">借阅订单</TabsTrigger>
                <TabsTrigger value="conversations">咨询记录</TabsTrigger>
                <TabsTrigger value="recommendations">推荐记录</TabsTrigger>
              </TabsList>
              <TabsContent value="orders">
                <DataTable columns={orderColumns} data={ordersQuery.data ?? []} emptyTitle="没有找到记录" emptyDescription="换个条件再试试。" />
              </TabsContent>
              <TabsContent value="conversations">
                <DataTable
                  columns={conversationColumns}
                  data={conversationsQuery.data ?? []}
                  emptyTitle="没有找到记录"
                  emptyDescription="换个条件再试试。"
                />
              </TabsContent>
              <TabsContent value="recommendations">
                <DataTable
                  columns={recommendationColumns}
                  data={recommendationsQuery.data ?? []}
                  emptyTitle="没有找到记录"
                  emptyDescription="换个条件再试试。"
                />
              </TabsContent>
            </Tabs>
          </WorkspacePanel>
        </div>

        <div className="space-y-6">
          <InspectorPanel title="读者信息" description="查看账号、最近查询、限制状态和注意标记。">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">账号</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{detailQuery.data.username}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">身份</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{detailQuery.data.affiliation_type ?? '未填写'}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近活跃</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{formatDateTime(detailQuery.data.last_active_at)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近查询</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{overview.recent_queries.join(' / ') || '没有找到记录'}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">借阅限制</p>
                  <div className="mt-2">
                    <StatusBadge status={detailQuery.data.restriction_status ?? 'none'} />
                  </div>
                </div>
                <div className="rounded-2xl bg-[var(--surface-container-low)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">分组</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{detailQuery.data.segment_code ?? '未分组'}</p>
                </div>
              </div>
            </div>
          </InspectorPanel>

          <WorkspacePanel title="偏好和标记" description="查看借阅偏好、注意标记和最近搜索。">
            <div className="space-y-4">
              <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.38)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">注意标记</p>
                  <p className="mt-2 text-sm text-[var(--foreground)]">{detailQuery.data.risk_flags.length ? formatRiskFlagList(detailQuery.data.risk_flags) : '没有找到记录'}</p>
              </div>
              <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.38)] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近查询</p>
                <p className="mt-2 text-sm text-[var(--foreground)]">{overview.recent_queries.join(' / ') || '没有找到记录'}</p>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </PageShell>
  )
}
