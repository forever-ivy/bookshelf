import * as React from 'react'
import { type VariantProps } from 'class-variance-authority'
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row flex-wrap items-center gap-2', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
  size?: VariantProps<typeof buttonVariants>['size']
  variant?: VariantProps<typeof buttonVariants>['variant']
} & React.ComponentProps<'a'>

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  variant,
  children,
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: variant ?? 'ghost',
          size: size ?? 'icon-sm',
        }),
        'h-9 min-w-9 rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] px-3 text-[13px] font-medium text-[var(--foreground)] shadow-none hover:border-[rgba(33,73,140,0.18)] hover:bg-[rgba(33,73,140,0.06)] hover:text-[var(--primary)] aria-disabled:pointer-events-none aria-disabled:border-[var(--line-subtle)] aria-disabled:bg-[var(--surface-panel)] aria-disabled:text-[var(--muted-foreground)] aria-disabled:opacity-45',
        isActive &&
          '!border-[var(--primary)] !bg-[var(--primary)] !text-white hover:!border-[var(--primary-container)] hover:!bg-[var(--primary-container)] hover:!text-white',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )
}

function PaginationPrevious({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label={props['aria-label'] ?? '上一页'}
      size="sm"
      variant="outline"
      className={cn('gap-1.5 rounded-xl px-3.5', className)}
      {...props}
    >
      <ChevronLeftIcon />
      <span>{children ?? '上一页'}</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  children,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label={props['aria-label'] ?? '下一页'}
      size="sm"
      variant="outline"
      className={cn('gap-1.5 rounded-xl px-3.5', className)}
      {...props}
    >
      <span>{children ?? '下一页'}</span>
      <ChevronRightIcon />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center rounded-xl border border-[var(--line-subtle)] bg-[var(--surface-panel)] text-[var(--muted-foreground)]', className)}
      {...props}
    >
      <MoreHorizontalIcon className="size-4" />
      <span className="sr-only">更多页码</span>
    </span>
  )
}

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
