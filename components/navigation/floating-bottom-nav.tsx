import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { AppIcon } from '@/components/base/app-icon';
import { GlassSurface } from '@/components/surfaces/glass-surface';
import { useGlassMountMotion } from '@/components/surfaces/glass/glass-mount-motion';
import { resolveGlassPressTransform } from '@/components/surfaces/glass/glass-motion';
import { useGlassPressMotion } from '@/components/surfaces/glass/glass-press-motion';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { BottomNavItem, BottomNavKey } from '@/lib/app/types';

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
  const { animatedStyle: mountStyle, profile } = useGlassMountMotion('nav');
  const activePatchX = useSharedValue(activeIndex * 74);

  React.useEffect(() => {
    activePatchX.value = withSpring(activeIndex * 74, {
      damping: profile.selectionSpring.damping,
      mass: profile.selectionSpring.mass,
      stiffness: profile.selectionSpring.stiffness,
    });
  }, [activeIndex, activePatchX, profile.selectionSpring.damping, profile.selectionSpring.mass, profile.selectionSpring.stiffness]);

  const activePatchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activePatchX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          alignSelf: 'center',
          bottom: 18,
          position: 'absolute',
        },
        mountStyle,
      ]}>
      <GlassSurface
        fallbackMode="material"
        isInteractive
        motionPreset="nav"
        tone="subtle"
        style={{
          alignSelf: 'center',
          borderCurve: 'continuous',
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
              backgroundColor: 'rgba(255,255,255,0.18)',
              borderColor: 'rgba(255,255,255,0.24)',
              borderCurve: 'continuous',
              borderRadius: bookleafTheme.radii.pill,
              borderWidth: 1,
              bottom: 10,
              left: 16,
              position: 'absolute',
              top: 10,
              width: 60,
            },
            activePatchStyle,
          ]}
          testID="active-nav-frosted-patch">
          <View style={{ flex: 1 }} />
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
  const { delayLongPress, emphasisProgress, onLongPress, onPressIn, onPressOut, pressProgress, profile } =
    useGlassPressMotion({
      preset: 'nav',
    });
  const activeProgress = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    activeProgress.value = withSpring(active ? 1 : 0, profile.selectionSpring);
  }, [active, activeProgress, profile.selectionSpring]);

  const contentStyle = useAnimatedStyle(() => {
    const pressTransform = resolveGlassPressTransform(
      'nav',
      pressProgress.value,
      emphasisProgress.value
    );

    return {
      transform: [
        {
          scale: interpolate(activeProgress.value, [0, 1], [0.95, 1.02]) + (pressTransform.scale - 1),
        },
        {
          translateY:
            interpolate(activeProgress.value, [0, 1], [1.5, 0]) +
            pressTransform.translateY,
        },
      ],
    };
  });

  const activeIconStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value,
  }));

  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - activeProgress.value,
  }));

  const activeLabelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(activeProgress.value, [0, 1], [
      bookleafTheme.colors.glassForeground,
      bookleafTheme.colors.glassForegroundActive,
    ]),
  }));

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      delayLongPress={delayLongPress}
      key={item.key}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
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
            <AppIcon color={bookleafTheme.colors.glassForeground} name={item.icon} size={20} />
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
            <AppIcon
              color={bookleafTheme.colors.glassForegroundActive}
              name={item.icon}
              size={20}
            />
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
