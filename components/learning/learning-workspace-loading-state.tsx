import React from 'react';
import { Text, View } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming, 
  useSharedValue, 
  withDelay, 
  withSequence, 
  withRepeat,
  Easing,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';

import {
  LoadingSkeletonBlock,
  LoadingSkeletonText,
} from '@/components/base/loading-skeleton';
import { PillButton } from '@/components/base/pill-button';
import { PageShell } from '@/components/navigation/page-shell';
import { useAppTheme } from '@/hooks/use-app-theme';

type LearningWorkspaceLoadingAction = {
  label: string;
  onPress: () => void;
  testID?: string;
  variant?: 'accent' | 'prominent' | 'soft';
};

const LEARNING_QUOTES = [
  { text: "学而不思则罔，思而不学则殆", author: "孔子" },
  { text: "书山有路勤为径，学海无涯苦作舟", author: "韩愈" },
  { text: "博学之，审问之，慎思之，明辨之，笃行之", author: "《礼记》" },
  { text: "青，取之于蓝，而青于蓝", author: "荀子" },
  { text: "温故而知新，可以为师矣", author: "孔子" },
  { text: "读书破万卷，下笔如有神", author: "杜甫" },
  { text: "黑发不知勤学早，白首方悔读书迟", author: "颜真卿" }
];

function RotatingQuotes() {
  const { theme } = useAppTheme();
  const [index, setIndex] = React.useState(0);
  const opacity = useSharedValue(1);

  React.useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 800, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 100 }, () => {
          'worklet';
          // react state update from worklet
        })
      );
      
      // We use a small timeout to sync the state change with the mid-animation
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % LEARNING_QUOTES.length);
        opacity.value = withTiming(1, { duration: 1200, easing: Easing.in(Easing.quad) });
      }, 1000);

    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * 10 }]
  }));

  return (
    <Animated.View style={[{ alignItems: 'center', gap: 12 }, animatedStyle]}>
      <Text style={{
        color: theme.colors.text,
        ...theme.typography.bold,
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 2,
        lineHeight: 28,
        fontFamily: 'PingFang SC',
      }}>
        {LEARNING_QUOTES[index].text}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ height: 1, width: 20, backgroundColor: theme.colors.borderSoft }} />
        <Text style={{
          color: theme.colors.textMuted,
          ...theme.typography.medium,
          fontSize: 12,
          letterSpacing: 1,
        }}>
          {LEARNING_QUOTES[index].author}
        </Text>
        <View style={{ height: 1, width: 20, backgroundColor: theme.colors.borderSoft }} />
      </View>
    </Animated.View>
  );
}

export function LearningWorkspaceLoadingState({
  description,
  primaryAction,
  secondaryAction,
  title,
  tone = 'neutral',
  visualState = 'copy',
}: {
  description: string;
  primaryAction?: LearningWorkspaceLoadingAction;
  secondaryAction?: LearningWorkspaceLoadingAction;
  title: string;
  tone?: 'danger' | 'neutral' | 'warning';
  visualState?: 'copy' | 'skeleton';
}) {
  const { theme } = useAppTheme();
  const palette =
    tone === 'danger'
      ? {
          accent: theme.colors.warning,
          backgroundColor: theme.colors.surfaceKnowledge,
        }
      : {
          accent: theme.colors.primaryStrong,
          backgroundColor: theme.colors.surfaceKnowledge,
        };

  return (
    <PageShell mode="workspace" keyboardAware scrollEnabled={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingBottom: theme.spacing.xxxl }}>
        <View
          style={{
            backgroundColor: palette.backgroundColor,
            borderColor: theme.colors.borderSoft,
            borderRadius: theme.radii.xl,
            borderWidth: 1,
            gap: theme.spacing.lg,
            padding: theme.spacing.xl,
          }}>
        {visualState === 'skeleton' ? (
          <View style={{ gap: 40, alignItems: 'center', paddingVertical: 20 }}>
            <RotatingQuotes />
            <View style={{ gap: theme.spacing.md, width: '100%' }}>
              <LoadingSkeletonBlock height={12} width="25%" />
              <View style={{ gap: 8 }}>
                <LoadingSkeletonBlock height={20} width="80%" />
                <LoadingSkeletonBlock height={20} width="45%" />
              </View>
            </View>
          </View>
        ) : (
          <>
            <Text
              style={{
                color: palette.accent,
                ...theme.typography.medium,
                fontSize: 11,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
              }}>
              导学工作区
            </Text>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 26,
                lineHeight: 32,
              }}>
              {title}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 14,
                lineHeight: 21,
              }}>
              {description}
            </Text>
          </>
        )}

        {primaryAction || secondaryAction ? (
          <View style={{ gap: theme.spacing.sm }}>
            {primaryAction ? (
              <PillButton
                fullWidth
                label={primaryAction.label}
                onPress={primaryAction.onPress}
                testID={primaryAction.testID}
                variant={primaryAction.variant ?? 'accent'}
              />
            ) : null}
            {secondaryAction ? (
              <PillButton
                fullWidth
                label={secondaryAction.label}
                onPress={secondaryAction.onPress}
                testID={secondaryAction.testID}
                variant={secondaryAction.variant ?? 'soft'}
              />
            ) : null}
          </View>
        ) : null}
        </View>
      </View>
    </PageShell>
  );
}
