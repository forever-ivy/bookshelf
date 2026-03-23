import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type MetricItem = {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
}

export function MetricStrip({
  items,
  className,
}: {
  items: MetricItem[]
  className?: string
}) {
  return (
    <div className={cn('grid overflow-hidden rounded-[1.75rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] md:grid-cols-2 xl:grid-cols-5', className)}>
      {items.map((item, index) => (
        <div
          key={item.label}
          className={cn(
            'flex min-h-[148px] flex-col justify-between gap-8 px-5 py-5 sm:px-6',
            index < items.length - 1 && 'border-b border-[var(--line-subtle)] md:border-b-0 xl:border-r',
            index % 2 === 0 && 'bg-[rgba(255,255,255,0.22)]',
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
              {item.label}
            </p>
            {item.icon ? <div className="text-[var(--primary)]">{item.icon}</div> : null}
          </div>
          <div className="space-y-2">
            <p className="text-4xl font-semibold tracking-[-0.06em] text-[var(--foreground)]">{item.value}</p>
            {item.hint ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{item.hint}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}
