import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/surfaces/glass-surface';
import { useGlassPressMotion } from '@/components/surfaces/glass/glass-press-motion';
import { bookleafTheme } from '@/constants/bookleaf-theme';

type GlassPillButtonProps = {
  icon: 'back' | 'info' | 'search' | 'share';
  label?: string;
  onPress: () => void;
};

export function GlassPillButton({ icon, label, onPress }: GlassPillButtonProps) {
  const { animatedStyle, delayLongPress, onLongPress, onPressIn, onPressOut } =
    useGlassPressMotion({
      preset: 'button',
    });

  return (
    <Pressable
      accessibilityRole="button"
      delayLongPress={delayLongPress}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Animated.View style={animatedStyle}>
        <GlassSurface
          fallbackMode="material"
          isInteractive
          motionPreset="button"
          tone="subtle"
          style={{
            alignItems: 'center',
            borderCurve: 'continuous',
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
