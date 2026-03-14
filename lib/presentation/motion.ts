import {
  Easing,
  FadeIn,
  LinearTransition,
  SlideInDown,
  SlideInUp,
} from 'react-native-reanimated';

export const motionTokens = {
  duration: {
    fast: 160,
    regular: 240,
    calm: 360,
    slow: 520,
  },
  spring: {
    snappy: {
      damping: 18,
      mass: 0.9,
      stiffness: 240,
    },
    gentle: {
      damping: 20,
      mass: 1,
      stiffness: 170,
    },
    exit: {
      damping: 24,
      mass: 1,
      stiffness: 190,
    },
  },
} as const;

export const motionTransitions = {
  gentle: LinearTransition.springify()
    .damping(motionTokens.spring.gentle.damping)
    .mass(motionTokens.spring.gentle.mass)
    .stiffness(motionTokens.spring.gentle.stiffness),
  snappy: LinearTransition.springify()
    .damping(motionTokens.spring.snappy.damping)
    .mass(motionTokens.spring.snappy.mass)
    .stiffness(motionTokens.spring.snappy.stiffness),
} as const;

export function createStaggeredFadeIn(index: number, delayStep = 70) {
  return FadeIn.duration(motionTokens.duration.calm)
    .delay(index * delayStep)
    .easing(Easing.bezier(0.22, 1, 0.36, 1));
}

export function createSlowFadeIn(index = 0, delayStep = 90) {
  return FadeIn.duration(motionTokens.duration.slow)
    .delay(index * delayStep)
    .easing(Easing.bezier(0.22, 1, 0.36, 1));
}

export const motionPresets = {
  buttonEnter: SlideInUp.duration(motionTokens.duration.calm).easing(
    Easing.bezier(0.22, 1, 0.36, 1)
  ),
  sheetEnter: SlideInDown.springify()
    .damping(motionTokens.spring.gentle.damping)
    .mass(motionTokens.spring.gentle.mass)
    .stiffness(motionTokens.spring.gentle.stiffness),
} as const;
