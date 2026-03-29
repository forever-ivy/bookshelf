import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { GripVertical, LibraryBig, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { PageShell } from '@/components/shared/page-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Iphone } from '@/components/ui/iphone'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  getAdminBooks,
  getAdminRecommendationStudio,
  getAdminRecommendationStudioPublications,
  publishAdminRecommendationStudio,
  saveAdminRecommendationStudioDraft,
} from '@/lib/api/management'
import { getAdminPageHero } from '@/lib/page-hero'
import { cn } from '@/lib/utils'
import type {
  AdminBook,
  AdminRecommendationStudio,
  AdminRecommendationStudioCandidateBook,
  AdminRecommendationStudioDraft,
  AdminRecommendationStudioHotList,
  AdminRecommendationStudioPreviewBook,
  AdminRecommendationStudioPreviewFeed,
} from '@/types/domain'

const pageHero = getAdminPageHero('recommendation')

type SectionKey = 'today_recommendations' | 'exam_zone'

type StudioBook = AdminRecommendationStudioCandidateBook & {
  id: string
  sectionKey: SectionKey
  explanation: string
}

type SlotState = Record<SectionKey, Array<StudioBook | null>>

type RecommendationStylePreset = {
  label: string
  weights: AdminRecommendationStudioDraft['strategy_weights']
}

const SECTION_META: Record<
  SectionKey,
  {
    label: string
    description: string
  }
> = {
  today_recommendations: {
    label: '今日推荐',
    description: '主推书位，建议放最稳的 3 本。',
  },
  exam_zone: {
    label: '考试专区',
    description: '复习用书和冲刺阅读放这里。',
  },
}

const STYLE_PRESETS: RecommendationStylePreset[] = [
  {
    label: '相关图书优先',
    weights: {
      content: 0.55,
      behavior: 0.3,
      freshness: 0.15,
    },
  },
  {
    label: '借阅热度',
    weights: {
      content: 0.3,
      behavior: 0.55,
      freshness: 0.15,
    },
  },
  {
    label: '新书补位',
    weights: {
      content: 0.25,
      behavior: 0.25,
      freshness: 0.5,
    },
  },
]

const COMPACT_LAYOUT_BREAKPOINT = 1280
const EMPTY_DRAFT: AdminRecommendationStudioDraft = {
  today_recommendations: [],
  exam_zone: [],
  hot_lists: ensureHotLists([]),
  system_booklists: [],
  explanation_card: {
    title: '',
    body: '',
  },
  placements: [
    { code: 'today_recommendations', name: '今日推荐', status: 'active', placement_type: 'home_feed', rank: 1 },
    { code: 'exam_zone', name: '考试专区', status: 'active', placement_type: 'home_feed', rank: 2 },
    { code: 'hot_lists', name: '热门榜单', status: 'active', placement_type: 'home_feed', rank: 3 },
    { code: 'system_booklists', name: '系统书单', status: 'active', placement_type: 'home_feed', rank: 4 },
  ],
  strategy_weights: STYLE_PRESETS[0].weights,
}

const EMPTY_PREVIEW_FEED: AdminRecommendationStudioPreviewFeed = {
  today_recommendations: [],
  exam_zone: [],
  quick_actions: [],
  hot_lists: [],
  system_booklists: [],
  explanation_card: {
    title: '',
    body: '',
  },
}

function createEmptySlots(): SlotState {
  return {
    today_recommendations: [null, null, null],
    exam_zone: [null, null, null],
  }
}

function ensureHotLists(hotLists: AdminRecommendationStudioHotList[]) {
  const normalized = [...hotLists]
  while (normalized.length < 3) {
    const index = normalized.length + 1
    normalized.push({
      id: `draft-hot-list-${index}`,
      title: '',
      description: '',
    })
  }
  return normalized.slice(0, 3)
}

function toStudioBook(
  candidate: AdminRecommendationStudioCandidateBook,
  sectionKey: SectionKey,
  explanation?: string,
): StudioBook {
  return {
    ...candidate,
    id: `${sectionKey}:${candidate.book_id}`,
    sectionKey,
    explanation: explanation?.trim() || candidate.default_explanation,
  }
}

function toSearchResultBook(book: AdminBook): StudioBook {
  const explanation = book.summary?.trim() || '馆内在架，可加入本期推荐候选池。'
  return {
    book_id: book.id,
    title: book.title,
    author: book.author,
    category: book.category,
    available_copies: book.stock_summary?.available_copies ?? 0,
    deliverable: (book.stock_summary?.available_copies ?? 0) > 0,
    eta_minutes: null,
    default_explanation: explanation,
    id: `search:${book.id}`,
    sectionKey: 'today_recommendations',
    explanation,
  }
}

function createCandidateLookup(studio: AdminRecommendationStudio) {
  const today = new Map(
    studio.candidates.today_recommendations.map((candidate) => [candidate.book_id, candidate]),
  )
  const exam = new Map(
    studio.candidates.exam_zone.map((candidate) => [candidate.book_id, candidate]),
  )
  return {
    today,
    exam,
  }
}

