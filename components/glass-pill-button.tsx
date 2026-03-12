import React from 'react';
import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/app-icon';
import { GlassSurface } from '@/components/glass-surface';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { motionTokens } from '@/lib/motion';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  const pressed = useSharedValue(0);
  const held = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 - pressed.value * 0.03 + held.value * 0.05 },
      { translateY: pressed.value * 1.5 - held.value * 2.5 },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      onLongPress={() => {
        held.value = withSpring(1, motionTokens.spring.snappy);

        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        }
      }}
      onPress={onPress}
      onPressIn={() => {
        pressed.value = withSpring(1, motionTokens.spring.snappy);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, motionTokens.spring.snappy);
        held.value = withSpring(0, motionTokens.spring.gentle);
      }}>
      <Animated.View style={animatedStyle}>
        <GlassSurface
          fallbackMode="material"
          isInteractive
          motionPreset="button"
          tone="subtle"
          style={{
            alignItems: 'center',
            borderCurve: 'continuous',
            borderRadius: bookleafTheme.radii.pill,
            flexDirection: 'row',
            gap: 8,
            minHeight: 46,
            minWidth: 46,
            paddingHorizontal: label ? 14 : 12,
            paddingVertical: 10,
          }}
          variant="clear">
          <AppIcon color={bookleafTheme.colors.glassForegroundActive} name={icon} size={18} />
          {label ? (
            <Text
              selectable
              style={{
                color: bookleafTheme.colors.glassForegroundActive,
                fontFamily: bookleafTheme.fonts.semiBold,
                fontSize: 14,
              }}>
              {label}
            </Text>
          ) : null}
        </GlassSurface>
      </Animated.View>
    </Pressable>
  );
}
