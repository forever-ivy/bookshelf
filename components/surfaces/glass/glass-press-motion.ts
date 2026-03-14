import * as Haptics from 'expo-haptics';
import React from 'react';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import {
  getGlassMotionProfile,
  resolveGlassPressTransform,
} from '@/components/surfaces/glass/glass-motion';
import type { GlassMotionPreset } from '@/components/surfaces/glass/glass-contracts';

type UseGlassPressMotionArgs = {
  disabled?: boolean;
  enableLongPress?: boolean;
  preset: GlassMotionPreset;
};

export function useGlassPressMotion({
  disabled = false,
  enableLongPress = true,
  preset,
}: UseGlassPressMotionArgs) {
  const profile = React.useMemo(() => getGlassMotionProfile(preset), [preset]);
  const pressProgress = useSharedValue(0);
  const emphasisProgress = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    const transform = resolveGlassPressTransform(
      preset,
      pressProgress.value,
      emphasisProgress.value,
      disabled
    );

    return {
      transform: [{ scale: transform.scale }, { translateY: transform.translateY }],
    };
  }, [disabled, preset]);

  const onLongPress = React.useCallback(() => {
    if (disabled || !enableLongPress) {
      return;
    }

    emphasisProgress.value = withSpring(1, profile.emphasis.spring);

    if (process.env.EXPO_OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    }
  }, [disabled, emphasisProgress, enableLongPress, profile.emphasis.spring]);

  const onPressIn = React.useCallback(() => {
    if (disabled) {
      return;
    }

    pressProgress.value = withSpring(1, profile.press.spring);
  }, [disabled, pressProgress, profile.press.spring]);

  const onPressOut = React.useCallback(() => {
    pressProgress.value = withSpring(0, profile.press.spring);
    emphasisProgress.value = withSpring(0, profile.emphasis.spring);
  }, [emphasisProgress, pressProgress, profile.emphasis.spring, profile.press.spring]);

  return {
    animatedStyle,
    delayLongPress: profile.emphasis.delayLongPress,
    emphasisProgress,
    onLongPress,
    onPressIn,
    onPressOut,
    pressProgress,
    profile,
  };
}
