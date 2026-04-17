import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { BookCover } from '@/components/base/book-cover';
import { AppIcon } from '@/components/base/app-icon';
import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
  type SkeletonWidth,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { SearchResultCardSkeleton } from '@/components/search/search-result-skeleton';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  useAddBookToBooklistMutation,
  useActiveOrdersQuery,
  useBookDetailQuery,
  useBooklistsQuery,
  useCollaborativeBooksQuery,
  useCreateBooklistMutation,
  useCreateBorrowOrderMutation,
  useCreateLearningProfileMutation,
  useFavoritesQuery,
  useHybridBooksQuery,
  useSimilarBooksQuery,
  useToggleFavoriteMutation,
} from '@/hooks/use-library-app-data';
import { getLibraryErrorMessage } from '@/lib/api/client';
import type { BookCard, BorrowOrderView } from '@/lib/api/types';
import { resolveBookEtaDisplay } from '@/lib/book-delivery';
import { resolveBookLocationDisplay } from '@/lib/book-location';

const BORROW_MODE_OPTIONS = [
  { description: '机器人送到阅读位，适合想尽快开始。', label: '配送', value: 'robot_delivery' as const },
  { description: '保留在书柜，之后到柜取走。', label: '自取', value: 'cabinet_pickup' as const },
] as const;

const DISCOVERY_COVER_TONES: ReadonlySet<BookCard['coverTone']> = new Set([
  'apricot',
  'blue',
  'coral',
  'lavender',
  'mint',
]);

function resolveDiscoveryText(value: unknown, fallback: string) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
}

function resolveOptionalDiscoveryText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
}

function resolveDiscoveryStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sanitizeDiscoveryBook(raw: unknown): BookCard | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const rawId = record.id ?? record.bookId ?? record.book_id;
  const id = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : 0;
  const rawCoverTone = record.coverTone ?? record.cover_tone;
  const coverTone =
    typeof rawCoverTone === 'string' && DISCOVERY_COVER_TONES.has(rawCoverTone as BookCard['coverTone'])
      ? (rawCoverTone as BookCard['coverTone'])
      : 'blue';

  return {
    id,
    author: resolveDiscoveryText(record.author, '佚名'),
    availabilityLabel: resolveDiscoveryText(
      record.availabilityLabel ?? record.availability_label,
      '馆藏信息待确认'
    ),
    cabinetLabel: resolveDiscoveryText(
      record.cabinetLabel ?? record.cabinet_label ?? record.locationNote ?? record.location_note,
      '位置待确认'
    ),
    category: resolveOptionalDiscoveryText(record.category),
    coverTone,
    coverUrl: resolveOptionalDiscoveryText(record.coverUrl ?? record.cover_url),
    deliveryAvailable: Boolean(record.deliveryAvailable ?? record.delivery_available),
    etaLabel: resolveDiscoveryText(record.etaLabel ?? record.eta_label, '到柜自取'),
    etaMinutes:
      typeof (record.etaMinutes ?? record.eta_minutes) === 'number' &&
      Number.isFinite(record.etaMinutes ?? record.eta_minutes)
        ? Number(record.etaMinutes ?? record.eta_minutes)
        : null,
    matchedFields: resolveDiscoveryStringList(record.matchedFields ?? record.matched_fields),
    recommendationReason: resolveOptionalDiscoveryText(
      record.recommendationReason ?? record.recommendation_reason
    ),
    shelfLabel: resolveDiscoveryText(record.shelfLabel ?? record.shelf_label, '主馆 2 楼'),
    stockStatus: resolveDiscoveryText(record.stockStatus ?? record.stock_status, 'available'),
    summary: resolveDiscoveryText(record.summary, ''),
    tags: resolveDiscoveryStringList(record.tags ?? record.tag_names),
    title: resolveDiscoveryText(record.title, '未命名图书'),
  };
}

function sanitizeDiscoveryBooks(books: unknown) {
  if (!Array.isArray(books)) {
    return [];
  }

  return books.map(sanitizeDiscoveryBook).filter((item): item is BookCard => item !== null);
}

function resolveDecisionAvailabilityLabel(value?: string | null) {
  const normalized = value?.trim();

  if (!normalized) {
    return '状态暂不可用';
  }

  if (normalized.includes('可立即借阅')) {
    return '可立即借阅';
  }

  return normalized;
}

function resolveBookDetailSummary(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : '暂无';
}

