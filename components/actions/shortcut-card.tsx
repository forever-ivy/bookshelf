import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AppIcon, type AppIconName } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/surfaces/glass-surface';
import { useGlassMountMotion } from '@/components/surfaces/glass/glass-mount-motion';
import { useGlassPressMotion } from '@/components/surfaces/glass/glass-press-motion';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { motionTransitions } from '@/lib/presentation/motion';

type ShortcutCardProps = {
  description: string;
  icon: AppIconName;
  onPress: () => void;
  title: string;
};

export function ShortcutCard({
  description,
  icon,
  onPress,
  title,
}: ShortcutCardProps) {
  const { animatedStyle: mountStyle } = useGlassMountMotion('card');
  const { animatedStyle: pressStyle, delayLongPress, onLongPress, onPressIn, onPressOut } =
    useGlassPressMotion({
      preset: 'card',
    });

  return (
    <Animated.View
      layout={motionTransitions.gentle}
      style={[{ flex: 1, minWidth: '47%' }, mountStyle, pressStyle]}>
      <Pressable
        accessibilityRole="button"
        delayLongPress={delayLongPress}
        onLongPress={onLongPress}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}>
        <GlassSurface
          fallbackMode="material"
          isInteractive
          motionPreset="card"
          style={{
            borderCurve: 'continuous',
            minHeight: 148,
            padding: 18,
          }}
          tone="neutral"
          variant="regular">
          <View style={{ flex: 1, justifyContent: 'space-between' }}>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: bookleafTheme.colors.surfaceMuted,
                borderCurve: 'continuous',
                borderRadius: 22,
                height: 48,
                justifyContent: 'center',
                width: 48,
              }}>
              <AppIcon color={bookleafTheme.colors.primaryStrong} name={icon} size={22} />
            </View>
            <View style={{ gap: 6 }}>
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.text,
                  fontFamily: bookleafTheme.fonts.semiBold,
                  fontSize: 16,
                }}>
                {title}
              </Text>
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.textMuted,
                  fontFamily: bookleafTheme.fonts.body,
                  fontSize: 13,
                  lineHeight: 18,
                }}>
                {description}
              </Text>
            </View>
          </View>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}
