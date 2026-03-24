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
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}>
          Database
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 30,
            letterSpacing: -0.6,
          }}>
          找书
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 20,
          }}>
          用一条搜索和一组筛选，先把可借、可送达、适合课程的书排到最前面。
        </Text>
      </View>

      <Animated.View entering={FadeInUp.duration(420)}>
        <SoftSearchBar mode="full" />
      </Animated.View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          description="先限定可借、履约和课程相关条件，再看结果。"
          title="筛选"
        />
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
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 12,
                lineHeight: 17,
              }}>
              {item.detail}
            </Text>
          </View>
          );
        })}
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          description="先看现在能借到、能送到、也最适合今晚开始的几本。"
          eyebrow="Results"
          title="搜索结果"
        />
        <View style={{ gap: theme.spacing.lg }}>
          {searchResults.map((item) => (
            <SearchResultCard key={item.title} {...item} />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          description="没看到目标书时，换课程名、作者名或自然语言描述，系统会继续从相似主题里找。"
          eyebrow="Fallback"
          title="没看到想找的书？"
        />
        <EditorialIllustration
          height={178}
          source={appArtwork.notionNoResults}
          testID="search-fallback-artwork"
        />
      </View>
    </PageShell>
  );
}
