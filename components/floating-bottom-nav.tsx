import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { AppIcon } from '@/components/app-icon';
import { GlassSurface } from '@/components/glass-surface';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { motionTokens } from '@/lib/motion';
import type { BottomNavItem, BottomNavKey } from '@/lib/types';

type FloatingBottomNavProps = {
  activeKey: BottomNavKey;
  items: readonly BottomNavItem[];
  onSelect: (key: BottomNavKey) => void;
};

export function FloatingBottomNav({
  activeKey,
  items,
  onSelect,
}: FloatingBottomNavProps) {
  const activeIndex = Math.max(
    items.findIndex((item) => item.key === activeKey),
    0
  );
  const activePatchX = useSharedValue(activeIndex * 74);
  const mountProgress = useSharedValue(0);

  React.useEffect(() => {
    activePatchX.value = withSpring(activeIndex * 74, {
      damping: 20,
      mass: 0.95,
      stiffness: 210,
    });
  }, [activeIndex, activePatchX]);

  React.useEffect(() => {
    mountProgress.value = withSpring(1, motionTokens.spring.gentle);
  }, [mountProgress]);

  const activePatchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activePatchX.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(mountProgress.value, [0, 1], [18, 0]),
      },
      {
        scale: interpolate(mountProgress.value, [0, 1], [0.98, 1]),
      },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'center',
          bottom: 18,
          position: 'absolute',
        },
        containerStyle,
      ]}>
      <GlassSurface
        fallbackMode="material"
        isInteractive
        motionPreset="nav"
        tone="subtle"
        style={{
          alignSelf: 'center',
          borderCurve: 'continuous',
          borderRadius: bookleafTheme.radii.pill,
          boxShadow: bookleafTheme.shadows.floating,
          flexDirection: 'row',
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 9,
        }}
        variant="clear">
        <Animated.View
          pointerEvents="none"
          style={[
            {
              bottom: 9,
              left: 14,
              position: 'absolute',
              top: 9,
              width: 64,
            },
            activePatchStyle,
          ]}
          testID="active-nav-frosted-patch">
          <GlassSurface
            fallbackMode="material"
            motionPreset="button"
            style={{
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
              flex: 1,
            }}
            tone="subtle"
            variant="clear">
            <View style={{ flex: 1 }} />
          </GlassSurface>
        </Animated.View>
        {items.map((item) => (
          <FloatingBottomNavItem
            active={item.key === activeKey}
            item={item}
            key={item.key}
            onPress={() => onSelect(item.key)}
          />
        ))}
      </GlassSurface>
    </Animated.View>
  );
}

type FloatingBottomNavItemProps = {
  active: boolean;
  item: BottomNavItem;
  onPress: () => void;
};

function FloatingBottomNavItem({
  active,
  item,
  onPress,
}: FloatingBottomNavItemProps) {
  const activeProgress = useSharedValue(active ? 1 : 0);
  const pressProgress = useSharedValue(0);
  const longPressProgress = useSharedValue(0);

  React.useEffect(() => {
    activeProgress.value = withSpring(active ? 1 : 0, motionTokens.spring.snappy);
  }, [active, activeProgress]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale:
          interpolate(activeProgress.value, [0, 1], [0.95, 1.02]) +
          interpolate(pressProgress.value, [0, 1], [0, 0.028]) +
          interpolate(longPressProgress.value, [0, 1], [0, 0.1]),
      },
      {
        translateY:
          interpolate(activeProgress.value, [0, 1], [1.5, 0]) -
          interpolate(pressProgress.value, [0, 1], [0, 1.5]) -
          interpolate(longPressProgress.value, [0, 1], [0, 4]),
      },
    ],
  }));

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
  }));

  const activeLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(activeProgress.value, [0, 1], [
      bookleafTheme.colors.text,
      bookleafTheme.colors.primaryStrong,
    ]),
  }));

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      key={item.key}
      onPress={onPress}
      onLongPress={() => {
        longPressProgress.value = withSpring(1, motionTokens.spring.snappy);

        if (process.env.EXPO_OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        }
      }}
      onPressIn={() => {
        pressProgress.value = withSpring(1, motionTokens.spring.snappy);
      }}
      onPressOut={() => {
        pressProgress.value = withSpring(0, motionTokens.spring.snappy);
        longPressProgress.value = withSpring(0, motionTokens.spring.gentle);
      }}
      delayLongPress={130}
      style={{
        alignItems: 'center',
        borderCurve: 'continuous',
        borderRadius: bookleafTheme.radii.pill,
        height: 58,
        justifyContent: 'center',
        overflow: 'hidden',
        width: 64,
      }}>
      <Animated.View
        style={[
          {
            alignItems: 'center',
            gap: 4,
            justifyContent: 'center',
          },
          contentStyle,
        ]}>
        <View
          style={{
            height: 20,
            position: 'relative',
            width: 20,
          }}>
          <Animated.View
            style={[
              {
                left: 0,
                position: 'absolute',
                top: 0,
              },
              inactiveIconStyle,
            ]}>
            <AppIcon color={bookleafTheme.colors.text} name={item.icon} size={20} />
          </Animated.View>
          <Animated.View
            style={[
              {
                left: 0,
                position: 'absolute',
                top: 0,
              },
              activeIconStyle,
            ]}>
            <AppIcon color={bookleafTheme.colors.primaryStrong} name={item.icon} size={20} />
          </Animated.View>
        </View>
        <Animated.Text
          style={[
            {
              fontFamily: bookleafTheme.fonts.bold,
              fontSize: 10,
              lineHeight: 15,
            },
            activeLabelStyle,
          ]}>
          {item.label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}
