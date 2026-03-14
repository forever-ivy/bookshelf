import React from 'react';
import {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import {
  getGlassMotionProfile,
} from '@/components/surfaces/glass/glass-motion';
import type { GlassMotionPreset } from '@/components/surfaces/glass/glass-contracts';

export function useGlassMountMotion(preset: GlassMotionPreset, active = true) {
  const profile = React.useMemo(() => getGlassMotionProfile(preset), [preset]);
  const progress = useSharedValue(active ? 0 : 1);

  React.useEffect(() => {
    progress.value = withSpring(active ? 1 : 0, profile.mount.spring);
  }, [active, profile.mount.spring, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.9, 1]),
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [profile.mount.fromTranslateY, 0]),
      },
      {
        scale: interpolate(progress.value, [0, 1], [profile.mount.fromScale, 1]),
      },
    ],
  }));

  return {
    animatedStyle,
    profile,
    progress,
  };
}
