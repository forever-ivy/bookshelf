import React from 'react';
import { Platform, Text, View } from 'react-native';

import { GlassSurface } from '@/components/base/glass-surface';
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
    <GlassSurface
      intensity={typeof Platform !== 'undefined' && Platform.OS === 'ios' ? 40 : 100}
      style={{
        borderRadius: 28,
        gap: 28,
        padding: theme.spacing.xl,
        overflow: 'hidden',
        boxShadow: theme.shadows.card,
      }}>
      <Text
        style={{
          color: theme.colors.text,
          ...theme.typography.bold,
          fontSize: 28,
          letterSpacing: -0.5,
          marginBottom: 20,
        }}>
        {headline}
      </Text>
      
      <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
        {[
          { label: '进行中借阅', value: totalCount },
          { label: '即将到期', value: dueSoonCount },
          { label: '可续借', value: renewableCount },
        ].map((item, index) => {
          const palette = statPalettes[index % statPalettes.length];

          return (
            <View
              key={item.label}
              style={{
                backgroundColor: palette.backgroundColor,
                borderRadius: 20,
                flex: 1,
                gap: 4,
                paddingVertical: 18,
                paddingHorizontal: 8,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text
                style={{
                  color: palette.color,
                  ...theme.typography.semiBold,
                  fontSize: 32,
                  lineHeight: 38,
                  fontVariant: ['tabular-nums'],
                }}>
                {item.value}
              </Text>
              <Text
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.medium,
                  fontSize: 12,
                }}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </GlassSurface>
  );
}
