import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] px-4 py-2 text-sm text-[var(--foreground)] transition placeholder:text-[var(--muted-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/35 focus-visible:border-[var(--line-strong)]',
        className,
      )}
      {...props}
    />
  )
})

Input.displayName = 'Input'

export { Input }
