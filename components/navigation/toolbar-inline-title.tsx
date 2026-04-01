import React from 'react';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function ToolbarInlineTitle({ title }: { title: string }) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        height: 44,
        justifyContent: 'center',
        minWidth: 132,
      }}>
      <Text
        numberOfLines={1}
        style={{
          color: theme.colors.text,
          ...theme.typography.semiBold,
          fontSize: 30,
          letterSpacing: -0.7,
          lineHeight: 36,
        }}>
        {title}
      </Text>
    </View>
  );
}
