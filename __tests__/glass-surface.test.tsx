import {
  isBlurViewAvailable,
  resolveGlassSurfaceMode,
  resolveGlassSurfacePalette,
} from '@/components/surfaces/glass-surface';

describe('resolveGlassSurfaceMode', () => {
  it('uses liquid glass when both glass APIs are available on iOS', () => {
    expect(
      resolveGlassSurfaceMode({
        fallbackMode: 'material',
        glassEffectAvailable: true,
        liquidGlassAvailable: true,
        platform: 'ios',
      })
    ).toBe('liquid');
  });

  it('falls back to material on iOS when liquid glass is unavailable', () => {
    expect(
      resolveGlassSurfaceMode({
        fallbackMode: 'material',
        glassEffectAvailable: false,
        liquidGlassAvailable: false,
        platform: 'ios',
      })
    ).toBe('material');
  });

  it('falls back to frosted surfaces on Android', () => {
    expect(
      resolveGlassSurfaceMode({
        fallbackMode: 'material',
        glassEffectAvailable: false,
        liquidGlassAvailable: false,
        platform: 'android',
      })
    ).toBe('frosted');
  });

  it('allows forcing frosted fallback on iOS', () => {
    expect(
      resolveGlassSurfaceMode({
        blurViewAvailable: true,
        fallbackMode: 'frosted',
        glassEffectAvailable: false,
        liquidGlassAvailable: false,
        platform: 'ios',
      })
    ).toBe('frosted');
  });

  it('falls back to frosted on iOS when the native blur view manager is unavailable', () => {
    expect(
      resolveGlassSurfaceMode({
        blurViewAvailable: false,
        fallbackMode: 'material',
        glassEffectAvailable: false,
        liquidGlassAvailable: false,
        platform: 'ios',
      })
    ).toBe('frosted');
  });

  it('uses subtler glass tints for navigation surfaces', () => {
    const palette = resolveGlassSurfacePalette({
      mode: 'liquid',
      motionPreset: 'nav',
      tone: 'subtle',
      variant: 'clear',
    });

    expect(palette.tintColor).toBe('rgba(255,255,255,0.12)');
    expect(palette.borderColor).toBe('rgba(255,255,255,0.28)');
  });

  it('uses a denser neutral tint for cta surfaces', () => {
    const palette = resolveGlassSurfacePalette({
      mode: 'material',
      motionPreset: 'cta',
      tone: 'neutral',
      variant: 'regular',
    });

    expect(palette.tintColor).toBe('rgba(255,255,255,0.22)');
    expect(palette.overlayShadow).toContain('rgba(15, 23, 42');
  });
});

describe('isBlurViewAvailable', () => {
  it('returns false when Expo blur view config is missing from the runtime', () => {
    expect(
      isBlurViewAvailable({
        getViewConfig: () => null,
        platform: 'ios',
      })
    ).toBe(false);
  });

  it('returns true when Expo blur view config exists on iOS', () => {
    expect(
      isBlurViewAvailable({
        getViewConfig: () => ({
          directEventTypes: {},
          validAttributes: {},
        }),
        platform: 'ios',
      })
    ).toBe(true);
  });
});
