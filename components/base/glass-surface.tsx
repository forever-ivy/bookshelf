import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type GlassSurfaceProps = {
  children: React.ReactNode;
  intensity?: 'clear' | 'regular';
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
};

export function GlassSurface({
  children,
  intensity = 'regular',
  style,
  tintColor,
}: GlassSurfaceProps) {
  const { theme } = useAppTheme();
  const supportsGlassAPI =
    typeof isGlassEffectAPIAvailable === 'function' ? isGlassEffectAPIAvailable() : false;
  const supportsLiquidGlass =
    typeof isLiquidGlassAvailable === 'function' ? isLiquidGlassAvailable() : false;
  const canUseLiquidGlass =
    Platform.OS === 'ios' && supportsGlassAPI && supportsLiquidGlass;

  return (
    <View
      style={[
        {
          backgroundColor: canUseLiquidGlass ? 'transparent' : theme.colors.surface,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          boxShadow: theme.shadows.card,
          overflow: 'hidden',
        },
        style,
      ]}>
      {canUseLiquidGlass ? (
        <GlassView
          colorScheme="light"
          glassEffectStyle={intensity}
          isInteractive={false}
          style={StyleSheet.absoluteFill}
          tintColor={tintColor ?? theme.colors.glassTint}
        />
      ) : (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: tintColor ?? theme.colors.surface,
            },
          ]}
        />
      )}
      <View>{children}</View>
    </View>
  );
}
