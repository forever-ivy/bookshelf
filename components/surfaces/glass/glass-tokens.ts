import type { GlassStyle } from 'expo-glass-effect';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import type {
  GlassMotionPreset,
  GlassSurfacePalette,
  GlassSurfaceTokens,
  GlassTone,
  ResolveGlassSurfaceTokensArgs,
} from '@/components/surfaces/glass/glass-contracts';

const fallbackTintByVariant: Record<GlassStyle, 'systemMaterial' | 'systemUltraThinMaterial'> = {
  clear: 'systemUltraThinMaterial',
  none: 'systemUltraThinMaterial',
  regular: 'systemMaterial',
};

const radiusByPreset: Record<GlassMotionPreset, number> = {
  button: bookleafTheme.radii.md,
  card: bookleafTheme.radii.xl,
  cta: bookleafTheme.radii.lg,
  nav: bookleafTheme.radii.pill,
  sheet: bookleafTheme.radii.xl,
};

const shadowByPreset: Record<GlassMotionPreset, string> = {
  button: '0 10px 20px rgba(15, 23, 42, 0.08)',
  card: bookleafTheme.shadows.soft,
  cta: '0 16px 28px rgba(15, 23, 42, 0.12)',
  nav: bookleafTheme.shadows.floating,
  sheet: bookleafTheme.shadows.card,
};

function resolveTintColor(tone: GlassTone, variant: GlassStyle) {
  if (tone === 'accent') {
    return variant === 'clear' ? 'rgba(194, 214, 255, 0.18)' : 'rgba(194, 214, 255, 0.28)';
  }

  if (tone === 'subtle') {
    return bookleafTheme.colors.glassTintClear;
  }

  return variant === 'clear'
    ? 'rgba(255,255,255,0.16)'
    : bookleafTheme.colors.glassTintNeutral;
}

function resolveBorderColor(tone: GlassTone) {
  if (tone === 'accent') {
    return 'rgba(208,223,255,0.36)';
  }

  if (tone === 'subtle') {
    return bookleafTheme.colors.glassBorder;
  }

  return 'rgba(255,255,255,0.32)';
}

function resolveFallbackFillColor(
  tone: GlassTone,
  mode: ResolveGlassSurfaceTokensArgs['mode']
) {
  if (tone === 'accent') {
    return mode === 'frosted' ? 'rgba(246,249,255,0.78)' : 'rgba(255,255,255,0.24)';
  }

  if (tone === 'subtle') {
    return mode === 'frosted' ? 'rgba(255,255,255,0.54)' : 'rgba(255,255,255,0.12)';
  }

  return mode === 'frosted' ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.18)';
}

function resolveForegroundColor(motionPreset: GlassMotionPreset, tone: GlassTone) {
  if (motionPreset === 'cta') {
    return bookleafTheme.colors.glassForegroundActive;
  }

  if (motionPreset === 'button' && tone === 'subtle') {
    return bookleafTheme.colors.glassForegroundActive;
  }

  return bookleafTheme.colors.glassForeground;
}

export function resolveGlassSurfaceTokens({
  mode,
  motionPreset,
  tone,
  variant,
}: ResolveGlassSurfaceTokensArgs): GlassSurfaceTokens {
  return {
    blurIntensity: motionPreset === 'nav' ? 82 : motionPreset === 'sheet' ? 88 : 86,
    borderColor: resolveBorderColor(tone),
    borderWidth: 1,
    fallbackFillColor: resolveFallbackFillColor(tone, mode),
    fallbackTint: fallbackTintByVariant[variant],
    foregroundColor: resolveForegroundColor(motionPreset, tone),
    overlayShadow: shadowByPreset[motionPreset],
    radius: radiusByPreset[motionPreset],
    tintColor: resolveTintColor(tone, variant),
  };
}

export function resolveGlassSurfacePalette(
  args: ResolveGlassSurfaceTokensArgs
): GlassSurfacePalette {
  const tokens = resolveGlassSurfaceTokens(args);

  return {
    borderColor: tokens.borderColor,
    fallbackFillColor: tokens.fallbackFillColor,
    overlayShadow: tokens.overlayShadow,
    tintColor: tokens.tintColor,
  };
}
