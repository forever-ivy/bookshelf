import { motionTokens } from '@/lib/presentation/motion';
import type { GlassMotionPreset } from '@/components/surfaces/glass/glass-contracts';

export type GlassMotionProfile = {
  emphasis: {
    delayLongPress: number;
    scaleBoost: number;
    spring: typeof motionTokens.spring.gentle;
    translateYBoost: number;
  };
  liquidAnimationDuration: number;
  mount: {
    fromScale: number;
    fromTranslateY: number;
    spring: typeof motionTokens.spring.gentle;
  };
  press: {
    scaleDelta: number;
    spring: typeof motionTokens.spring.snappy;
    translateY: number;
  };
  selectionSpring: typeof motionTokens.spring.snappy;
};

const glassMotionProfiles: Record<GlassMotionPreset, GlassMotionProfile> = {
  button: {
    emphasis: {
      delayLongPress: 130,
      scaleBoost: 0.04,
      spring: motionTokens.spring.gentle,
      translateYBoost: 2.5,
    },
    liquidAnimationDuration: 0.18,
    mount: {
      fromScale: 0.99,
      fromTranslateY: 12,
      spring: motionTokens.spring.gentle,
    },
    press: {
      scaleDelta: 0.025,
      spring: motionTokens.spring.snappy,
      translateY: 1.5,
    },
    selectionSpring: motionTokens.spring.snappy,
  },
  card: {
    emphasis: {
      delayLongPress: 140,
      scaleBoost: 0.03,
      spring: motionTokens.spring.gentle,
      translateYBoost: 1.8,
    },
    liquidAnimationDuration: 0.26,
    mount: {
      fromScale: 0.992,
      fromTranslateY: 10,
      spring: motionTokens.spring.gentle,
    },
    press: {
      scaleDelta: 0.016,
      spring: motionTokens.spring.snappy,
      translateY: 1,
    },
    selectionSpring: motionTokens.spring.snappy,
  },
  cta: {
    emphasis: {
      delayLongPress: 130,
      scaleBoost: 0.048,
      spring: motionTokens.spring.gentle,
      translateYBoost: 2.8,
    },
    liquidAnimationDuration: 0.22,
    mount: {
      fromScale: 0.986,
      fromTranslateY: 14,
      spring: motionTokens.spring.gentle,
    },
    press: {
      scaleDelta: 0.026,
      spring: motionTokens.spring.snappy,
      translateY: 1.8,
    },
    selectionSpring: motionTokens.spring.snappy,
  },
  nav: {
    emphasis: {
      delayLongPress: 130,
      scaleBoost: 0.038,
      spring: motionTokens.spring.gentle,
      translateYBoost: 2.4,
    },
    liquidAnimationDuration: 0.28,
    mount: {
      fromScale: 0.98,
      fromTranslateY: 18,
      spring: motionTokens.spring.gentle,
    },
    press: {
      scaleDelta: 0.024,
      spring: motionTokens.spring.snappy,
      translateY: 1.4,
    },
    selectionSpring: motionTokens.spring.snappy,
  },
  sheet: {
    emphasis: {
      delayLongPress: 140,
      scaleBoost: 0.024,
      spring: motionTokens.spring.gentle,
      translateYBoost: 1.2,
    },
    liquidAnimationDuration: 0.34,
    mount: {
      fromScale: 0.98,
      fromTranslateY: 20,
      spring: motionTokens.spring.gentle,
    },
    press: {
      scaleDelta: 0.012,
      spring: motionTokens.spring.snappy,
      translateY: 0.8,
    },
    selectionSpring: motionTokens.spring.snappy,
  },
};

export function getGlassMotionProfile(preset: GlassMotionPreset) {
  return glassMotionProfiles[preset];
}

export function resolveGlassPressTransform(
  preset: GlassMotionPreset,
  pressProgress: number,
  emphasisProgress: number,
  disabled = false
) {
  'worklet';

  if (disabled) {
    return { scale: 1, translateY: 0 };
  }

  const profile = glassMotionProfiles[preset];

  return {
    scale:
      1 -
      pressProgress * profile.press.scaleDelta +
      emphasisProgress * profile.emphasis.scaleBoost,
    translateY:
      pressProgress * profile.press.translateY -
      emphasisProgress * profile.emphasis.translateYBoost,
  };
}
