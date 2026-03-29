import React from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { StateMessageCard } from '@/components/base/state-message-card';
import { BorrowingCard } from '@/components/borrowing/borrowing-card';
import { BorrowingSummary } from '@/components/borrowing/borrowing-summary';
import { PageShell } from '@/components/navigation/page-shell';
import { getLibraryErrorMessage } from '@/lib/api/client';
import { appArtwork } from '@/lib/app/artwork';
import { useActiveOrdersQuery, useOrderHistoryQuery, useRenewBorrowOrderMutation } from '@/hooks/use-library-app-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function BorrowingRoute() {
  const activeOrdersQuery = useActiveOrdersQuery();
  const historyOrdersQuery = useOrderHistoryQuery();
  const renewMutation = useRenewBorrowOrderMutation();
  const router = useRouter();
  const { theme } = useAppTheme();
  const borrowingError = activeOrdersQuery.error ?? historyOrdersQuery.error ?? renewMutation.error;
  const activeOrders = activeOrdersQuery.data ?? [];
  const dueSoonOrders = activeOrders.filter((item) => item.status === 'dueSoon' || item.status === 'overdue');
  const currentOrders = activeOrders.filter((item) => item.status !== 'dueSoon' && item.status !== 'overdue');
  const historyOrders = historyOrdersQuery.data ?? [];
  const focusLabel = dueSoonOrders[0]
    ? `${dueSoonOrders[0].book.title} · ${dueSoonOrders[0].dueDateLabel}`
    : activeOrders[0]?.note ?? '当前没有需要优先处理的借阅事项';

  return (
    <PageShell headerTitle="借阅" insetBottom={112} mode="task">
      <BorrowingSummary
        dueSoonCount={dueSoonOrders.length}
        focus={focusLabel}
        renewableCount={activeOrders.filter((item) => item.renewable).length}
        totalCount={activeOrders.length}
      />

      {borrowingError ? (
        <StateMessageCard
          description={getLibraryErrorMessage(borrowingError, '借阅状态暂时同步失败，请确认 orders 接口可访问。')}
          title="借阅联调失败"
          tone="danger"
        />
      ) : null}

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="当前借阅" />
        <View style={{ gap: theme.spacing.lg }}>
          {currentOrders.map((item) => (
            <BorrowingCard
              key={item.id}
              actionLabel={item.renewable ? '立即续借' : item.actionableLabel}
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
          {currentOrders.length === 0 && !activeOrdersQuery.isError ? (
            <StateMessageCard
              description="去首页或找书页挑一本适合今晚开始的书吧。"
              title="当前没有进行中的借阅"
            />
          ) : null}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle title="即将到期" />
        <View style={{ gap: theme.spacing.lg }}>
          {dueSoonOrders.map((item) => (
            <BorrowingCard
              key={item.id}
              actionLabel="发起归还请求"
              author={item.book.author}
              coverTone={item.book.coverTone}
              dueDate={item.dueDateLabel}
              note={item.note}
              onPress={() => router.push('/returns')}
              status={item.status}
              title={item.book.title}
            />
          ))}
          {dueSoonOrders.length === 0 && !activeOrdersQuery.isError ? (
            <StateMessageCard description="当前借阅都还在安全借期内。" title="暂时没有临近到期的借阅" />
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
          {historyOrders.map((item, index) => (
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
          {historyOrders.length === 0 && !historyOrdersQuery.isError ? (
            <View style={{ padding: theme.spacing.lg }}>
              <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13 }}>
                还没有历史借阅记录。
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
