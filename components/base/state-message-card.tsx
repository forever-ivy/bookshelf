import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type StateMessageCardProps = {
  description: string;
  testID?: string;
  title: string;
  tone?: 'default' | 'danger' | 'info';
};

export function StateMessageCard({
  description,
  testID,
  title,
  tone = 'default',
}: StateMessageCardProps) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'danger'
      ? {
          backgroundColor: theme.colors.dangerSoft,
          borderColor: theme.colors.dangerBorder,
          titleColor: theme.colors.danger,
        }
      : tone === 'info'
        ? {
            backgroundColor: theme.colors.primarySoft,
            borderColor: theme.colors.primaryStrong,
            titleColor: theme.colors.primaryStrong,
          }
        : {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderStrong,
            titleColor: theme.colors.text,
          };

  return (
    <View
      style={{
        backgroundColor: palette.backgroundColor,
        borderColor: palette.borderColor,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        gap: theme.spacing.sm,
        padding: theme.spacing.xl,
      }}
      testID={testID}>
      <Text style={{ color: palette.titleColor, ...theme.typography.semiBold, fontSize: 15 }}>
        {title}
      </Text>
      <Text style={{ color: theme.colors.textMuted, ...theme.typography.body, fontSize: 13, lineHeight: 19 }}>
        {description}
      </Text>
    </View>
  );
}
