import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'

import { CalendarClock, Moon, PackageCheck, Shield, User, Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { getAdminReaders, updateAdminReader } from '@/lib/api/management'
import { formatRiskFlagLabel, formatRiskFlagList, formatStatusLabel } from '@/lib/display-labels'
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
  riskFlags: [] as string[],
}

const DEFAULT_RESTRICTION_STATUS_OPTIONS = ['none', 'limited', 'blacklist']
const DEFAULT_SEGMENT_OPTIONS = ['ai_power_user', 'cold_start', 'risk_watch', 'casual']
const DEFAULT_RISK_FLAG_OPTIONS = ['overdue', 'manual_review', 'high_frequency']

function formatDateTimeLocalValue(value?: string | null) {
  if (!value) {
    return ''
  }

  const normalizedValue = value.replace(' ', 'T')
  const parsed = new Date(normalizedValue)

  if (Number.isNaN(parsed.getTime())) {
    return normalizedValue.slice(0, 16)
  }

  const localDate = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
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
      restrictionUntil: formatDateTimeLocalValue(selectedReader.restriction_until),
      segmentCode: selectedReader.segment_code ?? '',
      riskFlags: selectedReader.risk_flags,
    })
  }, [selectedReader])

  const updateReaderMutation = useMutation({
    mutationFn: () => {
      if (!selectedReader) {
        throw new Error('No selected reader')
      }
      return updateAdminReader(selectedReader.id, {
        restriction_status: editor.restrictionStatus || undefined,
        restriction_until: editor.restrictionUntil || undefined,
        segment_code: editor.segmentCode || undefined,
        risk_flags: editor.riskFlags,
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
  const lateNightRatio = Number(selectedReader?.preference_profile_json?.late_night_ratio ?? 0)
  const restrictionStatusOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...DEFAULT_RESTRICTION_STATUS_OPTIONS, ...readers.map((reader) => reader.restriction_status), selectedReader?.restriction_status]
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [readers, selectedReader?.restriction_status],
  )
  const segmentOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...DEFAULT_SEGMENT_OPTIONS, ...readers.map((reader) => reader.segment_code), selectedReader?.segment_code]
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [readers, selectedReader?.segment_code],
  )
  const riskFlagOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [...DEFAULT_RISK_FLAG_OPTIONS, ...readers.flatMap((reader) => reader.risk_flags), ...editor.riskFlags]
            .filter((value): value is string => Boolean(value)),
        ),
      ),
    [editor.riskFlags, readers],
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
            <Select
              value={restrictionStatusFilter ?? 'all'}
              onValueChange={(value) => {
                setPage(1)
                setSearchParams(
                  patchSearchParams(searchParams, {
                    restriction_status: value === 'all' ? undefined : value,
                  }),
                  { replace: true },
                )
              }}
            >
              <SelectTrigger aria-label="限制状态筛选" className="md:w-[10rem]">
                <SelectValue placeholder="全部限制" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部限制</SelectItem>
                <SelectItem value="none">无限制</SelectItem>
                <SelectItem value="limited">受限</SelectItem>
                <SelectItem value="blacklist">禁止借阅</SelectItem>
              </SelectContent>
            </Select>
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
        <SheetContent className="w-full sm:max-w-xl">
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
            <div className="flex h-full flex-col">
              <ScrollArea className="flex-1 px-1">
                <div className="space-y-8 pb-8 pr-1 pt-2">
                  <div className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] border border-[var(--line-subtle)] text-[var(--muted-foreground)]">
                        <User className="size-7" />
                      </div>
                      <div>
                        <h4 className="text-[18px] font-bold tracking-tight text-[var(--foreground)]">{selectedReader.display_name}</h4>
                        <p className="text-[13px] text-[var(--muted-foreground)] font-medium">{selectedReader.username}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-[12px] font-semibold text-[var(--muted-foreground)] opacity-70">
                          <span>{selectedReader.college ?? '未分配学院'}</span>
                          <span className="opacity-30">·</span>
                          <span>{selectedReader.major ?? '未分配专业'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">借阅限制</p>
                       <StatusBadge status={selectedReader.restriction_status ?? 'none'} />
                    </div>
                  </div>

                  <section className="space-y-6">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ml-1" id="reader-restriction-status-label">
                          限制状态
                        </Label>
                        <Select
                          value={editor.restrictionStatus || 'none'}
                          onValueChange={(value) => setEditor((current) => ({ ...current, restrictionStatus: value }))}
                        >
                          <SelectTrigger aria-labelledby="reader-restriction-status-label" className="h-10 rounded-xl border-[var(--line-subtle)] bg-white/50 focus:bg-white transition-colors">
                            <SelectValue placeholder="选择限制状态" />
                          </SelectTrigger>
                          <SelectContent className="rounded-[1rem]">
                            {restrictionStatusOptions.map((value) => (
                              <SelectItem key={value} value={value} className="rounded-lg">
                                {formatStatusLabel(value)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2.5">
                        <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ml-1" htmlFor="reader-restriction-until">
                          限制到期
                        </Label>
                        <Input
                          id="reader-restriction-until"
                          type="datetime-local"
                          className="h-10 rounded-xl border-[var(--line-subtle)] bg-white/50 focus:bg-white transition-colors"
                          value={editor.restrictionUntil}
                          onChange={(event) => setEditor((current) => ({ ...current, restrictionUntil: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ml-1" id="reader-segment-code-label">
                        分组
                      </Label>
                      <Select
                        value={editor.segmentCode || segmentOptions[0] || 'casual'}
                        onValueChange={(value) => setEditor((current) => ({ ...current, segmentCode: value }))}
                      >
                        <SelectTrigger aria-labelledby="reader-segment-code-label" className="h-10 rounded-xl border-[var(--line-subtle)] bg-white/50 focus:bg-white transition-colors">
                          <SelectValue placeholder="选择分组" />
                        </SelectTrigger>
                        <SelectContent className="rounded-[1rem]">
                          {segmentOptions.map((value) => (
                            <SelectItem key={value} value={value} className="rounded-lg">
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2.5">
                      <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ml-1">
                        注意标记
                      </Label>
                      <div className="grid gap-2 rounded-2xl border border-[var(--line-subtle)] bg-white/50 p-4">
                        {riskFlagOptions.map((flag) => (
                          <label key={flag} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm text-[var(--foreground)] transition-colors hover:border-[var(--line-subtle)] hover:bg-white">
                            <input
                              type="checkbox"
                              className="size-4 rounded border-[var(--line-subtle)] text-[var(--primary)] focus:ring-[var(--ring)]/35"
                              checked={editor.riskFlags.includes(flag)}
                              onChange={(event) =>
                                setEditor((current) => ({
                                  ...current,
                                  riskFlags: event.target.checked
                                    ? Array.from(new Set([...current.riskFlags, flag]))
                                    : current.riskFlags.filter((item) => item !== flag),
                                }))
                              }
                            />
                            <span>{formatRiskFlagLabel(flag)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="pt-2">
                    <Label className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)] ml-1">借阅偏好</Label>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                       <div className="flex items-center justify-between rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-4 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                         <div className="flex items-center gap-3">
                           <div className="flex size-8 items-center justify-center rounded-full bg-[rgba(33,73,140,0.08)]">
                            <Zap className="size-4 text-[var(--primary)]" />
                           </div>
                           <span className="text-[13px] font-bold text-[var(--foreground)]">账户分组</span>
                         </div>
                         <Badge variant="outline" className="rounded-full bg-white px-3 font-bold text-[11px] h-6 shadow-none border-[var(--line-subtle)]">
                            {selectedReader.preference_profile_json?.segment === 'regular' ? '普通用户' : String(selectedReader.preference_profile_json?.segment ?? '系统默认')}
                         </Badge>
                       </div>

                       <div className="rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-4 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                         <div className="flex items-center gap-3 mb-3">
                           <div className="flex size-8 items-center justify-center rounded-full bg-[rgba(18,180,104,0.08)]">
                            <Shield className="size-4 text-[#0c8f54]" />
                           </div>
                           <span className="text-[13px] font-bold text-[var(--foreground)]">偏好模式</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                           {Array.isArray(selectedReader.preference_profile_json?.preferred_modes) ? (
                              selectedReader.preference_profile_json.preferred_modes.map(mode => (
                                <Badge key={mode} variant="default" className="rounded-full text-[10px] px-2 py-0.5 font-bold shadow-none">
                                  {mode === 'semantic' ? '语义搜索' : mode === 'chat' ? '对话模式' : String(mode)}
                                </Badge>
                              ))
                           ) : (
                              <span className="text-[12px] text-[var(--muted-foreground)]">暂无偏好记录</span>
                           )}
                         </div>
                       </div>

                       <div className="col-span-full rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-4 shadow-sm transition-colors hover:border-[var(--line-strong)]">
                         <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 items-center justify-center rounded-full bg-[rgba(185,56,45,0.08)]">
                                <Moon className="size-4 text-[var(--error)]" />
                              </div>
                              <span className="text-[13px] font-bold text-[var(--foreground)]">深夜活跃度</span>
                            </div>
                            <span className="text-[14px] font-black text-[var(--foreground)] tracking-tight">
                              {(lateNightRatio * 100).toFixed(1)}%
                            </span>
                         </div>
                         <div className="h-2 w-full rounded-full bg-[var(--surface-container)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--error)] rounded-full transition-all duration-500"
                              style={{ width: `${lateNightRatio * 100}%` }}
                            />
                         </div>
                         <p className="mt-3 text-[11px] text-[var(--muted-foreground)] leading-relaxed font-medium">
                            基于最近 90 天的统计数据。活跃度越高，说明该读者更倾向于在 23:00 之后进行书籍检索。
                         </p>
                       </div>
                    </div>
                  </section>

                  <section className="grid gap-3 sm:grid-cols-2 pt-2">
                    <div className="rounded-2xl border border-[var(--line-subtle)] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-2">
                        <CalendarClock className="size-4 text-[var(--muted-foreground)] opacity-70" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">最近活跃</p>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--foreground)]">{formatDateTime(selectedReader.last_active_at)}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--line-subtle)] bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2.5 mb-2">
                        <PackageCheck className="size-4 text-[var(--muted-foreground)] opacity-70" />
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">进行中订单</p>
                      </div>
                      <p className="text-[14px] font-bold text-[var(--foreground)]">{selectedReader.active_orders_count}</p>
                    </div>
                  </section>
                </div>
              </ScrollArea>

              <div className="mt-auto border-t border-[var(--line-subtle)] bg-[var(--surface-panel)] p-6 rounded-t-3xl">
                <Button
                  type="button"
                  className="min-w-36"
                  disabled={updateReaderMutation.isPending}
                  onClick={() => updateReaderMutation.mutate()}
                >
                  {updateReaderMutation.isPending ? '保存中…' : '保存读者资料'}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
