import { usePathname } from 'expo-router';
import React from 'react';
import { Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProfileSheetTriggerButton } from '@/components/navigation/profile-sheet-trigger-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useProfileSheet } from '@/providers/profile-sheet-provider';

const PRIMARY_PROFILE_TRIGGER_PATHS = new Set(['/', '/search', '/borrowing']);

export function shouldShowGlobalProfileSheetTrigger(pathname?: string | null) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  if (!pathname) {
    return false;
  }

  return PRIMARY_PROFILE_TRIGGER_PATHS.has(pathname);
}

export function GlobalProfileSheetLayer() {
  const pathname = usePathname();
  const shouldShow = shouldShowGlobalProfileSheetTrigger(pathname);
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { openProfileSheet } = useProfileSheet();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.92)).current;

  React.useEffect(() => {
    if (!shouldShow) {
      opacity.setValue(0);
      scale.setValue(0.92);
      return;
    }

    opacity.stopAnimation();
    scale.stopAnimation();
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 240,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        damping: 18,
        mass: 0.85,
        stiffness: 220,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, shouldShow]);

  if (!shouldShow) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        opacity,
        position: 'absolute',
        right: theme.spacing.xl,
        top: insets.top + theme.spacing.xl + 10,
        transform: [{ scale }],
        zIndex: 80,
      }}
      testID="profile-sheet-layer">
      <ProfileSheetTriggerButton onPress={openProfileSheet} />
    </Animated.View>
  );
}
