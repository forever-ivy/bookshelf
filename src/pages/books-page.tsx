import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  FolderTree,
  Plus,
  Book,
  BookOpen,
  Layers,
  Library,
  Hash,
  Key,
  FileText,
  Sparkles,
  Box,
  LayoutGrid,
  Search,
  Filter,
  Tags,
  Settings2
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { filledPrimaryActionButtonClassName } from '@/components/shared/action-button-styles'
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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { getAdminPageHero } from '@/lib/page-hero'
import { cn } from '@/lib/utils'
import {
  createAdminBook,
  createAdminCategory,
  createAdminTag,
  getAdminBooks,
  getAdminCategories,
  getAdminTags,
  setPrimaryAdminBookSourceDocument,
  setAdminBookStatus,
  uploadAdminBookSourceDocument,
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
    case 'borrowed':
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

function MultiTagSelect({
  tags,
  value,
  onChange,
}: {
  tags: AdminBookTag[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedTags = tags.filter((t) => value.includes(String(t.id)))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-[2.5rem] w-full justify-between font-normal bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-low)] border-[var(--line-subtle)] px-4 py-2 text-sm"
        >
          {selectedTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 pr-2 text-[var(--foreground)]">
              {selectedTags.map((t) => t.name).join(' · ')}
            </div>
          ) : (
            <span className="text-[var(--muted-foreground)]">请选择标签...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索标签..." />
          <CommandList>
            <CommandEmpty>没有找到相关标签</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const tagId = String(tag.id)
                const isSelected = value.includes(tagId)
                return (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => {
                      if (isSelected) {
                        onChange(value.filter((v) => v !== tagId))
                      } else {
                        onChange([...value, tagId])
                      }
                    }}
                  >
                    <div className={cn("mr-3 flex size-4 shrink-0 items-center justify-center rounded-sm border", isSelected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line-subtle)] opacity-50")}>
                      {isSelected ? <Check className="size-3 shrink-0" /> : null}
                    </div>
                    {tag.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: AdminBookCategory[]
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedCategory = categories.find((c) => String(c.id) === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-[2.5rem] w-full justify-between font-normal bg-[var(--surface-container-low)] hover:bg-[var(--surface-container-low)] border-[var(--line-subtle)] px-4 py-2 text-sm"
        >
          {selectedCategory ? (
            <span className="truncate text-[var(--foreground)]">{selectedCategory.name}</span>
          ) : value === 'unclassified' || !value ? (
            <span className="truncate text-[var(--foreground)]">未分类</span>
          ) : (
            <span className="text-[var(--muted-foreground)]">请选择分类...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索分类..." />
          <CommandList>
            <CommandEmpty>没有找到相关分类</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="未分类"
                onSelect={() => {
                  onChange('')
                  setOpen(false)
                }}
              >
                <div className={cn("mr-3 flex size-4 shrink-0 items-center justify-center rounded-sm border", !value ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line-subtle)] opacity-50")}>
                  {!value ? <Check className="size-3 shrink-0" /> : null}
                </div>
                未分类
              </CommandItem>
              {categories.map((category) => {
                const categoryId = String(category.id)
                const isSelected = value === categoryId
                return (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => {
                      onChange(categoryId)
                      setOpen(false)
                    }}
                  >
                    <div className={cn("mr-3 flex size-4 shrink-0 items-center justify-center rounded-sm border", isSelected ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--line-subtle)] opacity-50")}>
                      {isSelected ? <Check className="size-3 shrink-0" /> : null}
                    </div>
                    {category.name}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
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
  const [bookSourceFile, setBookSourceFile] = useState<File | null>(null)
  const [bookSourceIsPrimary, setBookSourceIsPrimary] = useState(true)
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

  const uploadBookSourceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBook || !bookSourceFile) {
        throw new Error('No selected source file')
      }
      return uploadAdminBookSourceDocument(selectedBook.id, {
        file: bookSourceFile,
        isPrimary: bookSourceIsPrimary,
      })
    },
    onSuccess: () => {
      setBookSourceFile(null)
      setBookSourceIsPrimary(true)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  const promoteBookSourceMutation = useMutation({
    mutationFn: async (documentId: number) => {
      if (!selectedBook) {
        throw new Error('No selected book')
      }
      return setPrimaryAdminBookSourceDocument(selectedBook.id, documentId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
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
      cell: (info) => (
        <div className="space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {info.row.original.author ?? '暂无作者'}
          </p>
        </div>
      ),
    }),
    bookColumnHelper.accessor('category', {
      header: '分类',
      cell: (info) => info.getValue() ?? '—',
    }),
    bookColumnHelper.accessor('isbn', {
      header: 'ISBN',
      cell: (info) => info.getValue() ?? '—',
    }),
    bookColumnHelper.accessor('shelf_status', {
      header: '上架状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    bookColumnHelper.display({
      id: 'tags',
      header: '标签',
      cell: (info) => {
        const tags = info.row.original.tags ?? []
        if (tags.length === 0) return '—'
        return tags.map((t) => t.name).join(', ')
      },
    }),
    bookColumnHelper.display({
      id: 'actions',
      header: '操作',
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Button
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
            size="sm"
            variant="secondary"
            onClick={() => openBookEntityCatalog(info.row.original.id)}
          >
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
    const sourceDocuments = book.source_documents ?? []

    return (
      <div className="space-y-4 pb-12">
        <section className="grid gap-6 lg:grid-cols-[1fr_320px] items-stretch">
          <div className="flex flex-col rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-6 sm:p-8 h-full">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-panel)] border border-[var(--line-subtle)] text-[var(--muted-foreground)]">
                <Book className="size-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[var(--foreground)]">基本信息</h3>
                <p className="text-[12px] text-[var(--muted-foreground)] mt-0.5">查看图书的基础数据与分类属性</p>
              </div>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">
                  <BookOpen className="size-3.5 opacity-70" />
                  作者
                </p>
                <p className="text-[14px] font-medium text-[var(--foreground)]">{formatSnapshotValue(book.author)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">
                  <Hash className="size-3.5 opacity-70" />
                  ISBN
                </p>
                <p className="text-[14px] font-medium text-[var(--foreground)]">{formatSnapshotValue(book.isbn)}</p>
              </div>
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">
                  <Key className="size-3.5 opacity-70" />
                  条码
                </p>
                <p className="text-[14px] font-medium text-[var(--foreground)]">{formatSnapshotValue(book.barcode)}</p>
              </div>
            </div>

            <div className="mt-8 space-y-3 border-t border-[var(--line-subtle)] pt-6">
              <p className="text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">简介</p>
              <p className="text-[13px] leading-relaxed text-[var(--foreground)]">
                {book.summary?.trim() || '暂无简介'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5 transition-shadow hover:shadow-sm">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">实体副本</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">{copies.length}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-panel)] border border-[var(--line-subtle)] text-[var(--muted-foreground)]">
                <Layers className="size-6" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5 transition-shadow hover:shadow-sm">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">可借副本</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">
                  {book.stock_summary?.available_copies ?? book.available_copies ?? 0}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-panel)] border border-[var(--line-subtle)] text-[var(--muted-foreground)]">
                <Library className="size-6" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5 transition-shadow hover:shadow-sm">
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium tracking-wider text-[var(--muted-foreground)]">总库存</p>
                <p className="text-2xl font-semibold text-[var(--foreground)]">
                  {book.stock_summary?.total_copies ?? book.total_copies ?? copies.length}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--surface-panel)] border border-[var(--line-subtle)] text-[var(--muted-foreground)]">
                <Box className="size-6" />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1]">
              <h4 className="flex items-center gap-2 text-[1.15rem] font-bold tracking-tight text-[var(--foreground)]">
                <Sparkles className="size-5 text-[var(--primary)]" />
                数字资源
              </h4>
              <p className="text-sm text-[var(--muted-foreground)]">
                导学系统会优先使用这里的主资源；如果没有，才会退回到书目元数据。
              </p>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-[var(--line-subtle)] bg-gradient-to-br from-[var(--surface-panel-strong)] to-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-4 flex-1 max-w-xl">
                <div className="space-y-2.5">
                  <Label htmlFor="book-source-upload" className="font-semibold">上传 PDF / 文本资源</Label>
                  <Input
                    id="book-source-upload"
                    type="file"
                    className="h-11 cursor-pointer rounded-xl bg-white/60 pt-2 transition-colors hover:bg-white"
                    accept=".pdf,.txt,.md,.markdown"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null
                      setBookSourceFile(nextFile)
                    }}
                  />
                </div>
                <label className="flex w-max cursor-pointer items-center gap-2.5 text-sm font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]">
                  <input
                    checked={bookSourceIsPrimary}
                    className="size-4 rounded-sm border-[var(--line-strong)] text-[var(--primary)] text-white focus:ring-[var(--primary)] transition-all"
                    type="checkbox"
                    onChange={(event) => setBookSourceIsPrimary(event.target.checked)}
                  />
                  <span>上传后设为导学主资源</span>
                </label>
              </div>
              <Button
                className="w-full sm:w-auto rounded-xl px-8 shadow-sm"
                disabled={!bookSourceFile || uploadBookSourceMutation.isPending}
                onClick={() => uploadBookSourceMutation.mutate()}
              >
                {uploadBookSourceMutation.isPending ? '上传中…' : '上传资源'}
              </Button>
            </div>
          </div>

          {sourceDocuments.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center space-y-2 rounded-[1.4rem] border border-dashed border-[var(--line-strong)] bg-white/40 text-center text-[var(--muted-foreground)]">
              <FileText className="size-6 opacity-40" />
              <p className="text-sm">这本书还没有上传数字资源</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sourceDocuments.map((document) => (
                <div
                  key={document.id}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[1.4rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute -right-4 -top-4 opacity-[0.02] transition-opacity group-hover:opacity-[0.05]">
                    <FileText className="size-32" />
                  </div>
                  <div className="relative z-10 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="font-bold text-[var(--foreground)] leading-tight">{document.file_name}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          {document.source_kind} · {document.mime_type ?? '未知类型'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={document.parse_status} />
                          {document.is_primary ? <StatusBadge status="active" label="主资源" /> : null}
                        </div>
                        {!document.is_primary ? (
                          <Button
                            disabled={promoteBookSourceMutation.isPending}
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs rounded-lg px-2.5"
                            onClick={() => promoteBookSourceMutation.mutate(document.id)}
                          >
                            设为主资源
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 rounded-[1.1rem] bg-[var(--surface-container-lowest)] p-4 text-[0.8rem] mix-blend-multiply">
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">资源编号</p>
                        <p className="font-medium text-[var(--foreground)]">#{document.id}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">解析文本</p>
                        <p className="truncate font-medium text-[var(--foreground)]" title={String(document.extracted_text_path || '')}>
                          {formatSnapshotValue(document.extracted_text_path)}
                        </p>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">哈希</p>
                        <p className="truncate font-medium text-[var(--foreground)]" title={String(document.content_hash || '')}>
                          {formatSnapshotValue(document.content_hash)}
                        </p>
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">更新时间</p>
                        <p className="font-medium text-[var(--foreground)]">
                          {formatDateTime(document.updated_at ?? document.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="flex items-center gap-2 text-[1.15rem] font-bold tracking-tight text-[var(--foreground)]">
                <LayoutGrid className="size-5 text-[var(--primary)]" />
                实体目录
              </h4>
              <p className="text-sm text-[var(--muted-foreground)]">查看每个副本当前所在书柜、槽位和可借状态。</p>
            </div>
          </div>

          {copies.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center space-y-2 rounded-[1.4rem] border border-dashed border-[var(--line-strong)] bg-white/40 text-center text-[var(--muted-foreground)]">
              <Library className="size-6 opacity-40" />
              <p className="text-sm">当前还没有登记实体副本</p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {copies.map((copy) => (
                <div
                  key={copy.id}
                  className="group relative overflow-hidden rounded-[1.4rem] border border-[var(--line-subtle)] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="absolute -right-4 -bottom-4 opacity-[0.02] transition-opacity group-hover:opacity-[0.05]">
                    <Box className="size-32" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <p className="font-bold text-[var(--foreground)] flex items-center gap-2">
                          <Library className="size-4 text-[var(--muted-foreground)]" />
                          {(copy.cabinet_name ?? '未分配书柜') + ' · ' + (copy.slot_code ?? '未分配位置')}
                        </p>
                        <p className="text-xs font-medium text-[var(--muted-foreground)] pl-6">
                          {copy.cabinet_location ?? '位置待补充'}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
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

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 rounded-[1.1rem] bg-[var(--surface-container-lowest)] p-4 text-[0.8rem] mix-blend-multiply">
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">编号</p>
                        <p className="font-medium text-[var(--foreground)]">#{copy.id}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">柜ID</p>
                        <p className="font-medium text-[var(--foreground)]">{formatSnapshotValue(copy.cabinet_id)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">槽位</p>
                        <p className="font-medium text-[var(--foreground)]">{formatSnapshotValue(copy.slot_code)}</p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">更新于</p>
                        <p className="font-medium text-[var(--foreground)] whitespace-nowrap">
                          {formatDateTime(copy.updated_at ?? copy.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  const booksAction = (
    <div className="flex w-full flex-col gap-3 py-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <div className="relative flex-1 sm:max-w-xs md:max-w-[22rem]">
        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center">
          <Search className="size-4.5 text-slate-400" />
        </div>
        <Input
          className="h-10 w-full rounded-[1.25rem] border-slate-200 bg-white/70 pl-10 pr-4 shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 font-medium placeholder:font-normal"
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
      </div>
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
        <SelectTrigger aria-label="上架状态筛选" className="h-10 rounded-[1.25rem] border-slate-200 bg-white/70 shadow-sm transition-all hover:bg-white md:w-[11rem] font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400" />
            <SelectValue placeholder="全部状态" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="all" className="rounded-xl">全部状态</SelectItem>
          {BOOK_SHELF_STATUS_OPTIONS.map((value) => (
            <SelectItem key={value} value={value} className="rounded-xl">
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
        <SelectTrigger aria-label="分类筛选" className="h-10 rounded-[1.25rem] border-slate-200 bg-white/70 shadow-sm transition-all hover:bg-white md:w-[11rem] font-medium text-slate-700" onClick={ensureFullCategoryList}>
          <div className="flex items-center gap-2">
            <Layers className="size-4 text-slate-400" />
            <SelectValue placeholder="全部分类" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="all" className="rounded-xl">全部分类</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={String(category.id)} className="rounded-xl">
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2.5">
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
            <Button size="sm" variant="default" className={cn("h-10 rounded-[1.25rem] px-5 font-semibold transition-colors", filledPrimaryActionButtonClassName)}>
              <Plus className="mr-1.5 size-4" />
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
                  <CategorySelect
                    categories={categories}
                    value={bookCreateForm.categoryId}
                    onChange={(value) => setBookCreateForm((current) => ({ ...current, categoryId: value }))}
                  />
                  {!hasCategories ? <p className="text-xs text-[var(--muted-foreground)]">还没有分类，可以先去创建。</p> : null}
                </div>
                <div className="space-y-2">
                  <Label id="new-book-tags-label">标签</Label>
                  <div>
                    {hasTags ? (
                      <MultiTagSelect
                        tags={tags}
                        value={bookCreateForm.tagIds}
                        onChange={(value) => setBookCreateForm((current) => ({ ...current, tagIds: value }))}
                      />
                    ) : (
                      <div className="rounded-[1.1rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-4">
                        <p className="text-xs text-[var(--muted-foreground)]">还没有标签，可以先去创建。</p>
                      </div>
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
            <Button size="sm" variant="outline" className="h-10 rounded-[1.25rem] px-5 shadow-sm font-semibold border border-slate-200 bg-white/70 hover:bg-white text-slate-700 hover:text-slate-900 transition-colors">
              <Settings2 className="mr-1.5 size-4 text-slate-500" />
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
                      className="h-[min(52vh,32rem)] pr-3"
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
                      className="h-[min(52vh,32rem)] pr-3"
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
    <div className="flex w-full flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-end">
      <div className="relative flex-1 sm:max-w-xs md:max-w-64">
        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center">
          <Search className="size-4.5 text-slate-400" />
        </div>
        <Input
          className="h-10 w-full rounded-[1.25rem] border-slate-200 bg-white/70 pl-10 pr-4 shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 font-medium placeholder:font-normal"
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
      </div>
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
        <SelectTrigger aria-label="分类状态筛选" className="h-10 rounded-[1.25rem] border-slate-200 bg-white/70 shadow-sm transition-all hover:bg-white md:w-[10rem] font-medium text-slate-700">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-slate-400" />
            <SelectValue placeholder="全部状态" />
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-2xl">
          <SelectItem value="all" className="rounded-xl">全部状态</SelectItem>
          <SelectItem value="active" className="rounded-xl">启用</SelectItem>
          <SelectItem value="inactive" className="rounded-xl">停用</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )

  const tagsAction = (
    <div className="flex w-full flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-end">
      <div className="relative flex-1 sm:max-w-xs md:max-w-[18rem]">
        <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center">
          <Search className="size-4.5 text-slate-400" />
        </div>
        <Input
          className="h-10 w-full rounded-[1.25rem] border-slate-200 bg-white/70 pl-10 pr-4 shadow-sm transition-all focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20 font-medium placeholder:font-normal"
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
    </div>
  )

  const entityCatalogAction = (
    <div className="flex w-full flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-end">
      <Button
        type="button"
        size="sm"
        variant="default"
        className="h-10 rounded-[1.25rem] px-5 shadow-sm font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors"
        onClick={closeBookEntityCatalog}
      >
        <ChevronLeft className="mr-1.5 size-4" />
        返回列表
      </Button>
      {entityCatalogBook ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-10 rounded-[1.25rem] px-5 shadow-sm font-semibold border border-slate-200 bg-white/70 hover:bg-white text-slate-700 transition-colors"
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
                <div className="space-y-8 px-1 pb-6">
                  {/* Status Banner */}
                  <div className="rounded-[1.2rem] border border-[var(--line-subtle)] bg-[var(--surface-bright)] p-5">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="rounded-full bg-[var(--primary)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--primary)]">
                            当前管控对象
                          </div>
                        </div>
                        <p className="text-lg font-bold text-[var(--foreground)]">{selectedBook.title}</p>
                        <p className="text-[13px] font-medium text-[var(--muted-foreground)] flex items-center gap-1.5">
                          <Library className="size-3.5 opacity-70" />
                          可借 {selectedBook.stock_summary?.available_copies ?? selectedBook.available_copies ?? 0} / 
                          总库 {selectedBook.stock_summary?.total_copies ?? selectedBook.total_copies ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 pt-4 border-t border-[var(--line-subtle)]">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-full px-4 text-[12px] shadow-none bg-[var(--surface-container)] text-[var(--foreground)] border border-[var(--line-subtle)] hover:bg-[var(--line-subtle)] transition-colors"
                        disabled={setBookStatusMutation.isPending || (selectedBook.shelf_status ?? 'draft') === 'draft'}
                        onClick={() => setBookStatusMutation.mutate('draft')}
                      >
                        回到草稿
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-full px-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-none text-[12px] transition-colors"
                        disabled={setBookStatusMutation.isPending || selectedBook.shelf_status === 'on_shelf'}
                        onClick={() => setBookStatusMutation.mutate('on_shelf')}
                      >
                        快速上架
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 rounded-full px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 shadow-none text-[12px] transition-colors"
                        disabled={setBookStatusMutation.isPending || selectedBook.shelf_status === 'off_shelf'}
                        onClick={() => setBookStatusMutation.mutate('off_shelf')}
                      >
                        执行下架
                      </Button>
                    </div>
                  </div>

                  {/* Form Container */}
                  <div className="space-y-6">
                    <div className="space-y-2.5">
                      <Label htmlFor="edit-book-title" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">书名</Label>
                      <Input
                        id="edit-book-title"
                        className="h-11 rounded-xl bg-[var(--surface-container-lowest)] shadow-sm font-medium"
                        value={bookEditForm.title}
                        onChange={(event) => setBookEditForm((current) => ({ ...current, title: event.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2.5">
                      <Label htmlFor="edit-book-author" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">作者</Label>
                      <Input
                        id="edit-book-author"
                        className="h-11 rounded-xl bg-[var(--surface-container-lowest)] shadow-sm font-medium"
                        value={bookEditForm.author}
                        onChange={(event) => setBookEditForm((current) => ({ ...current, author: event.target.value }))}
                      />
                    </div>
                    
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2.5">
                        <Label id="edit-book-category-label" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">分类</Label>
                        <div className="h-11">
                          <CategorySelect
                            categories={categories}
                            value={bookEditForm.categoryId}
                            onChange={(value) => setBookEditForm((current) => ({ ...current, categoryId: value }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        <Label id="edit-book-tags-label" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">标签</Label>
                        <div className="min-h-11">
                          {hasTags ? (
                            <MultiTagSelect
                              tags={tags}
                              value={bookEditForm.tagIds}
                              onChange={(value) => setBookEditForm((current) => ({ ...current, tagIds: value }))}
                            />
                          ) : (
                            <div className="flex h-11 items-center rounded-xl border border-dashed border-[var(--line-strong)] bg-white/40 px-4">
                              <p className="text-xs text-[var(--muted-foreground)]">无可用标签</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2.5">
                        <Label htmlFor="edit-book-isbn" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">ISBN</Label>
                        <Input
                          id="edit-book-isbn"
                          className="h-11 rounded-xl bg-[var(--surface-container-lowest)] shadow-sm font-medium"
                          value={bookEditForm.isbn}
                          onChange={(event) => setBookEditForm((current) => ({ ...current, isbn: event.target.value }))}
                        />
                      </div>
                      <div className="space-y-2.5">
                        <Label htmlFor="edit-book-barcode" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">条码</Label>
                        <Input
                          id="edit-book-barcode"
                          className="h-11 rounded-xl bg-[var(--surface-container-lowest)] shadow-sm font-mono text-sm"
                          value={bookEditForm.barcode}
                          onChange={(event) => setBookEditForm((current) => ({ ...current, barcode: event.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2.5">
                      <Label htmlFor="edit-book-summary" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">简介</Label>
                      <Textarea
                        id="edit-book-summary"
                        className="min-h-[100px] resize-none rounded-xl bg-[var(--surface-container-lowest)] p-4 leading-relaxed shadow-sm font-medium"
                        value={bookEditForm.summary}
                        onChange={(event) => setBookEditForm((current) => ({ ...current, summary: event.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2.5 pt-2">
                      <Label id="book-status-switch-label" className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">全站上架状态</Label>
                      <Select
                        value={bookEditForm.shelfStatus}
                        onValueChange={(value) =>
                          setBookEditForm((current) => ({
                            ...current,
                            shelfStatus: value,
                          }))
                        }
                      >
                        <SelectTrigger aria-labelledby="book-status-switch-label" className="h-11 rounded-xl bg-[var(--surface-container-lowest)] shadow-sm font-medium">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[1rem]">
                          {BOOK_SHELF_STATUS_OPTIONS.map((value) => (
                            <SelectItem key={value} value={value} className="rounded-xl">
                              {formatStatusLabel(value)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="pt-4 pb-2">
                <Button
                  type="button"
                  className="min-w-32 rounded-xl h-12 px-8 shadow-sm font-bold text-base"
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
