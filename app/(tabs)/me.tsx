import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { CollectionPreview } from '@/components/me/collection-preview';
import { ProfileSummaryCard } from '@/components/me/profile-summary-card';
import { SearchResultCard } from '@/components/search/search-result-card';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import {
  useBooklistsQuery,
  useFavoritesQuery,
  useMyOverviewQuery,
  useNotificationsQuery,
  useAchievementsQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { collectionPreview } from '@/lib/app/mock-data';

export default function MeRoute() {
  const { clearSession, profile } = useAppSession();
  const booklistsQuery = useBooklistsQuery();
  const favoritesQuery = useFavoritesQuery();
  const overviewQuery = useMyOverviewQuery();
  const notificationsQuery = useNotificationsQuery();
  const achievementsQuery = useAchievementsQuery();
  const { theme } = useAppTheme();
  const router = useRouter();
  const meError =
    overviewQuery.error ??
    booklistsQuery.error ??
    favoritesQuery.error ??
    notificationsQuery.error;
  const totalBooklists =
    (booklistsQuery.data?.customItems.length ?? 0) + (booklistsQuery.data?.systemItems.length ?? 0);
  const overview = overviewQuery.data;
  const activeOrders = overview?.recentOrders ?? [];
  const stats = overview?.stats;
  const achievements = achievementsQuery.data;
  const reminderCards = [
    {
      description: activeOrders[0]
        ? `${activeOrders[0].book.title} · ${activeOrders[0].statusLabel}`
        : '当前没有需要立刻处理的借阅事项',
      title: activeOrders.length ? `${activeOrders.length} 条借阅提醒` : '借阅状态平稳',
    },
    {
      description: stats
        ? `累计借阅 ${stats.borrowHistoryCount} 本 · 最近搜索 ${stats.searchCount} 次`
        : '画像和成就会随着借阅与阅读同步更新',
      title: stats?.lastActiveAt ? `最近活跃于 ${stats.lastActiveAt}` : '阅读画像已同步',
    },
  ];
  const dynamicCollectionPreview = [
    {
      count: `${favoritesQuery.data?.length ?? 0} 本`,
      detail: '收藏图书',
      title: '收藏图书',
    },
    {
      count: `${totalBooklists} 组`,
      detail: '系统书单 + 自建书单',
      title: '书单管理',
    },
    {
      count: `${notificationsQuery.data?.length ?? 0} 条`,
      detail: '通知消息',
      title: '消息通知',
    },
  ];

  return (
    <PageShell headerTitle="我的" mode="task">
      {meError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(meError, '个人中心数据暂时同步失败，请确认接口可访问。')}
          title="我的页面联调失败"
          tone="danger"
        />
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="今日提醒" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {reminderCards.map((item, index) => (
            <View
              key={item.title}
              style={{
                backgroundColor: index === 0 ? theme.colors.warningSoft : theme.colors.primarySoft,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                flex: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 16,
                  lineHeight: 22,
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
        </View>
      </View>

      <ProfileSummaryCard onProfilePress={() => router.push('/profile')} profile={overview?.profile ?? profile} />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="借阅与推荐概览" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {[
            {
              detail: `${stats?.activeOrdersCount ?? 0} 条进行中借阅`,
              title: '当前借阅',
            },
            {
              detail: `${stats?.recommendationCount ?? 0} 条推荐记录`,
              title: '推荐信号',
            },
            {
              detail: `${stats?.searchCount ?? 0} 次搜索`,
              title: '找书行为',
            },
          ].map((item, index) => (
            <View
              key={item.title}
              style={{
                backgroundColor: index === 0 ? theme.colors.primarySoft : index === 1 ? theme.colors.successSoft : theme.colors.warningSoft,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                flex: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>{item.title}</Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>{item.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── 成就 ── */}
      {achievements ? (
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="阅读成就" />
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              flexDirection: 'row',
              gap: theme.spacing.md,
              padding: theme.spacing.lg,
            }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.colors.warning, ...theme.typography.semiBold, fontSize: 20 }}>
                {achievements.currentPoints}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 12 }}>积分</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                {achievements.streakLabel}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 12 }}>连续学习</Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                {achievements.summary.totalBorrowedBooks} 本
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 12 }}>累计借阅</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="最近搜索与推荐" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.lg,
          }}>
          <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>最近搜索</Text>
          <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
            {overview?.recentQueries?.length ? overview.recentQueries.join('、') : '还没有搜索记录'}
          </Text>
          <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>最近借阅</Text>
          <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
            {activeOrders.length ? activeOrders.map((item) => item.book.title).join('、') : '最近借阅会同步到这里'}
          </Text>
        </View>
      </View>

      {/* ── 收藏图书 ── */}
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
              description={'在详情页点一下「加入收藏」，常读和想读的书就会汇总到这里。'}
              title="还没有收藏图书"
            />
          ) : null}
        </View>
      </View>

      {/* ── 书单 ── */}
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="书单" />
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

      {/* ── 通知 ── */}
      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="消息通知" />
        <View style={{ gap: theme.spacing.md }}>
          {notificationsQuery.data?.map((item) => {
            const kindLabel = (kind: string) => {
              if (kind === 'delivery') return '配送提醒';
              if (kind === 'borrowing') return '借阅提醒';
              if (kind === 'achievement') return '成就更新';
              return '系统通知';
            };
            return (
              <View
                key={item.id}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: 6,
                  padding: theme.spacing.lg,
                }}>
                <Text style={{ color: theme.colors.primaryStrong, ...theme.typography.medium, fontSize: 12 }}>
                  {kindLabel(item.kind)}
                </Text>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                  {item.title}
                </Text>
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13, lineHeight: 19 }}>
                  {item.body}
                </Text>
              </View>
            );
          })}
          {notificationsQuery.data?.length === 0 && !notificationsQuery.isError ? (
            <StateMessageCard
              description="借阅状态、推荐更新和成就提醒会出现在这里。"
              title="暂时没有新消息"
            />
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
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
    </PageShell>
  );
}
