import React from 'react';
import { Text, View } from 'react-native';

import { EditorialIllustration } from '@/components/base/editorial-illustration';
import { SectionTitle } from '@/components/base/section-title';
import { BorrowingCard } from '@/components/borrowing/borrowing-card';
import { BorrowingSummary } from '@/components/borrowing/borrowing-summary';
import { PageShell } from '@/components/navigation/page-shell';
import { appArtwork } from '@/lib/app/artwork';
import {
  borrowingHistory,
  currentBorrowings,
  dueSoonBorrowings,
} from '@/lib/app/mock-data';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function BorrowingRoute() {
  const { theme } = useAppTheme();

  return (
    <PageShell insetBottom={112} mode="task">
      <BorrowingSummary />

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="把最常处理的借阅放在最前面。" title="当前借阅" />
        <View style={{ gap: theme.spacing.lg }}>
          {currentBorrowings.map((item) => (
            <BorrowingCard key={item.title} {...item} />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="这些图书建议你优先处理。" title="即将到期" />
        <View style={{ gap: theme.spacing.lg }}>
          {dueSoonBorrowings.map((item) => (
            <BorrowingCard key={item.title} {...item} />
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle description="保留你的阅读轨迹，但不抢当前任务的焦点。" title="历史借阅" />
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            overflow: 'hidden',
          }}>
          {borrowingHistory.map((item, index) => (
            <View
              key={item.title}
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
                {item.title}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 12,
                }}>
                {item.meta}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: theme.spacing.lg }}>
        <SectionTitle
          description="完成借阅后，系统会把成功记录、后续提醒和下一步阅读动作继续串起来。"
          eyebrow="Flow"
          title="借阅闭环"
        />
        <EditorialIllustration
          height={176}
          source={appArtwork.notionBorrowSuccess}
          testID="borrowing-artwork"
        />
      </View>
    </PageShell>
  );
}
