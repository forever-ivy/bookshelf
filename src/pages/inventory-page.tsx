import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { filledPrimaryActionButtonClassName } from '@/components/shared/action-button-styles'
import { DataTable, DataTablePaginationFooter } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge, formatStatusLabel } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  applyAdminInventoryCorrection,
  getAdminCabinetSlots,
  getAdminCabinets,
  getAdminInventoryAlerts,
  getAdminInventoryRecords,
} from '@/lib/api/management'
import type { AdminCabinetSlot, AdminInventoryRecord } from '@/types/domain'
import { patchSearchParams, readOptionalSearchParam, useOptionalSearchParams } from '@/lib/search-params'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('inventory')

const slotColumnHelper = createColumnHelper<AdminCabinetSlot>()
const recordColumnHelper = createColumnHelper<AdminInventoryRecord>()

type InventoryMode = 'overview' | 'cabinet-detail'
type CabinetBoardTab = 'slots' | 'records' | 'alerts'
const INVENTORY_PAGE_SIZE = 20
const EMPTY_CORRECTION_FORM = {
  bookId: '',
  slotCode: '',
  reason: '',
  totalDelta: '',
  availableDelta: '',
  reservedDelta: '',
}

function resolveInventoryMode(pathname: string): InventoryMode {
  if (pathname.startsWith('/inventory/cabinets/')) {
    return 'cabinet-detail'
  }

  return 'overview'
}

function resolveCabinetBoardTab(value: string | null): CabinetBoardTab {
  if (value === 'records' || value === 'alerts') {
    return value
  }

  return 'slots'
}

function formatInventorySlotLabel(status?: string | null) {
  return formatStatusLabel(status)
}

function formatInventoryCopyLabel(status?: string | null) {
  if (!status) {
    return '未知状态'
  }

  switch (status) {
    case 'reserved':
      return '已预留'
    case 'stored':
      return '已存放'
    case 'checked_out':
      return '已借出'
    case 'in_transit':
      return '运输中'
    default:
      return formatStatusLabel(status)
  }
}

function formatInventoryCabinetLabel(status?: string | null) {
  return formatStatusLabel(status)
}

function formatInventoryAlertLabel(status?: string | null) {
  return formatStatusLabel(status)
}

function formatInventoryEventType(eventType?: string | null) {
  if (!eventType) {
    return '未知记录'
  }

  switch (eventType) {
    case 'book_stored':
      return '入柜'
    case 'book_removed':
      return '出柜'
    case 'manual_correction':
      return '人工修正'
    case 'slot_adjusted':
      return '位置调整'
    case 'inventory_adjustment':
      return '库存调整'
    default:
      return '其他记录'
  }
}

function formatInventorySourceType(sourceType?: string | null) {
  if (!sourceType) {
    return '未知来源'
  }

  switch (sourceType) {
    case 'inventory':
      return '库存'
    case 'cabinet':
      return '书柜'
    case 'robot':
      return '机器人'
    default:
      return formatStatusLabel(sourceType)
  }
}

function SummaryTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{label}</p>
      <div className="mt-2">{value}</div>
    </div>
  )
}

