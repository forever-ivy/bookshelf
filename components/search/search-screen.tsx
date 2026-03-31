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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SearchResultCardSkeleton } from '@/components/search/search-result-skeleton';
import {
  useCatalogBookSearchPageQuery,
  useExplicitBookSearchQuery,
  useRecommendationSearchQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { BookCard } from '@/lib/api/types';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';

const CATALOG_PAGE_SIZE = 20;
const RECOMMENDATION_PREVIEW_LIMIT = 5;
const SEARCH_INPUT_DEBOUNCE_MS = 300;
type SearchFilter = 'all' | 'delivery' | 'ready' | 'stocked' | 'wanted';

function isImmediatelyBorrowableResult(item: {
  availabilityLabel?: string | null;
  stockStatus?: string | null;
}) {
  return item.stockStatus === 'available' || Boolean(item.availabilityLabel?.includes('可立即借阅'));
}

function supportsDeliveryResult(item: {
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
}) {
  return item.deliveryAvailable === true || Boolean(item.etaLabel?.includes('分钟可送达'));
}

function isBorrowReadyResult(item: {
  availabilityLabel?: string | null;
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
  stockStatus?: string | null;
}) {
  return isImmediatelyBorrowableResult(item) && supportsDeliveryResult(item);
}

function hasWantedSignal(item: { matchedFields?: string[] | null; recommendationReason?: string | null }) {
  return Boolean(item.recommendationReason?.trim()) || Boolean(item.matchedFields?.length);
}

function hasResolvedLocation(item: { cabinetLabel?: string | null }) {
  return Boolean(item.cabinetLabel && item.cabinetLabel !== '位置待确认' && item.cabinetLabel !== '馆藏位置待确认');
}

function hasHealthyStock(item: { availabilityLabel?: string | null; stockStatus?: string | null }) {
  return item.stockStatus === 'available' || Boolean(item.availabilityLabel?.includes('馆藏充足'));
}

function matchesSearchFilter(item: BookCard, filter: SearchFilter) {
  switch (filter) {
    case 'ready':
      return isImmediatelyBorrowableResult(item);
    case 'delivery':
      return supportsDeliveryResult(item);
    case 'stocked':
      return hasHealthyStock(item);
    case 'wanted':
      return hasWantedSignal(item);
    default:
      return true;
  }
}

export function resolveSearchText(value: unknown) {
  if (value && typeof value === 'object' && 'nativeEvent' in value) {
    const nativeText = (value as { nativeEvent?: { text?: string } }).nativeEvent?.text;
    return typeof nativeText === 'string' ? nativeText : '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'text' in value) {
    const directText = (value as { text?: string }).text;
    return typeof directText === 'string' ? directText : '';
  }

  return '';
}

export function SearchScreen({
  borrowNowMode = false,
  query,
}: {
  borrowNowMode?: boolean;
  query: string;
}) {
  const normalizedQuery = query.trim();
  const searchQuery = useDebouncedSearchQuery(normalizedQuery, SEARCH_INPUT_DEBOUNCE_MS);
  const shouldShowDiscoveryRecommendations = !borrowNowMode && searchQuery.length === 0;
  const shouldUseExplicitSearch = searchQuery.length > 0;
  const shouldUseCatalogPage = borrowNowMode || searchQuery.length === 0;
  const querySourceKey = `${shouldUseExplicitSearch ? 'explicit' : 'catalog'}:${searchQuery}`;
  const lastQueryRef = React.useRef(querySourceKey);
  const [offset, setOffset] = React.useState(0);
  const [loadedCatalogState, setLoadedCatalogState] = React.useState<{
    items: BookCard[];
    key: string;
  }>({
    items: [],
    key: querySourceKey,
  });
  const [activeFilter, setActiveFilter] = React.useState<SearchFilter>(borrowNowMode ? 'ready' : 'all');
  const effectiveOffset = lastQueryRef.current === querySourceKey ? offset : 0;
  const catalogPageQuery = useCatalogBookSearchPageQuery(searchQuery, {
    enabled: shouldUseCatalogPage,
    limit: CATALOG_PAGE_SIZE,
    offset: effectiveOffset,
  });
  const explicitBookSearchQuery = useExplicitBookSearchQuery(searchQuery, {
    enabled: shouldUseExplicitSearch,
    limit: CATALOG_PAGE_SIZE,
    offset: effectiveOffset,
  });
  const recommendationSearchQuery = useRecommendationSearchQuery(
    searchQuery,
    !borrowNowMode
  );
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const activeCatalogQuery = shouldUseExplicitSearch ? explicitBookSearchQuery : catalogPageQuery;
  const [feedbackForm, setFeedbackForm] = React.useState({
    authorOrContext: '',
    note: '',
    title: '',
  });
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
  const [feedbackToastMessage, setFeedbackToastMessage] = React.useState<string | null>(null);
  const feedbackToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldShowFeedbackPrompt = !borrowNowMode && searchQuery.length > 0;

  const openFeedbackModal = React.useCallback(() => {
    setFeedbackForm({
      authorOrContext: '',
      note: '',
      title: searchQuery,
    });
    setFeedbackModalVisible(true);
  }, [searchQuery]);

  const closeFeedbackModal = React.useCallback(() => {
    setFeedbackModalVisible(false);
  }, []);

  const showFeedbackToast = React.useCallback((message: string) => {
    if (feedbackToastTimerRef.current) {
      clearTimeout(feedbackToastTimerRef.current);
    }

    setFeedbackToastMessage(message);
    feedbackToastTimerRef.current = setTimeout(() => {
      setFeedbackToastMessage(null);
      feedbackToastTimerRef.current = null;
    }, 2200);
  }, []);

  const handleFeedbackSubmit = React.useCallback(() => {
    setFeedbackModalVisible(false);
    showFeedbackToast('已收到缺书反馈');
  }, [showFeedbackToast]);

  React.useEffect(() => {
    if (lastQueryRef.current !== querySourceKey) {
      lastQueryRef.current = querySourceKey;
      setOffset(0);
      setActiveFilter(borrowNowMode ? 'ready' : 'all');
    }
  }, [borrowNowMode, querySourceKey]);

  React.useEffect(() => {
    if (!activeCatalogQuery.data) {
      return;
    }

    setLoadedCatalogState((previous) => {
      const baseItems = previous.key === querySourceKey && effectiveOffset > 0 ? previous.items : [];
      const nextItems = dedupeBooks([...baseItems, ...activeCatalogQuery.data.items]);
      if (previous.key === querySourceKey && haveSameBookIds(previous.items, nextItems)) {
        return previous;
      }

      return {
        items: nextItems,
        key: querySourceKey,
      };
    });
  }, [activeCatalogQuery.data, effectiveOffset, querySourceKey]);

  React.useEffect(() => {
    return () => {
      if (feedbackToastTimerRef.current) {
        clearTimeout(feedbackToastTimerRef.current);
      }
    };
  }, []);

  const filterPalettes = [
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
  ] as const;
  const catalogCards = React.useMemo(
    () => (loadedCatalogState.key === querySourceKey ? loadedCatalogState.items : []),
    [loadedCatalogState, querySourceKey]
  );
  const recommendationCards = React.useMemo(
    () =>
      borrowNowMode
        ? []
        : dedupeBooks(recommendationSearchQuery.data ?? []).slice(0, RECOMMENDATION_PREVIEW_LIMIT),
    [borrowNowMode, recommendationSearchQuery.data]
  );
  const primaryCatalogCards = React.useMemo(
    () => (borrowNowMode ? catalogCards.filter(isBorrowReadyResult) : catalogCards),
    [borrowNowMode, catalogCards]
  );
  const visibleResultCards = React.useMemo(() => {
    if (shouldShowDiscoveryRecommendations) {
      return recommendationCards.length ? recommendationCards : catalogCards;
    }

    const baseCards = primaryCatalogCards.length ? primaryCatalogCards : recommendationCards;

    if (borrowNowMode) {
      return baseCards;
    }

    return baseCards.filter((item) => matchesSearchFilter(item, activeFilter));
  }, [
    activeFilter,
    borrowNowMode,
    catalogCards,
    primaryCatalogCards,
    recommendationCards,
    shouldShowDiscoveryRecommendations,
  ]);
  const catalogError = activeCatalogQuery.error;
  const recommendationError = borrowNowMode ? null : recommendationSearchQuery.error;
  const hasAnyResults = visibleResultCards.length > 0;
  const showGlobalError = borrowNowMode
    ? Boolean(catalogError) && visibleResultCards.length === 0
    : Boolean(catalogError) && Boolean(recommendationError) && !hasAnyResults;
  const showCatalogUnavailableNotice = Boolean(catalogError) && !showGlobalError;
  const showEmptyState =
    (borrowNowMode || searchQuery.length > 0) &&
    !showGlobalError &&
    !catalogError &&
    !activeCatalogQuery.isFetching &&
    !recommendationSearchQuery.isFetching &&
    visibleResultCards.length === 0;
  const canLoadMore = Boolean(activeCatalogQuery.data?.hasMore) && !catalogError;
  const shouldShowResultSkeleton =
    visibleResultCards.length === 0 &&
    !showGlobalError &&
    !showCatalogUnavailableNotice &&
    !showEmptyState &&
    (Boolean(activeCatalogQuery.isFetching) || Boolean(recommendationSearchQuery.isFetching));
  const searchTitle = borrowNowMode ? '立即可借' : '找书';
  const emptyTitle = borrowNowMode ? '当前没有可立即借走的图书' : '这次没找到完全匹配的图书';
  const emptyDescription = borrowNowMode
    ? '可以换个关键词，或者稍后再看新的可借可送图书。'
    : '试试换一个课程名、作者名，或者用更自然的描述继续搜。';
  const resultSectionTitle = borrowNowMode
    ? '可直接借阅'
      : shouldShowDiscoveryRecommendations
        ? '为你推荐'
        : '馆藏结果';
  const filterChips = borrowNowMode
    ? [{ key: 'ready' as const, label: '只看可借可送' }]
    : [
        { key: 'all' as const, label: '全部结果' },
        { key: 'delivery' as const, label: '支持配送' },
        { key: 'wanted' as const, label: '猜你想要' },
        { key: 'stocked' as const, label: '馆藏充足' },
      ];
  const shellInsetBottom = 112;
  const catalogFallbackMessage = getLibraryErrorMessage(
    catalogError,
    '馆藏检索暂时不可用，请稍后再试。'
  );
  const renderResultCards = React.useCallback(
    (items: BookCard[], actionLabel: string) =>
      items.map((item, index) => (
        <SearchResultCard
          key={item.id}
          actionLabel={actionLabel}
          availability={item.availabilityLabel}
          author={item.author}
          coverTone={item.coverTone}
          eta={item.etaLabel}
          href={`/books/${item.id}`}
          listPosition={
            items.length === 1
              ? 'single'
              : index === 0
                ? 'first'
                : index === items.length - 1
                  ? 'last'
                  : 'middle'
          }
          location={hasResolvedLocation(item) ? item.cabinetLabel : '馆藏位置待确认'}
          reason={item.recommendationReason}
          summary={item.summary}
          title={item.title}
          variant="list"
        />
      )),
    []
  );
  const renderResultSkeletons = React.useCallback(
    (count: number) =>
      Array.from({ length: count }, (_, index) => (
        <SearchResultCardSkeleton
          key={`search-result-skeleton-${index}`}
          listPosition={count === 1 ? 'single' : index === 0 ? 'first' : index === count - 1 ? 'last' : 'middle'}
          testID={`search-result-skeleton-${index + 1}`}
          variant="list"
        />
      )),
    []
  );

  return (
    <View style={{ flex: 1 }}>
      <PageShell
        headerTitle={searchTitle}
        hideHeaderTitleWhenKeyboardVisible={!borrowNowMode}
        insetBottom={shellInsetBottom}
        mode="task"
        showBackButton={false}>
        {borrowNowMode ? (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.successSoft,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.md,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}>
            <Text
              style={{
                color: theme.colors.success,
                ...theme.typography.medium,
                fontSize: 13,
              }}>
              只看可借可送
            </Text>
          </View>
        ) : null}

          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="筛选" />
            <ScrollView
              contentContainerStyle={{
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingRight: theme.spacing.xs,
              }}
              directionalLockEnabled
              horizontal
              nestedScrollEnabled
              overScrollMode="never"
              showsHorizontalScrollIndicator={false}
              testID="search-filter-strip">
              {filterChips.map((filter, index) => {
                const palette = filterPalettes[index % filterPalettes.length];
                const isPrimaryChip = borrowNowMode && index === 0;
                const isActive = activeFilter === filter.key;

                return (
                  <Pressable
                    key={filter.label}
                    accessibilityRole="button"
                    onPress={() => setActiveFilter(filter.key)}
                    style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
                    testID={`search-filter-chip-${filter.key}`}>
                    <View
                      style={{
                        backgroundColor: isActive ? theme.colors.primarySoft : 'transparent',
                        borderRadius: theme.radii.md + 2,
                        padding: isActive ? 2 : 0,
                      }}
                      testID={`search-filter-chip-${filter.key}-shell`}>
                      <View
                        style={{
                          backgroundColor:
                            isPrimaryChip || isActive ? theme.colors.successSoft : palette.backgroundColor,
                          borderColor: isActive ? theme.colors.primaryStrong : theme.colors.borderStrong,
                          borderRadius: theme.radii.md,
                          borderWidth: isActive ? 1.5 : 1,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                        }}
                        testID={`search-filter-chip-${filter.key}-surface`}>
                        <Text
                          style={{
                            color: theme.colors.textMuted,
                            ...theme.typography.medium,
                            fontSize: 13,
                          }}
                          testID={`search-filter-chip-${filter.key}-label`}>
                          {filter.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title={resultSectionTitle} />
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.xl,
              borderWidth: 1,
              overflow: 'hidden',
            }}
            testID="search-results-list">
            {showGlobalError ? (
              <StateMessageCard
                description={getLibraryErrorMessage(
                  catalogError ?? recommendationError,
                  '搜索服务暂时不可用，请确认 recommendation 和 catalog 接口可访问。'
                )}
                title="找书联调失败"
                tone="danger"
              />
            ) : null}
            {showCatalogUnavailableNotice ? (
              <StateMessageCard
                description={catalogFallbackMessage}
                title="馆藏检索暂不可用"
                tone="info"
              />
            ) : null}
            {shouldShowResultSkeleton
              ? renderResultSkeletons(3)
              : renderResultCards(visibleResultCards, borrowNowMode ? '立即借这本' : '查看馆藏与借阅')}
            {canLoadMore ? (
              <View
                style={{
                  borderTopColor: theme.colors.borderSoft,
                  borderTopWidth: visibleResultCards.length > 0 ? 1 : 0,
                  padding: theme.spacing.lg,
                }}>
                <PillButton label="加载更多结果" onPress={() => setOffset((current) => current + CATALOG_PAGE_SIZE)} />
              </View>
            ) : null}
            {showEmptyState ? (
              <StateMessageCard description={emptyDescription} title={emptyTitle} />
            ) : null}
          </View>
        </View>

        {shouldShowFeedbackPrompt ? (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderSoft,
              borderRadius: theme.radii.xl,
              borderWidth: 1,
              gap: theme.spacing.lg,
              padding: theme.spacing.xl,
            }}>
            <View style={{ gap: theme.spacing.xs }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.heading,
                  fontSize: 22,
                  letterSpacing: -0.4,
                }}>
                没看到想找的书？
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 21,
                }}>
                告诉我们书名、作者或课程名，我们会优先留意。
              </Text>
            </View>
            <EditorialIllustration
              height={178}
              source={appArtwork.notionNoResults}
              testID="search-fallback-artwork"
            />
            <PillButton
              label="提交反馈"
              onPress={openFeedbackModal}
              testID="search-feedback-trigger"
              variant="accent"
            />
          </View>
        ) : null}
      </PageShell>

      <Modal
        animationType="fade"
        onRequestClose={closeFeedbackModal}
        transparent
        visible={feedbackModalVisible}>
        <Pressable
          onPress={closeFeedbackModal}
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
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.xl,
                borderWidth: 1,
                boxShadow: '0 18px 44px rgba(0, 0, 0, 0.24)',
                gap: theme.spacing.lg,
                padding: theme.spacing.xl,
              }}
              testID="missing-book-feedback-modal">
              <View style={{ gap: theme.spacing.xs }}>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.heading,
                    fontSize: 22,
                    letterSpacing: -0.4,
                  }}>
                  提交缺书反馈
                </Text>
                <Text
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 14,
                    lineHeight: 21,
                  }}>
                  告诉我们你在找什么，我们会优先留意。
                </Text>
              </View>

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
                    书名或关键词
                  </Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) =>
                      setFeedbackForm((previous) => ({
                        ...previous,
                        title: value,
                      }))
                    }
                    placeholder="请输入书名或关键词"
                    placeholderTextColor="rgba(31, 30, 27, 0.42)"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.56)',
                      borderColor: 'rgba(31, 30, 27, 0.10)',
                      borderRadius: 24,
                      borderWidth: 1,
                      color: theme.colors.text,
                      fontSize: 15,
                      minHeight: 54,
                      paddingHorizontal: 18,
                    }}
                    testID="missing-book-title-input"
                    value={feedbackForm.title}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    作者、课程名或备注
                  </Text>
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={(value) =>
                      setFeedbackForm((previous) => ({
                        ...previous,
                        authorOrContext: value,
                      }))
                    }
                    placeholder="请输入作者、课程名或备注"
                    placeholderTextColor="rgba(31, 30, 27, 0.42)"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.56)',
                      borderColor: 'rgba(31, 30, 27, 0.10)',
                      borderRadius: 24,
                      borderWidth: 1,
                      color: theme.colors.text,
                      fontSize: 15,
                      minHeight: 54,
                      paddingHorizontal: 18,
                    }}
                    testID="missing-book-author-input"
                    value={feedbackForm.authorOrContext}
                  />
                </View>

                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                    }}>
                    补充说明
                  </Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setFeedbackForm((previous) => ({
                        ...previous,
                        note: value,
                      }))
                    }
                    placeholder="请输入补充说明（可选）"
                    placeholderTextColor="rgba(31, 30, 27, 0.42)"
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.56)',
                      borderColor: 'rgba(31, 30, 27, 0.10)',
                      borderRadius: 24,
                      borderWidth: 1,
                      color: theme.colors.text,
                      fontSize: 15,
                      minHeight: 96,
                      paddingHorizontal: 18,
                      paddingTop: 16,
                      textAlignVertical: 'top',
                    }}
                    testID="missing-book-note-input"
                    value={feedbackForm.note}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: theme.spacing.sm, paddingTop: theme.spacing.xs }}>
                  <View style={{ flex: 1 }}>
                    <PillButton
                      label="取消"
                      onPress={closeFeedbackModal}
                      testID="missing-book-cancel"
                      variant="soft"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <PillButton
                      label="提交"
                      onPress={handleFeedbackSubmit}
                      testID="missing-book-submit"
                      variant="accent"
                    />
                  </View>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {feedbackToastMessage ? (
        <View
          pointerEvents="none"
          style={{
            bottom: insets.bottom + theme.spacing.lg,
            left: theme.spacing.lg,
            position: 'absolute',
            right: theme.spacing.lg,
          }}>
          <View
            style={{
              alignItems: 'center',
              alignSelf: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.xl,
              borderWidth: 1,
              boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            }}
            testID="missing-book-feedback-toast">
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.medium,
                fontSize: 13,
              }}>
              {feedbackToastMessage}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function dedupeBooks(items: BookCard[]) {
  const seen = new Set<number>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function haveSameBookIds(left: BookCard[], right: BookCard[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => item.id === right[index]?.id);
}

function useDebouncedSearchQuery(query: string, delayMs: number) {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    if (debouncedQuery === query) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setDebouncedQuery(query);
    }, delayMs);

    return () => clearTimeout(timeoutId);
  }, [debouncedQuery, delayMs, query]);

  return debouncedQuery;
}
