import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useDeferredValue, useEffect, useState } from 'react'

import { DataTable } from '@/components/shared/data-table'
import { EmptyState } from '@/components/shared/empty-state'
import { InspectorPanel } from '@/components/shared/inspector-panel'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { StatusBadge } from '@/components/shared/status-badge'
import { WorkspacePanel } from '@/components/shared/workspace-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  setAdminBookStatus,
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
  tagIds: '',
  isbn: '',
  barcode: '',
  summary: '',
  shelfStatus: 'draft',
}

const EMPTY_BOOK_EDIT_FORM = {
  title: '',
  author: '',
  categoryId: '',
  tagIds: '',
  isbn: '',
  barcode: '',
  summary: '',
  shelfStatus: 'draft',
}

const EMPTY_CATEGORY_FORM = {
  code: '',
  name: '',
  description: '',
}

const EMPTY_TAG_FORM = {
  code: '',
  name: '',
  description: '',
}

function parseIdList(value: string) {
  return value
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item) && item > 0)
}

export function BooksPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null)
  const [bookCreateForm, setBookCreateForm] = useState(EMPTY_BOOK_CREATE_FORM)
  const [bookEditForm, setBookEditForm] = useState(EMPTY_BOOK_EDIT_FORM)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM)
  const [tagForm, setTagForm] = useState(EMPTY_TAG_FORM)
  const [statusDraft, setStatusDraft] = useState('draft')
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
      tagIds: selectedBook.tags.map((tag) => String(tag.id)).join(','),
      isbn: selectedBook.isbn ?? '',
      barcode: selectedBook.barcode ?? '',
      summary: selectedBook.summary ?? '',
      shelfStatus: selectedBook.shelf_status ?? 'draft',
    })
    setStatusDraft(selectedBook.shelf_status ?? 'draft')
  }, [selectedBook])

  const createBookMutation = useMutation({
    mutationFn: () =>
      createAdminBook({
        title: bookCreateForm.title.trim(),
        author: bookCreateForm.author.trim() || undefined,
        category_id: bookCreateForm.categoryId ? Number(bookCreateForm.categoryId) : undefined,
        tag_ids: parseIdList(bookCreateForm.tagIds),
        isbn: bookCreateForm.isbn.trim() || undefined,
        barcode: bookCreateForm.barcode.trim() || undefined,
        summary: bookCreateForm.summary.trim() || undefined,
        shelf_status: bookCreateForm.shelfStatus,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
      setBookCreateForm(EMPTY_BOOK_CREATE_FORM)
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
        tag_ids: parseIdList(bookEditForm.tagIds),
        isbn: bookEditForm.isbn.trim() || undefined,
        barcode: bookEditForm.barcode.trim() || undefined,
        summary: bookEditForm.summary.trim() || undefined,
        shelf_status: bookEditForm.shelfStatus,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  const setStatusMutation = useMutation({
    mutationFn: () => {
      if (!selectedBook) {
        throw new Error('No selected book')
      }
      return setAdminBookStatus(selectedBook.id, statusDraft)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'books'] })
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: () =>
      createAdminCategory({
        code: categoryForm.code.trim(),
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
        code: tagForm.code.trim(),
        name: tagForm.name.trim(),
        description: tagForm.description.trim() || undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tags'] })
      setTagForm(EMPTY_TAG_FORM)
    },
  })

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
        <Button type="button" size="sm" variant="secondary" onClick={() => setSelectedBookId(info.row.original.id)}>
          编辑此书
        </Button>
      ),
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryColumns: Array<ColumnDef<AdminBookCategory, any>> = [
    categoryColumnHelper.accessor('name', { header: '分类名' }),
    categoryColumnHelper.accessor('code', { header: '编码' }),
    categoryColumnHelper.accessor('status', {
      header: '状态',
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tagColumns: Array<ColumnDef<AdminBookTag, any>> = [
    tagColumnHelper.accessor('name', { header: '标签名' }),
    tagColumnHelper.accessor('code', { header: '编码' }),
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
      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <WorkspacePanel
          title="图书列表"
          description="左侧查看图书、分类和标签。"
          action={
            <Input
              className="w-full md:w-80"
              placeholder="按书名、作者、ISBN 搜索..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
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
                <LoadingState label="数据装载中" />
              ) : (
                <DataTable
                  columns={bookColumns}
                  data={books}
                  emptyTitle="暂无记录"
                  emptyDescription="当前检视条件下无可用数据。"
                />
              )}
            </TabsContent>

            <TabsContent value="categories">
              {categoriesQuery.isLoading ? (
                <LoadingState label="数据装载中" />
              ) : (
                <DataTable
                  columns={categoryColumns}
                  data={categories}
                  emptyTitle="暂无记录"
                  emptyDescription="当前检视条件下无可用数据。"
                />
              )}
            </TabsContent>

            <TabsContent value="tags">
              {tagsQuery.isLoading ? (
                <LoadingState label="数据装载中" />
              ) : (
                <DataTable
                  columns={tagColumns}
                  data={tags}
                  emptyTitle="暂无记录"
                  emptyDescription="当前检视条件下无可用数据。"
                />
              )}
            </TabsContent>
          </Tabs>
        </WorkspacePanel>

        <div className="space-y-6">
          <InspectorPanel title="图书信息" description="右侧显示当前选中图书的库存、状态和编辑操作。">
            <div className="space-y-4">
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--muted-foreground)]">图书总数</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{booksQuery.data?.total ?? books.length}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">分类数量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{categoriesQuery.data?.total ?? categories.length}</p>
              </div>
              <div className="rounded-2xl bg-[var(--surface-container-low)] p-4">
                <p className="text-sm font-medium text-[var(--foreground)]">标签数量</p>
                <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{tagsQuery.data?.total ?? tags.length}</p>
              </div>
              {selectedBook ? (
                <div className="rounded-2xl border border-white/60 bg-white/50 p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">当前选中</p>
                  <p className="mt-2 font-semibold text-[var(--foreground)]">{selectedBook.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                    可借 {selectedBook.stock_summary?.available_copies ?? selectedBook.available_copies ?? 0} / 总库存 {selectedBook.stock_summary?.total_copies ?? selectedBook.total_copies ?? 0}
                  </p>
                </div>
              ) : (
                <EmptyState title="暂无记录" description="当前检视条件下无可用数据。" />
              )}
            </div>
          </InspectorPanel>

          <WorkspacePanel title="新增图书" description="补录基础信息，把新书加入系统。">
            <div className="space-y-4">
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
                  <Label htmlFor="new-book-category">分类 ID</Label>
                  <Input id="new-book-category" value={bookCreateForm.categoryId} onChange={(event) => setBookCreateForm((current) => ({ ...current, categoryId: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-book-tags">标签 ID 列表</Label>
                  <Input id="new-book-tags" value={bookCreateForm.tagIds} onChange={(event) => setBookCreateForm((current) => ({ ...current, tagIds: event.target.value }))} />
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
              <Button
                type="button"
                className="w-full"
                disabled={createBookMutation.isPending || !bookCreateForm.title.trim()}
                onClick={() => createBookMutation.mutate()}
              >
                {createBookMutation.isPending ? '保存中…' : '新增图书'}
              </Button>
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="编辑图书" description="修改图书信息、标签和上架状态。">
            <div className="space-y-4">
              {!selectedBook ? (
                <EmptyState title="暂无记录" description="当前检视条件下无可用数据。" />
              ) : (
                <>
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
                      <Label htmlFor="edit-book-category">分类 ID</Label>
                      <Input id="edit-book-category" value={bookEditForm.categoryId} onChange={(event) => setBookEditForm((current) => ({ ...current, categoryId: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-book-tags">标签 ID 列表</Label>
                      <Input id="edit-book-tags" value={bookEditForm.tagIds} onChange={(event) => setBookEditForm((current) => ({ ...current, tagIds: event.target.value }))} />
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
                  <Button
                    type="button"
                    className="w-full"
                    disabled={updateBookMutation.isPending || !bookEditForm.title.trim()}
                    onClick={() => updateBookMutation.mutate()}
                  >
                    {updateBookMutation.isPending ? '保存中…' : '保存修改'}
                  </Button>

                  <div className="space-y-2 rounded-2xl border border-white/60 bg-white/50 p-4">
                    <Label htmlFor="book-status-switch">上架状态</Label>
                    <select
                      id="book-status-switch"
                      className="h-11 w-full rounded-xl border border-[rgba(193,198,214,0.32)] bg-white/80 px-4 text-sm"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value)}
                    >
                      {['draft', 'on_shelf', 'off_shelf'].map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="secondary"
                      className="w-full"
                      disabled={setStatusMutation.isPending}
                      onClick={() => setStatusMutation.mutate()}
                    >
                      {setStatusMutation.isPending ? '更新中…' : '更新状态'}
                  </Button>
                </div>
              </>
              )}
            </div>
          </WorkspacePanel>

          <WorkspacePanel title="分类和标签" description="维护分类和标签。">
            <div className="space-y-6">
              <div className="space-y-4 rounded-2xl border border-white/60 bg-white/40 p-4">
                <div className="space-y-2">
                  <Label htmlFor="category-code">分类编码</Label>
                  <Input id="category-code" value={categoryForm.code} onChange={(event) => setCategoryForm((current) => ({ ...current, code: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-name">分类名称</Label>
                  <Input id="category-name" value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={createCategoryMutation.isPending || !categoryForm.code.trim() || !categoryForm.name.trim()}
                  onClick={() => createCategoryMutation.mutate()}
                >
                  {createCategoryMutation.isPending ? '保存中…' : '创建分类'}
                </Button>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/60 bg-white/40 p-4">
                <div className="space-y-2">
                  <Label htmlFor="tag-code">标签编码</Label>
                  <Input id="tag-code" value={tagForm.code} onChange={(event) => setTagForm((current) => ({ ...current, code: event.target.value }))} />
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
                  disabled={createTagMutation.isPending || !tagForm.code.trim() || !tagForm.name.trim()}
                  onClick={() => createTagMutation.mutate()}
                >
                  {createTagMutation.isPending ? '保存中…' : '创建标签'}
                </Button>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </PageShell>
  )
}
