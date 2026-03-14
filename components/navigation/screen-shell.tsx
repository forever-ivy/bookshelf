import React from "react";
import { BlurView } from "expo-blur";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  type SharedValue,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

import { bookleafTheme } from "@/constants/bookleaf-theme";
import type { AppTabKey } from "@/lib/app/types";

const TOP_OVERLAY_HEIGHT = 108;
const TOP_BLUR_HEIGHT = 56;
const TOP_OVERLAY_GRADIENT = `
<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
  <defs>
    <linearGradient id="screenShellTopFade" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="#F6F3EE" stop-opacity="0.08" />
<stop offset="10%" stop-color="#F6F3EE" stop-opacity="0.074" />
<stop offset="20%" stop-color="#F6F3EE" stop-opacity="0.062" />
<stop offset="30%" stop-color="#F6F3EE" stop-opacity="0.05" />
<stop offset="45%" stop-color="#F6F3EE" stop-opacity="0.035" />
<stop offset="60%" stop-color="#F6F3EE" stop-opacity="0.022" />
<stop offset="75%" stop-color="#F6F3EE" stop-opacity="0.012" />
<stop offset="88%" stop-color="#F6F3EE" stop-opacity="0.005" />
<stop offset="100%" stop-color="#F6F3EE" stop-opacity="0" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" fill="url(#screenShellTopFade)" />
</svg>
`;

type ScreenShellProps = {
  activeNavKey?: AppTabKey;
  backgroundDecoration?: React.ReactNode;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollOffset?: SharedValue<number>;
};

export function ScreenShell({
  activeNavKey,
  backgroundDecoration,
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
            paddingBottom: activeNavKey ? 56 : 40,
            paddingHorizontal: 24,
            paddingTop: 28,
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
      <View
        pointerEvents="none"
        style={{
          height: TOP_OVERLAY_HEIGHT,
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
          zIndex: 2,
        }}
        testID="screen-shell-top-overlay"
      >
        <BlurView
          intensity={4}
          style={{
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
            height: TOP_BLUR_HEIGHT,
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
          xml={TOP_OVERLAY_GRADIENT}
          width="100%"
        ></SvgXml>
      </View>
    </View>
  );
}
