import Animated, { FadeInUp } from 'react-native-reanimated';
import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Link, Stack, type Href } from 'expo-router';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import {
  MarkerHighlightText,
  type MarkerHighlightTone,
} from '@/components/base/marker-highlight-text';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { PageShell } from '@/components/navigation/page-shell';
import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { ToolbarInlineTitle } from '@/components/navigation/toolbar-inline-title';
import { ToolbarProfileAction } from '@/components/navigation/toolbar-profile-action';
import { useAppSession } from '@/hooks/use-app-session';
import { useHeaderChromeVisibility } from '@/hooks/use-header-chrome-visibility';
import {
  useActiveOrdersQuery,
  useAchievementsQuery,
  useBookDetailQueries,
  useHomeFeedQuery,
  usePersonalizedRecommendationsQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage, hasLibraryService } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { resolveBookEtaDisplay } from '@/lib/book-delivery';
import { isUnresolvedBookLocation, resolveBookLocationDisplay } from '@/lib/book-location';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

function resolveHomeGreeting(hour: number) {
  if (hour >= 5 && hour < 11) {
    return '早上好 ☀️';
  }

  if (hour >= 11 && hour < 14) {
    return '中午好 🌤️';
  }

  if (hour >= 14 && hour < 18) {
    return '下午好 🍃';
  }

  return '晚上好！ 🌙';
}

function mergeRecommendationLocation<T extends { cabinetLabel: string; id: number; shelfLabel: string }>(
  item: T,
  fallback?: { cabinetLabel: string; shelfLabel: string }
) {
  if (!fallback) {
    return item;
  }

  const needsCabinetFallback = isUnresolvedBookLocation(item.cabinetLabel);
  const needsShelfFallback = !item.shelfLabel || item.shelfLabel === '主馆 2 楼';

  if (!needsCabinetFallback && !needsShelfFallback) {
    return item;
  }

  return {
    ...item,
    cabinetLabel: needsCabinetFallback ? fallback.cabinetLabel : item.cabinetLabel,
    shelfLabel: needsShelfFallback ? fallback.shelfLabel : item.shelfLabel,
  };
}

type QuickStartItem = {
  description: string;
  descriptionHighlight?: string;
  highlightTone?: MarkerHighlightTone;
  icon: AppIconName;
  iconBackgroundColor: string;
  iconColor: string;
  key: string;
  title: string;
};

type HomeBookLinkItem = {
  author: string;
  availabilityLabel: string;
  cabinetLabel: string;
  etaLabel: string;
  href: Href;
  id: number;
  title: string;
};

function HomeQuickStartSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }} testID="home-quick-start-skeleton">
      {Array.from({ length: 3 }, (_, index) => (
        <View
          key={`quick-start-skeleton-${index}`}
          style={{
            borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: index === 0 ? 0 : 1,
            flexDirection: 'row',
            gap: theme.spacing.lg,
            paddingTop: index === 0 ? 0 : theme.spacing.lg,
          }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.md} height={44} width={44} />
          <View style={{ flex: 1, gap: 8, paddingTop: 2 }}>
            <LoadingSkeletonBlock height={16} width="28%" />
            <LoadingSkeletonBlock height={14} width={index === 1 ? '56%' : '72%'} />
          </View>
        </View>
      ))}
      <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={48} />
    </View>
  );
}

function HomeBookLinkListSkeleton({ testID }: { testID: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
      }}
      testID={testID}>
      {Array.from({ length: 2 }, (_, index) => (
        <View
          key={`${testID}-${index}`}
          style={{
            borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
            borderTopWidth: index === 0 ? 0 : 1,
            flexDirection: 'row',
            gap: theme.spacing.md,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          }}>
          <View style={{ flex: 1, gap: 8 }}>
            <LoadingSkeletonBlock height={16} width={index === 0 ? '66%' : '58%'} />
            <LoadingSkeletonBlock height={12} width="42%" />
            <LoadingSkeletonBlock height={12} width="54%" />
          </View>
          <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={16} width={16} />
        </View>
      ))}
    </View>
  );
}

function HomeFeaturedShelfSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.md }} testID="home-featured-skeleton">
      <LoadingSkeletonCard>
        <LoadingSkeletonBlock height={16} width="32%" />
        <LoadingSkeletonText lineHeight={12} widths={['58%', '42%']} />
      </LoadingSkeletonCard>
      <LoadingSkeletonBlock height={12} width={96} />
      <HomeBookLinkListSkeleton testID="home-featured-book-links-skeleton" />
    </View>
  );
}

