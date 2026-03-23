import type { PropsWithChildren, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function WorkspacePanel({
  title,
  description,
  action,
  children,
  className,
  tone = 'default',
}: PropsWithChildren<{
  title: string
  description?: string
  action?: ReactNode
  className?: string
  tone?: 'default' | 'muted'
}>) {
  return (
    <section
      className={cn(
        'rounded-[1.75rem] border border-[var(--line-subtle)] px-6 py-6',
        tone === 'default' ? 'bg-[var(--surface-panel)]' : 'bg-[rgba(255,255,255,0.42)]',
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--line-subtle)] pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">{title}</h3>
          {description ? <p className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  )
}
