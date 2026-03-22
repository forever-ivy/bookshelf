import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/60',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,var(--primary),var(--primary-container))] text-white shadow-[0_20px_40px_-24px_rgba(0,91,191,0.85)] hover:brightness-[1.03]',
        secondary:
          'bg-[var(--surface-container-lowest)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(193,198,214,0.35)] hover:bg-[var(--surface-bright)]',
        ghost: 'text-[var(--foreground)] hover:bg-[var(--surface-container-high)]',
        destructive: 'bg-[var(--error)] text-white hover:brightness-[0.98]',
        outline:
          'bg-transparent text-[var(--foreground)] shadow-[inset_0_0_0_1px_rgba(193,198,214,0.5)] hover:bg-[var(--surface-container-high)]',
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
