import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { SectionTitle } from '@/components/base/section-title';
import { CollectionPreview } from '@/components/me/collection-preview';
import { MenuList } from '@/components/me/menu-list';
import { ProfileSummaryCard } from '@/components/me/profile-summary-card';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';
import { collectionPreview, meFocus, meMenus } from '@/lib/app/mock-data';

export default function MeRoute() {
  const { theme } = useAppTheme();
  const router = useRouter();

  return (
    <PageShell mode="task">
      <View style={{ gap: theme.spacing.md }}>
        <Text
          style={{
            color: theme.colors.textSoft,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}>
          Workspace
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 30,
            letterSpacing: -0.7,
          }}>
          我的
        </Text>
        <Text
          style={{
            color: theme.colors.textMuted,
            ...theme.typography.body,
            fontSize: 14,
            lineHeight: 20,
          }}>
          把提醒、收藏和画像入口收在一个更清楚的工作台里，先处理今晚最该处理的事。
        </Text>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="先处理最影响今晚节奏的两件事。" title="今日提醒" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {meFocus.map((item, index) => (
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

      <ProfileSummaryCard onProfilePress={() => router.push('/profile')} />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="把想借、待看和进行中的记录分开放，决策会更轻。" title="收藏与书单" />
        <CollectionPreview items={collectionPreview} />
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="常用入口" />
        <MenuList
          items={meMenus}
          onPressItem={(title) => {
            if (title === '个人中心') {
              router.push('/profile');
            }
          }}
        />
      </View>
    </PageShell>
  );
}
