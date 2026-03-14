import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSurface } from '@/components/surfaces/glass-surface';
import { useGlassPressMotion } from '@/components/surfaces/glass/glass-press-motion';
import { bookleafTheme } from '@/constants/bookleaf-theme';

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
  const { animatedStyle, delayLongPress, onLongPress, onPressIn, onPressOut } =
    useGlassPressMotion({
      disabled: effectiveDisabled,
      preset: isPrimary ? 'cta' : 'button',
    });

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
      delayLongPress={delayLongPress}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Animated.View style={animatedStyle}>
        <GlassSurface
          fallbackMode="material"
          isInteractive={!effectiveDisabled}
          motionPreset={isPrimary ? 'cta' : 'button'}
          tone={isPrimary ? 'neutral' : 'subtle'}
          style={{
            alignItems: 'center',
            borderCurve: 'continuous',
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
