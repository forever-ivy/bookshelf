import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all outline-none disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 aria-invalid:ring-[var(--error)]/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] !text-white shadow-[0_18px_35px_-24px_rgba(33,73,140,0.75)] hover:bg-[var(--primary-container)] hover:!text-white visited:!text-white',
        destructive:
          'bg-[var(--error)] text-white hover:brightness-[0.98]',
        outline:
          'bg-transparent text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-[var(--surface-container-high)]',
        secondary:
          'bg-[var(--surface-panel-strong)] text-[var(--foreground)] shadow-[inset_0_0_0_1px_var(--line-subtle)] hover:bg-[var(--surface-bright)]',
        ghost:
          'text-[var(--foreground)] hover:bg-[rgba(33,73,140,0.06)]',
        link: 'text-[var(--primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        xs: 'h-6 rounded-lg px-2 text-[11px]',
        sm: 'h-8 rounded-lg px-3 text-xs',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-10',
        'icon-xs': 'size-6 rounded-md',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