export function InventoryPage() {
  const queryClient = useQueryClient()
  const location = useLocation()
  const { cabinetId } = useParams()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const [isCorrectionDialogOpen, setIsCorrectionDialogOpen] = useState(false)
  const [correctionForm, setCorrectionForm] = useState(EMPTY_CORRECTION_FORM)
  const [boardPages, setBoardPages] = useState<Record<CabinetBoardTab, number>>({
    slots: 1,
    records: 1,
    alerts: 1,
  })

  const inventoryMode = resolveInventoryMode(location.pathname)
  const activeBoardTab = resolveCabinetBoardTab(searchParams.get('tab'))
  const slotStatusFilter = readOptionalSearchParam(searchParams, 'slot_status')
  const recordEventTypeFilter = readOptionalSearchParam(searchParams, 'event_type')
  const alertStatusFilter = readOptionalSearchParam(searchParams, 'alert_status') ?? 'open'
  const activeBoardPage = boardPages[activeBoardTab]

  useEffect(() => {
    setBoardPages({ slots: 1, records: 1, alerts: 1 })
  }, [cabinetId])

  const cabinetsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'cabinets'],
    queryFn: () => getAdminCabinets(),
  })

  const cabinets = cabinetsQuery.data?.items ?? []
  const selectedCabinet = cabinets.find((item) => item.id === cabinetId) ?? null

  const slotsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'slots',
    queryKey: ['admin', 'inventory', 'cabinet-slots', cabinetId, boardPages.slots, slotStatusFilter],
    queryFn: () =>
      getAdminCabinetSlots(cabinetId ?? '', {
        page: boardPages.slots,
        pageSize: INVENTORY_PAGE_SIZE,
        status: slotStatusFilter,
      }),
  })

  const recordsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'records',
    queryKey: ['admin', 'inventory', 'records', cabinetId, boardPages.records, recordEventTypeFilter],
    queryFn: () =>
      getAdminInventoryRecords({
        cabinetId: cabinetId ?? undefined,
        eventType: recordEventTypeFilter,
        page: boardPages.records,
        pageSize: INVENTORY_PAGE_SIZE,
      }),
  })

  const alertsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'alerts',
    queryKey: ['admin', 'inventory', 'alerts', cabinetId, boardPages.alerts, alertStatusFilter],
    queryFn: () =>
      getAdminInventoryAlerts({
        status: alertStatusFilter,
        sourceId: cabinetId ?? undefined,
        page: boardPages.alerts,
        pageSize: INVENTORY_PAGE_SIZE,
      }),
  })

  const slots = slotsQuery.data?.items ?? []
  const records = recordsQuery.data?.items ?? []
  const alerts = alertsQuery.data?.items ?? []

  const correctionMutation = useMutation({
    mutationFn: () => {
      if (!cabinetId) {
        throw new Error('Cabinet is required')
      }
      return applyAdminInventoryCorrection({
        cabinet_id: cabinetId,
        book_id: Number(correctionForm.bookId),
        slot_code: correctionForm.slotCode.trim() || undefined,
        reason: correctionForm.reason.trim() || undefined,
        total_delta: Number(correctionForm.totalDelta),
        available_delta: Number(correctionForm.availableDelta),
        reserved_delta: Number(correctionForm.reservedDelta),
      })
    },
    onSuccess: async () => {
      setIsCorrectionDialogOpen(false)
      setCorrectionForm(EMPTY_CORRECTION_FORM)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'cabinets'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'cabinet-slots', cabinetId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'records', cabinetId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory', 'alerts', cabinetId] }),
      ])
    },
  })

  const summary = cabinets.reduce(
    (accumulator, cabinet) => {
      accumulator.totalCabinets += 1
      accumulator.totalSlots += cabinet.slot_total
      accumulator.occupiedSlots += cabinet.occupied_slots
      accumulator.openAlerts += cabinet.open_alert_count
      return accumulator
    },
    { totalCabinets: 0, totalSlots: 0, occupiedSlots: 0, openAlerts: 0 },
  )

  const slotColumns: Array<ColumnDef<AdminCabinetSlot, any>> = [
    slotColumnHelper.accessor('slot_code', { header: '位置' }),
    slotColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} label={formatInventorySlotLabel(info.getValue())} />,
    }),
    slotColumnHelper.accessor('book_title', {
      header: '图书',
      cell: (info) => info.getValue() ?? '空位',
    }),
    slotColumnHelper.accessor('copy_inventory_status', {
      header: '副本状态',
      cell: (info) =>
        info.getValue() ? <StatusBadge status={info.getValue()} label={formatInventoryCopyLabel(info.getValue())} /> : '—',
    }),
    slotColumnHelper.accessor('current_copy_id', {
      header: '副本编号',
      cell: (info) => info.getValue() ?? '—',
    }),
  ]

  const recordColumns: Array<ColumnDef<AdminInventoryRecord, any>> = [
    recordColumnHelper.accessor('event_type', {
      header: '记录',
      cell: (info) => formatInventoryEventType(info.getValue()),
    }),
    recordColumnHelper.accessor('slot_code', {
      header: '位置',
      cell: (info) => info.getValue() ?? '—',
    }),
    recordColumnHelper.accessor('book_title', {
      header: '图书',
      cell: (info) => info.getValue() ?? '—',
    }),
    recordColumnHelper.accessor('cabinet_name', {
      header: '书柜',
      cell: (info) => info.getValue() ?? '—',
    }),
    recordColumnHelper.accessor('created_at', {
      header: '时间',
      cell: (info) => formatDateTime(info.getValue()),
    }),
  ]

  if (cabinetsQuery.isLoading && cabinets.length === 0) {
    return <LoadingState label="正在载入数据" />
  }

  function updateBoardTab(nextTab: string) {
    const resolvedTab = resolveCabinetBoardTab(nextTab)
    setSearchParams(
      patchSearchParams(searchParams, {
        tab: resolvedTab,
      }),
      { replace: true },
    )
  }

  function updateBoardPage(tab: CabinetBoardTab, page: number) {
    setBoardPages((current) => ({ ...current, [tab]: page }))
  }

  function updateBoardFilters(patch: Record<string, string | undefined>) {
    setBoardPages((current) => ({ ...current, [activeBoardTab]: 1 }))
    setSearchParams(patchSearchParams(searchParams, patch), { replace: true })
  }

  function renderOverview() {
    return (
      <>
        <MetricStrip
          items={[
            { label: '书柜数量', value: summary.totalCabinets, hint: '当前管理中的书柜总数' },
            { label: '格口数量', value: summary.totalSlots, hint: '包含空位和已占用格口' },
            { label: '已占用格口', value: summary.occupiedSlots, hint: '现在有图书的格口' },
            { label: '待处理异常', value: summary.openAlerts, hint: '书柜或库存异常' },
          ]}
          className="xl:grid-cols-4"
        />

        <WorkspacePanel
          title="书柜列表"
          description="先看所有书柜，再点进单个书柜查看格口、记录和异常。"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            {cabinets.map((cabinet) => (
              <div
                key={cabinet.id}
                className="rounded-[1.65rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] px-5 py-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-semibold text-[var(--foreground)]">{cabinet.name}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{cabinet.location ?? '还没填写位置'}</p>
                  </div>
                  <StatusBadge status={cabinet.status} label={formatInventoryCabinetLabel(cabinet.status)} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <SummaryTile
                    label="位置数"
                    value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{cabinet.slot_total}</p>}
                  />
                  <SummaryTile
                    label="可借库存"
                    value={
                      <p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{cabinet.available_copies}</p>
                    }
                  />
                </div>

                <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                  异常 {cabinet.open_alert_count} · 已占用 {cabinet.occupied_slots}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line-subtle)] pt-4">
                  <Button asChild type="button" variant="default" className={filledPrimaryActionButtonClassName}>
                    <Link to={`/inventory/cabinets/${cabinet.id}`}>查看书柜</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      </>
    )
  }

  function renderCabinetBoard() {
    if (!selectedCabinet || !cabinetId) {
      return <EmptyState title="没有找到内容" description="换个条件再试试。" />
    }

    return (
      <WorkspacePanel
        title="书柜详情"
        description="在这里切换查看当前书柜的格口、记录和异常。"
        action={
          <div className="flex flex-wrap gap-2">
            <Dialog open={isCorrectionDialogOpen} onOpenChange={setIsCorrectionDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="secondary">
                  手动修正
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>手动修正库存</DialogTitle>
                  <DialogDescription>登记盘点差异，保存后会刷新当前书柜的库存和记录。</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="inventory-correction-book-id">图书编号</Label>
                      <Input
                        id="inventory-correction-book-id"
                        inputMode="numeric"
                        value={correctionForm.bookId}
                        onChange={(event) => setCorrectionForm((current) => ({ ...current, bookId: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inventory-correction-slot-code">格口编号</Label>
                      <Input
                        id="inventory-correction-slot-code"
                        value={correctionForm.slotCode}
                        onChange={(event) => setCorrectionForm((current) => ({ ...current, slotCode: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventory-correction-reason">修正说明</Label>
                    <Input
                      id="inventory-correction-reason"
                      value={correctionForm.reason}
                      onChange={(event) => setCorrectionForm((current) => ({ ...current, reason: event.target.value }))}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="inventory-correction-total-delta">总库存变化</Label>
                      <Input
                        id="inventory-correction-total-delta"
                        inputMode="numeric"
                        value={correctionForm.totalDelta}
                        onChange={(event) => setCorrectionForm((current) => ({ ...current, totalDelta: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inventory-correction-available-delta">可借库存变化</Label>
                      <Input
                        id="inventory-correction-available-delta"
                        inputMode="numeric"
                        value={correctionForm.availableDelta}
                        onChange={(event) => setCorrectionForm((current) => ({ ...current, availableDelta: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inventory-correction-reserved-delta">预留库存变化</Label>
                      <Input
                        id="inventory-correction-reserved-delta"
                        inputMode="numeric"
                        value={correctionForm.reservedDelta}
                        onChange={(event) => setCorrectionForm((current) => ({ ...current, reservedDelta: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    onClick={() => correctionMutation.mutate()}
                    disabled={correctionMutation.isPending || !correctionForm.bookId.trim()}
                  >
                    {correctionMutation.isPending ? '提交中…' : '保存修正'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              asChild
              type="button"
              variant="default"
              className={filledPrimaryActionButtonClassName}
            >
              <Link to="/inventory">返回书柜列表</Link>
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="书柜状态"
            value={<StatusBadge status={selectedCabinet.status} label={formatInventoryCabinetLabel(selectedCabinet.status)} />}
          />
          <SummaryTile
            label="格口数"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.slot_total}</p>}
          />
          <SummaryTile
            label="可借库存"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.available_copies}</p>}
          />
          <SummaryTile
            label="待处理异常"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.open_alert_count}</p>}
          />
        </div>

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          {selectedCabinet.location ?? '还没填写位置'} · 已占用 {selectedCabinet.occupied_slots}
        </p>

        <Tabs value={activeBoardTab} onValueChange={updateBoardTab} className="mt-6 space-y-5 border-t border-[var(--line-subtle)] pt-5">
          <TabsList className="grid w-full max-w-[20rem] grid-cols-3">
            <TabsTrigger value="slots">格口</TabsTrigger>
            <TabsTrigger value="records">记录</TabsTrigger>
            <TabsTrigger value="alerts">异常</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="mt-0">
            <div className="mb-4 flex flex-wrap gap-3">
              <Select
                value={slotStatusFilter ?? 'all'}
                onValueChange={(value) =>
                  updateBoardFilters({
                    slot_status: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="位置状态筛选" className="w-[10rem]">
                  <SelectValue placeholder="全部位置" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部位置</SelectItem>
                  <SelectItem value="occupied">已占用</SelectItem>
                  <SelectItem value="empty">空位</SelectItem>
                  <SelectItem value="locked">锁定</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {slotsQuery.isLoading ? (
              <LoadingState label="正在载入" />
            ) : (
              <DataTable
                columns={slotColumns}
                data={slots}
                emptyTitle="没有找到内容"
                emptyDescription="换个条件再试试。"
                pagination={{
                  page: slotsQuery.data?.page ?? activeBoardPage,
                  pageSize: slotsQuery.data?.page_size ?? INVENTORY_PAGE_SIZE,
                  total: slotsQuery.data?.total ?? slots.length,
                  onPageChange: (page) => updateBoardPage('slots', page),
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            <div className="mb-4 flex flex-wrap gap-3">
              <Select
                value={recordEventTypeFilter ?? 'all'}
                onValueChange={(value) =>
                  updateBoardFilters({
                    event_type: value === 'all' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="记录类型筛选" className="w-[11rem]">
                  <SelectValue placeholder="全部记录" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部记录</SelectItem>
                  <SelectItem value="book_stored">入柜记录</SelectItem>
                  <SelectItem value="book_removed">出柜记录</SelectItem>
                  <SelectItem value="manual_correction">手动修正记录</SelectItem>
                  <SelectItem value="inventory_adjustment">库存调整记录</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {recordsQuery.isLoading ? (
              <LoadingState label="正在载入" />
            ) : (
              <DataTable
                columns={recordColumns}
                data={records}
                emptyTitle="没有找到内容"
                emptyDescription="换个条件再试试。"
                pagination={{
                  page: recordsQuery.data?.page ?? activeBoardPage,
                  pageSize: recordsQuery.data?.page_size ?? INVENTORY_PAGE_SIZE,
                  total: recordsQuery.data?.total ?? records.length,
                  onPageChange: (page) => updateBoardPage('records', page),
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            <div className="mb-4 flex flex-wrap gap-3">
              <Select
                value={alertStatusFilter}
                onValueChange={(value) =>
                  updateBoardFilters({
                    alert_status: value === 'open' ? undefined : value,
                  })
                }
              >
                <SelectTrigger aria-label="库存警告状态筛选" className="w-[11rem]">
                  <SelectValue placeholder="待处理异常" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">待处理异常</SelectItem>
                  <SelectItem value="acknowledged">已确认异常</SelectItem>
                  <SelectItem value="resolved">已处理异常</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {alertsQuery.isLoading ? (
              <LoadingState label="正在载入" />
            ) : alerts.length === 0 ? (
              <EmptyState title="没有找到内容" description="换个条件再试试。" />
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] px-5 py-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{alert.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{alert.message ?? '无补充说明'}</p>
                        </div>
                        <StatusBadge status={alert.status} label={formatInventoryAlertLabel(alert.status)} />
                      </div>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        {formatInventorySourceType(alert.source_type)} · {formatDateTime(alert.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="overflow-hidden rounded-[1.75rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)]">
                  <DataTablePaginationFooter
                    bordered={false}
                    pagination={{
                      page: alertsQuery.data?.page ?? activeBoardPage,
                      pageSize: alertsQuery.data?.page_size ?? INVENTORY_PAGE_SIZE,
                      total: alertsQuery.data?.total ?? alerts.length,
                      onPageChange: (page) => updateBoardPage('alerts', page),
                    }}
                  />
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>
    )
  }

  const pageMeta = {
    overview: {
      title: '库存管理',
      description: '先看所有书柜，再点进单个书柜查看详细情况。',
      statusLine: '书柜总览',
    },
    'cabinet-detail': {
      title: selectedCabinet?.name ?? '书柜详情',
      description: '这个书柜的格口、记录和异常都在这里查看。',
      statusLine: '书柜详情',
    },
  } satisfies Record<InventoryMode, { title: string; description: string; statusLine: string }>

  return (
    <PageShell
      {...pageHero}
      eyebrow="库存管理"
      title={pageMeta[inventoryMode].title}
      description={pageMeta[inventoryMode].description}
      statusLine={pageMeta[inventoryMode].statusLine}
    >
      {inventoryMode === 'overview' ? renderOverview() : renderCabinetBoard()}
    </PageShell>
  )
}
