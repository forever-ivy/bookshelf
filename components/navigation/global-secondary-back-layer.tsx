import { usePathname } from 'expo-router';
import React from 'react';
import { Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';

const PRIMARY_ROUTE_PATHS = new Set(['/', '/search', '/borrowing', '/me', '/login']);

export function shouldShowSecondaryBackButton(pathname?: string | null) {
  if (!pathname) {
    return false;
  }

  return !PRIMARY_ROUTE_PATHS.has(pathname);
}

export function GlobalSecondaryBackLayer() {
  const pathname = usePathname();
  const shouldShow = shouldShowSecondaryBackButton(pathname);
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale = React.useRef(new Animated.Value(0.92)).current;
  const translateY = React.useRef(new Animated.Value(-12)).current;
  const animationRunId = React.useRef(0);
  const [isMounted, setIsMounted] = React.useState(shouldShow);

  React.useEffect(() => {
    if (shouldShow) {
      setIsMounted(true);
    }
  }, [shouldShow]);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }

    const runId = animationRunId.current + 1;
    animationRunId.current = runId;

    opacity.stopAnimation();
    scale.stopAnimation();
    translateY.stopAnimation();

    if (shouldShow) {
      Animated.parallel([
        Animated.timing(opacity, {
          duration: 260,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          damping: 17,
          mass: 0.82,
          stiffness: 220,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 280,
          easing: Easing.out(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]).start();

      return;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        duration: 360,
        easing: Easing.inOut(Easing.cubic),
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, {
          duration: 110,
          easing: Easing.out(Easing.cubic),
          toValue: 1.06,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          duration: 250,
          easing: Easing.in(Easing.cubic),
          toValue: 0.32,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(translateY, {
        duration: 360,
        easing: Easing.inOut(Easing.cubic),
        toValue: -10,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished && animationRunId.current === runId) {
        setIsMounted(false);
      }
    });
  }, [isMounted, opacity, scale, shouldShow, translateY]);

  if (!isMounted) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        left: theme.spacing.xl,
        opacity,
        position: 'absolute',
        top: insets.top + theme.spacing.xl + 10,
        transform: [{ translateY }, { scale }],
        zIndex: 80,
      }}
      testID="secondary-back-layer">
      <SecondaryBackButton glassVisible={shouldShow} />
    </Animated.View>
  );
}
