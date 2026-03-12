import {
  GlassContainer,
  GlassView,
  type GlassStyle,
  isLiquidGlassAvailable,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

import { bookleafTheme } from '@/constants/bookleaf-theme';

export type GlassFallbackMode = 'material' | 'frosted';
export type GlassMotionPreset = 'nav' | 'sheet' | 'button' | 'cta' | 'card';
export type GlassTone = 'neutral' | 'accent' | 'subtle';
export type ResolvedGlassSurfaceMode = 'liquid' | 'material' | 'frosted';

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

type ResolveGlassSurfaceModeArgs = {
  fallbackMode: GlassFallbackMode;
  glassEffectAvailable: boolean;
  liquidGlassAvailable: boolean;
  platform: string;
};

type ResolveGlassSurfacePaletteArgs = {
  mode: ResolvedGlassSurfaceMode;
  motionPreset: GlassMotionPreset;
  tone: GlassTone;
  variant: GlassStyle;
};

type GlassSurfacePalette = {
  borderColor: string;
  fallbackFillColor: string;
  overlayShadow: string;
  tintColor: string;
};

export function resolveGlassSurfaceMode({
  fallbackMode,
  glassEffectAvailable,
  liquidGlassAvailable,
  platform,
}: ResolveGlassSurfaceModeArgs) {
  if (platform === 'ios' && glassEffectAvailable && liquidGlassAvailable) {
    return 'liquid';
  }

  if (platform === 'ios' && fallbackMode === 'material') {
    return 'material';
  }

  return 'frosted';
}

const glassMotionConfig: Record<GlassMotionPreset, number> = {
  button: 0.18,
  card: 0.26,
  cta: 0.22,
  nav: 0.28,
  sheet: 0.34,
};

const fallbackTintByVariant: Record<GlassStyle, 'systemMaterial' | 'systemUltraThinMaterial'> = {
  clear: 'systemUltraThinMaterial',
  none: 'systemUltraThinMaterial',
  regular: 'systemMaterial',
};

function getFallbackOverlayStyle(motionPreset: GlassMotionPreset) {
  switch (motionPreset) {
    case 'nav':
      return {
        boxShadow: bookleafTheme.shadows.floating,
      };
    case 'sheet':
      return {
        boxShadow: bookleafTheme.shadows.card,
      };
    case 'button':
      return {
        boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)',
      };
    case 'cta':
      return {
        boxShadow: '0 16px 28px rgba(15, 23, 42, 0.12)',
      };
    case 'card':
    default:
      return {
        boxShadow: bookleafTheme.shadows.soft,
      };
  }
}

export function resolveGlassSurfacePalette({
  mode,
  motionPreset,
  tone,
  variant,
}: ResolveGlassSurfacePaletteArgs): GlassSurfacePalette {
  const tintColorByTone: Record<GlassTone, string> = {
    accent:
      variant === 'clear'
        ? 'rgba(194, 214, 255, 0.18)'
        : 'rgba(194, 214, 255, 0.28)',
    neutral:
      variant === 'clear'
        ? 'rgba(255,255,255,0.16)'
        : bookleafTheme.colors.glassTintNeutral,
    subtle: bookleafTheme.colors.glassTintClear,
  };

  const borderColorByTone: Record<GlassTone, string> = {
    accent: 'rgba(208,223,255,0.36)',
    neutral: 'rgba(255,255,255,0.32)',
    subtle: bookleafTheme.colors.glassBorder,
  };

  const fallbackFillByTone: Record<GlassTone, string> = {
    accent:
      mode === 'frosted'
        ? 'rgba(246,249,255,0.72)'
        : 'rgba(255,255,255,0.24)',
    neutral:
      mode === 'frosted'
        ? 'rgba(255,255,255,0.72)'
        : 'rgba(255,255,255,0.18)',
    subtle:
      mode === 'frosted'
        ? 'rgba(255,255,255,0.54)'
        : 'rgba(255,255,255,0.12)',
  };

  const overlayShadow =
    motionPreset === 'cta'
      ? '0 16px 28px rgba(15, 23, 42, 0.12)'
      : getFallbackOverlayStyle(motionPreset).boxShadow;

  return {
    borderColor: borderColorByTone[tone],
    fallbackFillColor: fallbackFillByTone[tone],
    overlayShadow,
    tintColor: tintColorByTone[tone],
  };
}

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
  const resolvedMode = resolveGlassSurfaceMode({
    fallbackMode,
    glassEffectAvailable: isGlassEffectAPIAvailable(),
    liquidGlassAvailable: isLiquidGlassAvailable(),
    platform,
  });
  const palette = resolveGlassSurfacePalette({
    mode: resolvedMode,
    motionPreset,
    tone,
    variant,
  });

  if (resolvedMode === 'material') {
    return (
      <BlurView
        intensity={86}
        style={[
          {
            backgroundColor: palette.fallbackFillColor,
            borderColor: palette.borderColor,
            borderRadius: bookleafTheme.radii.xl,
            borderWidth: 1,
            overflow: 'hidden',
          },
          {
            boxShadow: palette.overlayShadow,
          },
          style,
        ]}
        tint={fallbackTintByVariant[variant]}>
        {children}
      </BlurView>
    );
  }

  if (resolvedMode === 'frosted') {
    return (
      <View
        style={[
          {
            backgroundColor: palette.fallbackFillColor,
            borderColor: palette.borderColor,
            borderRadius: bookleafTheme.radii.xl,
            borderWidth: 1,
          },
          {
            boxShadow: palette.overlayShadow,
          },
          style,
        ]}>
        {children}
      </View>
    );
  }

  const surface = (
    <GlassView
      colorScheme="light"
      glassEffectStyle={{
        animate: true,
        animationDuration: glassMotionConfig[motionPreset],
        style: variant,
      }}
      isInteractive={isInteractive}
      key={`${motionPreset}-${tone}-${variant}-${isInteractive ? 'interactive' : 'static'}`}
      style={[
        {
          borderColor: palette.borderColor,
          borderRadius: bookleafTheme.radii.xl,
          borderWidth: 1,
          boxShadow: palette.overlayShadow,
          overflow: 'hidden',
        },
        style,
      ]}
      tintColor={tintColor ?? palette.tintColor}>
      {children}
    </GlassView>
  );

  if (containerSpacing == null) {
    return surface;
  }

  return <GlassContainer spacing={containerSpacing}>{surface}</GlassContainer>;
}
