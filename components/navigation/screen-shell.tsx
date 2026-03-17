import React from "react";
import { BlurView } from "expo-blur";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

import { useBookleafTheme } from "@/hooks/use-bookleaf-theme";
import type { AppTabKey } from "@/lib/app/types";

function createTopOverlayGradient(
  color: string,
  opacities: readonly number[]
) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="screenShellTopFade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="${opacities[0]}" />
<stop offset="28%" stop-color="${color}" stop-opacity="${opacities[1]}" />
<stop offset="62%" stop-color="${color}" stop-opacity="${opacities[2]}" />
<stop offset="100%" stop-color="${color}" stop-opacity="${opacities[3]}" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" fill="url(#screenShellTopFade)" />
</svg>
`;
}

type ScreenShellProps = {
  activeNavKey?: AppTabKey;
  backgroundDecoration?: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  showTopOverlay?: boolean;
  scrollOffset?: SharedValue<number>;
};

export function ScreenShell({
  activeNavKey,
  backgroundDecoration,
  children,
  contentContainerStyle,
  showTopOverlay = false,
  scrollOffset,
}: ScreenShellProps) {
  const { theme } = useBookleafTheme();
  const insets = useSafeAreaInsets();
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (scrollOffset) {
        scrollOffset.value = event.contentOffset.y;
      }
    },
  });
  const topOverlayGradient = createTopOverlayGradient(
    theme.topOverlay.gradientColor,
    theme.topOverlay.gradientOpacities
  );

  return (
    <View style={{ backgroundColor: theme.colors.background, flex: 1 }}>
      {backgroundDecoration ? (
        <View
          pointerEvents="none"
          style={{
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
          testID="screen-shell-background-decoration"
        >
          {backgroundDecoration}
        </View>
      ) : null}
      <Animated.ScrollView
        contentContainerStyle={[
          {
            gap: 24,
            paddingBottom: insets.bottom + (activeNavKey ? 56 : 40),
            paddingHorizontal: 24,
            paddingTop: insets.top + 4,
          },
          contentContainerStyle,
        ]}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={scrollOffset ? scrollHandler : undefined}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        testID="screen-shell-scroll-view"
      >
        {children}
      </Animated.ScrollView>
      {showTopOverlay ? (
        <View
          pointerEvents="none"
          style={{
            height: theme.topOverlay.height,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 2,
          }}
          testID="screen-shell-top-overlay"
        >
          <BlurView
            intensity={theme.topOverlay.blurIntensity}
            style={{
              height: theme.topOverlay.blurHeight,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
            }}
            testID="screen-shell-top-blur"
          />
          <SvgXml
            height="100%"
            style={{
              bottom: 0,
              left: 0,
              position: "absolute",
              right: 0,
              top: 0,
            }}
            testID="screen-shell-top-gradient"
            xml={topOverlayGradient}
            width="100%"
          ></SvgXml>
        </View>
      ) : null}
    </View>
  );
}
