import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';

import {
  LoadingSkeletonCard,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { JourneyStageRail } from '@/components/borrowing/journey-stage-rail';
import { StateMessageCard } from '@/components/base/state-message-card';
import { ProtectedRoute } from '@/components/navigation/protected-route';
import { PageShell } from '@/components/navigation/page-shell';
import { useReturnRequestDetailQuery } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { buildBorrowOrderJourney } from '@/lib/borrowing/order-journey';
import { getJourneyTonePalette } from '@/lib/borrowing/journey-palette';
import { describeReturnRequestStatus } from '@/lib/borrowing/return-request-status';

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
  const detail = detailQuery.data;
  const requestStatusCopy = detail ? describeReturnRequestStatus(detail.returnRequest.status) : null;
  const orderJourney = detail ? buildBorrowOrderJourney(detail.order) : null;
  const requestPalette = requestStatusCopy ? getJourneyTonePalette(requestStatusCopy.tone, theme) : null;
  const journeyPalette = orderJourney ? getJourneyTonePalette(orderJourney.tone, theme) : null;

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
        {!detail && !detailQuery.isError && Boolean(detailQuery.isFetching) ? (
          <ReturnRequestDetailSkeleton />
        ) : detail ? (
          <View style={{ gap: theme.spacing.lg }}>
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.lg,
                padding: theme.spacing.xl,
              }}>
              <View style={{ gap: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 18 }}>
                  {detail.order.book.title}
                </Text>
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  借阅单 #{detail.order.id} · {detail.order.dueDateLabel}
                </Text>
              </View>

              {requestStatusCopy && requestPalette ? (
                <View
                  style={{
                    backgroundColor: requestPalette.accentSoft,
                    borderColor: requestPalette.border,
                    borderRadius: theme.radii.xl,
                    borderWidth: 1,
                    gap: theme.spacing.lg,
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
                      Return Progress
                    </Text>
                    <Text
                      style={{
                        color: requestPalette.accent,
                        ...theme.typography.heading,
                        fontSize: 26,
                      }}>
                      {requestStatusCopy.label}
                    </Text>
                    <Text
                      style={{
                        color: theme.colors.textMuted,
                        ...theme.typography.body,
                        fontSize: 14,
                        lineHeight: 21,
                      }}>
                        {requestStatusCopy.description}
                      </Text>
                  </View>

                  {detail.returnRequest.status === 'completed' ? (
                    <EditorialIllustration
                      height={156}
                      source={appArtwork.notionReturnSuccess}
                      testID="return-request-success-artwork"
                    />
                  ) : null}

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceTint,
                        borderColor: theme.colors.borderSoft,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        minWidth: 132,
                        padding: theme.spacing.md,
                      }}>
                      <Text style={{ color: theme.colors.textSoft, ...theme.typography.semiBold, fontSize: 12 }}>
                        请求编号
                      </Text>
                      <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 16, marginTop: 4 }}>
                        #{detail.returnRequest.id}
                      </Text>
                    </View>
                    <View
                      style={{
                        backgroundColor: theme.colors.surfaceTint,
                        borderColor: theme.colors.borderSoft,
                        borderRadius: theme.radii.lg,
                        borderWidth: 1,
                        flex: 1,
                        minWidth: 180,
                        padding: theme.spacing.md,
                      }}>
                      <Text style={{ color: theme.colors.textSoft, ...theme.typography.semiBold, fontSize: 12 }}>
                        当前备注
                      </Text>
                      <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13, lineHeight: 19, marginTop: 4 }}>
                        {detail.returnRequest.note ?? '暂时没有额外备注。'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </View>

            {orderJourney && journeyPalette ? (
              <View style={{ gap: theme.spacing.md }}>
                <SectionTitle title="借阅旅程" />
                <View
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.borderStrong,
                    borderRadius: theme.radii.lg,
                    borderWidth: 1,
                    gap: theme.spacing.lg,
                    padding: theme.spacing.xl,
                  }}>
                  <View
                    style={{
                      backgroundColor: journeyPalette.accentSoft,
                      borderColor: journeyPalette.border,
                      borderRadius: theme.radii.xl,
                      borderWidth: 1,
                      gap: theme.spacing.lg,
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
                          color: orderJourney.variant === 'timeline' ? journeyPalette.accent : theme.colors.text,
                          ...theme.typography.heading,
                          fontSize: 26,
                        }}>
                        {orderJourney.variant === 'timeline' ? orderJourney.currentStageLabel : orderJourney.label}
                      </Text>
                      <Text
                        style={{
                          color: theme.colors.textMuted,
                          ...theme.typography.body,
                          fontSize: 14,
                          lineHeight: 21,
                        }}>
                        {orderJourney.variant === 'timeline'
                          ? orderJourney.currentStageDescription
                          : orderJourney.description}
                      </Text>
                    </View>

                    {orderJourney.variant === 'timeline' ? (
                      <JourneyStageRail accentColor={journeyPalette.accent} stages={orderJourney.stages} />
                    ) : null}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
        ) : null}
      </PageShell>
    </ProtectedRoute>
  );
}
