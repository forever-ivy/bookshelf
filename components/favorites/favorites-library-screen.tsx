import React from 'react';
import { View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { SearchFilterStrip } from '@/components/search/search-filter-strip';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SearchResultCardSkeleton } from '@/components/search/search-result-skeleton';
import { useCatalogCategoriesQuery, useFavoritesQuery } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { resolveBookLocationDisplay } from '@/lib/book-location';
import type { CatalogCategory } from '@/lib/api/types';

type FavoritesFilterKey = 'all' | `category:${string}`;
type FavoriteBook = NonNullable<ReturnType<typeof useFavoritesQuery>['data']>[number]['book'];

function resolveFavoriteReason(item: FavoriteBook) {
  const summary = item.summary?.trim();
  if (summary && summary.toLowerCase() !== 'nan') {
    return summary;
  }

  return item.author;
}

function buildFavoritesFilters(categories: CatalogCategory[]) {
  const categoryFilters = categories.map((category) => ({
    key: `category:${category.name}` as const,
    label: category.name,
  }));

  return [
    { key: 'all' as const, label: '全部' },
    ...categoryFilters,
  ];
}

export function FavoritesLibraryScreen({
  pageTitle,
  query,
}: {
  pageTitle?: string;
  query: string;
}) {
  const { theme } = useAppTheme();
  const [activeFilter, setActiveFilter] = React.useState<FavoritesFilterKey>('all');
  const normalizedQuery = query.trim();
  const categoriesQuery = useCatalogCategoriesQuery();
  const selectedCategory = activeFilter.startsWith('category:')
    ? activeFilter.slice('category:'.length)
    : null;
  const favoritesQuery = useFavoritesQuery({
    category: selectedCategory,
    query,
  });
  const showSkeleton = !favoritesQuery.data && Boolean(favoritesQuery.isFetching);
  const allFavorites = favoritesQuery.data ?? [];
  const filters = React.useMemo(() => buildFavoritesFilters(categoriesQuery.data ?? []), [categoriesQuery.data]);
  const showFavoritesEmptyState =
    !showSkeleton && !favoritesQuery.isError && allFavorites.length === 0 && !normalizedQuery && !selectedCategory;
  const showFavoritesFilterEmptyState =
    !showSkeleton &&
    !favoritesQuery.isError &&
    allFavorites.length === 0 &&
    (Boolean(normalizedQuery) || Boolean(selectedCategory));

  React.useEffect(() => {
    if (activeFilter === 'all') {
      return;
    }

    if (filters.some((filter) => filter.key === activeFilter)) {
      return;
    }

    setActiveFilter('all');
  }, [activeFilter, filters]);

  return (
    <PageShell insetBottom={112} mode="task" pageTitle={pageTitle}>
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="筛选" />
        <SearchFilterStrip
          activeFilter={activeFilter}
          filters={filters}
          onPress={setActiveFilter}
        />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="收藏图书" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            overflow: 'hidden',
          }}
          testID="favorites-results-list">
          {favoritesQuery.isError ? (
            <StateMessageCard
              description={getLibraryErrorMessage(
                favoritesQuery.error,
                '收藏图书暂时不可用，请稍后重试。'
              )}
              title="收藏加载失败"
              tone="danger"
            />
          ) : null}

          {showSkeleton
            ? Array.from({ length: 3 }, (_, index) => (
                <SearchResultCardSkeleton
                  key={`favorites-result-skeleton-${index}`}
                  listPosition={index === 0 ? 'first' : index === 2 ? 'last' : 'middle'}
                  testID={`favorites-result-skeleton-${index + 1}`}
                  variant="list"
                />
              ))
            : allFavorites.map((item, index) => (
                <SearchResultCard
                  key={item.id}
                  availability={item.book.availabilityLabel}
                  author={item.book.author}
                  coverTone={item.book.coverTone}
                  eta={item.book.etaLabel}
                  href={`/books/${item.book.id}`}
                  listPosition={
                    allFavorites.length === 1
                      ? 'single'
                      : index === 0
                        ? 'first'
                        : index === allFavorites.length - 1
                          ? 'last'
                          : 'middle'
                  }
                  location={resolveBookLocationDisplay(item.book.cabinetLabel)}
                  reason={resolveFavoriteReason(item.book)}
                  summary={item.book.summary}
                  title={item.book.title}
                  variant="list"
                />
              ))}

          {showFavoritesEmptyState ? (
            <View style={{ gap: theme.spacing.lg, padding: theme.spacing.xl }}>
              <EditorialIllustration
                height={176}
                source={appArtwork.notionEmptyCollection}
                testID="favorites-empty-artwork"
              />
              <StateMessageCard
                description="在图书详情页点一下「加入收藏」，常读和想读的书就会汇总到这里。"
                title="还没有收藏图书"
              />
            </View>
          ) : null}

          {showFavoritesFilterEmptyState ? (
            <View style={{ gap: theme.spacing.lg, padding: theme.spacing.xl }}>
              <EditorialIllustration
                height={168}
                source={appArtwork.notionEmptySearchCollection}
                testID="favorites-filter-empty-artwork"
              />
              <StateMessageCard
                description="换个关键词，或者试试切换筛选条件。"
                title="没有符合条件的收藏图书"
              />
            </View>
          ) : null}
        </View>
      </View>
    </PageShell>
  );
}
