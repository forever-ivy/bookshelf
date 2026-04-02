import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type BorrowingSummaryProps = {
  dueSoonCount?: number;
  headline?: string;
  renewableCount?: number;
  totalCount?: number;
};

export function BorrowingSummary({
  dueSoonCount = 2,
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
          { label: '进行中借阅', value: `${totalCount} 本` },
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
    </View>
  );
}
