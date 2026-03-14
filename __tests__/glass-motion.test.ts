import { motionTokens } from '@/lib/presentation/motion';
import { getGlassMotionProfile } from '@/components/surfaces/glass/glass-motion';

describe('getGlassMotionProfile', () => {
  it('uses a buoyant mount and patch glide for nav surfaces', () => {
    const profile = getGlassMotionProfile('nav');

    expect(profile.mount.fromTranslateY).toBe(18);
    expect(profile.mount.fromScale).toBe(0.98);
    expect(profile.selectionSpring).toEqual(motionTokens.spring.snappy);
    expect(profile.liquidAnimationDuration).toBe(0.28);
  });

  it('uses a deeper press response for cta surfaces', () => {
    const profile = getGlassMotionProfile('cta');

    expect(profile.press.scaleDelta).toBe(0.026);
    expect(profile.press.translateY).toBe(1.8);
    expect(profile.emphasis.scaleBoost).toBe(0.048);
    expect(profile.liquidAnimationDuration).toBe(0.22);
  });

  it('keeps cards restrained but gives sheets a softer, larger entrance', () => {
    const card = getGlassMotionProfile('card');
    const sheet = getGlassMotionProfile('sheet');

    expect(card.mount.fromTranslateY).toBeLessThan(sheet.mount.fromTranslateY);
    expect(card.mount.spring).toEqual(motionTokens.spring.gentle);
    expect(sheet.mount.spring).toEqual(motionTokens.spring.gentle);
  });
});
