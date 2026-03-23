import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { getAdminReaders, updateAdminReader } from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import type { AdminReader } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<AdminReader>()
const pageHero = getAdminPageHero('readers')

const EMPTY_READER_EDITOR = {
  restrictionStatus: '',
  restrictionUntil: '',
  segmentCode: '',
  riskFlags: '',
}

export function ReadersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedReaderId, setSelectedReaderId] = useState<number | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editor, setEditor] = useState(EMPTY_READER_EDITOR)
  const deferredSearch = useDeferredValue(search)

  const readersQuery = useQuery({
    queryKey: ['admin', 'readers', deferredSearch],
    queryFn: () => getAdminReaders(deferredSearch.trim() || undefined),
  })

  const readers = readersQuery.data?.items ?? []
  const selectedReader = readers.find((reader) => reader.id === selectedReaderId) ?? readers[0] ?? null

  useEffect(() => {
    if (!selectedReaderId && readers[0]) {
      setSelectedReaderId(readers[0].id)
    }
  }, [readers, selectedReaderId])

  useEffect(() => {
    if (!selectedReader) {
      return
    }
    setEditor({
      restrictionStatus: selectedReader.restriction_status ?? '',
      restrictionUntil: selectedReader.restriction_until ?? '',
      segmentCode: selectedReader.segment_code ?? '',
      riskFlags: selectedReader.risk_flags.join(', '),
    })
  }, [selectedReader])

  const updateReaderMutation = useMutation({
    mutationFn: () => {
      if (!selectedReader) {
        throw new Error('No selected reader')
      }
      return updateAdminReader(selectedReader.id, {
        restriction_status: editor.restrictionStatus.trim() || undefined,
        restriction_until: editor.restrictionUntil.trim() || undefined,
        segment_code: editor.segmentCode.trim() || undefined,
        risk_flags: editor.riskFlags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'readers'] })
      if (selectedReader) {
        void queryClient.invalidateQueries({ queryKey: ['readers', selectedReader.id] })
      }
      setIsEditorOpen(false)
    },
  })

  const totalActiveOrders = useMemo(
    () => readers.reduce((sum, reader) => sum + reader.active_orders_count, 0),
    [readers],
  )
  const restrictedCount = useMemo(
    () => readers.filter((reader) => Boolean(reader.restriction_status) && reader.restriction_status !== 'none').length,
    [readers],
  )
  const highRiskCount = useMemo(
    () => readers.filter((reader) => reader.risk_flags.length > 0).length,
    [readers],
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Array<ColumnDef<AdminReader, any>> = [
    columnHelper.accessor('display_name', {
      header: '用户',
      cell: (info) => (
        <div>
          <p className="font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{info.row.original.username}</p>
        </div>
      ),
    }),
    columnHelper.accessor('college', { header: '学院', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('major', { header: '专业', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('restriction_status', {
      header: '借阅限制',
      cell: (info) => <StatusBadge status={info.getValue() ?? 'none'} />,
    }),
    columnHelper.accessor('segment_code', {
      header: '用户分群',
      cell: (info) => info.getValue() ?? '未分群',
    }),
    columnHelper.accessor('risk_flags', {
      header: '风险标签',
      cell: (info) => info.getValue().join(' / ') || '—',
    }),
    columnHelper.accessor('last_active_at', {
      header: '最近活跃',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.display({
      id: 'profile',
      header: '画像编辑',
      cell: (info) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedReaderId(info.row.original.id)
            setIsEditorOpen(true)
          }}
        >
          编辑画像
        </Button>
      ),
    }),
    columnHelper.display({
      id: 'detail',
      header: '详情',
      cell: (info) => (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/readers/${info.row.original.id}`}>查看</Link>
        </Button>
      ),
    }),
  ]

  return (
    <PageShell
      {...pageHero}
      eyebrow="读者管理"
      title="读者管理"
      description="查看读者信息、限制状态和风险标签。"
      statusLine="读者索引"
    >
      <MetricStrip
        items={[
          { label: '读者数量', value: readers.length, hint: '当前筛选结果中的读者' },
          { label: '限制中', value: restrictedCount, hint: '存在限制状态的读者' },
          { label: '有风险标记', value: highRiskCount, hint: '已经挂上风险标签的读者' },
          { label: '进行中订单', value: totalActiveOrders, hint: '当前正在处理的借阅数' },
        ]}
        className="xl:grid-cols-4"
      />

      <WorkspacePanel
        title="读者索引"
        description="按账号、学院、分群和限制状态筛选读者，画像编辑从右侧抽屉进入。"
        action={
          <Input
            className="w-full md:w-80"
            placeholder="搜索账号、姓名、学院、分群..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        }
      >
        {readersQuery.isLoading ? (
          <LoadingState label="加载中" />
        ) : (
          <DataTable
            columns={columns}
            data={readers}
            emptyTitle="暂无数据"
            emptyDescription="当前条件下没有可用数据。"
          />
        )}
      </WorkspacePanel>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>画像编辑</SheetTitle>
            <SheetDescription>围绕当前读者调整限制、分群和风险标签，并核对最近活跃与偏好信息。</SheetDescription>
          </SheetHeader>

          {!selectedReader ? (
            readersQuery.isLoading ? (
              <LoadingState label="加载中" />
            ) : (
              <EmptyState title="暂无数据" description="当前条件下没有可用读者可供编辑。" />
            )
          ) : (
            <>
              <section className="space-y-5">
                <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.78)] px-5 py-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">当前读者</p>
                      <p className="text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{selectedReader.display_name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">{selectedReader.username}</p>
                    </div>
                    <div className="space-y-2 text-right">
                      <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">当前限制</p>
                      <StatusBadge status={selectedReader.restriction_status ?? 'none'} />
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-[var(--muted-foreground)] sm:grid-cols-2">
                    <p>{selectedReader.college ?? '学院待补充'}</p>
                    <p>{selectedReader.major ?? '专业待补充'}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="reader-restriction-status">限制状态</Label>
                    <Input
                      id="reader-restriction-status"
                      value={editor.restrictionStatus}
                      onChange={(event) => setEditor((current) => ({ ...current, restrictionStatus: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reader-restriction-until">限制到期</Label>
                    <Input
                      id="reader-restriction-until"
                      value={editor.restrictionUntil}
                      onChange={(event) => setEditor((current) => ({ ...current, restrictionUntil: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reader-segment-code">用户分群</Label>
                  <Input
                    id="reader-segment-code"
                    value={editor.segmentCode}
                    onChange={(event) => setEditor((current) => ({ ...current, segmentCode: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reader-risk-flags">风险标签</Label>
                  <Textarea
                    id="reader-risk-flags"
                    value={editor.riskFlags}
                    onChange={(event) => setEditor((current) => ({ ...current, riskFlags: event.target.value }))}
                  />
                </div>
              </section>

              <section className="space-y-4 border-t border-[var(--line-subtle)] pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.62)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">最近活跃</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{formatDateTime(selectedReader.last_active_at)}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.62)] px-4 py-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">进行中订单</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--foreground)]">{selectedReader.active_orders_count}</p>
                  </div>
                </div>

                <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.62)] px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">偏好信息</p>
                  <pre className="mt-3 whitespace-pre-wrap break-all text-sm leading-6 text-[var(--foreground)]">
                    {JSON.stringify(selectedReader.preference_profile_json ?? {}, null, 2)}
                  </pre>
                </div>
              </section>

              <SheetFooter>
                <Button
                  type="button"
                  className="min-w-36"
                  disabled={updateReaderMutation.isPending}
                  onClick={() => updateReaderMutation.mutate()}
                >
                  {updateReaderMutation.isPending ? '保存中…' : '保存画像设置'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
