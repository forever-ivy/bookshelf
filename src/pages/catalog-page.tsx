import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useDeferredValue, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getBooks } from '@/lib/api/catalog'
import type { Book } from '@/types/domain'

const columnHelper = createColumnHelper<Book>()

export function CatalogPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const booksQuery = useQuery({
    queryKey: ['catalog', deferredSearch],
    queryFn: () => getBooks(deferredSearch.trim() || undefined),
  })

  const books = booksQuery.data?.items ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Array<ColumnDef<Book, any>> = [
    columnHelper.accessor('title', {
      header: '书名',
      cell: (info) => (
        <div className="space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{info.row.original.author ?? '作者待补充'}</p>
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: '分类',
      cell: (info) => info.getValue() ?? '—',
    }),
    columnHelper.accessor('available_copies', {
      header: '可借库存',
      cell: (info) => info.getValue() ?? 0,
    }),
    columnHelper.accessor('delivery_available', {
      header: '可配送',
      cell: (info) => <Badge variant={info.getValue() ? 'success' : 'outline'}>{info.getValue() ? '支持' : '否'}</Badge>,
    }),
    columnHelper.accessor('stock_status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ]

  return (
    <PageShell
      title="图书目录页"
      description="高密度查看馆藏目录、可借库存、配送能力与格口分布。"
      actions={<Input className="w-full md:w-80" placeholder="搜索书名、作者、关键词…" value={search} onChange={(e) => setSearch(e.target.value)} />}
    >
      <div className="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        {booksQuery.isLoading ? (
          <LoadingState label="正在加载馆藏目录…" />
        ) : (
          <DataTable columns={columns} data={books} emptyTitle="没有找到图书" emptyDescription="换一个关键词试试，或者先在后端初始化一些书目数据。" />
        )}

        <Card>
          <CardHeader>
            <CardTitle>目录观察</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">书目总数</p>
              <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{books.length}</p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
              <p className="text-sm font-medium text-[var(--foreground)]">高频分类</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {Array.from(new Set(books.map((book) => book.category).filter(Boolean)))
                  .slice(0, 8)
                  .map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageShell>
  )
}
