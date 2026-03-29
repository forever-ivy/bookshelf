import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, FolderTree, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge, formatStatusLabel } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  createAdminBook,
  createAdminCategory,
  createAdminTag,
  getAdminBooks,
  getAdminCategories,
  getAdminTags,
  setAdminBookStatus,
  updateAdminBook,
} from '@/lib/api/management'
import type { AdminBook, AdminBookCategory, AdminBookTag, PaginatedResponse } from '@/types/domain'
import {
  patchSearchParams,
  readOptionalSearchParam,
  readPositiveIntSearchParam,
  readSearchParam,
  useOptionalSearchParams,
} from '@/lib/search-params'
import { formatDateTime } from '@/utils'

const pageHero = getAdminPageHero('books')

const bookColumnHelper = createColumnHelper<AdminBook>()
const categoryColumnHelper = createColumnHelper<AdminBookCategory>()
const tagColumnHelper = createColumnHelper<AdminBookTag>()

const BOOKS_PAGE_SIZE = 50
const TAXONOMY_PAGE_SIZE = 20
const TAXONOMY_PEEK_PAGE_SIZE = 1

const EMPTY_BOOK_CREATE_FORM = {
  title: '',
  author: '',
  categoryId: '',
  tagIds: [] as string[],
  isbn: '',
  barcode: '',
  summary: '',
  shelfStatus: 'draft',
}

const EMPTY_BOOK_EDIT_FORM = {
  title: '',
  author: '',
  categoryId: '',
  tagIds: [] as string[],
  isbn: '',
  barcode: '',
  summary: '',
  shelfStatus: 'draft',
}

const EMPTY_CATEGORY_FORM = {
  name: '',
  description: '',
}

const EMPTY_TAG_FORM = {
  name: '',
  description: '',
}

const BOOK_SHELF_STATUS_OPTIONS = ['draft', 'on_shelf', 'off_shelf'] as const

function resolveBooksWorkspaceTab(value?: string): BooksWorkspaceTab {
  if (value === 'categories' || value === 'tags') {
    return value
  }

  return 'books'
}

function normalizeSelectedIds(values: string[]) {
  return values.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
}

function buildInternalCode(kind: 'category' | 'tag', name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const base = normalized || kind
  return `${kind}-${base}-${suffix}`.slice(0, 64)
}

function mergeUpdatedBook(
  current: PaginatedResponse<AdminBook> | undefined,
  updatedBook: AdminBook,
) {
  if (!current) {
    return current
  }

  return {
    ...current,
    items: current.items.map((book) => (book.id === updatedBook.id ? { ...book, ...updatedBook } : book)),
  }
}

type BooksWorkspaceTab = 'books' | 'categories' | 'tags'

function formatCopyInventoryStatusLabel(status?: string | null) {
  switch (status) {
    case 'stored':
      return '已存放'
    case 'reserved':
      return '已预留'
    case 'checked_out':
      return '已借出'
    case 'in_transit':
      return '运输中'
    default:
      return formatStatusLabel(status)
  }
}

function formatSnapshotValue(value?: string | number | null) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  return String(value)
}

