import type { ColumnDef } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DataTable } from '@/components/shared/data-table'

type TableRow = {
  title: string
  category: string
}

const columns: Array<ColumnDef<TableRow, unknown>> = [
  {
    accessorKey: 'title',
    header: '书名',
  },
  {
    accessorKey: 'category',
    header: '分类',
  },
]

const rows: TableRow[] = [
  {
    title: '智能系统设计',
    category: '人工智能',
  },
]

describe('DataTable', () => {
  it('renders a visible shadcn pagination bar with active page pills and edge links', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={{
          page: 1,
          pageSize: 10,
          total: 120,
          onPageChange,
        }}
      />,
    )

    expect(screen.getByRole('navigation', { name: '分页导航' })).toBeInTheDocument()
    expect(
      screen.getByText((_, node) => node?.textContent?.replace(/\s+/g, '') === '第1/12页，共120条'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '1' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: '1' })).not.toHaveClass('opacity-50')
    expect(screen.getByRole('link', { name: '1' })).toHaveClass('!bg-[var(--primary)]')
    expect(screen.getByRole('link', { name: '1' })).toHaveClass('!text-white')
    expect(screen.getByRole('link', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '12' })).toBeInTheDocument()
    expect(screen.getByText('更多页码')).toBeInTheDocument()

    const previousPageLink = screen.getByRole('link', { name: '上一页' })
    const nextPageLink = screen.getByRole('link', { name: '下一页' })

    expect(previousPageLink).toHaveAttribute('aria-disabled', 'true')
    expect(nextPageLink).not.toHaveAttribute('aria-disabled', 'true')

    await user.click(screen.getByRole('link', { name: '2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('hides pagination navigation when pagination metadata is omitted', () => {
    render(<DataTable columns={columns} data={rows} />)

    expect(screen.queryByRole('navigation', { name: '分页导航' })).not.toBeInTheDocument()
  })

  it('marks next navigation as disabled on the final page', () => {
    render(
      <DataTable
        columns={columns}
        data={rows}
        pagination={{
          page: 12,
          pageSize: 10,
          total: 120,
          onPageChange: vi.fn(),
        }}
      />,
    )

    expect(screen.getByRole('link', { name: '12' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: '12' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: '12' })).toHaveClass('!bg-[var(--primary)]')
    expect(screen.getByRole('link', { name: '12' })).toHaveClass('!text-white')
    expect(screen.getByRole('link', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '上一页' })).not.toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('link', { name: '下一页' })).toHaveAttribute('aria-disabled', 'true')
  })
})
