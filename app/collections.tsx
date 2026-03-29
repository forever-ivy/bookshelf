import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useBooklistsQuery, useFavoritesQuery } from '@/hooks/use-library-app-data';

export default function CollectionsRoute() {
  const { theme } = useAppTheme();
  const favoritesQuery = useFavoritesQuery();
  const booklistsQuery = useBooklistsQuery();
  const collectionsError = favoritesQuery.error ?? booklistsQuery.error;

  return (
    <ProtectedRoute>
      <PageShell headerTitle="收藏与书单" mode="workspace" showBackButton>
        {collectionsError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(collectionsError, '收藏和书单暂时无法同步，请检查 favorites 与 booklists 接口。')}
            title="收藏页联调失败"
            tone="danger"
          />
        ) : null}

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="收藏图书" />
          <View style={{ gap: theme.spacing.lg }}>
            {favoritesQuery.data?.map((item) => (
              <SearchResultCard
                key={item.id}
                availability={item.book.availabilityLabel}
                author={item.book.author}
                coverTone={item.book.coverTone}
                eta={item.book.etaLabel}
                href={`/books/${item.book.id}`}
                location={item.book.cabinetLabel}
                reason={item.book.recommendationReason}
                summary={item.book.summary}
                title={item.book.title}
              />
            ))}
            {favoritesQuery.data?.length === 0 && !favoritesQuery.isError ? (
              <StateMessageCard
                description="在详情页点一下“加入收藏”，常读和想读的书就会汇总到这里。"
                title="还没有收藏图书"
              />
            ) : null}
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="系统书单" />
          <View style={{ gap: theme.spacing.sm }}>
            {booklistsQuery.data?.systemItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: 8,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  {item.description}
                </Text>
                <Text style={{ color: theme.colors.textSoft, ...theme.typography.body, fontSize: 12 }}>
                  {item.books.length} 本图书
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="自建书单" />
          <View style={{ gap: theme.spacing.sm }}>
            {booklistsQuery.data?.customItems.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radii.lg,
                  gap: 8,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.body, fontSize: 13 }}>
                  {item.description}
                </Text>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.body, fontSize: 12 }}>
                  {item.books.length} 本图书
                </Text>
              </View>
            ))}
          </View>
        </View>

        <PillButton href="/recommendations" label="去看推荐" variant="accent" />
      </PageShell>
    </ProtectedRoute>
  );
}
