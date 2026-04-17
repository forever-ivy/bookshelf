import {
  GlassView,
  type GlassEffectStyleConfig,
  type GlassStyle,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from 'expo-glass-effect';
import React from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

type GlassSurfaceProps = {
  children: React.ReactNode;
  glassEffectStyle?: GlassStyle | GlassEffectStyleConfig;
  glassViewTestID?: string;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
};

export function GlassSurface({
  children,
  glassEffectStyle = 'regular',
  glassViewTestID,
  interactive = false,
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

  const surfaceStyle: StyleProp<ViewStyle> = [
    {
      borderColor: theme.colors.borderSoft,
      borderRadius: theme.radii.xl,
      borderWidth: 1,
      boxShadow: theme.shadows.card,
      overflow: 'hidden',
    },
    style,
  ];

  if (canUseLiquidGlass) {
    return (
      <View style={surfaceStyle}>
        <GlassView
          colorScheme="light"
          glassEffectStyle={glassEffectStyle}
          isInteractive={interactive}
          pointerEvents={interactive ? 'auto' : 'none'}
          style={StyleSheet.absoluteFill}
          testID={glassViewTestID}
          tintColor={tintColor ?? theme.colors.glassTint}
        />
        <View
          pointerEvents={interactive ? 'box-none' : 'auto'}
          style={{
            flex: 1,
          }}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        surfaceStyle,
        {
          backgroundColor: theme.colors.surface,
        },
      ]}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: tintColor ?? theme.colors.surface,
          },
        ]}
      />
      <View>{children}</View>
    </View>
  );
}
