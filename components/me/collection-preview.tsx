import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function CollectionPreview({
  items,
}: {
  items: readonly { count: string; detail: string; title: string }[];
}) {
  const { theme } = useAppTheme();
  const palettes = [
    { backgroundColor: theme.colors.primarySoft, color: theme.colors.primaryStrong },
    { backgroundColor: theme.colors.accentLavender, color: theme.colors.knowledgeStrong },
    { backgroundColor: theme.colors.successSoft, color: theme.colors.success },
  ] as const;

  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      {items.map((item, index) => {
        const palette = palettes[index % palettes.length];

        return (
          <View
            key={item.title}
            style={{
              backgroundColor: palette.backgroundColor,
              borderColor: theme.colors.borderStrong,
              borderRadius: theme.radii.lg,
              borderWidth: 1,
              flex: 1,
              gap: 8,
              padding: theme.spacing.lg,
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
                color: palette.color,
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
        );
      })}
    </View>
  );
}
