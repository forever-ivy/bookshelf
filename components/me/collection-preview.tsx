import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function CollectionPreview({
  items,
}: {
  items: readonly { count: string; detail: string; title: string }[];
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
      {items.map((item) => (
        <View
          key={item.title}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.lg,
            borderWidth: 1,
            flexGrow: 1,
            gap: 8,
            minWidth: 140,
            padding: theme.spacing.lg,
            width: '47%',
          }}>
          <Text
            style={{
              color: theme.colors.textSoft,
              ...theme.typography.medium,
              fontSize: 12,
            }}>
            {item.title}
          </Text>
          <Text
            style={{
              color: theme.colors.text,
              ...theme.typography.bold,
              fontSize: 24,
            }}>
            {item.count}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
              lineHeight: 18,
            }}>
            {item.detail}
          </Text>
        </View>
      ))}
    </View>
  );
}
