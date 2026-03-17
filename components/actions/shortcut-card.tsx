import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type ShortcutCardProps = {
  icon: AppIconName;
  onPress: () => void;
  size?: 'default' | 'compact';
  title: string;
};

export function ShortcutCard({
  icon,
  onPress,
  size = 'default',
  title,
}: ShortcutCardProps) {
  const { theme } = useBookleafTheme();
  const isCompact = size === 'compact';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        height: isCompact ? 96 : 108,
        minHeight: isCompact ? 96 : 108,
        padding: isCompact ? 14 : 16,
        width: '100%',
      }}>
      <View style={{ flex: 1, gap: isCompact ? 10 : 14, justifyContent: 'flex-start' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceMuted,
            borderCurve: 'continuous',
            borderRadius: isCompact ? 18 : 20,
            height: isCompact ? 40 : 44,
            justifyContent: 'center',
            width: isCompact ? 40 : 44,
          }}>
          <AppIcon color={theme.colors.primaryStrong} name={icon} size={isCompact ? 20 : 22} />
        </View>
        <View style={{ gap: 4 }}>
          <Text
            numberOfLines={2}
            selectable
            style={{
              color: theme.colors.text,
              textAlign: 'left',
              ...theme.typography.semiBold,
              fontSize: isCompact ? 15 : 16,
            }}>
            {title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