function buildSlotsFromDraft(studio: AdminRecommendationStudio, draft: AdminRecommendationStudioDraft): SlotState {
  const lookup = createCandidateLookup(studio)
  const slots = createEmptySlots()

  draft.today_recommendations
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .forEach((slot, index) => {
      const candidate = lookup.today.get(slot.book_id)
      if (candidate && index < 3) {
        slots.today_recommendations[index] = toStudioBook(candidate, 'today_recommendations', slot.custom_explanation)
      }
    })

  draft.exam_zone
    .slice()
    .sort((left, right) => left.rank - right.rank)
    .forEach((slot, index) => {
      const candidate = lookup.exam.get(slot.book_id)
      if (candidate && index < 3) {
        slots.exam_zone[index] = toStudioBook(candidate, 'exam_zone', slot.custom_explanation)
      }
    })

  return slots
}

function mergeCandidateBooks(
  draft: AdminRecommendationStudioDraft,
  sources: StudioBook[],
) {
  const selectedBookIds = new Set([
    ...draft.today_recommendations.map((slot) => slot.book_id),
    ...draft.exam_zone.map((slot) => slot.book_id),
  ])
  const seenBookIds = new Set<number>()

  return sources.filter((candidate) => {
    if (selectedBookIds.has(candidate.book_id) || seenBookIds.has(candidate.book_id)) {
      return false
    }

    seenBookIds.add(candidate.book_id)
    return true
  })
}

function buildPoolFromDraft(
  studio: AdminRecommendationStudio,
  draft: AdminRecommendationStudioDraft,
  extraBooks: StudioBook[] = [],
) {
  return mergeCandidateBooks(draft, [
    ...studio.candidates.today_recommendations.map((candidate) =>
      toStudioBook(candidate, 'today_recommendations'),
    ),
    ...studio.candidates.exam_zone.map((candidate) => toStudioBook(candidate, 'exam_zone')),
    ...extraBooks,
  ])
}

function buildDraftFromSlots(currentDraft: AdminRecommendationStudioDraft, slots: SlotState): AdminRecommendationStudioDraft {
  return {
    ...currentDraft,
    today_recommendations: slots.today_recommendations.flatMap((book, index) =>
      book
        ? [
            {
              book_id: book.book_id,
              custom_explanation: book.explanation,
              source: 'manual_review',
              rank: index + 1,
            },
          ]
        : [],
    ),
    exam_zone: slots.exam_zone.flatMap((book, index) =>
      book
        ? [
            {
              book_id: book.book_id,
              custom_explanation: book.explanation,
              source: 'manual_review',
              rank: index + 1,
            },
          ]
        : [],
    ),
  }
}

function buildPreviewFeed(
  basePreview: AdminRecommendationStudioPreviewFeed,
  draft: AdminRecommendationStudioDraft,
  slots: SlotState,
): AdminRecommendationStudioPreviewFeed {
  const todayStatus = draft.placements.find((item) => item.code === 'today_recommendations')?.status ?? 'active'
  const examStatus = draft.placements.find((item) => item.code === 'exam_zone')?.status ?? 'active'
  const hotListStatus = draft.placements.find((item) => item.code === 'hot_lists')?.status ?? 'active'
  const booklistStatus = draft.placements.find((item) => item.code === 'system_booklists')?.status ?? 'active'

  const mapBook = (book: StudioBook): AdminRecommendationStudioPreviewBook => ({
    book_id: book.book_id,
    title: book.title,
    author: book.author,
    explanation: book.explanation,
    available_copies: book.available_copies,
    deliverable: book.deliverable,
    eta_minutes: book.eta_minutes,
  })

  return {
    ...basePreview,
    today_recommendations:
      todayStatus === 'paused'
        ? []
        : slots.today_recommendations.flatMap((book) => (book ? [mapBook(book)] : [])),
    exam_zone:
      examStatus === 'paused'
        ? []
        : slots.exam_zone.flatMap((book) => (book ? [mapBook(book)] : [])),
    hot_lists: hotListStatus === 'paused' ? [] : draft.hot_lists.filter((item) => item.title.trim() || item.description.trim()),
    system_booklists: booklistStatus === 'paused' ? [] : basePreview.system_booklists,
    explanation_card: draft.explanation_card,
  }
}

function inferStyleLabel(draft: AdminRecommendationStudioDraft) {
  const preset = STYLE_PRESETS.find((item) =>
    item.weights.content === draft.strategy_weights.content &&
    item.weights.behavior === draft.strategy_weights.behavior &&
    item.weights.freshness === draft.strategy_weights.freshness,
  )
  return preset?.label ?? STYLE_PRESETS[0].label
}

function formatAvailability(book: AdminRecommendationStudioPreviewBook | StudioBook) {
  if (!book.deliverable) {
    return '馆内查看'
  }
  if (book.eta_minutes == null || book.eta_minutes === '') {
    return '可借'
  }
  return `${book.eta_minutes} 分钟送达`
}

