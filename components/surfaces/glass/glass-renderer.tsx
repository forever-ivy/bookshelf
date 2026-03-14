import {
  GlassContainer,
  GlassView,
  type GlassStyle,
} from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import type {
  ResolvedGlassSurfaceMode,
  GlassSurfaceTokens,
} from '@/components/surfaces/glass/glass-contracts';

type GlassSurfaceRendererProps = {
  children: React.ReactNode;
  containerSpacing?: number;
  isInteractive: boolean;
  mode: ResolvedGlassSurfaceMode;
  nativeAnimationDuration: number;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  tokens: GlassSurfaceTokens;
  variant: GlassStyle;
};

export function GlassSurfaceRenderer({
  children,
  containerSpacing,
  isInteractive,
  mode,
  nativeAnimationDuration,
  style,
  tintColor,
  tokens,
  variant,
}: GlassSurfaceRendererProps) {
  const sharedStyle = [
    {
      backgroundColor: tokens.fallbackFillColor,
      borderColor: tokens.borderColor,
      borderRadius: tokens.radius,
      borderWidth: tokens.borderWidth,
    },
    {
      boxShadow: tokens.overlayShadow,
    },
    style,
  ] as StyleProp<ViewStyle>;

  if (mode === 'material') {
    return (
      <BlurView
        intensity={tokens.blurIntensity}
        style={[
          {
            overflow: 'hidden',
          },
          sharedStyle,
        ]}
        tint={tokens.fallbackTint}>
        {children}
      </BlurView>
    );
  }

  if (mode === 'frosted') {
    return <View style={sharedStyle}>{children}</View>;
  }

  const surface = (
    <GlassView
      colorScheme="light"
      glassEffectStyle={{
        animate: true,
        animationDuration: nativeAnimationDuration,
        style: variant,
      }}
      isInteractive={isInteractive}
      key={`${variant}-${isInteractive ? 'interactive' : 'static'}-${tokens.radius}`}
      style={[
        {
          borderColor: tokens.borderColor,
          borderRadius: tokens.radius,
          borderWidth: tokens.borderWidth,
          boxShadow: tokens.overlayShadow,
          overflow: 'hidden',
        },
        style,
      ]}
      tintColor={tintColor ?? tokens.tintColor}>
      {children}
    </GlassView>
  );

  if (containerSpacing == null) {
    return surface;
  }

  return <GlassContainer spacing={containerSpacing}>{surface}</GlassContainer>;
}