function findActiveOrderForBook(orders: BorrowOrderView[] | undefined, bookId: number) {
  if (!orders?.length) {
    return null;
  }

  return (
    [...orders]
      .filter((order) => order.book.id === bookId && order.status !== 'cancelled' && order.status !== 'completed')
      .sort((left, right) => right.id - left.id)[0] ?? null
  );
}

function resolveBookDecisionState(activeOrder: BorrowOrderView | null) {
  if (!activeOrder) {
    return null;
  }

  if (activeOrder.fulfillmentPhase === 'dispatch_started' || activeOrder.fulfillmentPhase === 'in_transit') {
    return {
      actionLabel: '查看配送',
      availabilityLabel: '正在配送',
      icon: 'truck' as const,
    };
  }

  if (activeOrder.fulfillmentPhase === 'pickup_pending') {
    return {
      actionLabel: '查看借阅',
      availabilityLabel: '待取书',
      icon: 'package' as const,
    };
  }

  return {
    actionLabel: '查看借阅',
    availabilityLabel: '已借阅',
    icon: 'borrowing' as const,
  };
}

function BookDetailSurface({
  children,
  muted = false,
  testID,
}: {
  children: React.ReactNode;
  muted?: boolean;
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: muted ? theme.colors.surfaceMuted : theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
      }}
      testID={testID}>
      {children}
    </View>
  );
}

function BookDetailHeroSkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard testID="book-detail-primary-skeleton">
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <LoadingSkeletonBlock borderRadius={theme.radii.lg} height={148} width={104} />
        <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: 'center' }}>
          <LoadingSkeletonText
            lineHeight={28}
            testIDPrefix="book-detail-primary-skeleton-title"
            widths={['82%', '64%']}
          />
          <LoadingSkeletonBlock height={14} width="36%" />
          <LoadingSkeletonBlock height={12} width="62%" />
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={88} />
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={28} width={72} />
          </View>
        </View>
      </View>
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="借阅决策" />
        <View
          style={{
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {['location', 'availability', 'eta'].map((key) => (
              <View key={key} style={{ flex: 1, gap: 6 }}>
                <LoadingSkeletonBlock height={12} width="56%" />
                <LoadingSkeletonBlock height={16} width="82%" />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="46%" />
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="28%" />
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={44} width="34%" />
            <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={44} width="34%" />
          </View>
          <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={44} width="38%" />
        </View>
      </View>
    </LoadingSkeletonCard>
  );
}

function BookDetailSectionSkeleton({
  lines,
  testID,
}: {
  lines: SkeletonWidth[];
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard style={{ padding: theme.spacing.xl }} testID={testID}>
      <LoadingSkeletonText lineHeight={13} widths={lines} />
    </LoadingSkeletonCard>
  );
}

function BookDetailDiscoverySkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard style={{ padding: theme.spacing.xl }} testID="book-detail-discovery-skeleton">
      <View style={{ gap: theme.spacing.lg }}>
        <LoadingSkeletonBlock height={12} width="20%" />
        <LoadingSkeletonText lineHeight={13} widths={['88%', '72%']} />
        <View style={{ gap: theme.spacing.md }}>
          <LoadingSkeletonBlock height={12} width="24%" />
          <SearchResultCardSkeleton testID="book-detail-discovery-skeleton-row-1" />
        </View>
        <View style={{ gap: theme.spacing.md }}>
          <LoadingSkeletonBlock height={12} width="18%" />
          <SearchResultCardSkeleton testID="book-detail-discovery-skeleton-row-2" />
        </View>
      </View>
    </LoadingSkeletonCard>
  );
}

function BookMetaPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'accent' | 'neutral';
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: tone === 'accent' ? theme.colors.primarySoft : theme.colors.surfaceMuted,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}>
      <Text
        style={{
          color: tone === 'accent' ? theme.colors.primaryStrong : theme.colors.textMuted,
          ...theme.typography.semiBold,
          fontSize: 12,
        }}>
        {label}
      </Text>
    </View>
  );
}

function DecisionMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14, lineHeight: 19 }}>
        {value}
      </Text>
    </View>
  );
}

function DetailTag({
  label,
}: {
  label: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.primarySoft,
        borderRadius: theme.radii.pill,
        paddingHorizontal: 12,
        paddingVertical: 8,
      }}>
      <Text
        style={{
          color: theme.colors.primaryStrong,
          ...theme.typography.semiBold,
          fontSize: 12,
        }}>
        {label}
      </Text>
    </View>
  );
}

