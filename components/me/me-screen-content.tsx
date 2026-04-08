import React from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { CollectionPreview } from '@/components/me/collection-preview';
import { ProfileSummaryCard } from '@/components/me/profile-summary-card';
import { useAppSession } from '@/hooks/use-app-session';
import {
  useAchievementsQuery,
  useMyOverviewQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';

function formatLastActiveLabel(value: string | null | undefined) {
  if (!value) {
    return '最近一周';
  }

  const normalizedValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsed = new Date(normalizedValue);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
  const day = `${parsed.getDate()}`.padStart(2, '0');
  const hours = `${parsed.getHours()}`.padStart(2, '0');
  const minutes = `${parsed.getMinutes()}`.padStart(2, '0');
  const hasTime = value.includes('T');

  return hasTime ? `${month}.${day} ${hours}:${minutes}` : `${month}.${day}`;
}

function formatStreakValue(value: string | null | undefined) {
  if (!value) {
    return '9 天';
  }

  const matched = value.match(/(\d+\s*天)/);
  return matched ? matched[1].replace(/\s+/g, ' ') : value;
}

function compactReadingSummary(value: string | null | undefined) {
  if (!value) {
    return '先看框架';
  }

  const normalized = value.replace(/[。！]/g, '').trim();
  return normalized.length > 12 ? `${normalized.slice(0, 12)}…` : normalized;
}

function ReminderSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.md }} testID="me-reminders-skeleton">
      <LoadingSkeletonCard style={{ backgroundColor: theme.colors.warningSoft, gap: theme.spacing.sm }}>
        <LoadingSkeletonBlock height={12} width="24%" />
        <LoadingSkeletonBlock height={18} width="42%" />
        <LoadingSkeletonBlock height={12} width="72%" />
      </LoadingSkeletonCard>
      <LoadingSkeletonCard style={{ backgroundColor: theme.colors.surface, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <LoadingSkeletonBlock height={10} width="34%" />
            <LoadingSkeletonBlock height={16} width="58%" />
          </View>
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <LoadingSkeletonBlock height={10} width="38%" />
            <LoadingSkeletonBlock height={16} width="42%" />
          </View>
        </View>
      </LoadingSkeletonCard>
    </View>
  );
}

function ProfileSummarySkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard testID="me-profile-summary-skeleton">
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.lg} height={60} width={60} />
          <View style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
            <LoadingSkeletonBlock height={24} width="38%" />
            <LoadingSkeletonBlock height={14} width="26%" />
            <LoadingSkeletonBlock height={12} width="44%" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {Array.from({ length: 3 }, (_, index) => (
            <LoadingSkeletonCard
              key={`me-highlight-skeleton-${index}`}
              style={{ backgroundColor: theme.colors.backgroundStrong, flex: 1, padding: theme.spacing.md }}>
              <LoadingSkeletonBlock height={10} width="56%" />
              <LoadingSkeletonBlock height={14} width="68%" />
            </LoadingSkeletonCard>
          ))}
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <LoadingSkeletonBlock height={12} width="18%" />
          <LoadingSkeletonBlock height={16} width="86%" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            <LoadingSkeletonBlock borderRadius={theme.radii.md} height={32} width={74} />
            <LoadingSkeletonBlock borderRadius={theme.radii.md} height={32} width={88} />
            <LoadingSkeletonBlock borderRadius={theme.radii.md} height={32} width={68} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <LoadingSkeletonCard style={{ backgroundColor: theme.colors.warningSoft, flex: 1, padding: theme.spacing.md }}>
            <LoadingSkeletonBlock height={14} width="82%" />
          </LoadingSkeletonCard>
          <LoadingSkeletonCard style={{ backgroundColor: theme.colors.backgroundStrong, flex: 1, padding: theme.spacing.md }}>
            <LoadingSkeletonBlock height={14} width="78%" />
          </LoadingSkeletonCard>
        </View>
        <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={48} width="42%" />
      </View>
    </LoadingSkeletonCard>
  );
}

function CollectionPreviewSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }} testID="me-collection-skeleton">
      {Array.from({ length: 4 }, (_, index) => (
        <LoadingSkeletonCard
          key={`me-collection-skeleton-${index}`}
          style={{
            backgroundColor: theme.colors.surface,
            flexGrow: 1,
            gap: 8,
            minWidth: 140,
            width: '47%',
          }}>
          <LoadingSkeletonBlock height={12} width="48%" />
          <LoadingSkeletonBlock height={22} width="54%" />
          <LoadingSkeletonBlock height={12} width="72%" />
        </LoadingSkeletonCard>
      ))}
    </View>
  );
}

