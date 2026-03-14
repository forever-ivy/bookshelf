import React from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, { useAnimatedScrollHandler, type SharedValue } from 'react-native-reanimated';

import { bookleafTheme } from '@/constants/bookleaf-theme';
import type { AppTabKey } from '@/lib/app/types';

type ScreenShellProps = {
  activeNavKey?: AppTabKey;
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
      <Animated.ScrollView
        contentContainerStyle={[
          {
            gap: 24,
            paddingBottom: activeNavKey ? 56 : 40,
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
