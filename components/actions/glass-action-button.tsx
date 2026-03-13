import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { GlassSurface } from '@/components/surfaces/glass-surface';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { motionTokens } from '@/lib/presentation/motion';

export type GlassActionButtonProps = {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
};

export function GlassActionButton({
  disabled = false,
  label,
  loading = false,
  onPress,
  variant = 'primary',
}: GlassActionButtonProps) {
  const isPrimary = variant === 'primary';
  const effectiveDisabled = disabled || loading;
  const pressed = useSharedValue(0);
  const held = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: effectiveDisabled ? 1 : 1 - pressed.value * 0.025 + held.value * 0.04 },
      { translateY: effectiveDisabled ? 0 : pressed.value * 1.5 - held.value * 2.5 },
    ],
  }));

  const foregroundColor = effectiveDisabled
    ? bookleafTheme.colors.glassForeground
    : isPrimary
      ? bookleafTheme.colors.glassForegroundActive
      : bookleafTheme.colors.glassForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        busy: loading || undefined,
        disabled: effectiveDisabled,
      }}
      disabled={effectiveDisabled}
      onLongPress={() => {
        if (effectiveDisabled) {
          return;
        }

        held.value = withSpring(1, motionTokens.spring.snappy);

        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        }
      }}
      onPress={onPress}
      onPressIn={() => {
        if (!effectiveDisabled) {
          pressed.value = withSpring(1, motionTokens.spring.snappy);
        }
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motionTokens.spring.snappy);
        held.value = withSpring(0, motionTokens.spring.gentle);
      }}>
      <Animated.View style={animatedStyle}>
        <GlassSurface
          fallbackMode="material"
          isInteractive={!effectiveDisabled}
          motionPreset={isPrimary ? 'cta' : 'button'}
          tone={isPrimary ? 'neutral' : 'subtle'}
          style={{
            alignItems: 'center',
            borderCurve: 'continuous',
            borderRadius: isPrimary ? bookleafTheme.radii.lg : bookleafTheme.radii.md,
            justifyContent: 'center',
            minHeight: isPrimary ? 56 : 46,
            paddingHorizontal: isPrimary ? 20 : 18,
            paddingVertical: isPrimary ? 14 : 12,
          }}
          variant={isPrimary ? 'regular' : 'clear'}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: loading ? 10 : 0,
              justifyContent: 'center',
            }}>
            {loading ? <ActivityIndicator color={foregroundColor} /> : null}
            <Text
              style={{
                color: foregroundColor,
                fontFamily: bookleafTheme.fonts.bold,
                fontSize: isPrimary ? 16 : 14,
                letterSpacing: isPrimary ? 0.15 : 0,
                lineHeight: isPrimary ? 24 : 20,
              }}>
              {label}
            </Text>
          </View>
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}
