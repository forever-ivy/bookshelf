import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { BottomNavKey } from '@/lib/app/types';

type ScreenShellProps = {
  activeNavKey?: BottomNavKey;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollOffset?: SharedValue<number>;
};

export function ScreenShell({
  activeNavKey,
  children,
  contentContainerStyle,
  scrollOffset,
}: ScreenShellProps) {
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (scrollOffset) {
        scrollOffset.value = event.contentOffset.y;
      }
    },
  });

  return (
    <View style={{ backgroundColor: bookleafTheme.colors.background, flex: 1 }}>
      <LinearGradient
        colors={['#F9F4EC', '#F6F3EE']}
        end={{ x: 1, y: 0.9 }}
        start={{ x: 0, y: 0 }}
        style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
      />
      <View
        style={{
          backgroundColor: 'rgba(200, 216, 255, 0.24)',
          borderRadius: 240,
          height: 260,
          position: 'absolute',
          right: -60,
          top: -40,
          width: 260,
        }}
      />
      <View
        style={{
          backgroundColor: 'rgba(240, 244, 239, 0.72)',
          borderRadius: 240,
          bottom: 80,
          height: 220,
          left: -100,
          position: 'absolute',
          width: 220,
        }}
      />
      <Animated.ScrollView
        contentContainerStyle={[
          {
            gap: 24,
            paddingBottom: activeNavKey ? 144 : 48,
            paddingHorizontal: 24,
            paddingTop: 28,
          },
          contentContainerStyle,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={scrollOffset ? scrollHandler : undefined}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}>
        {children}
      </Animated.ScrollView>
    </View>
  );
}
