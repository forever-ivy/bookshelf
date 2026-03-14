import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  const supportsLiquidGlass = isLiquidGlassAvailable();
  const { theme } = useBookleafTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID="glass-pill-button-shell"
      style={{
        backgroundColor: supportsLiquidGlass ? theme.glass.background : theme.colors.surface,
        borderColor: supportsLiquidGlass ? theme.glass.border : theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        boxShadow: supportsLiquidGlass ? theme.glass.shadow : undefined,
        minHeight: 44,
        minWidth: 44,
        overflow: 'hidden',
        position: 'relative',
      }}>
      {supportsLiquidGlass ? (
        <GlassView
          colorScheme={theme.glass.colorScheme}
          glassEffectStyle="regular"
          style={{
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0,
          }}
          testID="glass-pill-button-glass"
          tintColor={theme.glass.tint}
        />
      ) : null}
      <View
        style={{
          alignItems: 'center',
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
      </View>
    </Pressable>
  );
}
