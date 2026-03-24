import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function AchievementStrip({
  items,
}: {
  items: readonly { label: string; value: string }[];
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
      {items.map((item) => (
        <View
          key={item.label}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            flexGrow: 1,
            gap: 8,
            minWidth: 140,
            padding: theme.spacing.lg,
            width: '47%',
          }}>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 22,
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
      ))}
    </View>
  );
}