function DiscoveryItem({
  book,
  isFirst,
  onPress,
}: {
  book: BookCard;
  isFirst: boolean;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const recommendationText = resolveDiscoveryText(book.recommendationReason, '猜你感兴趣');
  const authorLabel = resolveDiscoveryText(book.author, '佚名');

  return (
    <Pressable
      accessibilityRole="button"
      disabled={book.id <= 0}
      onPress={book.id > 0 ? onPress : undefined}
      style={({ pressed }) => ({
        borderTopColor: isFirst ? 'transparent' : theme.colors.borderSoft,
        borderTopWidth: isFirst ? 0 : 1,
        opacity: pressed ? 0.94 : 1,
        paddingVertical: theme.spacing.lg,
      })}>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        <View
          style={{
            height: 90,
            justifyContent: 'center',
            width: 68,
          }}>
          <BookCover borderRadius={theme.radii.lg} height={90} seed={book.title} tone={book.coverTone} width={68} />
        </View>
        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <View style={{ gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                ...theme.typography.semiBold,
                fontSize: 17,
              }}>
              {book.title}
            </Text>
            <Text
              numberOfLines={2}
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 13,
                lineHeight: 19,
              }}>
              {recommendationText}
            </Text>
          </View>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {authorLabel}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.body,
              fontSize: 12,
            }}>
            {resolveBookLocationDisplay(book.cabinetLabel)} · {resolveBookEtaDisplay(book.etaLabel)}
          </Text>
        </View>
        <View
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: theme.spacing.xs,
          }}
          testID="book-detail-discovery-chevron">
          <AppIcon color={theme.colors.textSoft} name="chevronRight" size={18} strokeWidth={2} />
        </View>
      </View>
    </Pressable>
  );
}