export function BooksPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useOptionalSearchParams()
  const activeTab = resolveBooksWorkspaceTab(readOptionalSearchParam(searchParams, 'tab'))
  const searchQuery = readOptionalSearchParam(searchParams, 'q')
  const shelfStatusFilter = readOptionalSearchParam(searchParams, 'shelf_status')
  const categoryIdFilter = readPositiveIntSearchParam(searchParams, 'category_id')
  const bookIdFilter = activeTab === 'books' ? readPositiveIntSearchParam(searchParams, 'book_id') : undefined
  const categorySearchQuery = readOptionalSearchParam(searchParams, 'category_q')
  const categoryStatusFilter = readOptionalSearchParam(searchParams, 'category_status')
  const tagSearchQuery = readOptionalSearchParam(searchParams, 'tag_q')
  const [search, setSearch] = useState(() => readSearchParam(searchParams, 'q'))
  const [categorySearch, setCategorySearch] = useState(() => readSearchParam(searchParams, 'category_q'))
  const [tagSearch, setTagSearch] = useState(() => readSearchParam(searchParams, 'tag_q'))
  const isBookSearchComposingRef = useRef(false)
  const isCategorySearchComposingRef = useRef(false)
  const isTagSearchComposingRef = useRef(false)
  const [bookPage, setBookPage] = useState(1)
  const [categoriesPage, setCategoriesPage] = useState(1)
  const [tagsPage, setTagsPage] = useState(1)
  const [hasLoadedCategoriesTable, setHasLoadedCategoriesTable] = useState(false)
  const [hasLoadedTagsTable, setHasLoadedTagsTable] = useState(false)
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false)
  const [bookCreateForm, setBookCreateForm] = useState(EMPTY_BOOK_CREATE_FORM)
  const [bookEditForm, setBookEditForm] = useState(EMPTY_BOOK_EDIT_FORM)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [tagForm, setTagForm] = useState(EMPTY_TAG_FORM)
  const [booksTotalBaseline, setBooksTotalBaseline] = useState<number | null>(null)
  const categoriesPageSize =
    activeTab === 'books' ||
    hasLoadedCategoriesTable ||
    activeTab === 'categories' ||
    Boolean(categorySearchQuery) ||
    Boolean(categoryStatusFilter)
      ? TAXONOMY_PAGE_SIZE
      : TAXONOMY_PEEK_PAGE_SIZE
  const tagsPageSize =
    hasLoadedTagsTable || activeTab === 'tags' || Boolean(tagSearchQuery) ? TAXONOMY_PAGE_SIZE : TAXONOMY_PEEK_PAGE_SIZE

  const ensureFullCategoryList = () => {
    setHasLoadedCategoriesTable(true)
  }

  const ensureFullTagList = () => {
    setHasLoadedTagsTable(true)
  }

  const booksQuery = useQuery({
    queryKey: ['admin', 'books', bookPage, searchQuery, shelfStatusFilter, categoryIdFilter],
    queryFn: () =>
      getAdminBooks({
        page: bookPage,
        pageSize: BOOKS_PAGE_SIZE,
        query: searchQuery,
        shelfStatus: shelfStatusFilter,
        categoryId: categoryIdFilter,
      }),
  })
  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories', categoriesPage, categoriesPageSize, categorySearchQuery, categoryStatusFilter],
    queryFn: () =>
      getAdminCategories({
        page: hasLoadedCategoriesTable ? categoriesPage : 1,
        pageSize: categoriesPageSize,
        query: categorySearchQuery,
        status: categoryStatusFilter,
      }),
  })
  const tagsQuery = useQuery({
    queryKey: ['admin', 'tags', tagsPage, tagsPageSize, tagSearchQuery],
    queryFn: () =>
      getAdminTags({
        page: hasLoadedTagsTable ? tagsPage : 1,
        pageSize: tagsPageSize,
        query: tagSearchQuery,
      }),
  })

  const books = booksQuery.data?.items ?? []
  const categories = categoriesQuery.data?.items ?? []
  const tags = tagsQuery.data?.items ?? []
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null
  const entityCatalogBook = bookIdFilter ? books.find((book) => book.id === bookIdFilter) ?? null : null
  const isEntityCatalogView = activeTab === 'books' && Boolean(bookIdFilter)
  const hasCategories = categories.length > 0
  const hasTags = tags.length > 0

  const commitBookSearch = useCallback(
    (nextValue: string) => {
      setBookPage(1)
      setSearchParams(
        patchSearchParams(searchParams, {
          q: nextValue.trim() || undefined,
        }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  const commitCategorySearch = useCallback(
    (nextValue: string) => {
      setCategoriesPage(1)
      setSearchParams(
        patchSearchParams(searchParams, {
          category_q: nextValue.trim() || undefined,
        }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  const commitTagSearch = useCallback(
    (nextValue: string) => {
      setTagsPage(1)
      setSearchParams(
        patchSearchParams(searchParams, {
          tag_q: nextValue.trim() || undefined,
        }),
        { replace: true },
      )
    },
    [searchParams, setSearchParams],
  )

  useEffect(() => {
    if (books[0] && !books.some((book) => book.id === selectedBookId)) {
      setSelectedBookId(books[0].id)
    }
  }, [books, selectedBookId])

  useEffect(() => {
    const nextSearch = readSearchParam(searchParams, 'q')
    if (!isBookSearchComposingRef.current && nextSearch !== search) {
      setSearch(nextSearch)
    }
  }, [search, searchParams])

  useEffect(() => {
    const nextCategorySearch = readSearchParam(searchParams, 'category_q')
    if (!isCategorySearchComposingRef.current && nextCategorySearch !== categorySearch) {
      setCategorySearch(nextCategorySearch)
    }
  }, [categorySearch, searchParams])

  useEffect(() => {
    const nextTagSearch = readSearchParam(searchParams, 'tag_q')
    if (!isTagSearchComposingRef.current && nextTagSearch !== tagSearch) {
      setTagSearch(nextTagSearch)
    }
  }, [searchParams, tagSearch])

  useEffect(() => {
    if (
      booksQuery.data?.total !== undefined &&
      !searchQuery &&
      !shelfStatusFilter &&
      !categoryIdFilter
    ) {
      setBooksTotalBaseline(booksQuery.data.total)
    }
  }, [booksQuery.data?.total, categoryIdFilter, searchQuery, shelfStatusFilter])

  useEffect(() => {
    if (activeTab === 'categories') {
      ensureFullCategoryList()
      return
    }

    if (activeTab === 'tags') {
      ensureFullTagList()
    }
  }, [activeTab])

  useEffect(() => {
    if (!selectedBook) {
      return
    }
    setBookEditForm({
      title: selectedBook.title,
      author: selectedBook.author ?? '',
      categoryId: selectedBook.category_id ? String(selectedBook.category_id) : '',
      tagIds: selectedBook.tags.map((tag) => String(tag.id)),
      isbn: selectedBook.isbn ?? '',
      barcode: selectedBook.barcode ?? '',
      summary: selectedBook.summary ?? '',
      shelfStatus: selectedBook.shelf_status ?? 'draft',
    })
  }, [selectedBook])

  const createBookMutation = useMutation({
    mutationFn: () =>
      createAdminBook({
        title: bookCreateForm.title.trim(),
        author: bookCreateForm.author.trim() || undefined,
        category_id: bookCreateForm.categoryId ? Number(bookCreateForm.categoryId) : undefined,
        tag_ids: normalizeSelectedIds(bookCreateForm.tagIds),
        isbn: bookCreateForm.isbn.trim() || undefined,
        barcode: bookCreateForm.barcode.trim() || undefined,
        summary: bookCreateForm.summary.trim() || undefined,
        shelf_status: bookCreateForm.shelfStatus,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      setBookCreateForm(EMPTY_BOOK_CREATE_FORM)
      setIsCreateDialogOpen(false)
    },
  })

  const updateBookMutation = useMutation({
    mutationFn: () => {
      if (!selectedBook) {
        throw new Error('No selected book')
      }
      return updateAdminBook(selectedBook.id, {
        title: bookEditForm.title.trim(),
        author: bookEditForm.author.trim() || undefined,
        category_id: bookEditForm.categoryId ? Number(bookEditForm.categoryId) : undefined,
        tag_ids: normalizeSelectedIds(bookEditForm.tagIds),
        isbn: bookEditForm.isbn.trim() || undefined,
        barcode: bookEditForm.barcode.trim() || undefined,
        summary: bookEditForm.summary.trim() || undefined,
        shelf_status: bookEditForm.shelfStatus,
      })
    },
    onSuccess: (updatedBook) => {
      queryClient.setQueriesData<PaginatedResponse<AdminBook>>({ queryKey: ['admin', 'books'] }, (current) =>
        mergeUpdatedBook(current, updatedBook),
      )
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'], refetchType: 'none' })
      setIsEditDialogOpen(false)
    },
  })

  const setBookStatusMutation = useMutation({
    mutationFn: (shelfStatus: string) => {
      if (!selectedBook) {
        throw new Error('No selected book')
      }
      return setAdminBookStatus(selectedBook.id, shelfStatus)
    },
    onSuccess: (updatedBook) => {
      queryClient.setQueriesData<PaginatedResponse<AdminBook>>({ queryKey: ['admin', 'books'] }, (current) =>
        mergeUpdatedBook(current, updatedBook),
      )
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'], refetchType: 'none' })
      setBookEditForm((current) => ({
        ...current,
        shelfStatus: updatedBook.shelf_status ?? current.shelfStatus,
      }))
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createAdminCategory({
        code: buildInternalCode('category', categoryForm.name),
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim() || undefined,
        status: 'active',
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] })
      setCategoryForm(EMPTY_CATEGORY_FORM)
    },
  })

  const createTagMutation = useMutation({
    mutationFn: () =>
      createAdminTag({
        code: buildInternalCode('tag', tagForm.name),
        name: tagForm.name.trim(),
        description: tagForm.description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] })
      setTagForm(EMPTY_TAG_FORM)
    },
  })

  const handleBooksTabChange = (value: string) => {
    const nextTab = value as BooksWorkspaceTab
    setSearchParams(
      patchSearchParams(searchParams, {
        tab: nextTab === 'books' ? undefined : nextTab,
        book_id: nextTab === 'books' ? bookIdFilter : undefined,
      }),
      { replace: true },
    )

    if (nextTab === 'categories') {
      ensureFullCategoryList()
    }
    if (nextTab === 'tags') {
      ensureFullTagList()
    }
  }

  function openBookEntityCatalog(bookId: number) {
    setSelectedBookId(bookId)
    setSearchParams(
      patchSearchParams(searchParams, {
        book_id: bookId,
      }),
      { replace: true },
    )
  }

  function closeBookEntityCatalog() {
    setSearchParams(
      patchSearchParams(searchParams, {
        book_id: undefined,
      }),
      { replace: true },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookColumns: Array<ColumnDef<AdminBook, any>> = [
    bookColumnHelper.accessor('title', {
      header: '书名',
      meta: {
        headClassName: 'w-[18rem] min-w-[14rem]',
        cellClassName: 'w-[18rem] min-w-[14rem]',
      },
      cell: (info) => (
        <div className="min-w-0 max-w-[18rem] space-y-1">
          <p className="truncate font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="truncate text-xs text-[var(--muted-foreground)]">{info.row.original.author ?? '暂未填写作者'}</p>
        </div>
      ),
    }),
    bookColumnHelper.accessor('category', {
      header: '分类',
      meta: {
        headClassName: 'w-[12rem]',
        cellClassName: 'w-[12rem]',
      },
      cell: (info) => <span className="block max-w-[12rem] truncate">{info.getValue() ?? '—'}</span>,
    }),
    bookColumnHelper.accessor('isbn', {
      header: 'ISBN',
      meta: {
        headClassName: 'w-[9rem]',
        cellClassName: 'w-[9rem]',
      },
      cell: (info) => <span className="block max-w-[9rem] truncate">{info.getValue() ?? '—'}</span>,
    }),
    bookColumnHelper.accessor('shelf_status', {
      header: '上架状态',
      meta: {
        headClassName: 'w-[7rem]',
        cellClassName: 'w-[7rem]',
      },
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    bookColumnHelper.display({
      id: 'tags',
      header: '标签',
      meta: {
        headClassName: 'w-[11rem]',
        cellClassName: 'w-[11rem]',
      },
      cell: (info) => (
        <div className="flex max-w-[11rem] flex-wrap gap-2">
          {(info.row.original.tags ?? []).slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="secondary">
              {tag.name}
            </Badge>
          ))}
        </div>
      ),
    }),
    bookColumnHelper.display({
      id: 'actions',
      header: '操作',
      meta: {
        headClassName: 'w-[11rem] min-w-[11rem] text-right',
        cellClassName: 'w-[11rem] min-w-[11rem]',
      },
      cell: (info) => (
        <div className="flex min-w-[11rem] items-center justify-end gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setSelectedBookId(info.row.original.id)
              setIsEditDialogOpen(true)
            }}
          >
            编辑此书
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => openBookEntityCatalog(info.row.original.id)}
          >
            <ChevronRight className="size-4" />
            查看详情
          </Button>
        </div>
      ),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryColumns: Array<ColumnDef<AdminBookCategory, any>> = [
    categoryColumnHelper.accessor('name', { header: '分类名' }),
    categoryColumnHelper.accessor('id', { header: '编号' }),
    categoryColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagColumns: Array<ColumnDef<AdminBookTag, any>> = [
    tagColumnHelper.accessor('name', { header: '标签名' }),
    tagColumnHelper.accessor('id', { header: '编号' }),
    tagColumnHelper.accessor('description', {
      header: '说明',
      cell: (info) => info.getValue() ?? '—',
    }),
  ]

  function renderBookEntityCatalog(book: AdminBook) {
    const copies = book.copies ?? []

    return (
      <div className="space-y-8">
        <section className="space-y-6 border-b border-[var(--line-subtle)] pb-6">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted-foreground)]">图书信息</p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">
              先看这本书的基础信息，再继续查看每个实体副本的存放位置和借阅状态。
            </p>
          </div>

          <dl className="grid gap-4 md:grid-cols-3">
            {[
              { label: '作者', value: formatSnapshotValue(book.author) },
              { label: 'ISBN', value: formatSnapshotValue(book.isbn) },
              { label: '条码', value: formatSnapshotValue(book.barcode) },
            ].map((item) => (
              <div key={item.label} className="border-b border-[var(--line-subtle)] pb-3">
                <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">{item.label}</dt>
                <dd className="mt-2 break-words text-base font-medium text-[var(--foreground)]">{item.value}</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">简介</p>
            <p className="max-w-[56rem] text-sm leading-7 text-[var(--foreground)]">
              {book.summary?.trim() || '暂无简介'}
            </p>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-[var(--line-subtle)] pt-4">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">实体副本</p>
              <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">{copies.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">可借副本</p>
              <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {book.stock_summary?.available_copies ?? book.available_copies ?? 0}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">总库存</p>
              <p className="text-lg font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {book.stock_summary?.total_copies ?? book.total_copies ?? copies.length}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1 border-b border-[var(--line-subtle)] pb-4">
            <h4 className="text-[1.15rem] font-semibold tracking-[-0.03em] text-[var(--foreground)]">实体目录</h4>
            <p className="text-sm text-[var(--muted-foreground)]">查看每个副本当前所在书柜、槽位和可借状态。</p>
          </div>

          {copies.length === 0 ? (
            <div className="rounded-[1.2rem] border border-dashed border-[var(--line-subtle)] bg-white/70 px-4 py-4 text-sm text-[var(--muted-foreground)]">
              当前还没有登记实体副本，后续可在库存台补录书柜、槽位和库存状态。
            </div>
          ) : (
            <div className="space-y-3">
              {copies.map((copy) => (
                <section
                  key={copy.id}
                  className="rounded-[1.25rem] border border-[var(--line-subtle)] bg-white/80 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-[var(--foreground)]">
                        {(copy.cabinet_name ?? '未分配书柜') + ' · ' + (copy.slot_code ?? '未分配位置')}
                      </p>
                      <p className="text-sm text-[var(--muted-foreground)]">{copy.cabinet_location ?? '位置待补充'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge
                        status={copy.inventory_status}
                        label={formatCopyInventoryStatusLabel(copy.inventory_status)}
                      />
                      <StatusBadge
                        status={copy.available_for_borrow ? 'available' : 'none'}
                        label={copy.available_for_borrow ? '可借' : '不可借'}
                      />
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 border-t border-[var(--line-subtle)] pt-4 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">副本编号</dt>
                      <dd className="font-medium text-[var(--foreground)]">#{copy.id}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">书柜编号</dt>
                      <dd className="font-medium text-[var(--foreground)]">{formatSnapshotValue(copy.cabinet_id)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">槽位</dt>
                      <dd className="font-medium text-[var(--foreground)]">{formatSnapshotValue(copy.slot_code)}</dd>
                    </div>
                    <div className="space-y-1">
                      <dt className="text-xs uppercase tracking-[0.14em] text-[var(--muted-foreground)]">更新时间</dt>
                      <dd className="font-medium text-[var(--foreground)]">
                        {formatDateTime(copy.updated_at ?? copy.created_at)}
                      </dd>
                    </div>
                  </dl>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const booksAction = (
    <div className="flex w-full flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-end">
      <Input
        className="w-full md:w-80"
        placeholder="按书名、作者、ISBN 搜索..."
        value={search}
        onChange={(event) => {
          const nextValue = event.target.value
          setSearch(nextValue)
          if (!isBookSearchComposingRef.current) {
            commitBookSearch(nextValue)
          }
        }}
        onCompositionStart={() => {
          isBookSearchComposingRef.current = true
        }}
        onCompositionEnd={(event) => {
          isBookSearchComposingRef.current = false
          const nextValue = event.currentTarget.value
          setSearch(nextValue)
          commitBookSearch(nextValue)
        }}
      />
      <Select
        value={shelfStatusFilter ?? 'all'}
        onValueChange={(value) => {
          setBookPage(1)
          setSearchParams(
            patchSearchParams(searchParams, {
              shelf_status: value === 'all' ? undefined : value,
            }),
            { replace: true },
          )
        }}
      >
        <SelectTrigger aria-label="上架状态筛选" className="md:w-[10rem]">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {BOOK_SHELF_STATUS_OPTIONS.map((value) => (
            <SelectItem key={value} value={value}>
              {formatStatusLabel(value)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={categoryIdFilter ? String(categoryIdFilter) : 'all'}
        onValueChange={(value) => {
          setBookPage(1)
          setSearchParams(
            patchSearchParams(searchParams, {
              category_id: value === 'all' ? undefined : Number(value),
            }),
            { replace: true },
          )
        }}
      >
        <SelectTrigger aria-label="分类筛选" className="md:w-[11rem]" onClick={ensureFullCategoryList}>
          <SelectValue placeholder="全部分类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部分类</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open)
            if (open) {
              ensureFullCategoryList()
              ensureFullTagList()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              新增图书
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增图书</DialogTitle>
            <DialogDescription>填写基本信息，把新书加入系统。</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-book-title">书名</Label>
                <Input id="new-book-title" value={bookCreateForm.title} onChange={(event) => setBookCreateForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-book-author">作者</Label>
                <Input id="new-book-author" value={bookCreateForm.author} onChange={(event) => setBookCreateForm((current) => ({ ...current, author: event.target.value }))} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label id="new-book-category-label">分类</Label>
                  <Select
                    value={bookCreateForm.categoryId}
                    onValueChange={(value) =>
                      setBookCreateForm((current) => ({
                        ...current,
                        categoryId: value === 'unclassified' ? '' : value,
                      }))
                    }
                  >
                    <SelectTrigger aria-labelledby="new-book-category-label">
                      <SelectValue placeholder="未分类" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unclassified">未分类</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!hasCategories ? <p className="text-xs text-[var(--muted-foreground)]">还没有分类，可以先去创建。</p> : null}
                </div>
                <div className="space-y-2">
                  <Label id="new-book-tags-label">标签</Label>
                  <div className="rounded-[1.1rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-3">
                    {hasTags ? (
                      <ToggleGroup
                        type="multiple"
                        aria-labelledby="new-book-tags-label"
                        value={bookCreateForm.tagIds}
                        onValueChange={(value) => setBookCreateForm((current) => ({ ...current, tagIds: value }))}
                      >
                        {tags.map((tag) => {
                          return (
                            <ToggleGroupItem
                              key={tag.id}
                              value={String(tag.id)}
                              aria-label={tag.name}
                            >
                              {tag.name}
                            </ToggleGroupItem>
                          )
                        })}
                      </ToggleGroup>
                    ) : (
                      <p className="text-xs text-[var(--muted-foreground)]">还没有标签，可以先去创建。</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="new-book-isbn">ISBN</Label>
                  <Input id="new-book-isbn" value={bookCreateForm.isbn} onChange={(event) => setBookCreateForm((current) => ({ ...current, isbn: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-book-barcode">条码</Label>
                  <Input id="new-book-barcode" value={bookCreateForm.barcode} onChange={(event) => setBookCreateForm((current) => ({ ...current, barcode: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-book-summary">简介</Label>
                <Textarea id="new-book-summary" value={bookCreateForm.summary} onChange={(event) => setBookCreateForm((current) => ({ ...current, summary: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                className="min-w-32"
                disabled={createBookMutation.isPending || !bookCreateForm.title.trim()}
                onClick={() => createBookMutation.mutate()}
              >
                {createBookMutation.isPending ? '保存中…' : '新增图书'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={isTaxonomyDialogOpen}
          onOpenChange={(open) => {
            setIsTaxonomyDialogOpen(open)
            if (open) {
              ensureFullCategoryList()
              ensureFullTagList()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <FolderTree className="size-4" />
              管理分类和标签
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[min(860px,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] overflow-hidden">
            <DialogHeader>
              <DialogTitle>分类和标签</DialogTitle>
              <DialogDescription>维护全局可用的分类和标签，供图书编辑时直接选择。</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="categories" className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="categories">分类</TabsTrigger>
                <TabsTrigger value="tags">标签</TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="mt-0 min-h-0 flex-1 overflow-hidden">
                <div className="grid min-h-0 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <section className="flex min-h-0 flex-col space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-[var(--foreground)]">现有分类</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">分类用于定义图书的主归属，一本书通常只选一个分类。</p>
                    </div>
                    <ScrollArea
                      data-testid="taxonomy-categories-list"
                      className="min-h-0 max-h-[min(52vh,32rem)] pr-2"
                    >
                      {categoriesQuery.isLoading ? (
                        <p className="text-sm text-[var(--muted-foreground)]">正在载入</p>
                      ) : categories.length ? (
                        <div className="space-y-3">
                          {categories.map((category) => (
                            <div
                              key={category.id}
                              className="flex items-start justify-between gap-4 rounded-[1.1rem] border border-[var(--line-subtle)] bg-white/78 px-4 py-3"
                            >
                              <div className="space-y-1">
                                <p className="font-medium text-[var(--foreground)]">{category.name}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">编号 {category.id}</p>
                              </div>
                              <StatusBadge status={category.status ?? 'active'} />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">还没有分类，先在右侧新建一个。</p>
                      )}
                    </ScrollArea>
                  </section>

                  <section className="space-y-4 self-start rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-[var(--foreground)]">新建分类</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">只需要填写给人看的名称，编号会自动生成。</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-name">分类名称</Label>
                      <Input id="category-name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-description">分类说明</Label>
                      <Textarea
                        id="category-description"
                        value={categoryForm.description}
                        onChange={(event) => setCategoryForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="可选，用一句话说明这个分类适合哪些图书。"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={createCategoryMutation.isPending || !categoryForm.name.trim()}
                      onClick={() => createCategoryMutation.mutate()}
                    >
                      {createCategoryMutation.isPending ? '保存中…' : '创建分类'}
                    </Button>
                  </section>
                </div>
              </TabsContent>

              <TabsContent value="tags" className="mt-0 min-h-0 flex-1 overflow-hidden">
                <div className="grid min-h-0 items-start gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                  <section className="flex min-h-0 flex-col space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-[var(--foreground)]">现有标签</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">标签用于补充特征，一本书可以同时拥有多个标签。</p>
                    </div>
                    <ScrollArea
                      data-testid="taxonomy-tags-list"
                      className="min-h-0 max-h-[min(52vh,32rem)] pr-2"
                    >
                      {tagsQuery.isLoading ? (
                        <p className="text-sm text-[var(--muted-foreground)]">正在载入</p>
                      ) : tags.length ? (
                        <div className="space-y-3">
                          {tags.map((tag) => (
                            <div
                              key={tag.id}
                              className="space-y-1 rounded-[1.1rem] border border-[var(--line-subtle)] bg-white/78 px-4 py-3"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <p className="font-medium text-[var(--foreground)]">{tag.name}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">编号 {tag.id}</p>
                              </div>
                              {tag.description ? <p className="text-sm text-[var(--muted-foreground)]">{tag.description}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">还没有标签，先在右侧新建一个。</p>
                      )}
                    </ScrollArea>
                  </section>

                  <section className="space-y-4 self-start rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-[var(--foreground)]">新建标签</h4>
                      <p className="text-sm text-[var(--muted-foreground)]">填写标签名称和说明即可，编号会自动生成。</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag-name">标签名称</Label>
                      <Input id="tag-name" value={tagForm.name} onChange={(event) => setTagForm((current) => ({ ...current, name: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tag-description">标签说明</Label>
                      <Textarea id="tag-description" value={tagForm.description} onChange={(event) => setTagForm((current) => ({ ...current, description: event.target.value }))} />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={createTagMutation.isPending || !tagForm.name.trim()}
                      onClick={() => createTagMutation.mutate()}
                    >
                      {createTagMutation.isPending ? '保存中…' : '创建标签'}
                    </Button>
                  </section>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )

  const categoriesAction = (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
      <Input
        className="w-full md:w-72"
        placeholder="搜索分类名称"
        value={categorySearch}
        onChange={(event) => {
          const nextValue = event.target.value
          setCategorySearch(nextValue)
          if (!isCategorySearchComposingRef.current) {
            commitCategorySearch(nextValue)
          }
        }}
        onCompositionStart={() => {
          isCategorySearchComposingRef.current = true
        }}
        onCompositionEnd={(event) => {
          isCategorySearchComposingRef.current = false
          const nextValue = event.currentTarget.value
          setCategorySearch(nextValue)
          commitCategorySearch(nextValue)
        }}
      />
      <Select
        value={categoryStatusFilter ?? 'all'}
        onValueChange={(value) => {
          setCategoriesPage(1)
          setSearchParams(
            patchSearchParams(searchParams, {
              category_status: value === 'all' ? undefined : value,
            }),
            { replace: true },
          )
        }}
      >
        <SelectTrigger aria-label="分类状态筛选" className="md:w-[10rem]">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          <SelectItem value="active">启用</SelectItem>
          <SelectItem value="inactive">停用</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  const tagsAction = (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
      <Input
        className="w-full md:w-72"
        placeholder="搜索标签名称"
        value={tagSearch}
        onChange={(event) => {
          const nextValue = event.target.value
          setTagSearch(nextValue)
          if (!isTagSearchComposingRef.current) {
            commitTagSearch(nextValue)
          }
        }}
        onCompositionStart={() => {
          isTagSearchComposingRef.current = true
        }}
        onCompositionEnd={(event) => {
          isTagSearchComposingRef.current = false
          const nextValue = event.currentTarget.value
          setTagSearch(nextValue)
          commitTagSearch(nextValue)
        }}
      />
    </div>
  )

  const entityCatalogAction = (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
      <Button type="button" size="sm" variant="default" onClick={closeBookEntityCatalog}>
        <ChevronLeft className="size-4" />
        返回图书列表
      </Button>
      {entityCatalogBook ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            setSelectedBookId(entityCatalogBook.id)
            setIsEditDialogOpen(true)
          }}
        >
          编辑此书
        </Button>
      ) : null}
    </div>
  )

  const pageMeta = isEntityCatalogView
    ? {
        title: entityCatalogBook?.title ?? '图书详情',
        description: entityCatalogBook?.author
          ? `作者：${entityCatalogBook.author}`
          : '查看这本书的基本信息和馆藏位置。',
        statusLine: '图书详情',
      }
    : {
        title: '图书管理',
        description: '查看和维护图书信息、分类和标签。',
        statusLine: '图书列表',
      }

  return (
    <PageShell
      {...pageHero}
      eyebrow="图书管理"
      title={pageMeta.title}
      description={pageMeta.description}
      statusLine={pageMeta.statusLine}
    >
      <div className="space-y-6 ">
        {isEntityCatalogView ? null : (
          <MetricStrip
            items={[
              {
                label: '图书总数',
                value: booksTotalBaseline ?? booksQuery.data?.total ?? books.length,
              },
              {
                label: '分类数量',
                value: categoriesQuery.data?.total ?? categories.length,
              },
              {
                label: '标签数量',
                value: tagsQuery.data?.total ?? tags.length,
              },
            ]}
            className="md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3"
          />
        )}

        <WorkspacePanel
          title={isEntityCatalogView ? '图书目录' : '图书列表'}
          description={
            isEntityCatalogView
              ? '这里会显示这本书的基本信息和馆藏位置。'
              : '查看图书、分类和标签，右侧可以直接编辑。'
          }
          action={
            isEntityCatalogView
              ? entityCatalogAction
              : activeTab === 'categories'
                ? categoriesAction
                : activeTab === 'tags'
                  ? tagsAction
                  : booksAction
          }
        >
          {isEntityCatalogView ? (
            entityCatalogBook ? (
              renderBookEntityCatalog(entityCatalogBook)
            ) : (
              <EmptyState
                title="未找到图书"
                description="当前筛选条件下找不到这本书，可返回图书列表重新选择。"
              />
            )
          ) : (
            <Tabs value={activeTab} onValueChange={handleBooksTabChange} className="space-y-4">
              <TabsList>
                <TabsTrigger value="books">图书</TabsTrigger>
                <TabsTrigger value="categories">分类</TabsTrigger>
                <TabsTrigger value="tags">标签</TabsTrigger>
              </TabsList>

              <TabsContent value="books">
                {booksQuery.isLoading ? (
                  <LoadingState label="正在载入" />
                ) : (
                  <DataTable
                    columns={bookColumns}
                    data={books}
                    emptyTitle="没有找到内容"
                    emptyDescription="换个条件再试试。"
                    tableClassName="table-fixed"
                    pagination={{
                      page: booksQuery.data?.page ?? bookPage,
                      pageSize: booksQuery.data?.page_size ?? BOOKS_PAGE_SIZE,
                      total: booksQuery.data?.total ?? books.length,
                      onPageChange: setBookPage,
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="categories">
                {categoriesQuery.isLoading ? (
                  <LoadingState label="正在载入" />
                ) : (
                  <DataTable
                    columns={categoryColumns}
                    data={categories}
                    emptyTitle="没有找到内容"
                    emptyDescription="换个条件再试试。"
                    pagination={{
                      page: categoriesQuery.data?.page ?? categoriesPage,
                      pageSize: categoriesQuery.data?.page_size ?? TAXONOMY_PAGE_SIZE,
                      total: categoriesQuery.data?.total ?? categories.length,
                      onPageChange: setCategoriesPage,
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="tags">
                {tagsQuery.isLoading ? (
                  <LoadingState label="正在载入" />
                ) : (
                  <DataTable
                    columns={tagColumns}
                    data={tags}
                    emptyTitle="没有找到内容"
                    emptyDescription="换个条件再试试。"
                    pagination={{
                      page: tagsQuery.data?.page ?? tagsPage,
                      pageSize: tagsQuery.data?.page_size ?? TAXONOMY_PAGE_SIZE,
                      total: tagsQuery.data?.total ?? tags.length,
                      onPageChange: setTagsPage,
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>
          )}
        </WorkspacePanel>
      </div>

      <Sheet
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open)
          if (open) {
            ensureFullCategoryList()
            ensureFullTagList()
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>编辑图书</SheetTitle>
            <SheetDescription>在这里修改图书信息、标签和上架状态。</SheetDescription>
          </SheetHeader>
          {!selectedBook ? (
            <div className="py-8">
              <EmptyState title="没有找到内容" description="请先在列表中选择一本图书。" />
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[calc(100vh-18rem)] pr-1">
                <div className="space-y-5">
                <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前图书</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{selectedBook.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    可借 {selectedBook.stock_summary?.available_copies ?? selectedBook.available_copies ?? 0} / 总库存 {selectedBook.stock_summary?.total_copies ?? selectedBook.total_copies ?? 0}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={setBookStatusMutation.isPending || (selectedBook.shelf_status ?? 'draft') === 'draft'}
                      onClick={() => setBookStatusMutation.mutate('draft')}
                    >
                      回到草稿
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={setBookStatusMutation.isPending || selectedBook.shelf_status === 'on_shelf'}
                      onClick={() => setBookStatusMutation.mutate('on_shelf')}
                    >
                      快速上架
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={setBookStatusMutation.isPending || selectedBook.shelf_status === 'off_shelf'}
                      onClick={() => setBookStatusMutation.mutate('off_shelf')}
                    >
                      快速下架
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-book-title">书名</Label>
                    <Input id="edit-book-title" value={bookEditForm.title} onChange={(event) => setBookEditForm((current) => ({ ...current, title: event.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-book-author">作者</Label>
                    <Input id="edit-book-author" value={bookEditForm.author} onChange={(event) => setBookEditForm((current) => ({ ...current, author: event.target.value }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label id="edit-book-category-label">分类</Label>
                      <Select
                        value={bookEditForm.categoryId}
                        onValueChange={(value) =>
                          setBookEditForm((current) => ({
                            ...current,
                            categoryId: value === 'unclassified' ? '' : value,
                          }))
                        }
                      >
                        <SelectTrigger aria-labelledby="edit-book-category-label">
                          <SelectValue placeholder="未分类" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unclassified">未分类</SelectItem>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label id="edit-book-tags-label">标签</Label>
                      <div className="rounded-[1.1rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-3">
                        {hasTags ? (
                          <ToggleGroup
                            type="multiple"
                            aria-labelledby="edit-book-tags-label"
                            value={bookEditForm.tagIds}
                            onValueChange={(value) => setBookEditForm((current) => ({ ...current, tagIds: value }))}
                          >
                            {tags.map((tag) => {
                              return (
                                <ToggleGroupItem
                                  key={tag.id}
                                  value={String(tag.id)}
                                  aria-label={tag.name}
                                >
                                  {tag.name}
                                </ToggleGroupItem>
                              )
                            })}
                          </ToggleGroup>
                        ) : (
                          <p className="text-xs text-[var(--muted-foreground)]">还没有标签，可以先去创建。</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-book-isbn">ISBN</Label>
                      <Input id="edit-book-isbn" value={bookEditForm.isbn} onChange={(event) => setBookEditForm((current) => ({ ...current, isbn: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-book-barcode">条码</Label>
                      <Input id="edit-book-barcode" value={bookEditForm.barcode} onChange={(event) => setBookEditForm((current) => ({ ...current, barcode: event.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-book-summary">简介</Label>
                    <Textarea id="edit-book-summary" value={bookEditForm.summary} onChange={(event) => setBookEditForm((current) => ({ ...current, summary: event.target.value }))} />
                  </div>
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-2 md:max-w-sm">
                      <Label id="book-status-switch-label">上架状态</Label>
                      <Select
                        value={bookEditForm.shelfStatus}
                        onValueChange={(value) =>
                          setBookEditForm((current) => ({
                            ...current,
                            shelfStatus: value,
                          }))
                        }
                      >
                        <SelectTrigger aria-labelledby="book-status-switch-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BOOK_SHELF_STATUS_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value}>
                              {formatStatusLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                </div>
              </ScrollArea>
              <SheetFooter>
                <Button
                  type="button"
                  className="min-w-32"
                  disabled={updateBookMutation.isPending || !bookEditForm.title.trim()}
                  onClick={() => updateBookMutation.mutate()}
                >
                  {updateBookMutation.isPending ? '保存中…' : '保存修改'}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageShell>
  )
}
