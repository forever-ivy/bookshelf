import Animated, { FadeInUp } from 'react-native-reanimated';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppIcon } from '@/components/base/app-icon';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { PillButton } from '@/components/base/pill-button';
import { SearchResultCard } from '@/components/search/search-result-card';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { SoftSearchBar } from '@/components/base/soft-search-bar';
import { PageShell } from '@/components/navigation/page-shell';
import {
  useActiveOrdersQuery,
  useHomeFeedQuery,
  usePersonalizedRecommendationsQuery,
  useRecommendationDashboardQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { homeHero, homeLearningFocus, homeQuickActions, homeShelves } from '@/lib/app/mock-data';

function resolveQuickActionIcon(index: number): 'bookmark' | 'spark' | 'truck' {
  if (index === 0) {
    return 'spark';
  }

  if (index === 1) {
    return 'truck';
  }

  return 'bookmark';
}

export default function HomeRoute() {
  const activeOrdersQuery = useActiveOrdersQuery();
  const homeFeedQuery = useHomeFeedQuery();
  const dashboardQuery = useRecommendationDashboardQuery();
  const personalizedQuery = usePersonalizedRecommendationsQuery({ historyLimit: 5, limit: 8 });
  const router = useRouter();
  const { theme } = useAppTheme();
  const homeError = homeFeedQuery.error ?? activeOrdersQuery.error;
  const feedData = homeFeedQuery.data;
  const dashboard = dashboardQuery.data;

  const chipPalettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  ] as const;
  const actionPalettes = [
    { iconBackground: theme.colors.primarySoft, iconColor: theme.colors.primaryStrong },
    { iconBackground: theme.colors.warningSoft, iconColor: theme.colors.warning },
    { iconBackground: theme.colors.successSoft, iconColor: theme.colors.success },
  ] as const;
  const resolveQuickActionHref = (code?: string, title?: string): Href => {
    if (code === 'borrow_now' || title === '今晚待开始') {
      return '/search/borrow-now';
    }

    if (code === 'delivery_status' || title === '配送状态') {
      return '/(tabs)/borrowing';
    }

    if (title === '学习记录') {
      return '/profile';
    }

    return '/search';
  };
  const quickActions = homeFeedQuery.data?.quickActions?.length
    ? homeFeedQuery.data.quickActions.map((item, index) => ({
        code: item.code,
        description: item.description,
        icon: resolveQuickActionIcon(index),
        meta: item.meta,
        title: item.title,
      }))
    : homeError
      ? []
      : homeQuickActions.map((item) => ({
        code: undefined,
        ...item,
      }));
  const recommendationCards = homeFeedQuery.data?.todayRecommendations ?? [];
  const booklistCards = homeFeedQuery.data?.systemBooklists ?? [];
  const leadRecommendation = recommendationCards[0];
  const activeOrder = activeOrdersQuery.data?.[0];
  const learningBullets = [
    leadRecommendation
      ? `先借《${leadRecommendation.title}》，${leadRecommendation.etaLabel}`
      : homeLearningFocus.bullets[0],
    leadRecommendation?.recommendationReason
      ? `推荐解释：${leadRecommendation.recommendationReason}`
      : homeLearningFocus.bullets[1],
    activeOrder
      ? `预计 35 分钟可以完成一轮预习，当前履约：${activeOrder.statusLabel}`
      : homeLearningFocus.bullets[2],
  ];
  const recommendationSections = homeError
    ? []
    : booklistCards.length
      ? [
          {
            items: booklistCards.slice(0, 2).map((item, index) => ({
              coverTone: index % 2 === 0 ? 'apricot' : 'lavender',
              description: item.description,
              kicker: '系统书单',
              title: item.title,
            })),
            title: '系统生成书单',
          },
          {
            items: recommendationCards.slice(0, 2).map((item, index) => ({
              coverTone: index % 2 === 0 ? item.coverTone : 'mint',
              description: item.recommendationReason ?? item.summary,
              kicker: index === 0 ? '今日推荐' : '推荐解释',
              title: item.title,
            })),
            title: '个性化推荐',
          },
        ]
      : homeShelves;

  // 推荐引擎状态
  const dashboardModules = [
    {
      detail:
        dashboard?.modules.similar.ok && dashboard.modules.similar.results.length
          ? `${dashboard.modules.similar.results.length} 本基于内容相似度`
          : dashboard?.modules.similar.error ?? '当前缺少足够的内容特征，稍后会继续补充',
      title: '内容相似推荐',
      tone: theme.colors.primaryStrong,
    },
    {
      detail:
        dashboard?.modules.collaborative.ok && dashboard.modules.collaborative.results.length
          ? `${dashboard.modules.collaborative.results.length} 本来自相近读者借阅行为`
          : dashboard?.modules.collaborative.error ?? '借阅行为信号还在积累中',
      title: '协同过滤推荐',
      tone: theme.colors.success,
    },
    {
      detail:
        dashboard?.modules.hybrid.ok && dashboard.modules.hybrid.results.length
          ? `${dashboard.modules.hybrid.results.length} 本来自混合召回`
          : dashboard?.modules.hybrid.error ?? '混合推荐暂时没有可展示结果',
      title: '混合推荐',
      tone: theme.colors.warning,
    },
  ];

  // 个性化推荐
  const personalizedBooks =
    personalizedQuery.data?.length ? personalizedQuery.data : dashboard?.personalized ?? feedData?.todayRecommendations ?? [];

  // 考试专区
  const examZone = feedData?.examZone ?? [];

  // 推荐解释
  const explanationTitle = dashboard?.focusBook?.title
    ? `围绕《${dashboard.focusBook.title}》继续延展`
    : feedData?.explanationCard?.title ?? '今日推荐解释';
  const explanationBody = dashboard?.suggestedQueries?.length
    ? `系统识别到你最近关注 ${dashboard.suggestedQueries.slice(0, 3).join('、')}，所以优先推荐更贴近当前课程和阅读轨迹的图书。`
    : feedData?.explanationCard?.body ?? '这里会汇总今日推荐、考试专区、热门榜单和推荐解释。';

  // 阅读历史
  const historyBooks = dashboard?.historyBooks ?? [];

  return (
    <PageShell headerTitle={homeHero.title} mode="discovery">
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {homeHero.chips.map((chip, index) => {
            const palette = chipPalettes[index % chipPalettes.length];

            return (
              <View
                key={chip}
                style={{
                  backgroundColor: palette.backgroundColor,
                  borderRadius: theme.radii.md,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                }}>
                <Text
                  style={{
                    color: palette.color,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  {chip}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <Animated.View entering={FadeInUp.delay(60).duration(480)}>
        <EditorialIllustration
          height={214}
          source={appArtwork.notionReadingProgress}
          testID="home-artwork"
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(100).duration(480)}>
        <SoftSearchBar onPress={() => router.push('/search')} />
      </Animated.View>

      {homeError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(homeError, '首页推荐暂时不可用，请检查 service 是否已启动。')}
          title="首页联调失败"
          tone="danger"
        />
      ) : null}

      <Animated.View entering={FadeInUp.delay(140).duration(560)}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {quickActions.map((item, index) => {
            const palette = actionPalettes[index % actionPalettes.length];

            return (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                onPress={() => router.push(resolveQuickActionHref(item.code, item.title))}
                testID={`home-quick-action-${item.code ?? item.title}`}
                style={{
                  borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                  borderTopWidth: index === 0 ? 0 : 1,
                  flexDirection: 'row',
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: palette.iconBackground,
                    borderRadius: theme.radii.md,
                    height: 34,
                    justifyContent: 'center',
                    width: 34,
                  }}>
                  <AppIcon color={palette.iconColor} name={item.icon} size={15} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  {item.title === '今晚待开始' ? (
                    <MarkerHighlightText
                      highlight="今晚待开始"
                      highlightTone="orange"
                      text={item.title}
                      textStyle={{
                        color: theme.colors.text,
                        ...theme.typography.semiBold,
                        fontSize: 15,
                      }}
                    />
                  ) : (
                    <Text
                      style={{
                        color: theme.colors.text,
                        ...theme.typography.semiBold,
                        fontSize: 15,
                      }}>
                      {item.title}
                    </Text>
                  )}
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title={homeLearningFocus.title} />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}>
          {learningBullets.map((item, index) => (
            <View
              key={item}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                paddingTop: index === 0 ? 0 : theme.spacing.lg,
              }}>
              <View
                style={{
                  backgroundColor: theme.colors.primaryStrong,
                  borderRadius: theme.radii.pill,
                  height: 6,
                  marginTop: 7,
                  width: 6,
                }}
              />
              {item.includes('35 分钟') ? (
                <MarkerHighlightText
                  highlight="35 分钟"
                  highlightColor="#F28A14"
                  highlightTone="orange"
                  text={item}
                  variant="underline"
                  textStyle={{
                    color: theme.colors.text,
                    ...theme.typography.medium,
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 20,
                  }}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.medium,
                    flex: 1,
                    fontSize: 14,
                    lineHeight: 20,
                  }}>
                  {item}
                </Text>
              )}
            </View>
          ))}
          <PillButton href="/(tabs)/borrowing" icon="bookmark" label={homeHero.primaryCta} variant="accent" />
        </View>
      </View>

      {/* ── 推荐解释 ── */}
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
          {explanationTitle}
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 16,
            lineHeight: 22,
          }}>
          {explanationBody}
        </Text>
      </View>

      {/* ── 个性化推荐 ── */}
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="个性化推荐" />
        <View style={{ gap: theme.spacing.lg }}>
          {personalizedBooks.map((item) => (
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
          {personalizedBooks.length === 0 ? (
            <StateMessageCard
              description="还没有足够的个性化信号，先去找书页浏览几本感兴趣的书吧。"
              title="个性化推荐正在养成"
            />
          ) : null}
        </View>
      </View>

      {/* ── 推荐引擎状态 ── */}
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="推荐引擎状态" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {dashboardModules.map((item) => (
            <View
              key={item.title}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                flex: 1,
                gap: 6,
                padding: theme.spacing.md,
              }}>
              <Text style={{ color: item.tone, ...theme.typography.semiBold, fontSize: 14 }}>{item.title}</Text>
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
          ))}
        </View>
      </View>

      {/* ── 最近阅读方向 ── */}
      {historyBooks.length > 0 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="最近读过这些方向" />
          <View style={{ gap: theme.spacing.sm }}>
            {historyBooks.map((item, index) => (
              <View
                key={`${item.bookId ?? index}-${item.title ?? 'history'}`}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: 4,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title ?? `近期阅读主题 ${index + 1}`}
                </Text>
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  {item.bookId ? `已纳入推荐上下文 · 图书 ID ${item.bookId}` : '会继续用来优化后续推荐'}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ── 考试专区 ── */}
      {examZone.length > 0 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="考试专区" />
          <View style={{ gap: theme.spacing.lg }}>
            {examZone.map((item) => (
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
      ) : null}

      {/* ── 系统书单 ── */}
      {booklistCards.length > 0 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="系统书单" />
          <View style={{ gap: theme.spacing.sm }}>
            {booklistCards.map((item) => (
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
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="推荐起点" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {recommendationSections.flatMap((group) => group.items).map((item, index) => (
            <View
              key={item.title}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                gap: 4,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {item.kicker}
              </Text>
              {item.title === '机器学习从零到一' ? (
                <MarkerHighlightText
                  highlight="机器学习从零到一"
                  highlightTone="green"
                  text={item.title}
                  textStyle={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                  }}
                />
              ) : (
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                  }}>
                  {item.title}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </PageShell>
  );
}
