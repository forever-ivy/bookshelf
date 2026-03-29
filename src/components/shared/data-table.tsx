import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Fragment } from 'react'
import type { MouseEvent, ReactNode } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import {
  PaginationEllipsis,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type DataTablePagination = {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}

type DataTableProps<TData> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: Array<ColumnDef<TData, any>>
  data: TData[]
  emptyTitle?: string
  emptyDescription?: string
  tableClassName?: string
  pagination?: DataTablePagination
  getRowId?: (row: TData, index: number) => string
  expandedRowIds?: string[]
  renderExpandedRow?: (row: TData) => ReactNode
}

type DataTableColumnMeta = {
  headClassName?: string
  cellClassName?: string
}

type PaginationDisplayItem = number | 'ellipsis-start' | 'ellipsis-end'

function buildPaginationItems(page: number, totalPages: number): PaginationDisplayItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (page <= 3) {
    return [1, 2, 3, 'ellipsis-end', totalPages]
  }

  if (page >= totalPages - 2) {
    return [1, 'ellipsis-start', totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'ellipsis-start', page - 1, page, page + 1, 'ellipsis-end', totalPages]
}

type DataTablePaginationFooterProps = {
  pagination: DataTablePagination
  bordered?: boolean
  className?: string
}

export function DataTablePaginationFooter({
  pagination,
  bordered = true,
  className,
}: DataTablePaginationFooterProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
  const canGoToPreviousPage = pagination.page > 1
  const canGoToNextPage = pagination.page < totalPages
  const paginationItems = buildPaginationItems(pagination.page, totalPages)
  const buildPaginationLinkProps = (targetPage: number, disabled: boolean) => ({
    href: `?page=${targetPage}`,
    'aria-disabled': disabled || undefined,
    tabIndex: disabled ? -1 : undefined,
    className: disabled ? 'pointer-events-none opacity-50' : undefined,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault()
      if (disabled || targetPage === pagination.page) {
        return
      }

      pagination.onPageChange(targetPage)
    },
  })

  return (
    <div
      className={cn(
        'flex flex-col gap-4 bg-[var(--surface-container-low)]/55 px-4 py-4 md:flex-row md:items-center md:justify-between',
        bordered ? 'border-t border-[var(--line-subtle)]' : null,
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
          分页
        </p>
        <p className="text-sm text-[var(--foreground)]">
          第 <span className="font-semibold">{pagination.page}</span> 页，共 {totalPages} 页，合计{' '}
          <span className="font-semibold">{pagination.total}</span> 条
        </p>
      </div>
      <Pagination aria-label="翻页" className="mx-0 w-auto justify-start md:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              {...buildPaginationLinkProps(pagination.page - 1, !canGoToPreviousPage)}
            >
              上一页
            </PaginationPrevious>
          </PaginationItem>
          {paginationItems.map((item) =>
            typeof item === 'number' ? (
              <PaginationItem key={item}>
                <PaginationLink
                  {...buildPaginationLinkProps(item, false)}
                  aria-label={`${item}`}
                  isActive={item === pagination.page}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationEllipsis />
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              {...buildPaginationLinkProps(pagination.page + 1, !canGoToNextPage)}
            >
              下一页
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}

export function DataTable<TData>({
  columns,
  data,
  emptyTitle = '没有找到内容',
  emptyDescription = '换个条件再试试。',
  tableClassName,
  pagination,
  getRowId,
  expandedRowIds,
  renderExpandedRow,
}: DataTableProps<TData>) {
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)]">
      <Table className={tableClassName}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const columnMeta = header.column.columnDef.meta as DataTableColumnMeta | undefined

                return (
                <TableHead key={header.id} className={columnMeta?.headClassName}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => {
            const isExpanded = Boolean(expandedRowIds?.includes(row.id))

            return (
              <Fragment key={row.id}>
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => {
                    const columnMeta = cell.column.columnDef.meta as DataTableColumnMeta | undefined

                    return (
                    <TableCell key={cell.id} className={columnMeta?.cellClassName}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                    )
                  })}
                </TableRow>
                {isExpanded && renderExpandedRow ? (
                  <TableRow key={`${row.id}-expanded`} data-state="expanded">
                    <TableCell colSpan={row.getVisibleCells().length} className="bg-[var(--surface-container-low)]/45">
                      {renderExpandedRow(row.original)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </Fragment>
            )
          })}
        </TableBody>
      </Table>
      {pagination ? <DataTablePaginationFooter pagination={pagination} /> : null}
    </div>
  )
}