export function MeScreenContent({
  onLogout,
  onProfilePress,
}: {
  onLogout?: () => void;
  onProfilePress?: () => void;
}) {
  const { clearSession, profile } = useAppSession();
  const overviewQuery = useMyOverviewQuery();
  const achievementsQuery = useAchievementsQuery();
  const { theme } = useAppTheme();
  const meError = overviewQuery.error;
  const overview = overviewQuery.data;
  const activeOrders = overview?.recentOrders ?? [];
  const stats = overview?.stats;
  const achievements = achievementsQuery.data;
  const showOverviewSkeleton = !overviewQuery.data && Boolean(overviewQuery.isFetching);
  const currentProfile = overview?.profile ?? profile;
  const formattedLastActive = formatLastActiveLabel(stats?.lastActiveAt);
  const streakValue = formatStreakValue(achievements?.streakLabel);
  const profileHighlights = [
    { label: '借阅中', value: `${stats?.activeOrdersCount ?? activeOrders.length}` },
    { label: '累计借阅', value: `${stats?.borrowHistoryCount ?? 0} 本` },
    { label: '连续学习', value: streakValue },
  ];
  const dataOverviewItems = [
    {
      count: `${stats?.activeOrdersCount ?? activeOrders.length}`,
      detail: '当前',
      title: '借阅中',
    },
    {
      count: `${stats?.borrowHistoryCount ?? 0} 本`,
      detail: '累计',
      title: '累计借阅',
    },
    {
      count: `${stats?.searchCount ?? 0} 次`,
      detail: '最近',
      title: '找书次数',
    },
    {
      count: achievements ? streakValue : `${stats?.recommendationCount ?? 0} 次`,
      detail: achievements ? '连续' : '推荐',
      title: achievements ? '连续学习' : '推荐记录',
    },
  ];
  const recentQueries = overview?.recentQueries?.slice(0, 3) ?? [];
  const recentBorrowedBooks = activeOrders.slice(0, 3).map((item) => item.book.title);
  const primaryReminderTitle = activeOrders.length ? `${activeOrders.length} 条待处理` : '暂无待处理';
  const primaryReminderDescription = activeOrders[0]
    ? `${activeOrders[0].book.title} · ${activeOrders[0].statusLabel}`
    : '今天很轻松';

  return (
    <>
      {meError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(meError, '个人中心数据暂时同步失败，请确认接口可访问。')}
          title="我的页面联调失败"
          tone="danger"
        />
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="今日提醒" />
        {showOverviewSkeleton ? (
          <ReminderSkeleton />
        ) : (
          <View style={{ gap: theme.spacing.md }}>
            <View
              style={{
                backgroundColor: theme.colors.warningSoft,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 20,
                  lineHeight: 26,
                }}>
                {primaryReminderTitle}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 14,
                  lineHeight: 20,
                }}>
                {primaryReminderDescription}
              </Text>
            </View>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                flexDirection: 'row',
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                    color: theme.colors.textSoft,
                    ...theme.typography.medium,
                    fontSize: 12,
                  }}>
                  活跃
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  {formattedLastActive}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{
                  color: theme.colors.textSoft,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                  找书
                </Text>
                <Text
                  style={{
                    color: theme.colors.text,
                    ...theme.typography.semiBold,
                    fontSize: 16,
                  }}>
                  {stats?.searchCount ?? 0} 次
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {showOverviewSkeleton ? (
        <ProfileSummarySkeleton />
      ) : (
        <ProfileSummaryCard highlights={profileHighlights} onProfilePress={onProfilePress} profile={currentProfile} />
      )}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="数据概览" />
        {showOverviewSkeleton || Boolean(achievementsQuery.isFetching && !achievements)
          ? <CollectionPreviewSkeleton />
          : <CollectionPreview items={dataOverviewItems} />}
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="最近使用记录" />
        {showOverviewSkeleton ? (
          <LoadingSkeletonCard testID="me-history-skeleton">
            <LoadingSkeletonBlock height={15} width={72} />
            <LoadingSkeletonBlock height={12} width="58%" />
            <LoadingSkeletonBlock height={12} width="46%" />
            <LoadingSkeletonBlock height={15} width={72} />
            <LoadingSkeletonBlock height={12} width="62%" />
            <LoadingSkeletonBlock height={12} width="54%" />
          </LoadingSkeletonCard>
        ) : (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
            }}>
            <View style={{ gap: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>最近搜索</Text>
              {recentQueries.length ? (
                recentQueries.map((item) => (
                  <Text
                    key={item}
                    style={{
                    color: theme.colors.textMuted,
                    ...theme.typography.body,
                    fontSize: 13,
                    lineHeight: 18,
                  }}>
                    {compactReadingSummary(item)}
                  </Text>
                ))
              ) : (
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  还没有搜索记录
                </Text>
              )}
            </View>

            <View style={{ backgroundColor: theme.colors.borderSoft, height: 1 }} />

            <View style={{ gap: theme.spacing.sm }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>最近借阅</Text>
              {recentBorrowedBooks.length ? (
                recentBorrowedBooks.map((item) => (
                  <Text
                    key={item}
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 13,
                      lineHeight: 18,
                    }}>
                    {item}
                  </Text>
                ))
              ) : (
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  最近借阅会同步到这里
                </Text>
              )}
            </View>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          onLogout?.();
          void clearSession();
        }}
        style={({ pressed }) => ({
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        })}>
        <View
          style={{
            backgroundColor: theme.colors.warningSoft,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: 14,
          }}>
          <Text
            style={{
              color: theme.colors.warning,
              ...theme.typography.semiBold,
              fontSize: 15,
              textAlign: 'center',
            }}>
            退出登录
          </Text>
        </View>
      </Pressable>
    </>
  );
}
