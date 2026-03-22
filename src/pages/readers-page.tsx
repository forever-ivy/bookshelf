import { useQuery } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Link } from 'react-router-dom'
import { useDeferredValue, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReaders } from '@/lib/api/readers'
import type { ReaderListItem } from '@/types/domain'
import { formatDateTime } from '@/utils'

const columnHelper = createColumnHelper<ReaderListItem>()

export function ReadersPage() {
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const readersQuery = useQuery({
    queryKey: ['readers', deferredSearch],
    queryFn: () => getReaders(deferredSearch.trim() || undefined),
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const columns: Array<ColumnDef<ReaderListItem, any>> = [
    columnHelper.accessor('display_name', {
      header: '读者',
      cell: (info) => (
        <div>
          <p className="font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{info.row.original.username}</p>
        </div>
      ),
    }),
    columnHelper.accessor('college', { header: '学院', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('major', { header: '专业', cell: (info) => info.getValue() ?? '—' }),
    columnHelper.accessor('active_orders_count', { header: '活跃订单' }),
    columnHelper.accessor('last_active_at', {
      header: '最近活跃',
      cell: (info) => formatDateTime(info.getValue()),
    }),
    columnHelper.display({
      id: 'detail',
      header: '详情',
      cell: (info) => (
        <Button asChild size="sm" variant="secondary">
          <Link to={`/readers/${info.row.original.id}`}>查看</Link>
        </Button>
      ),
    }),
  ]

  return (
    <PageShell
      title="读者中心"
      description="管理员视角查看读者档案、活跃度、借阅历史、推荐与会话概况。"
      actions={<Input className="w-full md:w-80" placeholder="搜索读者账号、姓名、学院…" value={search} onChange={(event) => setSearch(event.target.value)} />}
    >
      {readersQuery.isLoading ? (
        <LoadingState label="正在加载读者列表…" />
      ) : (
        <DataTable columns={columns} data={readersQuery.data ?? []} emptyTitle="没有找到读者" emptyDescription="当前后端里还没有匹配的读者资料。" />
      )}
    </PageShell>
  )
}
