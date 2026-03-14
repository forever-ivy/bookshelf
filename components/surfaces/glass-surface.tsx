import {
  type GlassStyle,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import React from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

type GlassSurfaceProps = {
  children: React.ReactNode;
  containerSpacing?: number;
  fallbackMode?: GlassFallbackMode;
  isInteractive?: boolean;
  motionPreset?: GlassMotionPreset;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
  tone?: GlassTone;
  variant?: GlassStyle;
};

import {
  type GlassFallbackMode,
  type GlassMotionPreset,
  type GlassTone,
} from '@/components/surfaces/glass/glass-contracts';
import { GlassSurfaceRenderer } from '@/components/surfaces/glass/glass-renderer';
import { getGlassMotionProfile } from '@/components/surfaces/glass/glass-motion';
import {
  isBlurViewAvailable,
  resolveGlassSurfaceMode,
} from '@/components/surfaces/glass/glass-runtime';
import { resolveGlassSurfaceTokens } from '@/components/surfaces/glass/glass-tokens';

export type {
  GlassFallbackMode,
  GlassMotionPreset,
  GlassTone,
  ResolvedGlassSurfaceMode,
} from '@/components/surfaces/glass/glass-contracts';
export { getGlassMotionProfile } from '@/components/surfaces/glass/glass-motion';
export { isBlurViewAvailable, resolveGlassSurfaceMode } from '@/components/surfaces/glass/glass-runtime';
export { resolveGlassSurfacePalette, resolveGlassSurfaceTokens } from '@/components/surfaces/glass/glass-tokens';

export function GlassSurface({
  children,
  containerSpacing,
  fallbackMode = 'material',
  isInteractive = false,
  motionPreset = 'card',
  style,
  tintColor,
  tone = 'neutral',
  variant = 'regular',
}: GlassSurfaceProps) {
  const platform = process.env.EXPO_OS ?? Platform.OS;
  const blurViewAvailable = isBlurViewAvailable({ platform });
  const resolvedMode = resolveGlassSurfaceMode({
    blurViewAvailable,
    fallbackMode,
    glassEffectAvailable: isGlassEffectAPIAvailable(),
      liquidGlassAvailable: isLiquidGlassAvailable(),
      platform,
  });
  const tokens = resolveGlassSurfaceTokens({
    mode: resolvedMode,
    motionPreset,
    tone,
    variant,
  });
  const motionProfile = getGlassMotionProfile(motionPreset);

  return (
    <GlassSurfaceRenderer
      containerSpacing={containerSpacing}
      isInteractive={isInteractive}
      mode={resolvedMode}
      nativeAnimationDuration={motionProfile.liquidAnimationDuration}
      style={style}
      tintColor={tintColor}
      tokens={tokens}
      variant={variant}>
      {children}
    </GlassSurfaceRenderer>
  );
}