function DiscoveryGroup({
  books,
  title,
  onPressItem,
}: {
  books: BookCard[];
  title: string;
  onPressItem: (bookId: number) => void;
}) {
  const { theme } = useAppTheme();

  if (!books.length) {
    return null;
  }

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>{title}</Text>
      <View>
        {books.map((item, index) => (
          <DiscoveryItem
            book={item}
            isFirst={index === 0}
            key={`${title}-${item.id}`}
            onPress={() => onPressItem(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

export default function BookDetailRoute() {
  const params = useLocalSearchParams<{ bookId?: string; minimal?: string }>();
  const bookId = Number(params.bookId);
  const isMinimal = params.minimal === 'true';
  const { theme } = useAppTheme();
  const router = useRouter();
  const detailQuery = useBookDetailQuery(bookId);
  const recBookId = isMinimal ? NaN : bookId;
  const activeOrdersQuery = useActiveOrdersQuery();
  const booklistsQuery = useBooklistsQuery();
  const collaborativeQuery = useCollaborativeBooksQuery(recBookId);
  const favoritesQuery = useFavoritesQuery();
  const hybridQuery = useHybridBooksQuery(recBookId);
  const similarQuery = useSimilarBooksQuery(recBookId);
  const addBookToBooklistMutation = useAddBookToBooklistMutation();
  const createBooklistMutation = useCreateBooklistMutation();
  const borrowMutation = useCreateBorrowOrderMutation();
  const createLearningProfileMutation = useCreateLearningProfileMutation();
  const favoriteMutation = useToggleFavoriteMutation();
  const [isBorrowModalMounted, setIsBorrowModalMounted] = React.useState(false);
  const [isBooklistModalVisible, setIsBooklistModalVisible] = React.useState(false);
  const [isBooklistCreateMode, setIsBooklistCreateMode] = React.useState(false);
  const [draftBooklistTitle, setDraftBooklistTitle] = React.useState('');
  const [draftBooklistDescription, setDraftBooklistDescription] = React.useState('');
  const [borrowMode, setBorrowMode] = React.useState<'cabinet_pickup' | 'robot_delivery'>('robot_delivery');
  const [deliveryTarget, setDeliveryTarget] = React.useState('');
  const [pickupTarget, setPickupTarget] = React.useState('主馆 1 楼书柜');
  const book = detailQuery.data?.catalog;
  const activeOrderForBook = findActiveOrderForBook(activeOrdersQuery.data, bookId);
  const activeOrderDecisionState = resolveBookDecisionState(activeOrderForBook);

  const openBorrowModal = () => {
    if (activeOrderForBook) {
      router.push(`/orders/${activeOrderForBook.id}`);
      return;
    }

    if (!(book && (book.stockStatus === 'available' || book.availabilityLabel.includes('可立即借阅')))) {
      toast.error('这本书当前暂不可借，请换一本或稍后再试。');
      return;
    }

    setIsBorrowModalMounted(true);
  };

  const closeBorrowModal = () => {
    setIsBorrowModalMounted(false);
  };

  const handleCreateLearning = async () => {
    if (!book) {
      return;
    }

    try {
      const profile = await createLearningProfileMutation.mutateAsync({
        bookId: book.id,
        sourceType: 'book',
        title: book.title,
      });
      router.push(`/learning/${profile.id}/guide`);
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '创建学习导师失败，请稍后再试。'));
    }
  };

  if (!Number.isFinite(bookId)) {
    return null;
  }

  const isFavorite = Boolean(favoritesQuery.data?.some((item) => item.book.id === bookId));
  const detailError = detailQuery.error ?? favoritesQuery.error;
  const collaborativeBooks =
    sanitizeDiscoveryBooks(
      collaborativeQuery.data?.length ? collaborativeQuery.data : detailQuery.data?.peopleAlsoBorrowed ?? []
    );
  const customBooklists = booklistsQuery.data?.customItems ?? [];
  const watchLaterBooklist = customBooklists.find((item) => item.title.trim() === '稍后再看') ?? null;
  const visibleCustomBooklists = customBooklists.filter((item) => item.id !== watchLaterBooklist?.id);
  const similarBooks = sanitizeDiscoveryBooks(
    similarQuery.data?.length ? similarQuery.data : detailQuery.data?.relatedBooks ?? []
  );
  const hybridBooks = sanitizeDiscoveryBooks(hybridQuery.data ?? []);
  const locationNote = resolveBookLocationDisplay(book?.locationNote ?? book?.cabinetLabel);
  const availabilityLabel = activeOrderDecisionState?.availabilityLabel ?? book?.availabilityLabel ?? '状态暂不可用';
  const decisionAvailabilityLabel =
    activeOrderDecisionState?.availabilityLabel ?? resolveDecisionAvailabilityLabel(book?.availabilityLabel);
  const etaLabel = book ? resolveBookEtaDisplay(book.etaLabel) : '到手时间待确认';
  const activeBorrowTarget = borrowMode === 'robot_delivery' ? deliveryTarget : pickupTarget;
  const isDetailLoading = !detailError && !detailQuery.data && Boolean(detailQuery.isFetching);
  const isDiscoveryLoading =
    !isMinimal &&
    isDetailLoading &&
    Boolean(collaborativeQuery.isFetching) &&
    Boolean(similarQuery.isFetching) &&
    Boolean(hybridQuery.isFetching);
  const discoveryGroups = [
    { books: collaborativeBooks, title: '借过这本的人也借了' },
    { books: similarBooks, title: '同主题延伸' },
    { books: hybridBooks, title: '你可能还想借' },
  ].filter((group) => group.books.length > 0);
  const hasDiscoveryContent = Boolean(detailQuery.data?.recommendationReason) || discoveryGroups.length > 0;
  const isBooklistActionPending = createBooklistMutation.isPending || addBookToBooklistMutation.isPending;
  const primaryBorrowActionLabel =
    activeOrderDecisionState?.actionLabel ?? (borrowMutation.isPending ? '借阅中…' : '立即借阅');
  const primaryBorrowActionIcon = activeOrderDecisionState?.icon ?? 'borrowing';

  const closeBooklistModal = () => {
    setIsBooklistModalVisible(false);
    setIsBooklistCreateMode(false);
    setDraftBooklistTitle('');
    setDraftBooklistDescription('');
  };

  const addCurrentBookToExistingBooklist = async (booklistId: string) => {
    if (!book || isBooklistActionPending) {
      return;
    }

    try {
      await addBookToBooklistMutation.mutateAsync({
        bookId: book.id,
        booklistId,
      });
      closeBooklistModal();
      toast.success('已加入书单');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '加入书单失败，请稍后重试。'));
    }
  };

  const handleAddToWatchLater = async () => {
    if (!book || isBooklistActionPending) {
      return;
    }

    try {
      if (watchLaterBooklist) {
        await addBookToBooklistMutation.mutateAsync({
          bookId: book.id,
          booklistId: watchLaterBooklist.id,
        });
      } else {
        await createBooklistMutation.mutateAsync({
          bookIds: [book.id],
          description: `来自《${book.title}》的待读标记`,
          title: '稍后再看',
        });
      }
      closeBooklistModal();
      toast.success('已加入稍后再看');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '加入书单失败，请稍后重试。'));
    }
  };

  const handleCreateBooklist = async () => {
    const title = draftBooklistTitle.trim();
    const description = draftBooklistDescription.trim();

    if (!book || !title || isBooklistActionPending) {
      return;
    }

    try {
      await createBooklistMutation.mutateAsync({
        bookIds: [book.id],
        description: description || null,
        title,
      });
      closeBooklistModal();
      toast.success('书已加入新书单');
    } catch (error) {
      toast.error(getLibraryErrorMessage(error, '创建书单失败，请稍后重试。'));
    }
  };

  return (
    <ProtectedRoute>
      <PageShell mode="workspace" pageTitle="图书详情">
        {detailError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(detailError, '图书详情暂时不可用，请检查 catalog 和 favorites 接口。')}
            title="图书详情联调失败"
            tone="danger"
          />
        ) : null}

        {isDetailLoading ? <BookDetailHeroSkeleton /> : null}

        {book ? (
          <BookDetailSurface>
            <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
              <View
                style={{
                  height: 160,
                  justifyContent: 'center',
                  width: 114,
                }}
                testID="book-detail-cover-shell">
                <BookCover borderRadius={theme.radii.lg} height={144} seed={book.title} tone={book.coverTone} width={98} />
              </View>
              <View style={{ flex: 1, gap: theme.spacing.sm, justifyContent: 'center' }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.heading,
                    fontSize: 28,
                    lineHeight: 34,
                  }}>
                  {book.title}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.semiBold,
                    fontSize: 14,
                  }}>
                  {book.author}
                </Text>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.medium,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {locationNote}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  <BookMetaPill label={availabilityLabel} tone="accent" />
                  <BookMetaPill label={etaLabel} />
                </View>
              </View>
            </View>

            <View style={{ gap: theme.spacing.lg }}>
              <SectionTitle title="借阅决策" />
              <BookDetailSurface muted>
                <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                  <DecisionMetric label="馆藏位置" value={resolveBookLocationDisplay(book.cabinetLabel)} />
                  <DecisionMetric label="可借状态" value={decisionAvailabilityLabel} />
                  <DecisionMetric label="最快到手" value={etaLabel} />
                </View>
                <View
                  style={{
                    alignSelf: 'center',
                    gap: theme.spacing.md,
                    width: '100%',
                  }}
                  testID="book-detail-decision-actions">
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: theme.spacing.md,
                      width: '100%',
                    }}
                    testID="book-detail-decision-primary-row">
                    <View style={{ flex: 1, minHeight: 52 }} testID="book-detail-decision-borrow-slot">
                      <PillButton
                        fullWidth
                        href={undefined}
                        icon={primaryBorrowActionIcon}
                        label={primaryBorrowActionLabel}
                        onPress={openBorrowModal}
                        size="hero"
                        surfaceTestID="book-detail-decision-borrow-surface"
                        testID="book-detail-open-borrow-modal"
                        variant="prominent"
                      />
                    </View>
                    <View style={{ flex: 1, minHeight: 52 }} testID="book-detail-decision-favorite-slot">
                      <PillButton
                        fullWidth
                        href={undefined}
                        icon="bookmark"
                        label={favoriteMutation.isPending ? '收藏中…' : isFavorite ? '已收藏' : '加入收藏'}
                        onPress={async () => {
                          try {
                            await favoriteMutation.mutateAsync(book.id);
                          } catch (error) {
                            toast.error(getLibraryErrorMessage(error, '收藏状态更新失败，请稍后重试。'));
                          }
                        }}
                        size="hero"
                        surfaceTestID="book-detail-decision-favorite-surface"
                        variant="glass"
                      />
                    </View>
                  </View>
                  <View style={{ width: '100%' }} testID="book-detail-decision-secondary-row">
                    <PillButton
                      fullWidth
                      href={undefined}
                      icon="plus"
                      label={isBooklistActionPending ? '处理中…' : '加入书单'}
                      onPress={() => setIsBooklistModalVisible(true)}
                      size="hero"
                      surfaceTestID="book-detail-decision-booklist-surface"
                      testID="book-detail-open-booklist-modal"
                      variant="soft"
                    />
                  </View>
                  <View style={{ width: '100%' }} testID="book-detail-decision-tertiary-row">
                    <PillButton
                      fullWidth
                      href={undefined}
                      icon="spark"
                      label={createLearningProfileMutation.isPending ? '创建中…' : '创建学习导师'}
                      onPress={() => {
                        void handleCreateLearning();
                      }}
                      size="hero"
                      surfaceTestID="book-detail-decision-learning-surface"
                      testID="book-detail-create-learning"
                      variant="accent"
                    />
                  </View>
                </View>
              </BookDetailSurface>
            </View>
          </BookDetailSurface>
        ) : null}

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="内容信息" />
          {isDetailLoading ? (
            <BookDetailSectionSkeleton
              lines={['94%', '88%', '72%', '84%', '66%']}
              testID="book-detail-content-skeleton"
            />
          ) : book ? (
            <BookDetailSurface>
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>简介</Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 14,
                    lineHeight: 22,
                  }}>
                  {resolveBookDetailSummary(book.summary)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {book.tags.map((tag) => (
                  <DetailTag key={tag} label={tag} />
                ))}
              </View>
            </BookDetailSurface>
          ) : null}
        </View>

        {!isMinimal ? (
          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="延伸发现" />
            {isDiscoveryLoading ? (
              <BookDetailDiscoverySkeleton />
            ) : hasDiscoveryContent ? (
              <BookDetailSurface>
                {detailQuery.data?.recommendationReason ? (
                  <View style={{ gap: theme.spacing.sm }}>
                    <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>推荐给你</Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.body,
                        fontSize: 14,
                        lineHeight: 21,
                      }}>
                      {detailQuery.data.recommendationReason}
                    </Text>
                  </View>
                ) : null}
                {discoveryGroups.map((group) => (
                  <DiscoveryGroup
                    books={group.books}
                    key={group.title}
                    onPressItem={(targetBookId) => router.push(`/books/${targetBookId}`)}
                    title={group.title}
                  />
                ))}
              </BookDetailSurface>
            ) : (
              <StateMessageCard
                description="后续当借阅线索更完整时，这里会继续补充相关图书。"
                title="延伸发现正在整理"
              />
            )}
          </View>
        ) : null}

        {book ? (
          <Modal
            animationType="fade"
            onRequestClose={closeBooklistModal}
            transparent
            visible={isBooklistModalVisible}>
            <Pressable
              onPress={closeBooklistModal}
              style={{
                backgroundColor: 'rgba(26, 24, 21, 0.48)',
                flex: 1,
                padding: theme.spacing.lg,
              }}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                }}>
                <Pressable>
                  <View
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderSoft,
                      borderRadius: theme.radii.xl,
                      borderWidth: 1,
                      gap: theme.spacing.lg,
                      maxHeight: '82%',
                      padding: theme.spacing.xl,
                    }}
                    testID="book-detail-booklist-modal">
                    <View style={{ gap: theme.spacing.xs }}>
                      <Text
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.heading,
                          fontSize: 22,
                          letterSpacing: -0.4,
                        }}>
                        {isBooklistCreateMode ? '新建书单' : '加入书单'}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          ...theme.typography.body,
                          fontSize: 13,
                          lineHeight: 19,
                        }}>
                        {book.title}
                      </Text>
                    </View>

                    {isBooklistCreateMode ? (
                      <ScrollView
                        contentContainerStyle={{ gap: theme.spacing.md }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}>
                        <View style={{ gap: 8 }}>
                          <Text
                            style={{
                              color: theme.colors.textSoft,
                              ...theme.typography.medium,
                              fontSize: 12,
                            }}>
                            书单名称
                          </Text>
                          <TextInput
                            autoCapitalize="words"
                            onChangeText={setDraftBooklistTitle}
                            placeholder="请输入书单名称"
                            placeholderTextColor="rgba(31, 30, 27, 0.42)"
                            style={{
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.borderStrong,
                              borderRadius: theme.radii.lg,
                              borderWidth: 1,
                              color: theme.colors.text,
                              fontSize: 15,
                              minHeight: 52,
                              paddingHorizontal: 16,
                            }}
                            testID="book-detail-booklist-title-input"
                            value={draftBooklistTitle}
                          />
                        </View>

                        <View style={{ gap: 8 }}>
                          <Text
                            style={{
                              color: theme.colors.textSoft,
                              ...theme.typography.medium,
                              fontSize: 12,
                            }}>
                            书单描述
                          </Text>
                          <TextInput
                            multiline
                            onChangeText={setDraftBooklistDescription}
                            placeholder="请输入书单描述"
                            placeholderTextColor="rgba(31, 30, 27, 0.42)"
                            style={{
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.borderStrong,
                              borderRadius: theme.radii.lg,
                              borderWidth: 1,
                              color: theme.colors.text,
                              fontSize: 15,
                              minHeight: 96,
                              paddingHorizontal: 16,
                              paddingTop: 14,
                              textAlignVertical: 'top',
                            }}
                            testID="book-detail-booklist-description-input"
                            value={draftBooklistDescription}
                          />
                        </View>

                        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
                          <View style={{ flex: 1 }}>
                            <PillButton
                              label="返回"
                              onPress={() => setIsBooklistCreateMode(false)}
                              variant="soft"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <PillButton
                              label={createBooklistMutation.isPending ? '创建中…' : '创建并加入'}
                              onPress={handleCreateBooklist}
                              testID="book-detail-booklist-submit"
                              variant="accent"
                            />
                          </View>
                        </View>
                      </ScrollView>
                    ) : (
                      <ScrollView
                        contentContainerStyle={{ gap: theme.spacing.md }}
                        showsVerticalScrollIndicator={false}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={handleAddToWatchLater}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.92 : 1,
                          })}
                          testID="book-detail-booklist-option-watch-later">
                          <View
                            style={{
                              backgroundColor: theme.colors.primarySoft,
                              borderColor: theme.colors.primaryStrong,
                              borderRadius: theme.radii.lg,
                              borderWidth: 1,
                              gap: 6,
                              padding: theme.spacing.lg,
                            }}>
                            <Text
                              style={{
                                color: theme.colors.primaryStrong,
                                ...theme.typography.semiBold,
                                fontSize: 16,
                              }}>
                              稍后再看
                            </Text>
                            <Text
                              style={{
                                color: theme.colors.textMuted,
                                ...theme.typography.body,
                                fontSize: 13,
                                lineHeight: 19,
                              }}>
                              {watchLaterBooklist?.description?.trim() || '先放进你的默认待读书单。'}
                            </Text>
                          </View>
                        </Pressable>

                        {visibleCustomBooklists.map((item) => (
                          <Pressable
                            accessibilityRole="button"
                            key={item.id}
                            onPress={() => addCurrentBookToExistingBooklist(item.id)}
                            style={({ pressed }) => ({
                              opacity: pressed ? 0.92 : 1,
                            })}
                            testID={`book-detail-booklist-option-${item.id}`}>
                            <View
                              style={{
                                backgroundColor: theme.colors.surface,
                                borderColor: theme.colors.borderStrong,
                                borderRadius: theme.radii.lg,
                                borderWidth: 1,
                                gap: 6,
                                padding: theme.spacing.lg,
                              }}>
                              <Text
                                style={{
                                  color: theme.colors.text,
                                  ...theme.typography.semiBold,
                                  fontSize: 16,
                                }}>
                                {item.title}
                              </Text>
                              <Text
                                style={{
                                  color: theme.colors.textMuted,
                                  ...theme.typography.body,
                                  fontSize: 13,
                                  lineHeight: 19,
                                }}>
                                {item.description?.trim() || `${item.books.length} 本图书`}
                              </Text>
                            </View>
                          </Pressable>
                        ))}

                        <PillButton
                          label="新建书单"
                          onPress={() => setIsBooklistCreateMode(true)}
                          testID="book-detail-booklist-create-trigger"
                          variant="soft"
                        />
                      </ScrollView>
                    )}
                  </View>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>
        ) : null}

        {book ? (
          <Modal
            animationType="fade"
            onRequestClose={closeBorrowModal}
            transparent
            visible={isBorrowModalMounted}>
            <Pressable
              onPress={closeBorrowModal}
              style={{
                backgroundColor: 'rgba(23, 22, 20, 0.22)',
                flex: 1,
                padding: theme.spacing.lg,
              }}
              testID="book-detail-borrow-backdrop">
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{
                  flex: 1,
                  justifyContent: 'center',
                }}>
                <Pressable>
                  <View
                    style={{
                      alignSelf: 'center',
                      backgroundColor: theme.colors.backgroundWorkspace,
                      borderColor: theme.colors.borderSoft,
                      borderRadius: theme.radii.xl,
                      borderWidth: 1,
                      gap: theme.spacing.lg,
                      maxWidth: 560,
                      padding: theme.spacing.xl,
                      paddingBottom: theme.spacing.xl * 1.2,
                      width: '100%',
                    }}
                    testID="book-detail-borrow-modal">
                    <View
                      style={{
                        gap: theme.spacing.lg,
                        paddingBottom: theme.spacing.sm,
                      }}
                    >
                      <View
                        style={{
                          gap: 6,
                        }}>
                        <View style={{ gap: 6 }}>
                          <Text
                            style={{
                              color: theme.colors.text,
                              ...theme.typography.heading,
                              fontSize: 24,
                            }}>
                            选择借阅方式
                          </Text>
                          <Text
                            style={{
                              color: theme.colors.textMuted,
                              ...theme.typography.body,
                              fontSize: 13,
                              lineHeight: 19,
                            }}>
                            {book.title}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                        {BORROW_MODE_OPTIONS.map((item) => {
                          const isActive = borrowMode === item.value;

                          return (
                            <Pressable
                              key={item.value}
                              onPress={() => setBorrowMode(item.value)}
                              style={{
                                backgroundColor: isActive ? theme.colors.primarySoft : theme.colors.surface,
                                borderColor: isActive ? theme.colors.primaryStrong : theme.colors.borderStrong,
                                borderRadius: theme.radii.lg,
                                borderWidth: 1,
                                flex: 1,
                                gap: theme.spacing.sm,
                                padding: theme.spacing.lg,
                              }}
                              testID={`book-detail-borrow-tab-${item.value}`}>
                              <Text
                                style={{
                                  color: isActive ? theme.colors.primaryStrong : theme.colors.text,
                                  ...theme.typography.semiBold,
                                  fontSize: 16,
                                }}>
                                {item.label}
                              </Text>
                              <Text
                                style={{
                                  color: theme.colors.textMuted,
                                  ...theme.typography.body,
                                  fontSize: 12,
                                  lineHeight: 18,
                                }}>
                                {item.description}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <View style={{ gap: 8 }}>
                        <Text style={{ color: theme.colors.textSoft, ...theme.typography.medium, fontSize: 12 }}>
                          {borrowMode === 'robot_delivery' ? '座位号' : '取书地点'}
                        </Text>
                        <TextInput
                          onChangeText={borrowMode === 'robot_delivery' ? setDeliveryTarget : setPickupTarget}
                          placeholder={borrowMode === 'robot_delivery' ? '请输入阅览室座位号' : '例如：主馆 1 楼书柜'}
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.borderStrong,
                            borderRadius: theme.radii.md,
                            borderWidth: 1,
                            color: theme.colors.text,
                            minHeight: 52,
                            paddingHorizontal: 14,
                          }}
                          testID="book-detail-borrow-target-input"
                          value={activeBorrowTarget}
                        />
                      </View>

                      <View
                        style={{
                          backgroundColor: theme.colors.warningSoft,
                          borderRadius: theme.radii.md,
                          padding: theme.spacing.md,
                        }}>
                        <Text style={{ color: theme.colors.warning, ...theme.typography.medium, fontSize: 13 }}>
                          {borrowMode === 'robot_delivery'
                            ? `预计等待时间 · ${etaLabel}`
                            : '取书方式 · 到柜自取'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        alignSelf: 'center',
                        borderTopColor: theme.colors.borderSoft,
                        borderTopWidth: 1,
                        marginTop: theme.spacing.sm,
                        paddingTop: theme.spacing.lg,
                        width: '100%',
                      }}
                      testID="book-detail-borrow-actions">
                      <View
                        style={{
                          alignSelf: 'center',
                          backgroundColor: theme.colors.surfaceMuted,
                          borderColor: theme.colors.borderSoft,
                          borderRadius: theme.radii.lg,
                          borderWidth: 1,
                          flexDirection: 'row',
                          gap: theme.spacing.sm,
                          padding: theme.spacing.sm,
                          width: '100%',
                        }}>
                        <View style={{ flex: 1 }}>
                          <PillButton
                            href={undefined}
                            label="取消"
                            onPress={closeBorrowModal}
                            testID="book-detail-borrow-cancel"
                            variant="glass"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <PillButton
                            href={undefined}
                            label={borrowMutation.isPending ? '借阅中…' : '确认借阅'}
                            onPress={async () => {
                              const normalizedBorrowTarget = activeBorrowTarget.trim();

                              if (borrowMode === 'robot_delivery' && !normalizedBorrowTarget) {
                                toast.error('请先输入座位号。');
                                return;
                              }

                              try {
                                const order = await borrowMutation.mutateAsync({
                                  bookId: book.id,
                                  deliveryTarget: normalizedBorrowTarget,
                                  mode: borrowMode,
                                });
                                closeBorrowModal();
                                router.push(`/orders/${order.id}`);
                              } catch (error) {
                                toast.error(getLibraryErrorMessage(error, '借阅下单失败，请稍后重试。'));
                              }
                            }}
                            testID="book-detail-borrow-confirm"
                            variant="accent"
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </KeyboardAvoidingView>
            </Pressable>
          </Modal>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
