import { Stack } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { SearchResultCard } from '@/components/search/search-result-card';
import { useBookSearchQuery, useRecommendationSearchQuery } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { searchCollections, searchFilters } from '@/lib/app/mock-data';

function isBorrowReadyResult(item: {
  availabilityLabel?: string | null;
  deliveryAvailable?: boolean | null;
  etaLabel?: string | null;
  stockStatus?: string | null;
}) {
  const isAvailable =
    item.stockStatus === 'available' || Boolean(item.availabilityLabel?.includes('可立即借阅'));
  const supportsDelivery =
    item.deliveryAvailable === true || Boolean(item.etaLabel?.includes('分钟可送达'));

  return isAvailable && supportsDelivery;
}

function resolveSearchText(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && typeof value === 'object' && 'nativeEvent' in value) {
    const nativeText = (value as { nativeEvent?: { text?: string } }).nativeEvent?.text;
    return typeof nativeText === 'string' ? nativeText : '';
  }

  return '';
}

export function SearchScreen({ borrowNowMode = false }: { borrowNowMode?: boolean }) {
  const [query, setQuery] = React.useState(borrowNowMode ? '' : '机器学习');
  const bookSearchQuery = useBookSearchQuery(query);
  const recommendationSearchQuery = useRecommendationSearchQuery(
    query,
    !borrowNowMode || query.trim().length > 0
  );
  const { theme } = useAppTheme();
  const searchError = bookSearchQuery.error ?? recommendationSearchQuery.error;

  React.useEffect(() => {
    setQuery(borrowNowMode ? '' : '机器学习');
  }, [borrowNowMode]);

  const filterPalettes = [
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
  ] as const;
  const collectionPalettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
  ] as const;

  const resultCards = React.useMemo(() => {
    const merged = [...(bookSearchQuery.data ?? []), ...(recommendationSearchQuery.data ?? [])];
    const seen = new Set<number>();

    return merged.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }, [bookSearchQuery.data, recommendationSearchQuery.data]);

  const displayCards = React.useMemo(
    () => (borrowNowMode ? resultCards.filter(isBorrowReadyResult) : resultCards),
    [borrowNowMode, resultCards]
  );

  const resultInsights = displayCards.length
    ? [
        {
          detail: `${displayCards.filter((item) => item.stockStatus === 'available').length} 本可立即借阅`,
          title: borrowNowMode ? '立即可借' : '结果排序',
          tone: borrowNowMode ? theme.colors.success : theme.colors.primaryStrong,
        },
        {
          detail: `${displayCards.filter((item) => item.recommendationReason).length} 条带推荐解释`,
          title: '推荐解释',
          tone: theme.colors.knowledgeStrong,
        },
        {
          detail: `${displayCards.filter(isBorrowReadyResult).length} 本支持配送`,
          title: borrowNowMode ? '可送到位' : '履约信息',
          tone: theme.colors.warning,
        },
      ]
    : searchCollections.map((item, index) => ({
        detail: item.detail,
        title: item.title,
        tone: collectionPalettes[index % collectionPalettes.length].color,
      }));
  const showEmptyState =
    (borrowNowMode || query.trim().length > 0) &&
    !searchError &&
    !bookSearchQuery.isFetching &&
    !recommendationSearchQuery.isFetching &&
    displayCards.length === 0;
  const searchTitle = borrowNowMode ? '立即可借' : '找书';
  const searchPlaceholder = borrowNowMode ? '搜索想立刻借走的书' : '搜索书名、作者、课程或自然语言';
  const emptyTitle = borrowNowMode ? '当前没有可立即借走的图书' : '这次没找到完全匹配的图书';
  const emptyDescription = borrowNowMode
    ? '可以换个关键词，或者稍后再看新的可借可送图书。'
    : '试试换一个课程名、作者名，或者用更自然的描述继续搜。';
  const resultSectionTitle = borrowNowMode ? '可直接开始借阅' : '搜索结果';
  const filterChips = borrowNowMode ? ['只看可借可送', '支持配送', '解释推荐'] : searchFilters;
  const shellInsetBottom = 112;

  return (
    <>
      <Stack.SearchBar
        hideWhenScrolling={false}
        onChangeText={(value) => setQuery(resolveSearchText(value))}
        placement="automatic"
        placeholder={searchPlaceholder}
      />
      <View style={{ flex: 1 }}>
        <PageShell
          headerTitle={searchTitle}
          hideHeaderTitleWhenKeyboardVisible={!borrowNowMode}
          insetBottom={shellInsetBottom}
          mode="task"
          showBackButton={borrowNowMode}>
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
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {filterChips.map((filter, index) => {
                const palette = filterPalettes[index % filterPalettes.length];
                const isPrimaryChip = borrowNowMode && index === 0;

                return (
                  <View
                    key={filter}
                    style={{
                      backgroundColor: isPrimaryChip ? theme.colors.successSoft : palette.backgroundColor,
                      borderColor: theme.colors.borderStrong,
                      borderRadius: theme.radii.md,
                      borderWidth: 1,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                    }}>
                    <Text
                      style={{
                        color: isPrimaryChip ? theme.colors.success : palette.color,
                        ...theme.typography.medium,
                        fontSize: 13,
                      }}>
                      {filter}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {resultInsights.map((item, index) => {
              const palette = collectionPalettes[index % collectionPalettes.length];

              return (
                <View
                  key={item.title}
                  style={{
                    backgroundColor: palette.backgroundColor,
                    borderColor: theme.colors.borderStrong,
                    borderRadius: theme.radii.lg,
                    borderWidth: 1,
                    flex: 1,
                    gap: 6,
                    padding: theme.spacing.md,
                  }}>
                  <Text
                    style={{
                      color: item.tone ?? palette.color,
                      ...theme.typography.semiBold,
                      fontSize: 14,
                    }}>
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 12,
                      lineHeight: 16,
                    }}>
                    {item.detail}
                  </Text>
                </View>
              );
            })}
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
              {searchError ? (
                <StateMessageCard
                  description={getLibraryErrorMessage(
                    searchError,
                    '搜索服务暂时不可用，请确认 recommendation 和 catalog 接口可访问。'
                  )}
                  title="找书联调失败"
                  tone="danger"
                />
              ) : null}
              {displayCards.map((item, index) => (
                <SearchResultCard
                  key={item.id}
                  actionLabel={borrowNowMode ? '立即借这本' : '查看详情并借阅'}
                  availability={item.availabilityLabel}
                  author={item.author}
                  coverTone={item.coverTone}
                  eta={item.etaLabel}
                  href={`/books/${item.id}`}
                  listPosition={
                    displayCards.length === 1
                      ? 'single'
                      : index === 0
                        ? 'first'
                        : index === displayCards.length - 1
                          ? 'last'
                          : 'middle'
                  }
                  location={item.cabinetLabel}
                  reason={item.recommendationReason}
                  summary={item.summary}
                  title={item.title}
                  variant="list"
                />
              ))}
              {showEmptyState ? (
                <StateMessageCard description={emptyDescription} title={emptyTitle} />
              ) : null}
            </View>
          </View>

          <View style={{ gap: theme.spacing.lg }}>
            <SectionTitle title="没看到想找的书？" />
            <EditorialIllustration
              height={178}
              source={appArtwork.notionNoResults}
              testID="search-fallback-artwork"
            />
          </View>
        </PageShell>
      </View>
    </>
  );
}
