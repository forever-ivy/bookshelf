import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { FolderTree, Plus } from 'lucide-react'
import { useDeferredValue, useEffect, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { MetricStrip } from '@/components/shared/metric-strip'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { getAdminPageHero } from '@/lib/page-hero'
import {
  createAdminBook,
  createAdminCategory,
  createAdminTag,
  getAdminBooks,
  getAdminCategories,
  getAdminTags,
  updateAdminBook,
} from '@/lib/api/management'
import type { AdminBook, AdminBookCategory, AdminBookTag } from '@/types/domain'

const pageHero = getAdminPageHero('books')

const bookColumnHelper = createColumnHelper<AdminBook>()
const categoryColumnHelper = createColumnHelper<AdminBookCategory>()
const tagColumnHelper = createColumnHelper<AdminBookTag>()

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

export function BooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isTaxonomyDialogOpen, setIsTaxonomyDialogOpen] = useState(false)
  const [bookCreateForm, setBookCreateForm] = useState(EMPTY_BOOK_CREATE_FORM)
  const [bookEditForm, setBookEditForm] = useState(EMPTY_BOOK_EDIT_FORM)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [tagForm, setTagForm] = useState(EMPTY_TAG_FORM)
  const deferredSearch = useDeferredValue(search)

  const booksQuery = useQuery({
    queryKey: ['admin', 'books', deferredSearch],
    queryFn: () => getAdminBooks(deferredSearch.trim() || undefined),
  })
  const categoriesQuery = useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: getAdminCategories,
  })
  const tagsQuery = useQuery({
    queryKey: ['admin', 'tags'],
    queryFn: getAdminTags,
  })

  const books = booksQuery.data?.items ?? []
  const categories = categoriesQuery.data?.items ?? []
  const tags = tagsQuery.data?.items ?? []
  const selectedBook = books.find((book) => book.id === selectedBookId) ?? books[0] ?? null
  const hasCategories = categories.length > 0
  const hasTags = tags.length > 0

  useEffect(() => {
    if (!selectedBookId && books[0]) {
      setSelectedBookId(books[0].id)
    }
  }, [books, selectedBookId])

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      setIsEditDialogOpen(false)
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

  const toggleCreateTag = (tagId: string) => {
    setBookCreateForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId) ? current.tagIds.filter((item) => item !== tagId) : [...current.tagIds, tagId],
    }))
  }

  const toggleEditTag = (tagId: string) => {
    setBookEditForm((current) => ({
      ...current,
      tagIds: current.tagIds.includes(tagId) ? current.tagIds.filter((item) => item !== tagId) : [...current.tagIds, tagId],
    }))
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookColumns: Array<ColumnDef<AdminBook, any>> = [
    bookColumnHelper.accessor('title', {
      header: '书名',
      cell: (info) => (
        <div className="space-y-1">
          <p className="font-semibold text-[var(--foreground)]">{info.getValue()}</p>
          <p className="text-xs text-[var(--muted-foreground)]">{info.row.original.author ?? '作者待补充'}</p>
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
      cell: (info) => (
        <div className="flex flex-wrap gap-2">
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
      cell: (info) => (
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
      ),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryColumns: Array<ColumnDef<AdminBookCategory, any>> = [
    categoryColumnHelper.accessor('name', { header: '分类名' }),
    categoryColumnHelper.accessor('id', { header: '系统编号' }),
    categoryColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagColumns: Array<ColumnDef<AdminBookTag, any>> = [
    tagColumnHelper.accessor('name', { header: '标签名' }),
    tagColumnHelper.accessor('id', { header: '系统编号' }),
    tagColumnHelper.accessor('description', {
      header: '说明',
      cell: (info) => info.getValue() ?? '—',
    }),
  ]

  return (
    <PageShell
      {...pageHero}
      eyebrow="图书管理"
      title="图书管理"
      description="查看和维护图书信息、分类和标签。"
      statusLine="图书列表"
    >
      <div className="space-y-6 ">
        <MetricStrip
          items={[
            {
              label: '图书总数',
              value: booksQuery.data?.total ?? books.length,
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

        <WorkspacePanel
          title="图书列表"
          description="查看图书、分类和标签，编辑操作从右侧面板进入。"
          action={
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-end">
              <Input
                className="w-full md:w-80"
                placeholder="按书名、作者、ISBN 搜索..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="size-4" />
                      新增图书
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>新增图书</DialogTitle>
                      <DialogDescription>补录基础信息，把新书加入系统。</DialogDescription>
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
                          <Label htmlFor="new-book-category">分类</Label>
                          <select
                            id="new-book-category"
                            className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-base sm:text-sm"
                            value={bookCreateForm.categoryId}
                            onChange={(event) => setBookCreateForm((current) => ({ ...current, categoryId: event.target.value }))}
                          >
                            <option value="">未分类</option>
                            {categories.map((category) => (
                              <option key={category.id} value={String(category.id)}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          {!hasCategories ? <p className="text-xs text-[var(--muted-foreground)]">还没有分类，可先在“管理分类和标签”里创建。</p> : null}
                        </div>
                        <div className="space-y-2">
                          <Label>标签</Label>
                          <div className="rounded-[1.1rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-3">
                            {hasTags ? (
                              <div className="flex flex-wrap gap-2">
                                {tags.map((tag) => {
                                  const selected = bookCreateForm.tagIds.includes(String(tag.id))
                                  return (
                                    <button
                                      key={tag.id}
                                      type="button"
                                      onClick={() => toggleCreateTag(String(tag.id))}
                                      className={
                                        selected
                                          ? 'rounded-full border border-[var(--primary)] bg-[rgba(33,73,140,0.1)] px-3 py-1.5 text-sm font-medium text-[var(--primary)]'
                                          : 'rounded-full border border-[var(--line-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--foreground)]'
                                      }
                                    >
                                      {tag.name}
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-[var(--muted-foreground)]">还没有标签，可先在“管理分类和标签”里创建。</p>
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

                <Dialog open={isTaxonomyDialogOpen} onOpenChange={setIsTaxonomyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <FolderTree className="size-4" />
                      管理分类和标签
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="w-[min(860px,calc(100vw-2rem))]">
                    <DialogHeader>
                      <DialogTitle>分类和标签</DialogTitle>
                      <DialogDescription>维护全局可用的分类和标签，供图书编辑时直接选择。</DialogDescription>
                    </DialogHeader>
                    <Tabs defaultValue="categories" className="space-y-5">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="categories">分类</TabsTrigger>
                        <TabsTrigger value="tags">标签</TabsTrigger>
                      </TabsList>

                      <TabsContent value="categories" className="mt-0">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                          <section className="space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-[var(--foreground)]">已有分类</h4>
                              <p className="text-sm text-[var(--muted-foreground)]">分类用于定义图书的主归属，一本书通常只选一个分类。</p>
                            </div>
                            <div className="space-y-3">
                              {categoriesQuery.isLoading ? (
                                <p className="text-sm text-[var(--muted-foreground)]">加载中</p>
                              ) : categories.length ? (
                                categories.map((category) => (
                                  <div
                                    key={category.id}
                                    className="flex items-start justify-between gap-4 rounded-[1.1rem] border border-[var(--line-subtle)] bg-white/78 px-4 py-3"
                                  >
                                    <div className="space-y-1">
                                      <p className="font-medium text-[var(--foreground)]">{category.name}</p>
                                      <p className="text-xs text-[var(--muted-foreground)]">系统编号 {category.id}</p>
                                    </div>
                                    <StatusBadge status={category.status ?? 'active'} />
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-[var(--muted-foreground)]">还没有分类，先在右侧创建一个。</p>
                              )}
                            </div>
                          </section>

                          <section className="space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-[var(--foreground)]">新增分类</h4>
                              <p className="text-sm text-[var(--muted-foreground)]">只填写给人看的名称，系统编号会在保存后自动生成。</p>
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

                      <TabsContent value="tags" className="mt-0">
                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                          <section className="space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-[var(--foreground)]">已有标签</h4>
                              <p className="text-sm text-[var(--muted-foreground)]">标签用于补充特征，一本书可以同时拥有多个标签。</p>
                            </div>
                            <div className="space-y-3">
                              {tagsQuery.isLoading ? (
                                <p className="text-sm text-[var(--muted-foreground)]">加载中</p>
                              ) : tags.length ? (
                                tags.map((tag) => (
                                  <div
                                    key={tag.id}
                                    className="space-y-1 rounded-[1.1rem] border border-[var(--line-subtle)] bg-white/78 px-4 py-3"
                                  >
                                    <div className="flex items-center justify-between gap-4">
                                      <p className="font-medium text-[var(--foreground)]">{tag.name}</p>
                                      <p className="text-xs text-[var(--muted-foreground)]">系统编号 {tag.id}</p>
                                    </div>
                                    {tag.description ? <p className="text-sm text-[var(--muted-foreground)]">{tag.description}</p> : null}
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-[var(--muted-foreground)]">还没有标签，先在右侧创建一个。</p>
                              )}
                            </div>
                          </section>

                          <section className="space-y-4 rounded-[1.35rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.52)] p-4">
                            <div className="space-y-1">
                              <h4 className="font-semibold text-[var(--foreground)]">新增标签</h4>
                              <p className="text-sm text-[var(--muted-foreground)]">填写标签名称和说明即可，系统会自动生成内部编码。</p>
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
          }
        >
          <Tabs defaultValue="books" className="space-y-4">
            <TabsList>
              <TabsTrigger value="books">图书</TabsTrigger>
              <TabsTrigger value="categories">分类</TabsTrigger>
              <TabsTrigger value="tags">标签</TabsTrigger>
            </TabsList>

            <TabsContent value="books">
              {booksQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : (
                <DataTable
                  columns={bookColumns}
                  data={books}
                  emptyTitle="暂无数据"
                  emptyDescription="当前条件下没有可用数据。"
                />
              )}
            </TabsContent>

            <TabsContent value="categories">
              {categoriesQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : (
                <DataTable
                  columns={categoryColumns}
                  data={categories}
                  emptyTitle="暂无数据"
                  emptyDescription="当前条件下没有可用数据。"
                />
              )}
            </TabsContent>

            <TabsContent value="tags">
              {tagsQuery.isLoading ? (
                <LoadingState label="加载中" />
              ) : (
                <DataTable
                  columns={tagColumns}
                  data={tags}
                  emptyTitle="暂无数据"
                  emptyDescription="当前条件下没有可用数据。"
                />
              )}
            </TabsContent>
          </Tabs>
        </WorkspacePanel>
      </div>

      <Sheet open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>编辑图书</SheetTitle>
            <SheetDescription>从右侧直接修改图书信息、标签和上架状态。</SheetDescription>
          </SheetHeader>
          {!selectedBook ? (
            <div className="py-8">
              <EmptyState title="暂无数据" description="请先在列表中选择一本图书。" />
            </div>
          ) : (
            <>
              <div className="space-y-5 overflow-y-auto pr-1">
                <div className="rounded-[1.35rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-4">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">当前图书</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{selectedBook.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    可借 {selectedBook.stock_summary?.available_copies ?? selectedBook.available_copies ?? 0} / 总库存 {selectedBook.stock_summary?.total_copies ?? selectedBook.total_copies ?? 0}
                  </p>
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
                      <Label htmlFor="edit-book-category">分类</Label>
                      <select
                        id="edit-book-category"
                        className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-base sm:text-sm"
                        value={bookEditForm.categoryId}
                        onChange={(event) => setBookEditForm((current) => ({ ...current, categoryId: event.target.value }))}
                      >
                        <option value="">未分类</option>
                        {categories.map((category) => (
                          <option key={category.id} value={String(category.id)}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>标签</Label>
                      <div className="rounded-[1.1rem] border border-[var(--line-subtle)] bg-[var(--surface-panel-strong)] p-3">
                        {hasTags ? (
                          <div className="flex flex-wrap gap-2">
                            {tags.map((tag) => {
                              const selected = bookEditForm.tagIds.includes(String(tag.id))
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => toggleEditTag(String(tag.id))}
                                  className={
                                    selected
                                      ? 'rounded-full border border-[var(--primary)] bg-[rgba(33,73,140,0.1)] px-3 py-1.5 text-sm font-medium text-[var(--primary)]'
                                      : 'rounded-full border border-[var(--line-subtle)] bg-white px-3 py-1.5 text-sm text-[var(--foreground)]'
                                  }
                                >
                                  {tag.name}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-[var(--muted-foreground)]">还没有标签，可先在“管理分类和标签”里创建。</p>
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
                      <Label htmlFor="book-status-switch">上架状态</Label>
                      <select
                        id="book-status-switch"
                        className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-base sm:text-sm"
                        value={bookEditForm.shelfStatus}
                        onChange={(event) =>
                          setBookEditForm((current) => ({
                            ...current,
                            shelfStatus: event.target.value,
                          }))
                        }
                      >
                        {['draft', 'on_shelf', 'off_shelf'].map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
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
