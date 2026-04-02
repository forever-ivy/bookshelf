import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { toast } from 'sonner-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { SearchFilterStrip } from '@/components/search/search-filter-strip';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SearchResultCardSkeleton } from '@/components/search/search-result-skeleton';
import {
  useCatalogCategoriesQuery,
  useCatalogBookSearchPageQuery,
  useExplicitBookSearchQuery,
  useRecommendationSearchQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { BookCard, CatalogCategory } from '@/lib/api/types';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { resolveBookLocationDisplay } from '@/lib/book-location';
import {
  borrowNowSearchFilters,
  isBorrowReadyResult,
  type SearchFilter,
} from '@/lib/search/book-filters';

const CATALOG_PAGE_SIZE = 20;
const RECOMMENDATION_PREVIEW_LIMIT = 5;
const SEARCH_INPUT_DEBOUNCE_MS = 300;

function buildCategoryFilters(categories: CatalogCategory[]) {
  return [
    { key: 'all' as const, label: '全部' },
    ...categories.map((category) => ({
      key: `category:${category.name}` as const,
      label: category.name,
    })),
  ];
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
  onScroll,
  query,
}: {
  borrowNowMode?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  query: string;
}) {
  const normalizedQuery = query.trim();
  const searchQuery = useDebouncedSearchQuery(normalizedQuery, SEARCH_INPUT_DEBOUNCE_MS);
  const categoriesQuery = useCatalogCategoriesQuery();
  const [activeFilter, setActiveFilter] = React.useState<SearchFilter>(borrowNowMode ? 'ready' : 'all');
  const selectedCategory = !borrowNowMode && activeFilter.startsWith('category:')
    ? activeFilter.slice('category:'.length)
    : null;
  const shouldShowDiscoveryRecommendations = !borrowNowMode && searchQuery.length === 0;
  const activeCategoryForResults = shouldShowDiscoveryRecommendations ? null : selectedCategory;
  const shouldUseExplicitSearch = searchQuery.length > 0;
  const shouldUseCatalogPage = borrowNowMode || searchQuery.length === 0;
  const searchModeKey = `${shouldUseExplicitSearch ? 'explicit' : 'catalog'}:${searchQuery}`;
  const querySourceKey = `${searchModeKey}:${activeCategoryForResults ?? '__all__'}`;
  const lastQueryRef = React.useRef(querySourceKey);
  const [offset, setOffset] = React.useState(0);
  const [recommendationLimit, setRecommendationLimit] = React.useState(RECOMMENDATION_PREVIEW_LIMIT);
  const [loadedCatalogState, setLoadedCatalogState] = React.useState<{
    items: BookCard[];
    key: string;
  }>({
    items: [],
    key: querySourceKey,
  });
  const [loadedRecommendationState, setLoadedRecommendationState] = React.useState<{
    items: BookCard[];
    key: string;
  }>({
    items: [],
    key: querySourceKey,
  });
  const effectiveOffset = lastQueryRef.current === querySourceKey ? offset : 0;
  const catalogPageQuery = useCatalogBookSearchPageQuery(searchQuery, {
    category: activeCategoryForResults,
    enabled: shouldUseCatalogPage,
    limit: CATALOG_PAGE_SIZE,
    offset: effectiveOffset,
  });
  const explicitBookSearchQuery = useExplicitBookSearchQuery(searchQuery, {
    category: activeCategoryForResults,
    enabled: shouldUseExplicitSearch,
    limit: CATALOG_PAGE_SIZE,
    offset: effectiveOffset,
  });
  const recommendationSearchQuery = useRecommendationSearchQuery(
    searchQuery,
    !borrowNowMode,
    {
      limit: shouldShowDiscoveryRecommendations ? recommendationLimit : RECOMMENDATION_PREVIEW_LIMIT,
    }
  );
  const { theme } = useAppTheme();
  const activeCatalogQuery = shouldUseExplicitSearch ? explicitBookSearchQuery : catalogPageQuery;
  const [feedbackForm, setFeedbackForm] = React.useState({
    authorOrContext: '',
    note: '',
    title: '',
  });
  const [feedbackModalVisible, setFeedbackModalVisible] = React.useState(false);
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

  const handleFeedbackSubmit = React.useCallback(() => {
    setFeedbackModalVisible(false);
    toast.success('已收到缺书反馈');
  }, []);

  const handleFilterPress = React.useCallback((filter: SearchFilter) => {
    setActiveFilter(filter);
  }, []);

  React.useEffect(() => {
    if (lastQueryRef.current === querySourceKey) {
      return;
    }

    lastQueryRef.current = querySourceKey;
    setOffset(0);
    setRecommendationLimit(RECOMMENDATION_PREVIEW_LIMIT);
  }, [querySourceKey]);

  React.useEffect(() => {
    setActiveFilter(borrowNowMode ? 'ready' : 'all');
  }, [borrowNowMode]);

  const filterChips = React.useMemo(
    () => (borrowNowMode ? borrowNowSearchFilters : buildCategoryFilters(categoriesQuery.data ?? [])),
    [borrowNowMode, categoriesQuery.data]
  );

  React.useEffect(() => {
    if (borrowNowMode || activeFilter === 'all' || activeFilter === 'ready') {
      return;
    }

    if (filterChips.some((filter) => filter.key === activeFilter)) {
      return;
    }

    setActiveFilter('all');
  }, [activeFilter, borrowNowMode, filterChips]);

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
    setLoadedRecommendationState((previous) =>
      previous.key === querySourceKey
        ? previous
        : {
            items: [],
            key: querySourceKey,
          }
    );
  }, [querySourceKey]);

  React.useEffect(() => {
    if (!recommendationSearchQuery.data) {
      return;
    }

    setLoadedRecommendationState((previous) => {
      const nextItems = dedupeBooks(recommendationSearchQuery.data);
      if (previous.key === querySourceKey && haveSameBookIds(previous.items, nextItems)) {
        return previous;
      }

      return {
        items: nextItems,
        key: querySourceKey,
      };
    });
  }, [querySourceKey, recommendationSearchQuery.data]);

  const catalogCards = React.useMemo(
    () => (loadedCatalogState.key === querySourceKey ? loadedCatalogState.items : []),
    [loadedCatalogState, querySourceKey]
  );
  const recommendationCards = React.useMemo(
    () => (borrowNowMode ? [] : loadedRecommendationState.key === querySourceKey ? loadedRecommendationState.items : []),
    [borrowNowMode, loadedRecommendationState, querySourceKey]
  );
  const hasDiscoveryRecommendationResponse =
    recommendationSearchQuery.data !== undefined || recommendationCards.length > 0;
  const isWaitingForDiscoveryRecommendations =
    shouldShowDiscoveryRecommendations &&
    !hasDiscoveryRecommendationResponse &&
    Boolean(recommendationSearchQuery.isFetching);
  const isWaitingForDiscoveryCatalogFallback =
    shouldShowDiscoveryRecommendations &&
    hasDiscoveryRecommendationResponse &&
    recommendationCards.length === 0 &&
    catalogCards.length === 0 &&
    Boolean(activeCatalogQuery.isFetching);
  const isLoadingMoreDiscoveryRecommendations =
    shouldShowDiscoveryRecommendations &&
    recommendationCards.length > 0 &&
    recommendationLimit > recommendationCards.length &&
    Boolean(recommendationSearchQuery.isFetching);
  const isLoadingMoreCatalogResults =
    !shouldShowDiscoveryRecommendations &&
    catalogCards.length > 0 &&
    effectiveOffset > 0 &&
    Boolean(activeCatalogQuery.isFetching);
  const primaryCatalogCards = React.useMemo(
    () => (borrowNowMode ? catalogCards.filter(isBorrowReadyResult) : catalogCards),
    [borrowNowMode, catalogCards]
  );
  const visibleResultCards = React.useMemo(() => {
    if (shouldShowDiscoveryRecommendations) {
      if (!hasDiscoveryRecommendationResponse) {
        return [];
      }

      return recommendationCards.length ? recommendationCards : catalogCards;
    }

    const baseCards = primaryCatalogCards.length ? primaryCatalogCards : recommendationCards;
    return baseCards;
  }, [
    borrowNowMode,
    catalogCards,
    hasDiscoveryRecommendationResponse,
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
  const canLoadMore =
    shouldShowDiscoveryRecommendations && hasDiscoveryRecommendationResponse && recommendationCards.length > 0
      ? recommendationCards.length >= recommendationLimit && !recommendationError
      : Boolean(activeCatalogQuery.data?.hasMore) && !catalogError;
  const isLoadingMoreResults =
    isLoadingMoreDiscoveryRecommendations || isLoadingMoreCatalogResults;
  const showLoadMoreControl = canLoadMore || isLoadingMoreResults;
  const shouldShowResultSkeleton =
    visibleResultCards.length === 0 &&
    !showGlobalError &&
    !showCatalogUnavailableNotice &&
    !showEmptyState &&
    (isWaitingForDiscoveryRecommendations ||
      isWaitingForDiscoveryCatalogFallback ||
      (!shouldShowDiscoveryRecommendations &&
        (Boolean(activeCatalogQuery.isFetching) || Boolean(recommendationSearchQuery.isFetching))));
  const emptyTitle = borrowNowMode ? '当前没有可立即借走的图书' : '这次没找到完全匹配的图书';
  const emptyDescription = borrowNowMode
    ? '可以换个关键词，或者稍后再看新的可借可送图书。'
    : '试试换一个课程名、作者名，或者用更自然的描述继续搜。';
  const resultSectionTitle = borrowNowMode
    ? '可直接借阅'
      : shouldShowDiscoveryRecommendations
        ? '为你推荐'
        : '馆藏结果';
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
          location={resolveBookLocationDisplay(item.cabinetLabel)}
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
      <PageShell insetBottom={shellInsetBottom} mode="task" onScroll={onScroll}>
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
            <SearchFilterStrip
              activeFilter={activeFilter}
              filters={filterChips}
              onPress={handleFilterPress}
              primaryFilterKey={borrowNowMode ? 'ready' : undefined}
            />
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
            {showLoadMoreControl ? (
              <View
                style={{
                  borderTopColor: theme.colors.borderSoft,
                  borderTopWidth: visibleResultCards.length > 0 ? 1 : 0,
                  padding: theme.spacing.lg,
                }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: isLoadingMoreResults, disabled: isLoadingMoreResults }}
                  disabled={isLoadingMoreResults}
                  onPress={() => {
                    if (shouldShowDiscoveryRecommendations && recommendationCards.length > 0) {
                      setRecommendationLimit((current) => current + RECOMMENDATION_PREVIEW_LIMIT);
                      return;
                    }

                    setOffset((current) => current + CATALOG_PAGE_SIZE);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed && !isLoadingMoreResults ? 0.92 : 1,
                  })}
                  testID="search-load-more-button">
                  <View
                    style={{
                      alignItems: 'center',
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.borderStrong,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      justifyContent: 'center',
                      minHeight: 42,
                      paddingHorizontal: 14,
                    }}>
                    {isLoadingMoreResults ? (
                      <ActivityIndicator
                        color={theme.colors.primaryStrong}
                        size="small"
                        testID="search-load-more-spinner"
                      />
                    ) : (
                      <Text
                        style={{
                          color: theme.colors.text,
                          ...theme.typography.semiBold,
                          fontSize: 14,
                        }}>
                        加载更多结果
                      </Text>
                    )}
                  </View>
                </Pressable>
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
