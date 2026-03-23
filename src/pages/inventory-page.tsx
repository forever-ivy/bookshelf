import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useMemo } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge, formatStatusLabel } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  getAdminCabinetSlots,
  getAdminCabinets,
  getAdminInventoryAlerts,
  getAdminInventoryRecords,
} from '@/lib/api/management'
import type { AdminCabinetSlot, AdminInventoryRecord } from '@/types/domain'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('inventory')

const slotColumnHelper = createColumnHelper<AdminCabinetSlot>()
const recordColumnHelper = createColumnHelper<AdminInventoryRecord>()

type InventoryMode = 'overview' | 'cabinet-detail'
type CabinetBoardTab = 'slots' | 'records' | 'alerts'

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
  const location = useLocation()
  const { cabinetId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()

  const inventoryMode = resolveInventoryMode(location.pathname)
  const activeBoardTab = resolveCabinetBoardTab(searchParams.get('tab'))

  const cabinetsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'cabinets'],
    queryFn: () => getAdminCabinets(),
  })

  const cabinets = cabinetsQuery.data?.items ?? []
  const selectedCabinet = cabinets.find((item) => item.id === cabinetId) ?? null

  const slotsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'slots',
    queryKey: ['admin', 'inventory', 'cabinet-slots', cabinetId],
    queryFn: () => getAdminCabinetSlots(cabinetId ?? ''),
  })

  const recordsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'records',
    queryKey: ['admin', 'inventory', 'records', cabinetId],
    queryFn: () => getAdminInventoryRecords(cabinetId ?? undefined),
  })

  const alertsQuery = useQuery({
    enabled: inventoryMode === 'cabinet-detail' && Boolean(cabinetId) && activeBoardTab === 'alerts',
    queryKey: ['admin', 'inventory', 'alerts', cabinetId],
    queryFn: () => getAdminInventoryAlerts('open'),
  })

  const slots = slotsQuery.data?.items ?? []
  const records = recordsQuery.data?.items ?? []
  const alerts = useMemo(() => {
    const items = alertsQuery.data?.items ?? []
    if (!cabinetId) {
      return items
    }

    return items.filter((alert) => alert.source_id === cabinetId)
  }, [alertsQuery.data?.items, cabinetId])

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
    return <LoadingState label="数据装载中" />
  }

  function updateBoardTab(nextTab: string) {
    const resolvedTab = resolveCabinetBoardTab(nextTab)
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', resolvedTab)
    setSearchParams(nextSearchParams, { replace: true })
  }

  function renderOverview() {
    return (
      <>
        <MetricStrip
          items={[
            { label: '书柜数量', value: summary.totalCabinets, hint: '当前管理中的书柜总数' },
            { label: '位置数量', value: summary.totalSlots, hint: '包含空闲和占用位置' },
            { label: '占用位置', value: summary.occupiedSlots, hint: '正在存放图书的位置' },
            { label: '待处理警告', value: summary.openAlerts, hint: '库存或书柜警告' },
          ]}
          className="xl:grid-cols-4"
        />

        <WorkspacePanel
          title="书柜列表"
          description="一级目录只展示书柜总览。进入书柜详情后，再切换查看位置、记录和警告。"
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
                    <p className="text-sm text-[var(--muted-foreground)]">{cabinet.location ?? '未配置位置'}</p>
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
                  警告 {cabinet.open_alert_count} · 占用 {cabinet.occupied_slots}
                </p>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--line-subtle)] pt-4">
                  <Button asChild type="button" variant="secondary">
                    <Link to={`/inventory/cabinets/${cabinet.id}`}>书柜详情</Link>
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
      return <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
    }

    return (
      <WorkspacePanel
        title="书柜目录"
        description="二级目录使用切换看板查看当前书柜的位置、记录和警告。"
        action={
          <Button asChild type="button" variant="secondary">
            <Link to="/inventory">返回书柜列表</Link>
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            label="书柜状态"
            value={<StatusBadge status={selectedCabinet.status} label={formatInventoryCabinetLabel(selectedCabinet.status)} />}
          />
          <SummaryTile
            label="位置数"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.slot_total}</p>}
          />
          <SummaryTile
            label="可借库存"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.available_copies}</p>}
          />
          <SummaryTile
            label="待处理警告"
            value={<p className="text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{selectedCabinet.open_alert_count}</p>}
          />
        </div>

        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
          {selectedCabinet.location ?? '未配置位置'} · 占用 {selectedCabinet.occupied_slots}
        </p>

        <Tabs value={activeBoardTab} onValueChange={updateBoardTab} className="mt-6 space-y-5 border-t border-[var(--line-subtle)] pt-5">
          <TabsList className="grid w-full max-w-[20rem] grid-cols-3">
            <TabsTrigger value="slots">位置</TabsTrigger>
            <TabsTrigger value="records">记录</TabsTrigger>
            <TabsTrigger value="alerts">警告</TabsTrigger>
          </TabsList>

          <TabsContent value="slots" className="mt-0">
            {slotsQuery.isLoading ? (
              <LoadingState label="加载中" />
            ) : (
              <DataTable columns={slotColumns} data={slots} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
            )}
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            {recordsQuery.isLoading ? (
              <LoadingState label="加载中" />
            ) : (
              <DataTable columns={recordColumns} data={records} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
            )}
          </TabsContent>

          <TabsContent value="alerts" className="mt-0">
            {alertsQuery.isLoading ? (
              <LoadingState label="加载中" />
            ) : alerts.length === 0 ? (
              <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
            ) : (
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
            )}
          </TabsContent>
        </Tabs>
      </WorkspacePanel>
    )
  }

  const pageMeta = {
    overview: {
      title: '库存管理',
      description: '进入一级目录先看书柜总览，再进入对应书柜的二级目录。',
      statusLine: '库存总览',
    },
    'cabinet-detail': {
      title: selectedCabinet?.name ?? '书柜详情',
      description: '当前位置、记录和警告都收在当前书柜的切换看板里。',
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
