import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-11 w-full rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] px-4 py-2 text-base leading-6 text-[var(--foreground)] transition placeholder:text-[var(--muted-foreground)] focus-visible:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/35 sm:text-sm sm:leading-5',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
