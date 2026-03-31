import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type BorrowingSummaryProps = {
  dueSoonCount?: number;
  focus?: string;
  headline?: string;
  renewableCount?: number;
  totalCount?: number;
};

export function BorrowingSummary({
  dueSoonCount = 2,
  focus = '时间简史 · 今天 21:00',
  headline = '借阅任务中心',
  renewableCount = 3,
  totalCount = 6,
}: BorrowingSummaryProps) {
  const { theme } = useAppTheme();
  const statPalettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.warningSoft, color: theme.colors.warning },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  ] as const;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.lg,
        padding: theme.spacing.xl,
      }}>
      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.heading,
            fontSize: 28,
          }}>
          {headline}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {[
          { label: '当前借阅', value: `${totalCount} 本` },
          { label: '即将到期', value: `${dueSoonCount} 本` },
          { label: '可续借', value: `${renewableCount} 本` },
        ].map((item, index) => {
          const palette = statPalettes[index % statPalettes.length];

          return (
            <View
              key={item.label}
              style={{
                backgroundColor: palette.backgroundColor,
                borderRadius: theme.radii.md,
                flex: 1,
                gap: 6,
                padding: theme.spacing.md,
              }}>
              <Text
                style={{
                  color: palette.color,
                  ...theme.typography.bold,
                  fontSize: 18,
                  fontVariant: ['tabular-nums'],
                }}>
                {item.value}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.body,
                  fontSize: 12,
                }}>
                {item.label}
              </Text>
            </View>
          );
        })}
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
        <Text
          style={{
            color: theme.colors.warning,
            ...theme.typography.medium,
            fontSize: 11,
            letterSpacing: 0.2,
            textTransform: 'uppercase',
          }}>
          今晚最该先处理
        </Text>
        <Text
          style={{
            color: theme.colors.text,
            ...theme.typography.medium,
            fontSize: 14,
            lineHeight: 20,
          }}>
          {focus}
        </Text>
      </View>
    </View>
  );
}
