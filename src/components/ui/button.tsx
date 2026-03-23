import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-white shadow-[0_18px_35px_-24px_rgba(33,73,140,0.75)] hover:bg-[var(--primary-container)]',
        secondary:
          'bg-[var(--surface-panel-strong)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--line-subtle)] hover:bg-[var(--surface-bright)]',
        ghost: 'text-[var(--foreground)] hover:bg-[rgba(33,73,140,0.06)]',
        destructive: 'bg-[var(--error)] text-white hover:brightness-[0.98]',
        outline:
          'bg-transparent text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-[var(--surface-container-high)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

export { Button }
