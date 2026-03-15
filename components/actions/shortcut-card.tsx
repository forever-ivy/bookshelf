import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type ShortcutCardProps = {
  description: string;
  icon: AppIconName;
  onPress: () => void;
  title: string;
};

export function ShortcutCard({
  description,
  icon,
  onPress,
  title,
}: ShortcutCardProps) {
  const { theme } = useBookleafTheme();

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
        height: 196,
        padding: 18,
        width: '100%',
      }}>
      <View style={{ flex: 1, gap: 18, justifyContent: 'flex-start' }}>
        <View
          style={{
            alignItems: 'center',
            backgroundColor: theme.colors.surfaceMuted,
            borderCurve: 'continuous',
            borderRadius: 22,
            height: 48,
            justifyContent: 'center',
            width: 48,
          }}>
          <AppIcon color={theme.colors.primaryStrong} name={icon} size={22} />
        </View>
        <View style={{ gap: 6 }}>
          <Text
            numberOfLines={2}
            selectable
            style={{
              color: theme.colors.text,
              ...theme.typography.semiBold,
              fontSize: 16,
            }}>
            {title}
          </Text>
          <Text
            numberOfLines={3}
            selectable
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.body,
              fontSize: 13,
              lineHeight: 18,
            }}>
            {description}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
