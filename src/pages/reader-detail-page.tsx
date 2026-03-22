import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatCard } from '@/components/shared/stat-card'
import { StatusBadge } from '@/components/shared/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getReaderConversations, getReaderDetail, getReaderOrders, getReaderOverview, getReaderRecommendations } from '@/lib/api/readers'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import type { OrderBundle, ReaderConversation, ReaderRecommendation } from '@/types/domain'
import { formatDateTime } from '@/utils'

const orderColumnHelper = createColumnHelper<OrderBundle>()
const conversationColumnHelper = createColumnHelper<ReaderConversation>()
const recommendationColumnHelper = createColumnHelper<ReaderRecommendation>()

export function ReaderDetailPage() {
  const params = useParams()
  const readerId = Number(params.readerId)

  const detailQuery = useQuery({
    enabled: Number.isFinite(readerId),
    queryKey: ['readers', readerId, 'detail'],
    queryFn: () => getReaderDetail(readerId),
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
    return <LoadingState label="正在加载读者详情…" />
  }

  if (!detailQuery.data || !overviewQuery.data) {
    return <EmptyState title="读者不存在" description="请回到读者列表重新选择一个有效读者。" />
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
    recommendationColumnHelper.accessor('created_at', {
      header: '推荐时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  const overview = overviewQuery.data

  return (
    <PageShell title={detailQuery.data.display_name} description={`${detailQuery.data.college ?? '未填写学院'} · ${detailQuery.data.major ?? '未填写专业'}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="活跃订单" value={overview.stats.active_orders_count} />
        <StatCard title="借阅历史" value={overview.stats.borrow_history_count} />
        <StatCard title="推荐记录" value={overview.stats.recommendation_count} />
        <StatCard title="会话数量" value={overview.stats.conversation_count} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>读者全景</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">账号</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">{detailQuery.data.username}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">身份</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">{detailQuery.data.affiliation_type ?? '未填写'}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近活跃</p>
              <p className="mt-2 font-semibold text-[var(--foreground)]">{formatDateTime(detailQuery.data.last_active_at)}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近查询</p>
              <p className="mt-2 text-sm text-[var(--foreground)]">{overview.recent_queries.join(' / ') || '暂无'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">借阅订单</TabsTrigger>
          <TabsTrigger value="conversations">会话记录</TabsTrigger>
          <TabsTrigger value="recommendations">推荐记录</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <DataTable columns={orderColumns} data={ordersQuery.data ?? []} emptyTitle="暂无借阅订单" emptyDescription="该读者还没有借阅记录。" />
        </TabsContent>
        <TabsContent value="conversations">
          <DataTable columns={conversationColumns} data={conversationsQuery.data ?? []} emptyTitle="暂无会话" emptyDescription="该读者还没有会话记录。" />
        </TabsContent>
        <TabsContent value="recommendations">
          <DataTable columns={recommendationColumns} data={recommendationsQuery.data ?? []} emptyTitle="暂无推荐记录" emptyDescription="该读者还没有推荐历史。" />
        </TabsContent>
      </Tabs>
    </PageShell>
  )
}
