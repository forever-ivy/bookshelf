import { bookleafTheme } from '@/constants/bookleaf-theme';
import { resolveGlassSurfaceTokens } from '@/components/surfaces/glass/glass-tokens';

describe('resolveGlassSurfaceTokens', () => {
  it('uses restrained subtle glass for nav surfaces', () => {
    const tokens = resolveGlassSurfaceTokens({
      mode: 'liquid',
      motionPreset: 'nav',
      tone: 'subtle',
      variant: 'clear',
    });

    expect(tokens.radius).toBe(bookleafTheme.radii.pill);
    expect(tokens.tintColor).toBe('rgba(255,255,255,0.12)');
    expect(tokens.fallbackTint).toBe('systemUltraThinMaterial');
    expect(tokens.foregroundColor).toBe(bookleafTheme.colors.glassForeground);
  });

  it('uses stronger emphasis for call-to-action surfaces', () => {
    const tokens = resolveGlassSurfaceTokens({
      mode: 'material',
      motionPreset: 'cta',
      tone: 'neutral',
      variant: 'regular',
    });

    expect(tokens.radius).toBe(bookleafTheme.radii.lg);
    expect(tokens.tintColor).toBe(bookleafTheme.colors.glassTintNeutral);
    expect(tokens.foregroundColor).toBe(bookleafTheme.colors.glassForegroundActive);
    expect(tokens.overlayShadow).toContain('rgba(15, 23, 42');
  });

  it('uses denser frosted fills when glass falls back off iOS native mode', () => {
    const tokens = resolveGlassSurfaceTokens({
      mode: 'frosted',
      motionPreset: 'sheet',
      tone: 'accent',
      variant: 'regular',
    });

    expect(tokens.fallbackFillColor).toBe('rgba(246,249,255,0.78)');
    expect(tokens.borderColor).toBe('rgba(208,223,255,0.36)');
    expect(tokens.radius).toBe(bookleafTheme.radii.xl);
  });
});
