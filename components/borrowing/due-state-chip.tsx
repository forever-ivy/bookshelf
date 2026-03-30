import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type DueState = 'active' | 'cancelled' | 'completed' | 'dueSoon' | 'overdue' | 'renewable';

export function DueStateChip({ state }: { state: DueState }) {
  const { theme } = useAppTheme();

  const palette = {
    active: {
      backgroundColor: theme.colors.primarySoft,
      color: theme.colors.primaryStrong,
      label: '借阅中',
    },
    completed: {
      backgroundColor: theme.colors.surfaceMuted,
      color: theme.colors.textMuted,
      label: '已完成',
    },
    cancelled: {
      backgroundColor: '#F4E9E7',
      color: '#9B675C',
      label: '已取消',
    },
    dueSoon: {
      backgroundColor: theme.colors.warningSoft,
      color: theme.colors.warning,
      label: '即将到期',
    },
    overdue: {
      backgroundColor: '#F1E7E2',
      color: '#8C5D49',
      label: '已逾期',
    },
    renewable: {
      backgroundColor: theme.colors.successSoft,
      color: theme.colors.success,
      label: '可续借',
    },
  }[state];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.backgroundColor,
        borderColor: theme.colors.borderSoft,
        borderRadius: theme.radii.md,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 5,
      }}>
      <Text
        style={{
          color: palette.color,
          ...theme.typography.semiBold,
          fontSize: 12,
        }}>
        {palette.label}
      </Text>
    </View>
  );
}