function formatHomeHeaderTitle() {
  return '首页';
}

function resolveHomeBookAuthor(author?: string | null) {
  const normalized = author?.trim();

  if (!normalized || /^nan$/i.test(normalized)) {
    return '佚名';
  }

  return normalized;
}

function resolveRecommendationHighlight(text: string) {
  const normalized = text.trim();

  const priorityPhrase = normalized.match(/优先展示[^。；]*/)?.[0]?.trim();

  if (priorityPhrase) {
    return priorityPhrase;
  }

  const immediatePhrase = normalized.match(/(?:当前可借|能立即拿到)[^。；]*/)?.[0]?.trim();

  if (immediatePhrase) {
    return immediatePhrase;
  }

  const easierToBorrowPhrase = normalized.match(/(?:更容易借到|方便尽快借到)[^。；]*/)?.[0]?.trim();

  if (easierToBorrowPhrase) {
    return easierToBorrowPhrase;
  }

  const clauses = normalized
    .split(/[，。；]/)
    .map((item) => item.trim())
    .filter(Boolean);

  return clauses.at(-1) ?? normalized;
}

function formatRecommendationSummary(text?: string | null) {
  const normalized = text?.trim();

  if (!normalized) {
    return null;
  }

  if (/系统会结合|优先展示|馆内热度|最近借阅|收藏|课程/.test(normalized)) {
    return '这些书更贴近你最近在看的方向，也优先帮你挑出现在更容易借到的书。';
  }

  return normalized;
}

function countDeliveryOrders(
  orders: { mode?: string | null; statusLabel?: string | null }[]
) {
  return orders.filter(
    (order) => order.mode === 'robot_delivery' || Boolean(order.statusLabel?.includes('配送'))
  ).length;
}

function countDueSoonOrders(
  orders: { status?: string | null; statusLabel?: string | null }[]
) {
  return orders.filter(
    (order) =>
      order.status === 'dueSoon' ||
      order.status === 'overdue' ||
      Boolean(order.statusLabel?.includes('到期'))
  ).length;
}

function HomeBookLinkList({
  items,
  testIDPrefix,
}: {
  items: HomeBookLinkItem[];
  testIDPrefix: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        overflow: 'hidden',
      }}>
      {items.map((item, index) => (
        <Link key={`${testIDPrefix}-${item.id}`} asChild href={item.href}>
          <Pressable
            accessibilityRole="button"
            testID={`${testIDPrefix}-${item.id}`}
            style={({ pressed }) => ({
              opacity: pressed ? 0.94 : 1,
            })}>
            <View
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: theme.spacing.md,
              }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 15,
                    lineHeight: 21,
                  }}>
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.medium,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                  {resolveHomeBookAuthor(item.author)} · {resolveBookLocationDisplay(item.cabinetLabel)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.body,
                  fontSize: 12,
                  lineHeight: 17,
                }}>
                  {item.availabilityLabel} · {resolveBookEtaDisplay(item.etaLabel)}
                </Text>
              </View>
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <AppIcon color={theme.colors.textSoft} name="chevronRight" size={16} strokeWidth={1.7} />
              </View>
            </View>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

