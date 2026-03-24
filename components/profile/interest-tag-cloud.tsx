import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function InterestTagCloud({ tags }: { tags: readonly string[] }) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
      {tags.map((tag) => (
        <View
          key={tag}
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.pill,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 8,
          }}>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.semiBold,
              fontSize: 12,
            }}>
            {tag}
          </Text>
        </View>
      ))}
    </View>
  );
}
