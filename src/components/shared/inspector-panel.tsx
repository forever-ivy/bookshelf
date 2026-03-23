import type { PropsWithChildren, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function InspectorPanel({
  title,
  description,
  action,
  children,
  className,
}: PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
  className?: string
}>) {
  return (
    <aside
      className={cn(
        'rounded-[1.75rem] border border-[var(--line-subtle)] bg-[rgba(255,251,244,0.95)] px-6 py-6 shadow-[0_14px_38px_-34px_rgba(24,24,20,0.45)]',
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--line-subtle)] pb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[1.05rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h3>
          {action ? <div>{action}</div> : null}
        </div>
        {description ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p> : null}
      </div>
      <div className="pt-5">{children}</div>
    </aside>
  )
}
