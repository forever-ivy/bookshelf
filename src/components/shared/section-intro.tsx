import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function SectionIntro({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-[var(--line-subtle)] pb-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--primary)]/80">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-[var(--foreground)]">{title}</h2>
          {description ? <p className="max-w-3xl text-sm leading-6 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
