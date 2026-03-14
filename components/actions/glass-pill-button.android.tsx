import React from 'react';
import { Pressable, Text } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  const { theme } = useBookleafTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: label ? 14 : 12,
      }}>
      <AppIcon color={theme.colors.text} name={icon} size={18} />
      {label ? (
        <Text
          selectable
          style={{
            color: theme.colors.text,
            ...theme.typography.semiBold,
            fontSize: 14,
          }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
