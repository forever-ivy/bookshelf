import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium tracking-wide',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(0,91,191,0.12)] text-[var(--primary)]',
        secondary: 'bg-[var(--surface-container-high)] text-[var(--foreground)]',
        success: 'bg-[rgba(0,110,44,0.16)] text-[var(--secondary)]',
        warning: 'bg-[rgba(158,67,0,0.16)] text-[var(--tertiary)]',
        destructive: 'bg-[rgba(186,26,26,0.14)] text-[var(--error)]',
        outline: 'border border-[rgba(193,198,214,0.45)] bg-transparent text-[var(--foreground)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}
