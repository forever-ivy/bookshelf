import React from 'react';
import { Pressable, Text } from 'react-native';

import { AppIcon } from '@/components/base/app-icon';
import { bookleafTheme } from '@/constants/bookleaf-theme';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        alignItems: 'center',
        backgroundColor: bookleafTheme.colors.surface,
        borderColor: bookleafTheme.colors.border,
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.pill,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 8,
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: label ? 14 : 12,
      }}>
      <AppIcon color={bookleafTheme.colors.text} name={icon} size={18} />
      {label ? (
        <Text
          selectable
          style={{
            color: bookleafTheme.colors.text,
            ...bookleafTheme.typography.semiBold,
            fontSize: 14,
          }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}
