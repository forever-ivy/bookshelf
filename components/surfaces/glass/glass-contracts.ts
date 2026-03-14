import type { GlassStyle } from 'expo-glass-effect';

export type GlassFallbackMode = 'material' | 'frosted';
export type GlassMotionPreset = 'nav' | 'sheet' | 'button' | 'cta' | 'card';
export type GlassTone = 'neutral' | 'accent' | 'subtle';
export type ResolvedGlassSurfaceMode = 'liquid' | 'material' | 'frosted';

export type ResolveGlassSurfaceModeArgs = {
  blurViewAvailable?: boolean;
  fallbackMode: GlassFallbackMode;
  glassEffectAvailable: boolean;
  liquidGlassAvailable: boolean;
  platform: string;
};

export type ResolveGlassSurfaceTokensArgs = {
  mode: ResolvedGlassSurfaceMode;
  motionPreset: GlassMotionPreset;
  tone: GlassTone;
  variant: GlassStyle;
};

export type GlassSurfaceTokens = {
  blurIntensity: number;
  borderColor: string;
  borderWidth: number;
  fallbackFillColor: string;
  fallbackTint: 'systemMaterial' | 'systemUltraThinMaterial';
  foregroundColor: string;
  overlayShadow: string;
  radius: number;
  tintColor: string;
};

export type GlassSurfacePalette = Pick<
  GlassSurfaceTokens,
  'borderColor' | 'fallbackFillColor' | 'overlayShadow' | 'tintColor'
>;

export type ExpoViewConfig = {
  directEventTypes: Record<string, { registrationName: string }>;
  validAttributes: Record<string, unknown>;
};

export type BlurViewAvailabilityArgs = {
  getViewConfig?: ((moduleName: string, viewName?: string) => ExpoViewConfig | null) | null;
  platform: string;
};
