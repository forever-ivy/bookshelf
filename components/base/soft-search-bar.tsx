import React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { MarkerHighlightText } from '@/components/base/marker-highlight-text';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SoftSearchBar({
  mode = 'teaser',
}: {
  mode?: 'full' | 'teaser';
}) {
  const { theme } = useAppTheme();
  const isFull = mode === 'full';

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderStrong,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
      }}>
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 12,
          minHeight: isFull ? 52 : 48,
          paddingHorizontal: 16,
        }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.iconSurface,
            borderRadius: theme.radii.md,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}>
          <AppIcon color={theme.colors.iconInk} name="search" size={14} strokeWidth={1.68} />
        </View>
        <View style={{ flex: 1 }}>
          <MarkerHighlightText
            highlight="课程或自然语言"
            text="搜索书名、作者、课程或自然语言"
            textStyle={{
              color: theme.colors.text,
              ...theme.typography.medium,
              fontSize: 14,
            }}
          />
        </View>
        <AppIcon color={theme.colors.textSoft} name="chevronRight" size={16} strokeWidth={1.7} />
      </View>
    </View>
  );
}
