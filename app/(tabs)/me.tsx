import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { CollectionPreview } from '@/components/me/collection-preview';
import { MenuList } from '@/components/me/menu-list';
import { ProfileSummaryCard } from '@/components/me/profile-summary-card';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppSession } from '@/hooks/use-app-session';
import {
  useAchievementsQuery,
  useActiveOrdersQuery,
  useBooklistsQuery,
  useFavoritesQuery,
  useNotificationsQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { collectionPreview, meMenus } from '@/lib/app/mock-data';

export default function MeRoute() {
  const { clearSession, profile } = useAppSession();
  const achievementsQuery = useAchievementsQuery();
  const activeOrdersQuery = useActiveOrdersQuery();
  const booklistsQuery = useBooklistsQuery();
  const favoritesQuery = useFavoritesQuery();
  const notificationsQuery = useNotificationsQuery();
  const { theme } = useAppTheme();
  const router = useRouter();
  const meError =
    achievementsQuery.error ??
    activeOrdersQuery.error ??
    booklistsQuery.error ??
    favoritesQuery.error ??
    notificationsQuery.error;
  const totalBooklists =
    (booklistsQuery.data?.customItems.length ?? 0) + (booklistsQuery.data?.systemItems.length ?? 0);
  const activeOrders = activeOrdersQuery.data ?? [];
  const reminderCards = [
    {
      description: activeOrders[0]
        ? `${activeOrders[0].book.title} · ${activeOrders[0].statusLabel}`
        : '当前没有需要立刻处理的借阅事项',
      title: activeOrders.length ? `${activeOrders.length} 条借阅提醒` : '借阅状态平稳',
    },
    {
      description: achievementsQuery.data
        ? `累计积分 ${achievementsQuery.data.currentPoints} · 累计借阅 ${achievementsQuery.data.summary.totalBorrowedBooks} 本`
        : '画像和成就会随着借阅与阅读同步更新',
      title: achievementsQuery.data?.streakLabel ?? '阅读画像已同步',
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
  const menuItems = meMenus.filter((item) => item.title !== '文字高亮示例');

  return (
    <PageShell headerTitle="我的" mode="task">
      {meError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(meError, '个人中心数据暂时同步失败，请确认 favorites、booklists、notifications、achievements 接口可访问。')}
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

      <ProfileSummaryCard onProfilePress={() => router.push('/profile')} profile={profile} />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="收藏与书单" />
        <CollectionPreview items={meError ? dynamicCollectionPreview : booklistsQuery.data ? dynamicCollectionPreview : collectionPreview} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="常用入口" />
        <MenuList
          items={menuItems}
          onPressItem={(title) => {
            if (title === '个人中心') {
              router.push('/profile');
              return;
            }

            if (title === '收藏与书单') {
              router.push('/collections');
              return;
            }

            if (title === '通知中心') {
              router.push('/notifications');
              return;
            }

            if (title === '归还与整理请求') {
              router.push('/returns');
              return;
            }

            if (title === '配送记录') {
              router.push('/delivery-records');
            }
          }}
        />
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
