import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import {
  useCancelBorrowOrderMutation,
  useOrderDetailQuery,
  useRenewBorrowOrderMutation,
  useReturnRequestMutation,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';

export default function OrderDetailRoute() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const orderQuery = useOrderDetailQuery(orderId);
  const cancelMutation = useCancelBorrowOrderMutation();
  const renewMutation = useRenewBorrowOrderMutation();
  const returnRequestMutation = useReturnRequestMutation();
  const router = useRouter();
  const { theme } = useAppTheme();
  const [actionError, setActionError] = React.useState<string | null>(null);

  if (!orderQuery.data) {
    return (
      <ProtectedRoute>
        <PageShell headerTitle="借阅状态" mode="task" showBackButton>
          {orderQuery.isError ? (
            <StateMessageCard
              description={getLibraryErrorMessage(orderQuery.error, '订单详情暂时不可用，请检查 orders 接口。')}
              title="订单联调失败"
              tone="danger"
            />
          ) : null}
        </PageShell>
      </ProtectedRoute>
    );
  }

  const order = orderQuery.data;
  const canCancel = order.status === 'active' || order.status === 'renewable' || order.status === 'dueSoon';
  const canReturn = order.status !== 'completed' && order.status !== 'cancelled';

  return (
    <ProtectedRoute>
      <PageShell
        headerDescription={`${order.book.title} · ${order.statusLabel}`}
        headerTitle="借阅状态"
        mode="workspace"
        showBackButton>
        {actionError ? (
          <StateMessageCard description={actionError} title="操作没有完成" tone="danger" />
        ) : null}

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.sm,
            padding: theme.spacing.xl,
          }}>
          <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 16 }}>
            {order.book.title}
          </Text>
          <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
            {order.mode === 'robot_delivery' ? '机器人配送' : '到柜自取'} · {order.dueDateLabel}
          </Text>
          <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13, lineHeight: 19 }}>
            {order.note || '订单状态由后端履约流转驱动。'}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            {order.renewable ? (
              <PillButton
                href={undefined}
                label={renewMutation.isPending ? '续借中…' : '立即续借'}
                onPress={async () => {
                  try {
                    setActionError(null);
                    await renewMutation.mutateAsync(order.id);
                  } catch (error) {
                    setActionError(getLibraryErrorMessage(error, '续借失败，请稍后重试。'));
                  }
                }}
                variant="accent"
              />
            ) : null}
            {canReturn ? (
              <PillButton
                href={undefined}
                label={returnRequestMutation.isPending ? '提交中…' : '发起归还'}
                onPress={async () => {
                  try {
                    setActionError(null);
                    await returnRequestMutation.mutateAsync(order.id);
                    router.push('/(tabs)/borrowing');
                  } catch (error) {
                    setActionError(getLibraryErrorMessage(error, '归还请求提交失败，请稍后重试。'));
                  }
                }}
                variant="soft"
              />
            ) : null}
            {canCancel ? (
              <PillButton
                href={undefined}
                label={cancelMutation.isPending ? '取消中…' : '取消借阅'}
                onPress={async () => {
                  try {
                    setActionError(null);
                    await cancelMutation.mutateAsync(order.id);
                  } catch (error) {
                    setActionError(getLibraryErrorMessage(error, '取消借阅失败，请稍后重试。'));
                  }
                }}
                variant="soft"
              />
            ) : null}
          </View>
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
          }}>
          {order.timeline.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
              <View
                style={{
                  backgroundColor: item.completed ? theme.colors.primaryStrong : theme.colors.borderStrong,
                  borderRadius: theme.radii.pill,
                  height: 8,
                  marginTop: 6,
                  width: 8,
                }}
              />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                  {item.label}
                </Text>
                {item.timestamp ? (
                  <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 12 }}>
                    {item.timestamp}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </PageShell>
    </ProtectedRoute>
  );
}