function CandidateCard({
  book,
  inPool,
}: {
  book: StudioBook
  inPool: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `candidate:${book.id}`,
    data: { type: 'candidate' as const, book },
  })

  return (
    <div
      ref={inPool ? setNodeRef : undefined}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      className={cn(isDragging && 'z-20 opacity-50')}
      {...(inPool ? { ...attributes, ...listeners } : {})}
    >
      <div className="flex items-center gap-2 rounded-xl border border-[var(--line-subtle)] bg-white/90 px-2 py-2 transition-all hover:border-[rgba(33,73,140,0.22)] hover:bg-white">
        <div className="flex h-8 w-6 shrink-0 items-center justify-center rounded-lg bg-[rgba(248,246,241,0.95)] text-[var(--muted-foreground)]">
          <GripVertical className="size-3" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold leading-5 text-[var(--foreground)]">{book.title}</p>
          <p className="truncate text-[10px] leading-4 text-[var(--muted-foreground)]">
            {book.author || '未知作者'} · {formatAvailability(book)}
          </p>
        </div>
      </div>
    </div>
  )
}

function SlotCard({
  sectionKey,
  index,
  book,
}: {
  sectionKey: SectionKey
  index: number
  book: StudioBook | null
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${sectionKey}:${index}` })
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: `slot-book:${sectionKey}:${index}`,
    data: { type: 'slot' as const, sectionKey, index },
    disabled: !book,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-[1.2rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.84)] p-3 transition-all',
        isOver && 'border-[rgba(33,73,140,0.42)] bg-[rgba(235,241,252,0.88)] shadow-[0_12px_24px_-18px_rgba(33,73,140,0.3)]',
      )}
    >
      <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">槽位 {index + 1}</p>
      {book ? (
        <div
          ref={setDragRef}
          style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
          className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-50')}
          {...attributes}
          {...listeners}
        >
          <div className="rounded-xl border border-[var(--line-subtle)] bg-white/90 px-3 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{book.title}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{book.explanation}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-[9px]">
                {book.available_copies} 本可借
              </Badge>
              <Badge variant="outline" className="rounded-full px-2 py-0 text-[9px]">
                {formatAvailability(book)}
              </Badge>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex min-h-20 items-center justify-center rounded-xl border border-dashed border-[rgba(33,73,140,0.22)] bg-[rgba(248,246,241,0.92)] text-center text-xs text-[var(--muted-foreground)]">
          拖入候选书
        </div>
      )}
    </div>
  )
}

function IPhonePreview({
  previewFeed,
}: {
  previewFeed: AdminRecommendationStudioPreviewFeed
}) {
  return (
    <div data-testid="recommendation-phone-preview" className="w-full">
      <Iphone className="drop-shadow-[0_20px_48px_rgba(31,45,67,0.22)]">
        <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top,#eff4ff_0%,#fcfcfd_24%,#f7f7f8_100%)] px-4 pb-6 pt-8">
          <div className="flex items-center justify-between text-[10px] font-semibold text-[#22314c]">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="h-2 w-3.5 rounded-sm bg-[#22314c]/18" />
              <div className="h-2 w-3.5 rounded-sm bg-[#22314c]/34" />
              <div className="h-2 w-4 rounded-sm bg-[#22314c]" />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-[1.2rem] font-semibold tracking-[-0.04em] text-[#1f2d43]">上午好，开始今天的阅读</p>
          </div>

          <div className="mt-3 flex h-8 items-center rounded-xl border border-[#e5eaf2] bg-white/90 px-3 text-[11px] text-[#8d99ab]">
            搜索书名、作者...
          </div>

          <div className="mt-4 rounded-xl border border-[#e7ecf3] bg-white/88 p-3">
            <p className="text-[11px] font-semibold text-[#1f2d43]">{previewFeed.explanation_card.title}</p>
            <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#70819b]">{previewFeed.explanation_card.body}</p>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[#1f2d43]">今日推荐</h4>
              <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#6a85e7]">Live</span>
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              {previewFeed.today_recommendations.map((book, index) => (
                <div key={`${book.book_id}-${index}`} className="w-[5.5rem] shrink-0 space-y-1">
                  <div
                    className={cn(
                      'flex aspect-[0.78] items-end rounded-xl px-2 py-2',
                      index % 3 === 0 && 'bg-[linear-gradient(180deg,#7ca7ff_0%,#4e72ff_100%)]',
                      index % 3 === 1 && 'bg-[linear-gradient(180deg,#ffb08d_0%,#ff7f5e_100%)]',
                      index % 3 === 2 && 'bg-[linear-gradient(180deg,#9fd0b5_0%,#6fb48b_100%)]',
                    )}
                  >
                    <div className="h-8 w-full rounded-md bg-black/10" />
                  </div>
                  <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-[#1f2d43]">{book.title}</p>
                </div>
              ))}
              {previewFeed.today_recommendations.length === 0 ? (
                <div className="flex h-16 w-full items-center justify-center rounded-xl border border-dashed border-[#dde5f2] text-[10px] text-[#8a97aa]">
                  暂无推荐
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-[13px] font-semibold text-[#1f2d43]">备考专区</h4>
              <Badge
                variant="outline"
                className="rounded-full border-[#dfe6f2] bg-white/78 px-1.5 py-0 text-[8px] text-[#627089]"
              >
                {previewFeed.exam_zone.length}/3
              </Badge>
            </div>
            <div className="rounded-xl border border-[#e6ebf2] bg-white/88 p-2">
              {previewFeed.exam_zone.length === 0 ? (
                <div className="flex h-14 items-center justify-center text-[10px] text-[#8a97aa]">暂无备考推荐</div>
              ) : (
                previewFeed.exam_zone.map((book, index) => (
                  <div
                    key={`${book.book_id}-${index}`}
                    className={cn('flex items-start gap-2 px-1 py-1.5', index > 0 && 'border-t border-[#eef2f7]')}
                  >
                    <div className="h-10 w-8 shrink-0 rounded-lg bg-[linear-gradient(180deg,#dfe6f2_0%,#bcc9db_100%)]" />
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-[11px] font-semibold text-[#1f2d43]">{book.title}</p>
                      <p className="line-clamp-1 text-[10px] text-[#70819b]">{book.explanation}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <h4 className="text-[13px] font-semibold text-[#1f2d43]">热门榜单</h4>
            <div className="space-y-1.5">
              {previewFeed.hot_lists.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#e7ecf3] bg-white/84 px-3 py-2">
                  <p className="text-[11px] font-semibold text-[#1f2d43]">{item.title}</p>
                  <p className="text-[10px] text-[#70819b]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Iphone>
    </div>
  )
}

export function RecommendationPage() {
  const queryClient = useQueryClient()
  const [isCompactLayout, setIsCompactLayout] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.innerWidth < COMPACT_LAYOUT_BREAKPOINT
  })
  const [draft, setDraft] = useState<AdminRecommendationStudioDraft | null>(null)
  const [previewFeed, setPreviewFeed] = useState<AdminRecommendationStudioPreviewFeed | null>(null)
  const [pool, setPool] = useState<StudioBook[]>([])
  const [extraPoolBooks, setExtraPoolBooks] = useState<StudioBook[]>([])
  const [slots, setSlots] = useState<SlotState>(createEmptySlots())
  const [dragOverlay, setDragOverlay] = useState<StudioBook | null>(null)
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0].label)
  const [candidateSearch, setCandidateSearch] = useState('')
  const [candidateSearchResults, setCandidateSearchResults] = useState<AdminBook[]>([])

  const studioQuery = useQuery({
    queryKey: ['admin', 'recommendation', 'studio'],
    queryFn: getAdminRecommendationStudio,
  })
  const publicationsQuery = useQuery({
    queryKey: ['admin', 'recommendation', 'studio', 'publications'],
    queryFn: getAdminRecommendationStudioPublications,
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const onResize = () => setIsCompactLayout(window.innerWidth < COMPACT_LAYOUT_BREAKPOINT)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!studioQuery.data) {
      return
    }

    const nextDraft = {
      ...studioQuery.data.draft,
      hot_lists: ensureHotLists(studioQuery.data.draft.hot_lists),
    }
    const nextSlots = buildSlotsFromDraft(studioQuery.data, nextDraft)

    setDraft(nextDraft)
    setSlots(nextSlots)
    setPool(buildPoolFromDraft(studioQuery.data, nextDraft, extraPoolBooks))
    setPreviewFeed(buildPreviewFeed(studioQuery.data.preview_feed, nextDraft, nextSlots))
    setSelectedStyle(inferStyleLabel(nextDraft))
  }, [extraPoolBooks, studioQuery.data])

  const saveDraftMutation = useMutation({
    mutationFn: (payload: AdminRecommendationStudioDraft) => saveAdminRecommendationStudioDraft(payload),
    onSuccess: (result) => {
      setDraft({
        ...result.draft,
        hot_lists: ensureHotLists(result.draft.hot_lists),
      })
      setPreviewFeed(result.preview_feed)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation', 'studio'] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: publishAdminRecommendationStudio,
    onSuccess: (result) => {
      setPreviewFeed(result.preview_feed)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation', 'studio'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'recommendation', 'studio', 'publications'] })
    },
  })

  const candidateSearchMutation = useMutation({
    mutationFn: (query: string) =>
      getAdminBooks({
        page: 1,
        pageSize: 8,
        query,
        shelfStatus: 'on_shelf',
      }),
    onSuccess: (result) => {
      setCandidateSearchResults(result.items)
    },
  })

  const { setNodeRef: setPoolDropRef, isOver: isPoolOver } = useDroppable({ id: 'pool-drop' })
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const visibleSections = useMemo(() => {
    return (Object.keys(SECTION_META) as SectionKey[]).filter((key) => {
      const placement = (draft ?? EMPTY_DRAFT).placements.find((item) => item.code === key)
      return placement?.status !== 'paused'
    })
  }, [draft])

  const publications = publicationsQuery.data?.items ?? []
  const activeDraft = draft ?? EMPTY_DRAFT
  const activePreviewFeed = previewFeed ?? EMPTY_PREVIEW_FEED
  const candidateBookIds = useMemo(() => {
    return new Set([
      ...pool.map((book) => book.book_id),
      ...slots.today_recommendations.flatMap((book) => (book ? [book.book_id] : [])),
      ...slots.exam_zone.flatMap((book) => (book ? [book.book_id] : [])),
    ])
  }, [pool, slots.exam_zone, slots.today_recommendations])

  const applyStudioState = (nextDraft: AdminRecommendationStudioDraft, nextSlots: SlotState, nextPool: StudioBook[]) => {
    if (!studioQuery.data) {
      return
    }

    const normalizedDraft = {
      ...nextDraft,
      hot_lists: ensureHotLists(nextDraft.hot_lists),
    }

    setDraft(normalizedDraft)
    setSlots(nextSlots)
    setPool(nextPool)
    setPreviewFeed(buildPreviewFeed(studioQuery.data.preview_feed, normalizedDraft, nextSlots))
  }

  const resetToServerDraft = () => {
    if (!studioQuery.data) {
      return
    }

    const nextDraft = {
      ...studioQuery.data.draft,
      hot_lists: ensureHotLists(studioQuery.data.draft.hot_lists),
    }
    applyStudioState(
      nextDraft,
      buildSlotsFromDraft(studioQuery.data, nextDraft),
      buildPoolFromDraft(studioQuery.data, nextDraft),
    )
    setExtraPoolBooks([])
    setCandidateSearchResults([])
    setCandidateSearch('')
    setSelectedStyle(inferStyleLabel(nextDraft))
  }

  const updateDraftFields = (updater: (current: AdminRecommendationStudioDraft) => AdminRecommendationStudioDraft) => {
    if (!draft) {
      return
    }

    applyStudioState(updater(draft), slots, pool)
  }

  const updatePlacementStatus = (code: SectionKey | 'hot_lists' | 'system_booklists', status: 'active' | 'paused') => {
    updateDraftFields((current) => ({
      ...current,
      placements: current.placements.map((item) => (item.code === code ? { ...item, status } : item)),
    }))
  }

  const updateHotList = (index: number, field: 'title' | 'description', value: string) => {
    updateDraftFields((current) => ({
      ...current,
      hot_lists: ensureHotLists(current.hot_lists).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }))
  }

  const applyStylePreset = (preset: RecommendationStylePreset) => {
    setSelectedStyle(preset.label)
    updateDraftFields((current) => ({
      ...current,
      strategy_weights: preset.weights,
    }))
  }

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === 'candidate') {
      setDragOverlay(data.book as StudioBook)
    }
    if (data?.type === 'slot') {
      setDragOverlay(slots[data.sectionKey as SectionKey][data.index as number])
    }
  }

  const handleDragCancel = () => setDragOverlay(null)

  const handleDragEnd = (event: DragEndEvent) => {
    setDragOverlay(null)
    if (!draft) {
      return
    }

    const data = event.active.data.current
    const overId = String(event.over?.id ?? '')
    if (!data || !overId) {
      return
    }

    if (overId === 'pool-drop' && data.type === 'slot') {
      const sectionKey = data.sectionKey as SectionKey
      const slotIndex = data.index as number
      const book = slots[sectionKey][slotIndex]
      if (!book) {
        return
      }

      const nextSlots = {
        ...slots,
        [sectionKey]: slots[sectionKey].map((item, index) => (index === slotIndex ? null : item)),
      }
      const nextPool = [...pool, book]
      applyStudioState(buildDraftFromSlots(draft, nextSlots), nextSlots, nextPool)
      return
    }

    if (!overId.startsWith('slot:')) {
      return
    }

    const [, targetSection, targetIndexValue] = overId.split(':')
    if (targetSection !== 'today_recommendations' && targetSection !== 'exam_zone') {
      return
    }

    const targetIndex = Number(targetIndexValue)
    const nextSlots = {
      ...slots,
      today_recommendations: [...slots.today_recommendations],
      exam_zone: [...slots.exam_zone],
    }
    let nextPool = [...pool]

    if (data.type === 'candidate') {
      const book = data.book as StudioBook
      const existing = nextSlots[targetSection][targetIndex]
      nextPool = nextPool.filter((item) => item.id !== book.id)
      if (existing) {
        nextPool.push(existing)
      }
      nextSlots[targetSection][targetIndex] = book
    }

    if (data.type === 'slot') {
      const fromSection = data.sectionKey as SectionKey
      const fromIndex = data.index as number
      const sourceBook = nextSlots[fromSection][fromIndex]
      const targetBook = nextSlots[targetSection][targetIndex]
      nextSlots[fromSection][fromIndex] = targetBook
      nextSlots[targetSection][targetIndex] = sourceBook
    }

    applyStudioState(buildDraftFromSlots(draft, nextSlots), nextSlots, nextPool)
  }

  const searchCandidateBooks = () => {
    const trimmedQuery = candidateSearch.trim()
    if (!trimmedQuery) {
      setCandidateSearchResults([])
      return
    }

    candidateSearchMutation.mutate(trimmedQuery)
  }

  const addBookToCandidatePool = (book: AdminBook) => {
    if (!studioQuery.data || !draft || candidateBookIds.has(book.id)) {
      return
    }

    const nextExtraBooks = [...extraPoolBooks, toSearchResultBook(book)]
    setExtraPoolBooks(nextExtraBooks)
    setCandidateSearchResults((current) => current.filter((item) => item.id !== book.id))
    applyStudioState(draft, slots, buildPoolFromDraft(studioQuery.data, draft, nextExtraBooks))
  }

  const renderCandidatePool = (mode: 'wide' | 'compact') => (
    <section
      ref={setPoolDropRef}
      className={cn(
        'min-w-0 overflow-x-hidden overflow-y-auto rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(247,245,240,0.9)] p-3 transition-all',
        mode === 'compact' ? 'max-h-[22rem]' : 'h-full',
        isPoolOver && 'border-[rgba(33,73,140,0.42)] bg-[rgba(235,241,252,0.88)]',
      )}
    >
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-[var(--foreground)]">候选书池</h4>
        <p className="text-[10px] leading-4 text-[var(--muted-foreground)]">把还没放到首页的图书先集中在这里安排。</p>
      </div>

      <div className="mt-4 space-y-2 rounded-[1.15rem] border border-[var(--line-subtle)] bg-white/80 p-3">
        <div className="space-y-1">
          <Label htmlFor="candidate-search-input">搜索图书加入候选</Label>
          <p className="text-[10px] leading-4 text-[var(--muted-foreground)]">这里只搜索当前可借的图书，适合临时补位。</p>
        </div>
        <div className="flex gap-2">
          <Input
            id="candidate-search-input"
            value={candidateSearch}
            onChange={(event) => setCandidateSearch(event.target.value)}
            placeholder="输入书名或作者"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={searchCandidateBooks}
            disabled={candidateSearchMutation.isPending || !candidateSearch.trim()}
          >
            {candidateSearchMutation.isPending ? '搜索中…' : '搜索并加入'}
          </Button>
        </div>
        {(candidateSearchResults.length > 0 || candidateSearchMutation.isSuccess) ? (
          <div data-testid="recommendation-search-results" className="space-y-2">
            {candidateSearchResults.length > 0 ? (
              candidateSearchResults.map((book) => {
                const isAdded = candidateBookIds.has(book.id)
                return (
                  <div
                    key={book.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line-subtle)] bg-[rgba(248,246,241,0.92)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-[var(--foreground)]">{book.title}</p>
                      <p className="truncate text-[10px] text-[var(--muted-foreground)]">
                        {book.author || '未知作者'} · {(book.stock_summary?.available_copies ?? 0)} 本可借
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isAdded ? 'secondary' : 'default'}
                      disabled={isAdded}
                      onClick={() => addBookToCandidatePool(book)}
                    >
                      {isAdded ? '已在候选池' : '加入候选池'}
                    </Button>
                  </div>
                )
              })
            ) : (
              <p className="rounded-xl border border-dashed border-[var(--line-subtle)] px-3 py-4 text-center text-[10px] text-[var(--muted-foreground)]">
                没有找到符合条件的在架图书
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-2 rounded-[1.15rem] border border-[var(--line-subtle)] bg-white/80 p-3">
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-[var(--foreground)]">系统书单</h5>
          <p className="text-[10px] leading-4 text-[var(--muted-foreground)]">这些书单会跟当前版本一起显示给读者。</p>
        </div>
        <div className="space-y-2">
          {studioQuery.data?.candidates.system_booklists.map((booklist) => (
            <div
              key={booklist.booklist_id}
              className="rounded-xl border border-[var(--line-subtle)] bg-[rgba(248,246,241,0.92)] px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--foreground)]">{booklist.title}</p>
                {booklist.book_count ? (
                  <Badge variant="outline" className="rounded-full px-2 py-0 text-[9px]">
                    {booklist.book_count} 本
                  </Badge>
                ) : null}
              </div>
              {booklist.description ? (
                <p className="mt-1 text-[10px] leading-4 text-[var(--muted-foreground)]">{booklist.description}</p>
              ) : null}
            </div>
          ))}
          {studioQuery.data?.candidates.system_booklists.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line-subtle)] px-3 py-4 text-center text-[10px] text-[var(--muted-foreground)]">
              现在没有可用书单
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {pool.map((book) => (
          <CandidateCard key={book.id} book={book} inPool />
        ))}
        {pool.length === 0 ? (
          <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">候选图书都已经放到首页了</p>
        ) : null}
      </div>
    </section>
  )

  const renderSectionBoard = (sectionKey: SectionKey, mode: 'wide' | 'compact') => (
    <section
      key={sectionKey}
      className={cn(
        'min-w-0 overflow-x-hidden overflow-y-auto rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.78)] p-4',
        mode === 'wide' ? 'h-full' : null,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">{SECTION_META[sectionKey].label}</h4>
          <p className="text-xs text-[var(--muted-foreground)]">{SECTION_META[sectionKey].description}</p>
        </div>
        <Badge variant="success">显示</Badge>
      </div>
      <div className="mt-4 space-y-3">
        {slots[sectionKey].map((book, index) => (
          <SlotCard key={`${sectionKey}-${index}`} sectionKey={sectionKey} index={index} book={book} />
        ))}
      </div>
    </section>
  )

  const renderKanbanBoard = () => {
    if (isCompactLayout) {
      return (
        <div data-testid="recommendation-kanban-board" className="space-y-4">
          {renderCandidatePool('compact')}
          {visibleSections.map((sectionKey) => renderSectionBoard(sectionKey, 'compact'))}
        </div>
      )
    }

    const gridCols = `minmax(11rem,13rem) ${visibleSections.map(() => 'minmax(0,1fr)').join(' ')}`

    return (
      <div
        data-testid="recommendation-kanban-board"
        className="grid h-full min-w-0 gap-4"
        style={{ gridTemplateColumns: gridCols }}
      >
        {renderCandidatePool('wide')}
        {visibleSections.map((sectionKey) => renderSectionBoard(sectionKey, 'wide'))}
      </div>
    )
  }

  if (studioQuery.isLoading || !draft || !previewFeed) {
    return (
      <PageShell
        {...pageHero}
        heroLayout="stacked"
        eyebrow="推荐"
        title="推荐页面正在载入"
        description="正在同步候选图书、草稿和手机预览。"
      >
        <LoadingState label="正在载入推荐页面" />
      </PageShell>
    )
  }

  if (studioQuery.isError && !studioQuery.data) {
    return (
      <PageShell
        {...pageHero}
        heroLayout="stacked"
        eyebrow="推荐"
        title="推荐页面"
        description="安排首页推荐内容，并在右侧查看手机效果。"
      >
        <EmptyState title="推荐页面加载失败" description="请稍后再试。" />
      </PageShell>
    )
  }

  return (
    <PageShell
      {...pageHero}
      heroLayout="stacked"
      eyebrow="推荐"
      title="推荐页面"
      description="安排首页推荐内容，并在右侧查看手机效果。"
    >
      <div className="space-y-5 pb-8">
        <section
          data-testid="recommendation-action-bar"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.74)] px-4 py-4"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <LibraryBig className="mr-1 size-3.5" />
              候选 {pool.length}
            </Badge>
            <Badge variant="outline">
              <Smartphone className="mr-1 size-3" />
              {activePreviewFeed.today_recommendations.length}/3 今日推荐
            </Badge>
            <Badge variant="outline">{activePreviewFeed.exam_zone.length}/3 考试专区</Badge>
            {studioQuery.data?.live_publication ? (
              <Badge variant="outline">线上 v{studioQuery.data.live_publication.version}</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={resetToServerDraft}>
              还原改动
            </Button>
            <Button type="button" variant="secondary" onClick={() => saveDraftMutation.mutate(activeDraft)} disabled={saveDraftMutation.isPending || !draft}>
              {saveDraftMutation.isPending ? '保存中…' : '保存草稿'}
            </Button>
            <Button type="button" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending || !draft}>
              {publishMutation.isPending ? '发布中…' : '发布到首页'}
            </Button>
          </div>
        </section>

        <div className={cn('grid gap-4', isCompactLayout ? 'grid-cols-1' : 'grid-cols-[minmax(0,1.55fr)_minmax(18rem,22rem)]')}>
          <section data-testid="recommendation-primary-column" className="space-y-4">
            <div
              data-testid="recommendation-control-deck"
              className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.74)] p-4"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">首页栏目</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">决定哪些模块显示在读者首页。</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label id="placement-today-label">今日推荐显示</Label>
                      <Select
                        value={activeDraft.placements.find((item) => item.code === 'today_recommendations')?.status ?? 'active'}
                        onValueChange={(value) => updatePlacementStatus('today_recommendations', value as 'active' | 'paused')}
                      >
                        <SelectTrigger aria-labelledby="placement-today-label">
                          <SelectValue placeholder="显示" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="active">显示</SelectItem>
                            <SelectItem value="paused">暂停</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label id="placement-exam-label">考试专区显示</Label>
                      <Select
                        value={activeDraft.placements.find((item) => item.code === 'exam_zone')?.status ?? 'active'}
                        onValueChange={(value) => updatePlacementStatus('exam_zone', value as 'active' | 'paused')}
                      >
                        <SelectTrigger aria-labelledby="placement-exam-label">
                          <SelectValue placeholder="显示" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="active">显示</SelectItem>
                            <SelectItem value="paused">暂停</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-[var(--foreground)]">推荐方式</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">快速切换推荐侧重点。</p>
                  </div>
                  <ToggleGroup
                    type="single"
                    value={selectedStyle}
                    aria-label="推荐方式"
                    onValueChange={(value) => {
                      if (!value) {
                        return
                      }
                      const preset = STYLE_PRESETS.find((item) => item.label === value)
                      if (preset) {
                        applyStylePreset(preset)
                      }
                    }}
                  >
                    {STYLE_PRESETS.map((preset) => (
                      <ToggleGroupItem key={preset.label} value={preset.label}>
                        {preset.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.74)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-[var(--foreground)]">推荐看板</h3>
                  <p className="text-sm text-[var(--muted-foreground)]">把图书拖到对应栏目里，右侧会同步显示手机效果。</p>
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button type="button" variant="secondary">编辑页面内容</Button>
                  </SheetTrigger>
                  <SheetContent side="left" aria-describedby="recommendation-config-description" className="sm:w-[min(640px,calc(100vw-1.5rem))]">
                    <SheetHeader>
                      <SheetTitle>编辑页面内容</SheetTitle>
                      <SheetDescription id="recommendation-config-description">在这里修改首页说明和热门榜单，保存草稿后会同步到预览。</SheetDescription>
                    </SheetHeader>
                    <div className="mt-6 space-y-5">
                      <div className="space-y-3 rounded-[1.25rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.76)] p-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">首页说明</h4>
                          <p className="text-xs text-[var(--muted-foreground)]">首页顶部显示的推荐理由。</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="explanation-title">说明标题</Label>
                          <Input
                            id="explanation-title"
                            value={activeDraft.explanation_card.title}
                            onChange={(event) =>
                              updateDraftFields((current) => ({
                                ...current,
                                explanation_card: {
                                  ...current.explanation_card,
                                  title: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="explanation-body">说明正文</Label>
                          <Textarea
                            id="explanation-body"
                            className="min-h-20"
                            value={activeDraft.explanation_card.body}
                            onChange={(event) =>
                              updateDraftFields((current) => ({
                                ...current,
                                explanation_card: {
                                  ...current.explanation_card,
                                  body: event.target.value,
                                },
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-3 rounded-[1.25rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.76)] p-4">
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold text-[var(--foreground)]">热门榜单</h4>
                          <p className="text-xs text-[var(--muted-foreground)]">首页里给读者快速查看的榜单。</p>
                        </div>
                        {ensureHotLists(activeDraft.hot_lists).map((item, index) => (
                          <div key={item.id || `hot-list-${index}`} className="space-y-2 rounded-xl border border-[var(--line-subtle)] bg-[rgba(248,246,241,0.88)] p-3">
                            <Label htmlFor={`hot-list-title-${index}`}>热门榜单 {index + 1} 标题</Label>
                            <Input
                              id={`hot-list-title-${index}`}
                              value={item.title}
                              onChange={(event) => updateHotList(index, 'title', event.target.value)}
                            />
                            <Label htmlFor={`hot-list-description-${index}`}>热门榜单 {index + 1} 描述</Label>
                            <Textarea
                              id={`hot-list-description-${index}`}
                              className="min-h-16"
                              value={item.description}
                              onChange={(event) => updateHotList(index, 'description', event.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <SheetFooter className="mt-6">
                      <SheetClose asChild>
                        <Button type="button" variant="secondary">完成编辑</Button>
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>

              <div className="mt-4">
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
                  {renderKanbanBoard()}
                  <DragOverlay>
                    {dragOverlay ? (
                      <div className="w-[16rem]">
                        <div className="rounded-xl border border-[rgba(33,73,140,0.22)] bg-white px-3 py-3 shadow-[0_18px_38px_-24px_rgba(24,24,20,0.5)]">
                          <p className="text-sm font-semibold text-[var(--foreground)]">{dragOverlay.title}</p>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{dragOverlay.explanation}</p>
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </div>
            </div>
          </section>

          <section data-testid="recommendation-secondary-column" className="space-y-4">
            <div className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.78)] p-4">
              <div className="space-y-1">
                <h4 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">手机预览</h4>
                <p className="text-xs leading-5 text-[var(--muted-foreground)]">确认读者首页现在会显示什么。</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline">{activePreviewFeed.today_recommendations.length}/3 今日推荐</Badge>
                <Badge variant="outline">{activePreviewFeed.exam_zone.length}/3 考试专区</Badge>
              </div>
              <div className="mt-4 flex items-start justify-center">
                <IPhonePreview previewFeed={activePreviewFeed} />
              </div>
            </div>

            <div className="rounded-[1.45rem] border border-[var(--line-subtle)] bg-[rgba(255,255,255,0.78)] p-4">
              <div className="space-y-1">
                <h4 className="text-base font-semibold tracking-[-0.02em] text-[var(--foreground)]">发布状态</h4>
                <p className="text-xs text-[var(--muted-foreground)]">查看当前线上版本和最近发布记录。</p>
              </div>
              <div className="mt-4 space-y-3">
                {studioQuery.data?.live_publication ? (
                  <div className="rounded-xl border border-[var(--line-subtle)] bg-white/88 px-3 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">线上版本 v{studioQuery.data.live_publication.version}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      发布人 {studioQuery.data.live_publication.published_by_username || '未知'}
                    </p>
                  </div>
                ) : null}
                {publications.map((publication) => (
                  <div key={publication.id} className="rounded-xl border border-[var(--line-subtle)] bg-white/88 px-3 py-3">
                    <p className="text-sm font-semibold text-[var(--foreground)]">历史版本 v{publication.version}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {publication.published_by_username || '未知'} · {publication.published_at || '待记录'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  )
}
