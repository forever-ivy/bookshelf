import type {
  BlurViewAvailabilityArgs,
  ResolveGlassSurfaceModeArgs,
} from '@/components/surfaces/glass/glass-contracts';

export function isBlurViewAvailable({
  getViewConfig = globalThis.expo?.getViewConfig,
  platform,
}: BlurViewAvailabilityArgs) {
  if (platform !== 'ios') {
    return false;
  }

  try {
    return Boolean(getViewConfig?.('ExpoBlur', 'ExpoBlurView'));
  } catch {
    return false;
  }
}

export function resolveGlassSurfaceMode({
  blurViewAvailable = true,
  fallbackMode,
  glassEffectAvailable,
  liquidGlassAvailable,
  platform,
}: ResolveGlassSurfaceModeArgs) {
  if (platform === 'ios' && glassEffectAvailable && liquidGlassAvailable) {
    return 'liquid';
  }

  if (platform === 'ios' && fallbackMode === 'material' && blurViewAvailable) {
    return 'material';
  }

  return 'frosted';
}
