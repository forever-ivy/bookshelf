import { useQuery } from '@tanstack/react-query'

import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getInventoryStatus } from '@/lib/api/inventory'
import { formatDateTime } from '@/utils'

export function InventoryPage() {
  const inventoryQuery = useQuery({
    queryKey: ['inventory', 'status'],
    queryFn: getInventoryStatus,
  })

  const inventory = inventoryQuery.data

  if (inventoryQuery.isLoading && !inventory) {
    return <LoadingState label="正在加载书柜与格口状态…" />
  }

  return (
    <PageShell title="库存与书柜页" description="以格口为单位查看当前占用情况，并回看最近入柜、取书、识别事件。">
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <CardHeader>
            <CardTitle>格口布局</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
            {inventory?.slots.map((slot) => (
              <div
                key={slot.slot_code}
                className="rounded-2xl border border-[rgba(193,198,214,0.18)] bg-white/80 p-4"
              >
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{slot.slot_code}</p>
                <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{slot.status}</p>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">副本：{slot.current_copy_id ?? '—'}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>库存概况</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">占用格口</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {inventory?.occupied_slots ?? 0}
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">空闲格口</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
                  {inventory?.free_slots ?? 0}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>最近库存事件</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {inventory?.events.map((event) => (
                <div key={event.id} className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                  <p className="font-medium text-[var(--foreground)]">{event.event_type}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    格口 {event.slot_code ?? '—'} · 图书 {event.book_id ?? '—'} · 副本 {event.copy_id ?? '—'}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">{formatDateTime(event.created_at)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
