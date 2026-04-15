import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { toast } from 'sonner-native';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { DeliveryTrackingHero } from '@/components/borrowing/delivery-tracking-hero';
import { DueStateChip } from '@/components/borrowing/due-state-chip';
import { JourneyStageRail } from '@/components/borrowing/journey-stage-rail';
import { PageShell } from '@/components/navigation/page-shell';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import {
  useCancelBorrowOrderMutation,
  useOrderDetailQuery,
  useRenewBorrowOrderMutation,
  useReturnRequestMutation,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { buildMockDeliveryTracking } from '@/lib/borrowing/order-delivery-tracking';
import { buildBorrowOrderJourney } from '@/lib/borrowing/order-journey';
import { getJourneyTonePalette } from '@/lib/borrowing/journey-palette';

function OrderDetailSkeleton() {
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: theme.spacing.lg }} testID="order-detail-skeleton">
      <LoadingSkeletonCard>
        <LoadingSkeletonText lineHeight={22} widths={['72%']} />
        <LoadingSkeletonBlock height={14} width="36%" />
        <LoadingSkeletonBlock borderRadius={theme.radii.md} height={28} width="22%" />
        <LoadingSkeletonText lineHeight={13} widths={['58%', '44%']} />
      </LoadingSkeletonCard>
      <LoadingSkeletonCard>
        <LoadingSkeletonBlock height={14} width="28%" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="32%" />
          <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={46} width="32%" />
        </View>
      </LoadingSkeletonCard>
      <LoadingSkeletonCard>
        <LoadingSkeletonText lineHeight={14} widths={['36%', '28%', '44%']} />
      </LoadingSkeletonCard>
    </View>
  );
}

