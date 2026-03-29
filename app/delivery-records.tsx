import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useActiveOrdersQuery, useOrderHistoryQuery } from '@/hooks/use-library-app-data';

export default function DeliveryRecordsRoute() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const activeOrdersQuery = useActiveOrdersQuery();
  const orderHistoryQuery = useOrderHistoryQuery();
  const activeOrders = activeOrdersQuery.data ?? [];
  const historyOrders = orderHistoryQuery.data ?? [];
  const deliveryError = activeOrdersQuery.error ?? orderHistoryQuery.error;

  return (
    <ProtectedRoute>
      <PageShell headerTitle="配送记录" mode="workspace" showBackButton>
        {deliveryError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(deliveryError, '配送记录暂时不可用，请检查 orders 接口。')}
            title="配送联调失败"
            tone="danger"
          />
        ) : null}
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="进行中" />
          {activeOrders.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: 6,
                padding: theme.spacing.lg,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                {order.book.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                {order.statusLabel} · {order.mode === 'robot_delivery' ? '机器人配送' : '到柜自取'}
              </Text>
              <PillButton
                href={undefined}
                label="查看状态"
                onPress={() => router.push(`/orders/${order.id}`)}
                variant="soft"
              />
            </View>
          ))}
          {activeOrders.length === 0 && !activeOrdersQuery.isError ? (
            <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
              当前没有进行中的配送或到柜取书记录。
            </Text>
          ) : null}
        </View>
        <View style={{ gap: theme.spacing.lg }}>
          <SectionTitle title="历史记录" />
          {historyOrders.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: 6,
                padding: theme.spacing.lg,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                {order.book.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                {order.statusLabel} · {order.dueDateLabel}
              </Text>
            </View>
          ))}
        </View>
      </PageShell>
    </ProtectedRoute>
  );
}
