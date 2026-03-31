import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';

type LoadingSkeletonBlockProps = {
  borderRadius?: number;
  height: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  width?: number | string;
};

export function LoadingSkeletonBlock({
  borderRadius,
  height,
  style,
  testID,
  width = '100%',
}: LoadingSkeletonBlockProps) {
  const { theme } = useAppTheme();
  const opacity = useSharedValue(0.62);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration: 920,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(0.62, {
          duration: 920,
          easing: Easing.inOut(Easing.ease),
        })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      testID={testID}
      style={[
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderRadius: borderRadius ?? theme.radii.md,
          height,
          width,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function LoadingSkeletonText({
  gap = 8,
  lineHeight = 12,
  testIDPrefix,
  widths,
}: {
  gap?: number;
  lineHeight?: number;
  testIDPrefix?: string;
  widths: (number | string)[];
}) {
  return (
    <View style={{ gap }}>
      {widths.map((width, index) => (
        <LoadingSkeletonBlock
          key={`${testIDPrefix ?? 'skeleton-line'}-${index}`}
          height={lineHeight}
          testID={testIDPrefix ? `${testIDPrefix}-${index + 1}` : undefined}
          width={width}
        />
      ))}
    </View>
  );
}

export function LoadingSkeletonCard({
  children,
  style,
  testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.borderStrong,
          borderRadius: theme.radii.lg,
          borderWidth: 1,
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
        },
        style,
      ]}
      testID={testID}>
      {children}
    </View>
  );
}
