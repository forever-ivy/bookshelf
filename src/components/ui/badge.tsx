import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] uppercase',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(33,73,140,0.1)] text-[var(--primary)]',
        secondary: 'bg-[var(--surface-container-high)] text-[var(--foreground)]',
        success: 'bg-[rgba(44,107,82,0.12)] text-[var(--secondary)]',
        warning: 'bg-[rgba(138,90,40,0.12)] text-[var(--tertiary)]',
        destructive: 'bg-[rgba(185,56,45,0.12)] text-[var(--error)]',
        outline: 'border border-[var(--line-strong)] bg-transparent text-[var(--foreground)]',
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
