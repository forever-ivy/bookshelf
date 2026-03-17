import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';

import { AppIcon } from '@/components/base/app-icon';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

const accessibilityLabelByIcon = {
  back: '返回',
  info: '信息',
  search: '搜索',
  share: '分享',
} as const;

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  const supportsLiquidGlass = isLiquidGlassAvailable();
  const { theme } = useBookleafTheme();

  return (
    <Pressable
      accessibilityLabel={label ?? accessibilityLabelByIcon[icon]}
      accessibilityRole="button"
      onPress={onPress}
      testID={supportsLiquidGlass ? 'glass-pill-button-native-host' : 'glass-pill-button-shell'}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        backgroundColor: supportsLiquidGlass ? theme.glass.background : theme.colors.surface,
        borderColor: supportsLiquidGlass ? theme.glass.border : theme.colors.border,
        borderCurve: 'continuous',
        borderRadius: theme.radii.pill,
        borderWidth: 1,
        minHeight: 44,
        minWidth: 44,
        overflow: 'hidden',
        position: 'relative',
        ...(supportsLiquidGlass ? { boxShadow: theme.glass.shadow } : null),
        ...(pressed ? { transform: [{ scale: 0.98 }] } : null),
      })}>
      {supportsLiquidGlass ? (
        <GlassView
          colorScheme={theme.glass.colorScheme}
          glassEffectStyle="regular"
          isInteractive={false}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
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
