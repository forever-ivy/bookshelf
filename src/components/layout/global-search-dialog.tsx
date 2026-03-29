import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight, BookOpen, LayoutDashboard, Search, Users } from 'lucide-react'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getAdminOrders } from '@/lib/api/admin'
import { getAdminBooks, getAdminReaders } from '@/lib/api/management'
import { formatOrderModeLabel, formatStatusLabel } from '@/lib/display-labels'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

const GLOBAL_SEARCH_PLACEHOLDER = '搜索图书、订单、读者与告警'
const GLOBAL_SEARCH_RESULT_LIMIT = 5

const QUICK_ACTIONS = [
  {
    id: 'dashboard',
    label: '首页总览',
    description: '回到首页查看今天的整体情况',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    id: 'books',
    label: '图书管理',
    description: '查看图书、分类和标签',
    icon: BookOpen,
    path: '/books',
  },
  {
    id: 'orders',
    label: '订单管理',
    description: '查看借书订单和送书状态',
    icon: Search,
    path: '/orders',
  },
  {
    id: 'readers',
    label: '读者管理',
    description: '查看读者资料、限制和分组',
    icon: Users,
    path: '/readers',
  },
  {
    id: 'alerts',
    label: '警告中心',
    description: '查看告警和处理记录',
    icon: AlertTriangle,
    path: '/alerts',
  },
] as const

type GlobalSearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function buildSearchPath(pathname: string, query: string) {
  const nextSearchParams = new URLSearchParams()
  nextSearchParams.set('q', query)
  return `${pathname}?${nextSearchParams.toString()}`
}

function ResultText({ title, description }: { title: string; description: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-medium text-[var(--foreground)]">{title}</p>
      <p className="truncate text-xs text-[var(--muted-foreground)]">{description}</p>
    </div>
  )
}