export default function OrderDetailRoute() {
  const params = useLocalSearchParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const orderQuery = useOrderDetailQuery(orderId);
  const cancelMutation = useCancelBorrowOrderMutation();
  const renewMutation = useRenewBorrowOrderMutation();
  const returnRequestMutation = useReturnRequestMutation();
  const router = useRouter();
  const { theme } = useAppTheme();

  const showSkeleton = !orderQuery.data && !orderQuery.isError && Boolean(orderQuery.isFetching);
  const order = orderQuery.data;
  const hasActions = order ? (order.renewable || order.returnable || order.cancellable) : false;
  const deliveryTracking = order ? buildMockDeliveryTracking(order) : null;
  const journey = order ? buildBorrowOrderJourney(order) : null;
  const journeyPalette = journey ? getJourneyTonePalette(journey.tone, theme) : null;

  return (
    <ProtectedRoute>
      <PageShell mode="workspace" pageTitle="借阅状态">
        {orderQuery.isError ? (
          <StateMessageCard
            description={getLibraryErrorMessage(orderQuery.error, '订单详情暂时不可用，请检查 orders 接口。')}
            title="订单联调失败"
            tone="danger"
          />
        ) : null}

        {showSkeleton ? (
          <OrderDetailSkeleton />
        ) : order ? (
          <>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.md,
                padding: theme.spacing.xl,
              }}>
              <View style={{ gap: theme.spacing.lg }}>
                <View style={{ gap: theme.spacing.sm }}>
                  <Text style={{ color: theme.colors.text, ...theme.typography.heading, fontSize: 20 }}>
                    {order.book.title}
                  </Text>
                  <Text style={{ color: theme.colors.textMuted, ...theme.typography.medium, fontSize: 14 }}>
                    {order.book.author}
                  </Text>
                  <View style={{ alignItems: 'flex-start', flexDirection: 'row', gap: theme.spacing.sm }}>
                    <DueStateChip state={order.status} />
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: theme.colors.surfaceMuted,
                        borderColor: theme.colors.borderSoft,
                        borderRadius: theme.radii.md,
                        borderWidth: 1,
                        paddingHorizontal: 8,
                        paddingVertical: 5,
                      }}>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          ...theme.typography.semiBold,
                          fontSize: 12,
                        }}>
                        {order.mode === 'robot_delivery' ? '机器人配送' : '到柜自取'}
                      </Text>
                    </View>
                  </View>
                </View>

                {order.note ? (
                  <Text style={{ color: theme.colors.textSoft, ...theme.typography.body, fontSize: 13, lineHeight: 19 }}>
                    {order.note}
                  </Text>
                ) : null}

                <View style={{ paddingTop: theme.spacing.xs }}>
                  <PillButton href={`/books/${order.book.id}?minimal=true`} label="查看图书详情" variant="glass" />
                </View>
              </View>
            </View>

            {deliveryTracking ? <DeliveryTrackingHero tracking={deliveryTracking} /> : null}

            {journey && journeyPalette ? (
              <View
                style={{
                  backgroundColor: journeyPalette.accentSoft,
                  borderColor: journeyPalette.border,
                  borderRadius: theme.radii.xl,
                  borderWidth: 1,
                  gap: theme.spacing.lg,
                  overflow: 'hidden',
                  padding: theme.spacing.xl,
                }}>
                <View style={{ gap: theme.spacing.xs }}>
                  <Text
                    style={{
                      color: theme.colors.textSoft,
                      ...theme.typography.semiBold,
                      fontSize: 11,
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                    }}>
                    Borrow Journey
                  </Text>
                  <Text
                    style={{
                      color: journey.variant === 'timeline' ? journeyPalette.accent : theme.colors.text,
                      ...theme.typography.heading,
                      fontSize: 28,
                    }}>
                    {journey.variant === 'timeline' ? journey.currentStageLabel : journey.label}
                  </Text>
                  <Text
                    style={{
                      color: theme.colors.textMuted,
                      ...theme.typography.body,
                      fontSize: 14,
                      lineHeight: 21,
                    }}>
                    {journey.variant === 'timeline' ? journey.currentStageDescription : journey.description}
                  </Text>
                </View>

                {journey.variant === 'timeline' ? (
                  <JourneyStageRail accentColor={journeyPalette.accent} stages={journey.stages} />
                ) : (
                  <View
                    style={{
                      backgroundColor: theme.colors.surfaceTint,
                      borderColor: theme.colors.borderSoft,
                      borderRadius: theme.radii.lg,
                      borderWidth: 1,
                      gap: theme.spacing.sm,
                      padding: theme.spacing.lg,
                    }}>
                    <Text style={{ color: theme.colors.textSoft, ...theme.typography.semiBold, fontSize: 12 }}>
                      状态说明
                    </Text>
                    <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13, lineHeight: 19 }}>
                      你可以返回借阅列表，重新发起新的借阅订单。
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            {hasActions ? (
              <View
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.borderStrong,
                  borderRadius: theme.radii.lg,
                  borderWidth: 1,
                  gap: theme.spacing.md,
                  padding: theme.spacing.xl,
                }}>
                <SectionTitle title={journey?.variant === 'timeline' ? '下一步操作' : '可用操作'} />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                  {order.renewable ? (
                    <PillButton
                      href={undefined}
                      label={renewMutation.isPending ? '续借中…' : '立即续借'}
                      onPress={async () => {
                        try {
                          await renewMutation.mutateAsync(order.id);
                          toast.success('续借成功');
                        } catch (error) {
                          toast.error(getLibraryErrorMessage(error, '续借失败，请稍后重试。'));
                        }
                      }}
                      variant="accent"
                    />
                  ) : null}
                  {order.returnable ? (
                    <PillButton
                      href={undefined}
                      label={returnRequestMutation.isPending ? '提交中…' : '发起归还'}
                      onPress={async () => {
                        try {
                          await returnRequestMutation.mutateAsync(order.id);
                          toast.success('归还请求已提交');
                          router.push('/(tabs)/borrowing');
                        } catch (error) {
                          toast.error(getLibraryErrorMessage(error, '归还请求提交失败，请稍后重试。'));
                        }
                      }}
                      variant="soft"
                    />
                  ) : null}
                  {order.cancellable ? (
                    <PillButton
                      href={undefined}
                      label={cancelMutation.isPending ? '取消中…' : '取消借阅'}
                      onPress={async () => {
                        try {
                          await cancelMutation.mutateAsync(order.id);
                          toast.success('借阅已取消');
                        } catch (error) {
                          toast.error(getLibraryErrorMessage(error, '取消借阅失败，请稍后重试。'));
                        }
                      }}
                      variant="soft"
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
