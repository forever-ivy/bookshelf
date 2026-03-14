import React from 'react';
import Svg, { Circle } from 'react-native-svg';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AnimatedCountText } from '@/components/base/animated-count-text';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { motionTransitions, motionTokens } from '@/lib/presentation/motion';

type GoalProgressCardProps = {
  buttonLabel?: string;
  currentValue: number;
  onPress?: () => void;
  progress: number;
  subtitle: string;
  targetValue: number;
  title: string;
};

const RADIUS = 42;
const STROKE_WIDTH = 8;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function GoalProgressCard({
  buttonLabel = '查看档案',
  currentValue,
  onPress,
  progress,
  subtitle,
  targetValue,
  title,
}: GoalProgressCardProps) {
  const { theme } = useBookleafTheme();
  const clampedProgress = Math.max(0, Math.min(progress, 1));
  const strokeDashoffset = CIRCUMFERENCE * (1 - clampedProgress);
  const animatedProgress = useSharedValue(clampedProgress);

  React.useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: motionTokens.duration.slow,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [animatedProgress, clampedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  return (
    <View
      style={{
        backgroundColor: theme.goalProgress.cardBackground,
        borderCurve: 'continuous',
        borderRadius: theme.radii.xl,
        padding: 24,
      }}>
      <Animated.View
        layout={motionTransitions.gentle}
        style={{ alignItems: 'flex-start', flexDirection: 'row', gap: 18 }}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Svg height="104" width="104" viewBox="0 0 104 104">
            <Circle
              cx="52"
              cy="52"
              fill="transparent"
              r={RADIUS}
              stroke={theme.goalProgress.track}
              strokeWidth={STROKE_WIDTH}
            />
            <AnimatedCircle
              animatedProps={animatedProps}
              cx="52"
              cy="52"
              fill="transparent"
              r={RADIUS}
              stroke={theme.colors.primaryStrong}
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              strokeWidth={STROKE_WIDTH}
              transform="rotate(-90 52 52)"
            />
          </Svg>
          <View
            style={{
              alignItems: 'center',
              position: 'absolute',
            }}>
            <AnimatedCountText
              style={{
                color: theme.colors.text,
                ...theme.typography.bold,
                fontSize: 24,
                fontVariant: ['tabular-nums'],
              }}
              value={currentValue}
            />
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 12,
              }}>
              / {targetValue}
            </Text>
          </View>
        </View>
        <View
          style={{ flex: 1, gap: 16, minWidth: 0, paddingTop: 4 }}
          testID="goal-progress-card-copy">
          <View style={{ gap: 6 }}>
            <Text
              selectable
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 26,
                lineHeight: 30,
              }}>
              {title}
            </Text>
            <Text
              selectable
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 20,
              }}>
              {subtitle}
            </Text>
          </View>
          {onPress ? (
            <Pressable
              accessibilityRole="button"
              onPress={onPress}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: theme.goalProgress.ctaBackground,
                borderColor: theme.goalProgress.ctaBorder,
                borderCurve: 'continuous',
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}>
              <Text
                selectable
                style={{
                  color: theme.colors.textMuted,
                  ...theme.typography.semiBold,
                  fontSize: 13,
                }}>
                {buttonLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}