export function GlobalSearchDialog({ open, onOpenChange }: GlobalSearchDialogProps) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const hasSearch = deferredSearch.length > 0

  useEffect(() => {
    if (!open) {
      setSearch('')
    }
  }, [open])

  const booksQuery = useQuery({
    enabled: open && hasSearch,
    queryKey: ['admin', 'global-search', 'books', deferredSearch],
    queryFn: () =>
      getAdminBooks({
        query: deferredSearch,
        page: 1,
        pageSize: GLOBAL_SEARCH_RESULT_LIMIT,
      }),
  })

  const readersQuery = useQuery({
    enabled: open && hasSearch,
    queryKey: ['admin', 'global-search', 'readers', deferredSearch],
    queryFn: () =>
      getAdminReaders({
        query: deferredSearch,
        page: 1,
        pageSize: GLOBAL_SEARCH_RESULT_LIMIT,
      }),
  })

  const ordersQuery = useQuery({
    enabled: open && hasSearch,
    queryKey: ['admin', 'global-search', 'orders', deferredSearch],
    queryFn: () =>
      getAdminOrders({
        query: deferredSearch,
        page: 1,
        pageSize: GLOBAL_SEARCH_RESULT_LIMIT,
      }),
  })

  const isSearching = booksQuery.isFetching || readersQuery.isFetching || ordersQuery.isFetching
  const books = booksQuery.data?.items ?? []
  const readers = readersQuery.data?.items ?? []
  const orders = ordersQuery.data?.items ?? []
  const hasResults = books.length > 0 || readers.length > 0 || orders.length > 0

  const searchActions = useMemo(() => {
    if (!hasSearch) {
      return []
    }

    return [
      {
        id: 'search-books',
        label: `在图书管理中搜索“${deferredSearch}”`,
        description: '跳转到图书管理页查看完整结果',
        path: buildSearchPath('/books', deferredSearch),
      },
      {
        id: 'search-readers',
        label: `在读者管理中搜索“${deferredSearch}”`,
        description: '跳转到读者管理页查看完整结果',
        path: buildSearchPath('/readers', deferredSearch),
      },
      {
        id: 'open-orders',
        label: '打开订单管理',
        description: '继续在订单页处理或筛选',
        path: '/orders',
      },
    ]
  }, [deferredSearch, hasSearch])

  function handleSelect(path: string) {
    onOpenChange(false)
    setSearch('')
    navigate(path)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0">
        <DialogTitle className="sr-only">全局搜索</DialogTitle>
        <DialogDescription className="sr-only">
          搜索图书、订单、读者，并快速跳转到后台常用页面。
        </DialogDescription>

        <Command shouldFilter={false}>
          <CommandInput
            autoFocus
            placeholder={GLOBAL_SEARCH_PLACEHOLDER}
            value={search}
            onValueChange={(value) => {
              startTransition(() => {
                setSearch(value)
              })
            }}
          />
          <CommandList>
            {!hasSearch ? (
              <CommandGroup heading="快捷跳转">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon
                  return (
                    <CommandItem key={action.id} value={action.label} onSelect={() => handleSelect(action.path)}>
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)]">
                        <Icon className="size-4 text-[var(--primary)]" />
                      </div>
                      <ResultText title={action.label} description={action.description} />
                      <CommandShortcut>{action.id === 'dashboard' ? 'G D' : '打开'}</CommandShortcut>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : (
              <>
                <CommandGroup heading="快捷跳转">
                  {searchActions.map((action) => (
                    <CommandItem key={action.id} value={action.label} onSelect={() => handleSelect(action.path)}>
                      <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)]">
                        <ArrowRight className="size-4 text-[var(--primary)]" />
                      </div>
                      <ResultText title={action.label} description={action.description} />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />

                {isSearching ? (
                  <div className="px-4 py-8 text-sm text-[var(--muted-foreground)]">正在搜索…</div>
                ) : !hasResults ? (
                  <CommandEmpty>没有找到相关内容，换个关键词再试试。</CommandEmpty>
                ) : (
                  <>
                    {books.length > 0 ? (
                      <CommandGroup heading="图书">
                        {books.map((book) => (
                          <CommandItem
                            key={`book-${book.id}`}
                            value={`${book.title} ${book.author ?? ''}`}
                            onSelect={() => handleSelect(buildSearchPath('/books', book.title))}
                          >
                            <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)]">
                              <BookOpen className="size-4 text-[var(--primary)]" />
                            </div>
                            <ResultText title={book.title} description={book.author || '作者待补充'} />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : null}

                    {readers.length > 0 ? (
                      <>
                        {books.length > 0 ? <CommandSeparator /> : null}
                        <CommandGroup heading="读者">
                          {readers.map((reader) => (
                            <CommandItem
                              key={`reader-${reader.id}`}
                              value={`${reader.display_name} ${reader.username}`}
                              onSelect={() => handleSelect(`/readers/${reader.id}`)}
                            >
                              <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)]">
                                <Users className="size-4 text-[var(--primary)]" />
                              </div>
                              <ResultText
                                title={reader.display_name}
                                description={`${reader.username} · ${reader.college ?? '学院待补充'}`}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    ) : null}

                    {orders.length > 0 ? (
                      <>
                        {books.length > 0 || readers.length > 0 ? <CommandSeparator /> : null}
                        <CommandGroup heading="订单">
                          {orders.map((bundle) => (
                            <CommandItem
                              key={`order-${bundle.borrow_order.id}`}
                              value={`订单 ${bundle.borrow_order.id} ${bundle.delivery_order?.delivery_target ?? ''}`}
                              onSelect={() => handleSelect(`/orders/${bundle.borrow_order.id}`)}
                            >
                              <div className="flex size-10 items-center justify-center rounded-2xl border border-[var(--line-subtle)] bg-[var(--surface-bright)]">
                                <Search className="size-4 text-[var(--primary)]" />
                              </div>
                              <ResultText
                                title={`订单 #${bundle.borrow_order.id}`}
                                description={`${formatOrderModeLabel(bundle.borrow_order.order_mode)} · ${formatStatusLabel(bundle.borrow_order.status)}`}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </>
                    ) : null}
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

export { GLOBAL_SEARCH_PLACEHOLDER }
