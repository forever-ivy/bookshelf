import Animated, { FadeInUp } from 'react-native-reanimated';
import React from 'react';
import { Text, View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { SoftSearchBar } from '@/components/base/soft-search-bar';
import { PageShell } from '@/components/navigation/page-shell';
import { SearchResultCard } from '@/components/search/search-result-card';
import { appArtwork } from '@/lib/app/artwork';
import { useAppTheme } from '@/hooks/use-app-theme';
import { searchCollections, searchFilters, searchResults } from '@/lib/app/mock-data';

export default function SearchRoute() {
  const { theme } = useAppTheme();
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

  return (
    <PageShell insetBottom={112} mode="task">
      <View style={{ gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 30,
            letterSpacing: -0.6,
          }}>
          找书
        </Text>
      </View>

      <Animated.View entering={FadeInUp.duration(420)}>
        <SoftSearchBar mode="full" />
      </Animated.View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="筛选" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {searchFilters.map((filter) => (
            (() => {
              const palette = filterPalettes[searchFilters.indexOf(filter) % filterPalettes.length];

              return (
            <View
              key={filter}
              style={{
                backgroundColor: palette.backgroundColor,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
              <Text
                style={{
                  color: palette.color,
                  ...theme.typography.medium,
                  fontSize: 13,
                }}>
                {filter}
              </Text>
            </View>
              );
            })()
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {searchCollections.map((item, index) => {
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
                color: palette.color,
                ...theme.typography.semiBold,
                fontSize: 14,
              }}>
              {item.title}
            </Text>
          </View>
          );
        })}
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="搜索结果" />
        <View style={{ gap: theme.spacing.lg }}>
          {searchResults.map((item) => (
            <SearchResultCard key={item.title} {...item} />
          ))}
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
  );
}
