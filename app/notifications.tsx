import React from 'react';
import { Text, View } from 'react-native';

import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNotificationsQuery } from '@/hooks/use-library-app-data';

export default function NotificationsRoute() {
  const { theme } = useAppTheme();
  const notificationsQuery = useNotificationsQuery();
  const kindLabel = (kind: string) => {
    if (kind === 'delivery') {
      return '配送提醒';
    }
    if (kind === 'borrowing') {
      return '借阅提醒';
    }
    if (kind === 'achievement') {
      return '成就更新';
    }
    return '系统通知';
  };

  return (
    <ProtectedRoute>
      <PageShell headerTitle="消息通知" mode="workspace" showBackButton>
        <View style={{ gap: theme.spacing.md }}>
          {notificationsQuery.isError ? (
            <StateMessageCard
              description={getLibraryErrorMessage(notificationsQuery.error, '通知中心暂时不可用，请检查 notifications 接口。')}
              title="通知联调失败"
              tone="danger"
            />
          ) : null}
          {notificationsQuery.data?.map((item) => (
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
          ))}
          {notificationsQuery.data?.length === 0 && !notificationsQuery.isError ? (
            <StateMessageCard
              description="借阅状态、推荐更新和成就提醒会出现在这里。"
              title="暂时没有新消息"
            />
          ) : null}
        </View>
      </PageShell>
    </ProtectedRoute>
  );
}
