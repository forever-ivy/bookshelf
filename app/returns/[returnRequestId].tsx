import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import {
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { useReturnRequestDetailQuery } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';

function ReturnRequestDetailSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }} testID="return-detail-skeleton">
      <LoadingSkeletonCard>
        <LoadingSkeletonText lineHeight={16} widths={['58%', '42%', '38%']} />
      </LoadingSkeletonCard>
      <View style={{ gap: theme.spacing.md }}>
        <SectionTitle title="履约时间线" />
        <LoadingSkeletonCard>
          <LoadingSkeletonText lineHeight={14} widths={['34%', '26%', '42%']} />
          <LoadingSkeletonText lineHeight={12} widths={['48%', '34%', '52%']} />
        </LoadingSkeletonCard>
      </View>
    </View>
  );
}

export default function ReturnRequestDetailRoute() {
  const params = useLocalSearchParams<{ returnRequestId?: string }>();
  const returnRequestId = Number(params.returnRequestId);
  const detailQuery = useReturnRequestDetailQuery(returnRequestId);
  const { theme } = useAppTheme();

  return (
    <ProtectedRoute>
      <PageShell mode="workspace">
        {detailQuery.isError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(detailQuery.error, '归还请求详情暂时不可用，请检查 orders 接口。')}
            title="归还请求联调失败"
            tone="danger"
          />
        ) : null}
        {!detailQuery.data && !detailQuery.isError && Boolean(detailQuery.isFetching) ? (
          <ReturnRequestDetailSkeleton />
        ) : detailQuery.data ? (
          <View style={{ gap: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.xl,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 18 }}>
                {detailQuery.data.order.book.title}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                归还请求 #{detailQuery.data.returnRequest.id} · 状态 {detailQuery.data.returnRequest.status}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                借阅单 #{detailQuery.data.order.id} · {detailQuery.data.order.dueDateLabel}
              </Text>
              {detailQuery.data.returnRequest.note ? (
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  {detailQuery.data.returnRequest.note}
                </Text>
              ) : null}
            </View>

            <View style={{ gap: theme.spacing.md }}>
              <SectionTitle title="履约时间线" />
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: theme.spacing.md,
                  padding: theme.spacing.lg,
                }}>
                {detailQuery.data.order.timeline.map((item) => (
                  <View key={item.label} style={{ gap: 4 }}>
                    <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 14 }}>
                      {item.label}
                    </Text>
                    {item.timestamp ? (
                      <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 12 }}>
                        {item.timestamp}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
