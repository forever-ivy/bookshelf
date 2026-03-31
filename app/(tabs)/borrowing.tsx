import React from 'react';
import { Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import {
  LoadingSkeletonBlock,
  LoadingSkeletonCard,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { BorrowingCard } from '@/components/borrowing/borrowing-card';
import { BorrowingCardSkeleton } from '@/components/borrowing/borrowing-card-skeleton';
import { BorrowingSummary } from '@/components/borrowing/borrowing-summary';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import {
  useBorrowOrdersQuery,
  useCancelBorrowOrderMutation,
  useRenewBorrowOrderMutation,
  useReturnRequestMutation,
  useReturnRequestsQuery,
} from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';

const statusFilters = [
  { label: '全部', value: null },
  { label: '借阅中', value: 'active' },
  { label: '可续借', value: 'renewable' },
  { label: '即将到期', value: 'dueSoon' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
] as const;

function BorrowingSummarySkeleton() {
  const { theme } = useAppTheme();

  return (
    <LoadingSkeletonCard style={{ gap: theme.spacing.lg }} testID="borrowing-summary-skeleton">
      <LoadingSkeletonBlock height={28} width="42%" />
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {Array.from({ length: 3 }, (_, index) => (
          <View
            key={`borrowing-summary-skeleton-${index}`}
            style={{
              backgroundColor:
                index === 0
                  ? theme.colors.primarySoft
                  : index === 1
                    ? theme.colors.warningSoft
                    : theme.colors.successSoft,
              borderRadius: theme.radii.md,
              flex: 1,
              gap: 6,
              padding: theme.spacing.md,
            }}>
            <LoadingSkeletonBlock height={18} width="54%" />
            <LoadingSkeletonBlock height={12} width="48%" />
          </View>
        ))}
      </View>
      <View
        style={{
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.md,
          borderWidth: 1,
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
        }}>
        <LoadingSkeletonBlock height={10} width={96} />
        <LoadingSkeletonBlock height={14} width="72%" />
      </View>
    </LoadingSkeletonCard>
  );
}

export default function BorrowingRoute() {
  const [activeOnly, setActiveOnly] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<(typeof statusFilters)[number]['value']>(null);
  const ordersQuery = useBorrowOrdersQuery({ activeOnly, status: statusFilter });
  const cancelMutation = useCancelBorrowOrderMutation();
  const renewMutation = useRenewBorrowOrderMutation();
  const returnRequestMutation = useReturnRequestMutation();
  const returnRequestsQuery = useReturnRequestsQuery();
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const allOrdersQuery = useBorrowOrdersQuery();
  const router = useRouter();
  const { theme } = useAppTheme();
  const borrowingError = ordersQuery.error ?? renewMutation.error ?? cancelMutation.error;
  const visibleOrders = ordersQuery.data ?? [];
  const activeOrders = visibleOrders.filter((item) =>
    ['active', 'dueSoon', 'overdue', 'renewable'].includes(item.status)
  );
  const dueSoonOrders = activeOrders.filter((item) => item.status === 'dueSoon' || item.status === 'overdue');
  const currentOrders = activeOrders.filter((item) => item.status !== 'dueSoon' && item.status !== 'overdue');
  const historyOrders = visibleOrders.filter((item) => item.status === 'completed' || item.status === 'cancelled');
  const focusLabel = dueSoonOrders[0]
    ? `${dueSoonOrders[0].book.title} · ${dueSoonOrders[0].dueDateLabel}`
    : activeOrders[0]?.note ?? '当前没有需要优先处理的借阅事项';

  // 还书相关数据
  const returnRequests = returnRequestsQuery.data ?? [];

  // 配送记录数据
  const deliveryActive = (allOrdersQuery.data ?? []).filter((item) =>
    ['active', 'dueSoon', 'overdue', 'renewable'].includes(item.status)
  );
  const isBorrowingLoading =
    (!ordersQuery.data && Boolean(ordersQuery.isFetching)) ||
    (!allOrdersQuery.data && Boolean(allOrdersQuery.isFetching)) ||
    (!returnRequestsQuery.data && Boolean(returnRequestsQuery.isFetching));
  const pendingTaskItems = [
    ...dueSoonOrders.map((item) => ({
      description: item.note,
      dueDate: item.dueDateLabel,
      id: `due-${item.id}`,
      label: item.statusLabel,
      title: item.book.title,
      type: 'order' as const,
    })),
    ...returnRequests.map((item) => ({
      description: item.note ?? '归还申请已提交，等待馆内处理。',
      dueDate: item.borrowOrderStatus ?? '等待处理',
      id: `return-${item.id}`,
      label: item.status,
      title: `归还请求 #${item.id}`,
      type: 'return' as const,
    })),
  ];

  return (
    <PageShell headerTitle="借阅" insetBottom={112} mode="task">
      {isBorrowingLoading ? (
        <BorrowingSummarySkeleton />
      ) : (
        <BorrowingSummary
          dueSoonCount={dueSoonOrders.length}
          focus={focusLabel}
          headline="借阅任务中心"
          renewableCount={activeOrders.filter((item) => item.renewable).length}
          totalCount={activeOrders.length}
        />
      )}

      {borrowingError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(borrowingError, '借阅状态暂时同步失败，请确认 orders 接口可访问。')}
          title="借阅联调失败"
          tone="danger"
        />
      ) : null}

      {submitError ? (
        <StateMessageCard description={submitError} title="请求没有完成" tone="danger" />
      ) : null}

      <View style={{ gap: theme.spacing.md }}>
        <SectionTitle title="订单筛选" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveOnly((value) => !value)}
            style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
            <View
              style={{
                backgroundColor: activeOnly ? theme.colors.successSoft : theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.md,
                borderWidth: 1,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}>
              <Text style={{ color: activeOnly ? theme.colors.success : theme.colors.text, ...theme.typography.medium, fontSize: 13 }}>
                只看进行中
              </Text>
            </View>
          </Pressable>
          {statusFilters.map((item) => {
            const active = statusFilter === item.value;
            return (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => setStatusFilter(item.value)}
                style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
                <View
                  style={{
                    backgroundColor: active ? theme.colors.primarySoft : theme.colors.surface,
                    borderColor: theme.colors.borderStrong,
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}>
                  <Text
                    style={{
                      color: active ? theme.colors.primaryStrong : theme.colors.text,
                      ...theme.typography.medium,
                      fontSize: 13,
                    }}>
                    {item.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="进行中借阅" />
        <View style={{ gap: theme.spacing.lg }}>
          {isBorrowingLoading && currentOrders.length === 0
            ? Array.from({ length: 2 }, (_, index) => (
                <BorrowingCardSkeleton key={`borrowing-current-skeleton-${index}`} />
              ))
            : currentOrders.map((item) => (
            <BorrowingCard
              key={item.id}
              actionLabel={item.renewable ? '立即续借' : item.status === 'active' ? '查看详情' : item.actionableLabel}
              author={item.book.author}
              coverTone={item.book.coverTone}
              dueDate={item.dueDateLabel}
              note={item.note}
              onPress={() => {
                if (item.renewable) {
                  renewMutation.mutate(item.id);
                  return;
                }
                router.push(`/orders/${item.id}`);
              }}
              status={item.status}
              title={item.book.title}
            />
          ))}
          {currentOrders.length === 0 && !ordersQuery.isError && !isBorrowingLoading ? (
            <StateMessageCard
              description="去找书页看看当前可借的书，开始下一次借阅。"
              title="当前没有进行中的借阅"
            />
          ) : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="即将到期 / 需处理" />
        <View style={{ gap: theme.spacing.lg }}>
          {isBorrowingLoading && pendingTaskItems.length === 0
            ? Array.from({ length: 2 }, (_, index) => (
                <BorrowingCardSkeleton key={`borrowing-pending-skeleton-${index}`} />
              ))
            : dueSoonOrders.map((item) => (
            <BorrowingCard
              key={item.id}
              actionLabel="发起归还请求"
              author={item.book.author}
              coverTone={item.book.coverTone}
              dueDate={item.dueDateLabel}
              note={item.note}
              onPress={async () => {
                try {
                  setSubmitError(null);
                  await returnRequestMutation.mutateAsync(item.id);
                } catch (error) {
                  setSubmitError(getLibraryErrorMessage(error, '归还请求提交失败，请稍后重试。'));
                }
              }}
              status={item.status}
              title={item.book.title}
            />
          ))}
          {returnRequests.map((item) => (
            <View
              key={`rr-${item.id}`}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: theme.spacing.sm,
                padding: theme.spacing.lg,
              }}>
              <Text style={{ color: theme.colors.text, ...theme.typography.semiBold, fontSize: 15 }}>
                归还请求 #{item.id}
              </Text>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                当前状态 · {item.status}
              </Text>
              {item.note ? (
                <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                  {item.note}
                </Text>
              ) : null}
              <PillButton href={`/returns/${item.id}`} label="查看详情" variant="soft" />
            </View>
          ))}
          {pendingTaskItems.length === 0 && !ordersQuery.isError && !isBorrowingLoading ? (
            <StateMessageCard
              description="当前借阅都还在正常借期内，暂时没有需要额外处理的事项。"
              title="暂时没有待处理任务"
            />
          ) : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="配送与取书进度" />
        <View style={{ gap: theme.spacing.lg }}>
          {isBorrowingLoading && deliveryActive.length === 0
            ? Array.from({ length: 2 }, (_, index) => (
                <LoadingSkeletonCard key={`borrowing-delivery-skeleton-${index}`}>
                  <LoadingSkeletonBlock height={16} width="54%" />
                  <LoadingSkeletonBlock height={12} width="42%" />
                  <LoadingSkeletonBlock borderRadius={theme.radii.pill} height={42} width="38%" />
                </LoadingSkeletonCard>
              ))
            : deliveryActive.map((order) => (
            <View
              key={`dl-${order.id}`}
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderStrong,
                borderRadius: theme.radii.lg,
                borderWidth: 1,
                gap: 6,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {order.book.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 13,
                }}>
                {order.statusLabel} · {order.mode === 'robot_delivery' ? '配送中 / 待送达' : '到柜自取'}
              </Text>
              <PillButton href={undefined} label="查看状态" onPress={() => router.push(`/orders/${order.id}`)} variant="soft" />
            </View>
          ))}
          {deliveryActive.length === 0 && !allOrdersQuery.isError && !isBorrowingLoading ? (
            <StateMessageCard
              description="当前没有进行中的配送或到柜取书进度。"
              title="配送与取书进度会显示在这里"
            />
          ) : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="历史借阅" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {isBorrowingLoading && historyOrders.length === 0
            ? Array.from({ length: 2 }, (_, index) => (
                <View
                  key={`history-skeleton-${index}`}
                  style={{
                    borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                    borderTopWidth: index === 0 ? 0 : 1,
                    gap: 8,
                    padding: theme.spacing.lg,
                  }}>
                  <LoadingSkeletonBlock height={16} width="52%" />
                  <LoadingSkeletonBlock height={12} width="38%" />
                </View>
              ))
            : historyOrders.map((item, index) => (
            <View
              key={item.id}
              style={{
                borderTopColor: index === 0 ? 'transparent' : theme.colors.borderSoft,
                borderTopWidth: index === 0 ? 0 : 1,
                gap: 4,
                padding: theme.spacing.lg,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 15,
                }}>
                {item.book.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 12,
                }}>
                {item.statusLabel} · {item.dueDateLabel}
              </Text>
            </View>
          ))}
          {historyOrders.length === 0 && !ordersQuery.isError && !isBorrowingLoading ? (
            <View style={{ padding: theme.spacing.lg }}>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                还没有历史借阅记录，可以先去找书页挑一本开始。
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="借阅闭环" />
        <EditorialIllustration
          height={176}
          source={appArtwork.notionBorrowSuccess}
          testID="borrowing-artwork"
        />
      </View>
    </PageShell>
  );
}
