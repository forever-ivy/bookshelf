import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
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
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item) => (
        <Card
          key={item.label}
          className="flex h-full flex-col justify-between border-transparent bg-[var(--surface-container-low)] shadow-none"
        >
          <CardContent className="flex h-full flex-col justify-between px-6 py-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-[var(--foreground)]">{item.label}</p>
              {item.icon ? <div className="text-[var(--primary)]">{item.icon}</div> : null}
            </div>
            <div>
              <p className="mt-5 text-5xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{item.value}</p>
              {item.hint ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.hint}</p> : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
