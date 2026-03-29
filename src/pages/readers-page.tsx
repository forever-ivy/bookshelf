import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

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
import { formatRiskFlagList } from '@/lib/display-labels'
import { getAdminPageHero } from '@/lib/page-hero'
import { patchSearchParams, readOptionalSearchParam, readSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import type { AdminReader } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<AdminReader>()
const pageHero = getAdminPageHero('readers')
const READERS_PAGE_SIZE = 20

const EMPTY_READER_EDITOR = {
  restrictionStatus: '',
  restrictionUntil: '',
  segmentCode: '',
  riskFlags: '',
}

export function ReadersPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const searchQuery = readOptionalSearchParam(searchParams, 'q')
  const restrictionStatusFilter = readOptionalSearchParam(searchParams, 'restriction_status')
  const segmentCodeFilter = readOptionalSearchParam(searchParams, 'segment_code')
  const [search, setSearch] = useState(() => readSearchParam(searchParams, 'q'))
  const [segmentSearch, setSegmentSearch] = useState(() => readSearchParam(searchParams, 'segment_code'))
  const [page, setPage] = useState(1)
  const [selectedReaderId, setSelectedReaderId] = useState<number | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editor, setEditor] = useState(EMPTY_READER_EDITOR)

  const readersQuery = useQuery({
    queryKey: ['admin', 'readers', searchQuery, restrictionStatusFilter, segmentCodeFilter, page],
    queryFn: () =>
      getAdminReaders({
        query: searchQuery,
        restrictionStatus: restrictionStatusFilter,
        segmentCode: segmentCodeFilter,
        page,
        pageSize: READERS_PAGE_SIZE,
      }),
  })

  const readers = readersQuery.data?.items ?? []
  const totalReaders = readersQuery.data?.total ?? 0
  const selectedReader = readers.find((reader) => reader.id === selectedReaderId) ?? readers[0] ?? null

  useEffect(() => {
    if (!selectedReaderId && readers[0]) {
      setSelectedReaderId(readers[0].id)
    }
  }, [readers, selectedReaderId])

  useEffect(() => {
    const nextSearch = readSearchParam(searchParams, 'q')
    if (nextSearch !== search) {
      setSearch(nextSearch)
    }
  }, [search, searchParams])

  useEffect(() => {
    const nextSegmentSearch = readSearchParam(searchParams, 'segment_code')
    if (nextSegmentSearch !== segmentSearch) {
      setSegmentSearch(nextSegmentSearch)
    }
  }, [searchParams, segmentSearch])

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
      header: '分组',
      cell: (info) => info.getValue() ?? '未分组',
    }),
    columnHelper.accessor('risk_flags', {
      header: '注意标记',
      cell: (info) => formatRiskFlagList(info.getValue()),
    }),
    columnHelper.accessor('last_active_at', {
      header: '最近活跃',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.display({
      id: 'profile',
      header: '编辑',
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
          编辑资料
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
      eyebrow="读者"
      title="读者"
      description="查看读者信息、借阅限制和注意标记。"
      statusLine="读者列表"
    >
      <MetricStrip
        items={[
          { label: '读者数量', value: totalReaders, hint: '符合当前条件的读者总数' },
          { label: '受限制', value: restrictedCount, hint: '当前这一页里有限制的读者' },
          { label: '有注意标记', value: highRiskCount, hint: '当前这一页里带标记的读者' },
          { label: '处理中订单', value: totalActiveOrders, hint: '当前这一页里还在处理的订单' },
        ]}
        className="xl:grid-cols-4"
      />

      <WorkspacePanel
        title="读者列表"
        description="按账号、学院、分组和限制状态筛选读者，右侧可以直接改资料。"
        action={
          <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
            <Input
              className="w-full md:w-80"
              placeholder="搜索账号、姓名、学院或分组"
              value={search}
              onChange={(event) => {
                const nextValue = event.target.value
                setSearch(nextValue)
                setPage(1)
                setSearchParams(
                  patchSearchParams(searchParams, {
                    q: nextValue.trim() || undefined,
                  }),
                  { replace: true },
                )
              }}
            />
            <select
              aria-label="限制状态筛选"
              className="h-11 rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm text-[var(--foreground)]"
              value={restrictionStatusFilter ?? 'all'}
              onChange={(event) => {
                setPage(1)
                setSearchParams(
                  patchSearchParams(searchParams, {
                    restriction_status: event.target.value === 'all' ? undefined : event.target.value,
                  }),
                  { replace: true },
                )
              }}
            >
              <option value="all">全部限制</option>
              <option value="none">无限制</option>
              <option value="limited">受限</option>
              <option value="blacklist">禁止借阅</option>
            </select>
            <Input
              className="w-full md:w-56"
              placeholder="输入分组名称"
              value={segmentSearch}
              onChange={(event) => {
                const nextValue = event.target.value
                setSegmentSearch(nextValue)
                setPage(1)
                setSearchParams(
                  patchSearchParams(searchParams, {
                    segment_code: nextValue.trim() || undefined,
                  }),
                  { replace: true },
                )
              }}
            />
          </div>
        }
      >
        {readersQuery.isLoading ? (
          <LoadingState label="正在载入" />
        ) : (
          <DataTable
            columns={columns}
            data={readers}
            emptyTitle="没有找到内容"
            emptyDescription="换个条件再试试。"
            pagination={{
              page: readersQuery.data?.page ?? page,
              pageSize: readersQuery.data?.page_size ?? READERS_PAGE_SIZE,
              total: totalReaders,
              onPageChange: setPage,
            }}
          />
        )}
      </WorkspacePanel>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>编辑读者资料</SheetTitle>
            <SheetDescription>在这里修改限制状态、分组和注意标记，也能顺手看看最近使用情况。</SheetDescription>
          </SheetHeader>

          {!selectedReader ? (
            readersQuery.isLoading ? (
              <LoadingState label="正在载入" />
            ) : (
              <EmptyState title="没有找到内容" description="当前没有可编辑的读者。" />
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
                    <p>{selectedReader.college ?? '暂未填写学院'}</p>
                    <p>{selectedReader.major ?? '暂未填写专业'}</p>
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
                  <Label htmlFor="reader-segment-code">分组</Label>
                  <Input
                    id="reader-segment-code"
                    value={editor.segmentCode}
                    onChange={(event) => setEditor((current) => ({ ...current, segmentCode: event.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reader-risk-flags">注意标记</Label>
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
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">借阅偏好</p>
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
                  {updateReaderMutation.isPending ? '保存中…' : '保存读者资料'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
