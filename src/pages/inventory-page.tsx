import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useEffect, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('inventory')

const slotColumnHelper = createColumnHelper<AdminCabinetSlot>()
const recordColumnHelper = createColumnHelper<AdminInventoryRecord>()

export function InventoryPage() {
  const queryClient = useQueryClient()
  const [selectedCabinetId, setSelectedCabinetId] = useState('')
  const [correctionForm, setCorrectionForm] = useState({
    cabinet_id: '',
    book_id: '',
    total_delta: '0',
    available_delta: '0',
    reserved_delta: '0',
    slot_code: '',
    reason: '',
  })

  const cabinetsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'cabinets'],
    queryFn: () => getAdminCabinets(),
  })

  const activeCabinetId = selectedCabinetId || cabinetsQuery.data?.items[0]?.id || ''

  useEffect(() => {
    if (!selectedCabinetId && cabinetsQuery.data?.items[0]?.id) {
      setSelectedCabinetId(cabinetsQuery.data.items[0].id)
      setCorrectionForm((current) => ({
        ...current,
        cabinet_id: cabinetsQuery.data?.items[0]?.id ?? '',
      }))
    }
  }, [selectedCabinetId, cabinetsQuery.data])

  const slotsQuery = useQuery({
    enabled: Boolean(activeCabinetId),
    queryKey: ['admin', 'inventory', 'cabinet-slots', activeCabinetId],
    queryFn: () => getAdminCabinetSlots(activeCabinetId),
  })

  const recordsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'records', activeCabinetId],
    queryFn: () => getAdminInventoryRecords(activeCabinetId || undefined),
  })

  const alertsQuery = useQuery({
    queryKey: ['admin', 'inventory', 'alerts'],
    queryFn: () => getAdminInventoryAlerts('open'),
  })

  const correctionMutation = useMutation({
    mutationFn: () =>
      applyAdminInventoryCorrection({
        cabinet_id: correctionForm.cabinet_id || activeCabinetId,
        book_id: Number(correctionForm.book_id),
        total_delta: Number(correctionForm.total_delta),
        available_delta: Number(correctionForm.available_delta),
        reserved_delta: Number(correctionForm.reserved_delta),
        slot_code: correctionForm.slot_code || undefined,
        reason: correctionForm.reason || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] })
      setCorrectionForm((current) => ({
        ...current,
        book_id: '',
        total_delta: '0',
        available_delta: '0',
        reserved_delta: '0',
        slot_code: '',
        reason: '',
      }))
    },
  })

  const cabinets = cabinetsQuery.data?.items ?? []
  const slots = slotsQuery.data?.items ?? []
  const records = recordsQuery.data?.items ?? []
  const alerts = alertsQuery.data?.items ?? []

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slotColumns: Array<ColumnDef<AdminCabinetSlot, any>> = [
    slotColumnHelper.accessor('slot_code', { header: '仓位' }),
    slotColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    slotColumnHelper.accessor('book_title', {
      header: '当前图书',
      cell: (info) => info.getValue() ?? '空仓位',
    }),
    slotColumnHelper.accessor('copy_inventory_status', {
      header: '副本状态',
      cell: (info) => info.getValue() ?? '—',
    }),
    slotColumnHelper.accessor('current_copy_id', {
      header: '副本 ID',
      cell: (info) => info.getValue() ?? '—',
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recordColumns: Array<ColumnDef<AdminInventoryRecord, any>> = [
    recordColumnHelper.accessor('event_type', { header: '记录类型' }),
    recordColumnHelper.accessor('slot_code', {
      header: '仓位',
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

  return (
    <PageShell
      {...pageHero}
      eyebrow="库存管理"
      title="库存管理"
      description="查看书柜库存、仓位和出入库记录，并支持人工调整。"
      statusLine="库存概览"
    >
      <MetricStrip
        items={[
          { label: '书柜数量', value: summary.totalCabinets, hint: '当前管理中的书柜总数' },
          { label: '仓位数量', value: summary.totalSlots, hint: '包含空闲和占用仓位' },
          { label: '占用仓位', value: summary.occupiedSlots, hint: '正在存放图书的仓位' },
          { label: '待处理警告', value: summary.openAlerts, hint: '库存或书柜警告' },
        ]}
        className="xl:grid-cols-4"
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <WorkspacePanel title="库存列表" description="左侧查看书柜、仓位、记录和警告。">
          <Tabs defaultValue="cabinets" className="space-y-4">
            <TabsList>
              <TabsTrigger value="cabinets">书柜</TabsTrigger>
              <TabsTrigger value="slots">仓位</TabsTrigger>
              <TabsTrigger value="records">记录</TabsTrigger>
              <TabsTrigger value="alerts">警告</TabsTrigger>
            </TabsList>

            <TabsContent value="cabinets">
              <div className="grid gap-4 xl:grid-cols-2">
                {cabinets.map((cabinet) => (
                  <div
                    key={cabinet.id}
                    className={cabinet.id === activeCabinetId ? 'rounded-[1.5rem] border border-[var(--primary)]/35 bg-[rgba(33,73,140,0.06)] px-5 py-5' : 'rounded-[1.5rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-5'}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{cabinet.name}</p>
                        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{cabinet.location ?? '未配置位置'}</p>
                      </div>
                      <StatusBadge status={cabinet.status} />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-[rgba(255,255,255,0.34)] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">仓位数</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{cabinet.slot_total}</p>
                      </div>
                      <div className="rounded-2xl bg-[rgba(255,255,255,0.34)] px-4 py-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">可借库存</p>
                        <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{cabinet.available_copies}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-[var(--muted-foreground)]">警告 {cabinet.open_alert_count} · 占用 {cabinet.occupied_slots}</p>
                      <Button
                        type="button"
                        variant={cabinet.id === activeCabinetId ? 'default' : 'secondary'}
                        onClick={() => {
                          setSelectedCabinetId(cabinet.id)
                          setCorrectionForm((current) => ({
                            ...current,
                            cabinet_id: cabinet.id,
                          }))
                        }}
                      >
                        查看该书柜明细
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="slots">
              {slotsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : activeCabinetId ? (
                <DataTable columns={slotColumns} data={slots} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
              ) : (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              )}
            </TabsContent>

            <TabsContent value="records">
              {recordsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : (
                <DataTable columns={recordColumns} data={records} emptyTitle="暂无数据" emptyDescription="当前条件下没有可用数据。" />
              )}
            </TabsContent>

            <TabsContent value="alerts">
              {alertsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : alerts.length === 0 ? (
                <EmptyState title="暂无数据" description="当前条件下没有可用数据。" />
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.34)] px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-[var(--foreground)]">{alert.title}</p>
                          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{alert.message ?? '无补充说明'}</p>
                        </div>
                        <StatusBadge status={alert.status} />
                      </div>
                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        {alert.source_type} · {formatDateTime(alert.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </WorkspacePanel>

        <InspectorPanel title="库存调整" description="右侧可以直接做盘点补录、错位修正和识别失败修正。">
          <div className="space-y-4">
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">当前书柜</p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{activeCabinetId || '未选择书柜'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-cabinet">书柜 ID</Label>
              <Input
                id="correction-cabinet"
                value={correctionForm.cabinet_id}
                onChange={(event) => setCorrectionForm((current) => ({ ...current, cabinet_id: event.target.value }))}
                placeholder="cabinet-east"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-book">图书 ID</Label>
              <Input
                id="correction-book"
                value={correctionForm.book_id}
                onChange={(event) => setCorrectionForm((current) => ({ ...current, book_id: event.target.value }))}
                placeholder="1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="correction-total">总量增量</Label>
                <Input
                  id="correction-total"
                  value={correctionForm.total_delta}
                  onChange={(event) => setCorrectionForm((current) => ({ ...current, total_delta: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correction-available">可借增量</Label>
                <Input
                  id="correction-available"
                  value={correctionForm.available_delta}
                  onChange={(event) => setCorrectionForm((current) => ({ ...current, available_delta: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="correction-reserved">预留增量</Label>
                <Input
                  id="correction-reserved"
                  value={correctionForm.reserved_delta}
                  onChange={(event) => setCorrectionForm((current) => ({ ...current, reserved_delta: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-slot">仓位</Label>
              <Input
                id="correction-slot"
                value={correctionForm.slot_code}
                onChange={(event) => setCorrectionForm((current) => ({ ...current, slot_code: event.target.value }))}
                placeholder="A01"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correction-reason">原因说明</Label>
              <Input
                id="correction-reason"
                value={correctionForm.reason}
                onChange={(event) => setCorrectionForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="盘点补录 / 错位修正 / 识别失败修正"
              />
            </div>
            <Button type="button" onClick={() => correctionMutation.mutate()} disabled={correctionMutation.isPending}>
              {correctionMutation.isPending ? '提交中…' : '提交调整'}
            </Button>
            {correctionMutation.data ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                已更新库存：总量 {correctionMutation.data.stock.total_copies}，可借 {correctionMutation.data.stock.available_copies}。
              </p>
            ) : null}
          </div>
        </InspectorPanel>
      </div>
    </PageShell>
  )
}
