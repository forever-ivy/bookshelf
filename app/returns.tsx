import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useActiveOrdersQuery, useReturnRequestMutation } from '@/hooks/use-library-app-data';

export default function ReturnsRoute() {
  const { theme } = useAppTheme();
  const activeOrdersQuery = useActiveOrdersQuery();
  const returnRequestMutation = useReturnRequestMutation();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const returnsError = activeOrdersQuery.error ?? returnRequestMutation.error;

  return (
    <ProtectedRoute>
      <PageShell headerTitle="归还与整理请求" mode="workspace" showBackButton>
        {returnsError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(returnsError, '归还请求暂时不可用，请检查 orders 接口。')}
            title="归还联调失败"
            tone="danger"
          />
        ) : null}
        {submitError ? (
          <StateMessageCard description={submitError} title="请求没有完成" tone="danger" />
        ) : null}
        <View style={{ gap: theme.spacing.lg }}>
          {activeOrdersQuery.data?.map((order) => (
            <View
              key={order.id}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                {order.book.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                {order.statusLabel} · {order.dueDateLabel}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                {order.note}
              </Text>
              <PillButton
                href={undefined}
                label={returnRequestMutation.isPending ? '请求中…' : '发起归还请求'}
                onPress={async () => {
                  try {
                    setSubmitError(null);
                    await returnRequestMutation.mutateAsync(order.id);
                  } catch (error) {
                    setSubmitError(getLibraryErrorMessage(error, '归还请求提交失败，请稍后重试。'));
                  }
                }}
                variant="accent"
              />
            </View>
          ))}
          {activeOrdersQuery.data?.length === 0 && !activeOrdersQuery.isError ? (
            <StateMessageCard
              description="等你完成新的借阅后，这里会显示归还与整理请求入口。"
              title="当前没有可归还的借阅"
            />
          ) : null}
        </View>
      </PageShell>
    </ProtectedRoute>
  );
}
