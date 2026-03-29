import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SectionTitle } from '@/components/base/section-title';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useHomeFeedQuery } from '@/hooks/use-library-app-data';

export default function RecommendationsRoute() {
  const { theme } = useAppTheme();
  const feedQuery = useHomeFeedQuery();

  return (
    <ProtectedRoute>
      <PageShell
        headerDescription="这里会汇总今日推荐、考试专区、热门榜单和推荐解释。"
        headerTitle="智能推荐"
        mode="workspace"
        showBackButton>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.sm,
            padding: theme.spacing.xl,
          }}>
          <Text
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {feedQuery.data?.explanationCard.title}
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 16,
              lineHeight: 22,
            }}>
            {feedQuery.data?.explanationCard.body}
          </Text>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="今日推荐" />
          <View style={{ gap: theme.spacing.lg }}>
            {feedQuery.data?.todayRecommendations.map((item) => (
              <SearchResultCard
                key={item.id}
                availability={item.availabilityLabel}
                author={item.author}
                coverTone={item.coverTone}
                eta={item.etaLabel}
                href={`/books/${item.id}`}
                location={item.cabinetLabel}
                reason={item.recommendationReason}
                title={item.title}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="考试专区" />
          <View style={{ gap: theme.spacing.lg }}>
            {feedQuery.data?.examZone.map((item) => (
              <SearchResultCard
                key={item.id}
                availability={item.availabilityLabel}
                author={item.author}
                coverTone={item.coverTone}
                eta={item.etaLabel}
                href={`/books/${item.id}`}
                location={item.cabinetLabel}
                reason={item.recommendationReason}
                title={item.title}
              />
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="热门榜单" />
          <View style={{ gap: theme.spacing.sm }}>
            {feedQuery.data?.hotLists.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: 4,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="系统书单" />
          <View style={{ gap: theme.spacing.sm }}>
            {feedQuery.data?.systemBooklists.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.primarySoft,
                  borderRadius: theme.radii.lg,
                  gap: 4,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.body, fontSize: 13 }}>
                  {item.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <PillButton href="/search" label="回到找书" variant="accent" />
      </PageShell>
    </ProtectedRoute>
  );
}
