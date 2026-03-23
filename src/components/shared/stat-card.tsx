import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function StatCard({
  title,
  value,
  hint,
  icon,
  className,
}: {
  title: string
  value: string | number
  hint?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-[1.65rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] px-5 py-5 shadow-[0_10px_24px_-28px_rgba(24,24,20,0.42)]', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{title}</p>
          <h3 className="text-[2.4rem] font-semibold tracking-[-0.06em] text-[var(--foreground)]">{value}</h3>
        </div>
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[var(--line-subtle)] bg-[rgba(33,73,140,0.04)] text-[var(--primary)]">
          {icon}
        </div>
      </div>
      {hint ? <p className="mt-4 text-sm leading-6 text-[var(--muted-foreground)]">{hint}</p> : null}
    </div>
  )
}