export default function HomeRoute() {
  const activeOrdersQuery = useActiveOrdersQuery();
  const achievementsQuery = useAchievementsQuery();
  const homeFeedQuery = useHomeFeedQuery();
  const personalizedQuery = usePersonalizedRecommendationsQuery({ historyLimit: 5, limit: 8 });
  const { profile } = useAppSession();
  const { openProfileSheet } = useProfileSheet();
  const { theme } = useAppTheme();
  const homeError = homeFeedQuery.error ?? activeOrdersQuery.error;
  const hasRealLibraryService = hasLibraryService();
  const feedData = homeFeedQuery.data;
  const now = new Date();
  const isIos = Platform.OS === 'ios';
  const greeting = resolveHomeGreeting(now.getHours());
  const displayName = profile?.displayName?.trim() ? profile.displayName.trim() : '同学';
  const homeHeaderTitle = formatHomeHeaderTitle();
  const { onScroll: handleHomeScroll, showHeaderChrome: showHomeHeaderChrome } =
    useHeaderChromeVisibility();

  const chipPalettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  ] as const;
  const deliveryOrderCount = countDeliveryOrders(activeOrdersQuery.data ?? []);
  const dueSoonOrderCount = countDueSoonOrders(activeOrdersQuery.data ?? []);
  const deliveryChip = deliveryOrderCount > 0 ? `${deliveryOrderCount} 单配送中` : '暂无订单';
  const dueSoonChip = dueSoonOrderCount > 0 ? `${dueSoonOrderCount} 本临近到期` : '暂无临期';
  const streakChip = achievementsQuery.data?.streakLabel?.trim() || null;
  const heroChips = hasRealLibraryService
    ? [deliveryChip, dueSoonChip, streakChip]
        .filter((item): item is string => Boolean(item))
        .sort((left, right) => {
          const leftScore = left.startsWith('暂无') ? 1 : 0;
          const rightScore = right.startsWith('暂无') ? 1 : 0;
          return leftScore - rightScore;
        })
    : [];
  const activeOrder = hasRealLibraryService ? activeOrdersQuery.data?.[0] : undefined;
  const recommendationCards = homeFeedQuery.data?.todayRecommendations ?? [];
  const booklistCards = homeFeedQuery.data?.systemBooklists ?? [];
  const quickStartItems: QuickStartItem[] = activeOrder?.book?.title
    ? [
        {
          description: `《${activeOrder.book.title}》`,
          icon: 'bookmark',
          iconBackgroundColor: theme.colors.accentLavender,
          iconColor: theme.colors.knowledgeStrong,
          key: 'continue-reading',
          title: '继续阅读',
        },
        {
          description: [activeOrder.statusLabel, activeOrder.dueDateLabel].filter(Boolean).join(' · '),
          descriptionHighlight: activeOrder.dueDateLabel ?? activeOrder.statusLabel,
          highlightTone: 'blue',
          icon: 'clock',
          iconBackgroundColor: theme.colors.warningSoft,
          iconColor: theme.colors.warning,
          key: 'view-progress',
          title: '查看进度',
        },
        {
          description: '处理续借、归还和查看进度',
          descriptionHighlight: '处理续借、归还和查看进度',
          highlightTone: 'green',
          icon: 'borrowing',
          iconBackgroundColor: theme.colors.successSoft,
          iconColor: theme.colors.success,
          key: 'manage-borrowing',
          title: '去借阅页',
        },
      ]
    : hasRealLibraryService
      ? [
          {
            description: '按书名、作者或主题开始',
            highlightTone: 'orange',
            icon: 'search',
            iconBackgroundColor: theme.colors.accentLavender,
            iconColor: theme.colors.knowledgeStrong,
            key: 'go-search',
            title: '去找书',
          },
          {
            description: '优先查看可借可送图书',
            highlightTone: 'blue',
            icon: 'spark',
            iconBackgroundColor: theme.colors.warningSoft,
            iconColor: theme.colors.warning,
            key: 'borrow-now',
            title: '看可立即借',
          },
          {
            description: '确认位置后再决定',
            highlightTone: 'green',
            icon: 'bookmark',
            iconBackgroundColor: theme.colors.successSoft,
            iconColor: theme.colors.success,
            key: 'check-location',
            title: '查看馆藏',
          },
        ]
      : [];
  const quickStartState = !hasRealLibraryService
    ? {
        description: '连接真实 service 后，这里会展示基于当前借阅和馆藏状态的入口动作。',
        title: '尚未连接真实数据',
        tone: 'info' as const,
      }
    : homeError
      ? {
          description: getLibraryErrorMessage(homeError, '首页入口暂时不可用，请检查 service 是否已启动。'),
          title: '首页入口暂时不可用',
          tone: 'danger' as const,
        }
      : null;

  const recommendationLocationById = new Map(
    recommendationCards.map((item) => [
      item.id,
      {
        cabinetLabel: item.cabinetLabel,
        shelfLabel: item.shelfLabel,
      },
      ])
  );
  const hasPersonalizedResponse = personalizedQuery.data !== undefined;
  const personalizedBooksSource =
    personalizedQuery.data?.length
      ? personalizedQuery.data
      : hasPersonalizedResponse
        ? feedData?.todayRecommendations ?? []
        : [];
  const personalizedBooksWithFeedLocations = personalizedBooksSource.map((item) =>
    mergeRecommendationLocation(item, recommendationLocationById.get(item.id))
  );
  const missingPersonalizedLocationIds = personalizedBooksWithFeedLocations
    .filter((item) => isUnresolvedBookLocation(item.cabinetLabel))
    .map((item) => item.id);
  const personalizedBookDetails = useBookDetailQueries(hasRealLibraryService ? missingPersonalizedLocationIds : []);
  const personalizedDetailLocationById = new Map(
    personalizedBookDetails
      .map((query) => query.data?.catalog)
      .filter(
        (catalog): catalog is { cabinetLabel: string; id: number; shelfLabel: string } => Boolean(catalog)
      )
      .map((catalog) => [
        catalog.id,
        {
          cabinetLabel: catalog.cabinetLabel,
          shelfLabel: catalog.shelfLabel,
        },
      ])
  );
  const personalizedBooks = personalizedBooksWithFeedLocations.map((item) =>
    mergeRecommendationLocation(item, personalizedDetailLocationById.get(item.id))
  );
  const personalizedDetailsLoading = personalizedBookDetails.some(
    (query) => Boolean(query.isFetching) && !query.data
  );

  const homeRecommendationCards = personalizedBooks.slice(0, 2);
  const examZone = feedData?.examZone ?? [];
  const hasFeaturedCollections = booklistCards.length > 0 || examZone.length > 0;
  const homeRecommendationLinks = homeRecommendationCards.map((item) => ({
    author: item.author,
    availabilityLabel: item.availabilityLabel,
    cabinetLabel: item.cabinetLabel,
    etaLabel: item.etaLabel,
    href: `/books/${item.id}` as Href,
    id: item.id,
    title: item.title,
  }));
  const showQuickStartSkeleton =
    hasRealLibraryService && !quickStartState && !activeOrdersQuery.data && Boolean(activeOrdersQuery.isFetching);
  const showRecommendationSkeleton =
    hasRealLibraryService &&
    !homeRecommendationLinks.length &&
    !homeError &&
    ((!hasPersonalizedResponse && Boolean(personalizedQuery.isFetching)) || personalizedDetailsLoading);
  const showFeaturedCollectionsSkeleton =
    hasRealLibraryService &&
    !hasFeaturedCollections &&
    !homeError &&
    Boolean(homeFeedQuery.isFetching);
  const recommendationReasonSummary =
    formatRecommendationSummary(feedData?.explanationCard?.body) ||
    homeRecommendationCards
      .map((item) => item.recommendationReason?.trim())
      .filter((item): item is string => Boolean(item))
      .slice(0, 2)
      .join('；') ||
    '这些书更贴近你最近在看的方向，也更容易借到。';
  const featuredBookLinks = examZone.map((item) => ({
    author: item.author,
    availabilityLabel: item.availabilityLabel,
    cabinetLabel: item.cabinetLabel,
    etaLabel: item.etaLabel,
    href: `/books/${item.id}` as Href,
    id: item.id,
    title: item.title,
  }));
  const quickStartCta = activeOrder?.book?.title
    ? {
        href: '/(tabs)/borrowing' as const,
        label: '查看当前借阅',
      }
    : {
        href: '/search' as const,
        label: '去找书',
      };
  const homeHeader = (
    <View
      style={{
        gap: theme.spacing.xs,
        maxWidth: 320,
      }}
      testID="home-greeting-header">
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.heading,
          fontSize: 36,
          letterSpacing: -1.1,
          lineHeight: 42,
        }}
        testID="home-greeting-label">
        {greeting}
      </Text>
      <Text
        style={{
          color: theme.colors.textMuted,
          ...theme.typography.medium,
          fontSize: 22,
          letterSpacing: -0.2,
          lineHeight: 28,
        }}
        testID="home-greeting-name">
        {displayName}
      </Text>
    </View>
  );

  return (
    <>
      {isIos ? (
        <Stack.Screen
          options={{
            title: '',
            unstable_headerLeftItems: () =>
              showHomeHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="home-header-inline-title-slot">
                          <ToolbarInlineTitle title={homeHeaderTitle} />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
            unstable_headerRightItems: () =>
              showHomeHeaderChrome
                ? [
                    {
                      element: (
                        <View testID="home-header-profile-slot">
                          <ToolbarProfileAction onPress={openProfileSheet} />
                        </View>
                      ),
                      hidesSharedBackground: true,
                      type: 'custom' as const,
                    },
                  ]
                : [],
          }}
        />
      ) : (
        <Stack.Screen
          options={{
            headerRight: () =>
              showHomeHeaderChrome ? <ProfileSheetTriggerButton onPress={openProfileSheet} /> : null,
            title: showHomeHeaderChrome ? homeHeaderTitle : '',
          }}
        />
      )}
      <PageShell mode="discovery" onScroll={handleHomeScroll}>
        {homeHeader}
        {heroChips.length > 0 ? (
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {heroChips.map((chip, index) => {
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
        ) : null}
      <Animated.View entering={FadeInUp.delay(60).duration(480)}>
        <EditorialIllustration
          height={214}
          source={appArtwork.notionReadingProgress}
          testID="home-artwork"
        />
      </Animated.View>

      {homeError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(homeError, '首页推荐暂时不可用，请检查 service 是否已启动。')}
          title="首页联调失败"
          tone="danger"
        />
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="快速开始" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}>
          {showQuickStartSkeleton ? (
            <HomeQuickStartSkeleton />
          ) : quickStartState ? (
            <StateMessageCard
              description={quickStartState.description}
              testID="home-quick-start-empty-state"
              title={quickStartState.title}
              tone={quickStartState.tone}
            />
          ) : (
            quickStartItems.map((item, index) => (
              <View
                key={item.key}
                style={{
                  borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                  borderTopWidth: index === 0 ? 0 : 1,
                  flexDirection: 'row',
                  gap: theme.spacing.lg,
                  paddingTop: index === 0 ? 0 : theme.spacing.lg,
                }}
                testID="home-quick-start-item">
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: item.iconBackgroundColor,
                    borderRadius: theme.radii.md,
                    height: 44,
                    justifyContent: 'center',
                    width: 44,
                  }}
                  testID="home-quick-start-item-icon">
                  <AppIcon color={item.iconColor} name={item.icon} size={18} strokeWidth={1.7} />
                </View>
                <View style={{ flex: 1, gap: 4, paddingTop: 2 }}>
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.semiBold,
                      fontSize: 15,
                      lineHeight: 22,
                    }}>
                    {item.title}
                  </Text>
                  {item.descriptionHighlight ? (
                    <MarkerHighlightText
                      highlight={item.descriptionHighlight}
                      highlightTone={item.highlightTone}
                      numberOfLines={1}
                      text={item.description}
                      textStyle={{
                        color: theme.colors.textMuted,
                        ...theme.typography.medium,
                        flex: 1,
                        fontSize: 14,
                        lineHeight: 20,
                      }}
                    />
                  ) : (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.medium,
                        flex: 1,
                        fontSize: 14,
                        lineHeight: 20,
                      }}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
          {!showQuickStartSkeleton ? (
            <PillButton href={quickStartCta.href} icon="bookmark" label={quickStartCta.label} variant="accent" />
          ) : null}
        </View>
      </View>

      {showRecommendationSkeleton || homeRecommendationLinks.length > 0 ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="推荐借阅" />
          {showRecommendationSkeleton ? (
            <View style={{ gap: theme.spacing.sm }} testID="home-recommendation-skeleton">
              <LoadingSkeletonText lineHeight={14} widths={['92%', '78%']} />
              <HomeBookLinkListSkeleton testID="home-recommendation-links-skeleton" />
            </View>
          ) : (
            <View style={{ gap: theme.spacing.sm }}>
              <MarkerHighlightText
                highlight={resolveRecommendationHighlight(recommendationReasonSummary)}
                highlightTone="orange"
                text={recommendationReasonSummary}
                textStyle={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 22,
                }}
              />
              <HomeBookLinkList items={homeRecommendationLinks} testIDPrefix="home-recommendation-link" />
            </View>
          )}
        </View>
      ) : null}

      {showFeaturedCollectionsSkeleton || hasFeaturedCollections ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="专题书单" />
          {showFeaturedCollectionsSkeleton ? (
            <HomeFeaturedShelfSkeleton />
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {booklistCards.map((item) => (
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
                  <Text
                    style={{
                      color: theme.colors.text,
                      ...theme.typography.semiBold,
                      fontSize: 15,
                    }}>
                    {item.title}
                  </Text>
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
              ))}
              {featuredBookLinks.length > 0 ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <MarkerHighlightText
                    highlight="这几本"
                    highlightTone="green"
                    text="先从这几本看起"
                    textStyle={{
                      color: theme.colors.textSoft,
                      ...theme.typography.medium,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  />
                  <HomeBookLinkList items={featuredBookLinks} testIDPrefix="home-booklist-link" />
                </View>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
      </PageShell>
    </>
  );
}
