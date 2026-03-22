import type { PropsWithChildren, ReactNode } from 'react'

export function PageShell({
  title,
  description,
  actions,
  children,
}: PropsWithChildren<{
  title: string
  description?: string
  actions?: ReactNode
}>) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--primary)] text-opacity-80 drop-shadow-sm">
            Zhi Xu Console
          </p>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
            {description ? <p className="max-w-3xl text-sm font-medium text-[var(--muted-foreground)]/80">{description}</p> : null}
          </div>
        </div>
        {actions && <div>{actions}</div>}
      </div>
      <div>
        {children}
      </div>
    </div>
  )
}
