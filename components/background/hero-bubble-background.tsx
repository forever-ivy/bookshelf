import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { bookleafTheme } from '@/constants/bookleaf-theme';

type HeroBubbleBackgroundProps = {
  variant?: 'home' | 'settings';
};

type BubbleConfig = {
  style: ViewStyle;
  testID: string;
};

const bubbleVariants: Record<NonNullable<HeroBubbleBackgroundProps['variant']>, BubbleConfig[]> = {
  home: [
    {
      testID: 'hero-bubble-home-primary',
      style: {
        backgroundColor: 'rgba(146, 191, 255, 0.24)',
        boxShadow: '0 24px 60px rgba(126, 168, 255, 0.18)',
        height: 360,
        right: -128,
        top: -54,
        width: 360,
      },
    },
    {
      testID: 'hero-bubble-home-secondary',
      style: {
        backgroundColor: 'rgba(206, 239, 228, 0.44)',
        height: 224,
        right: 92,
        top: 8,
        width: 224,
      },
    },
    {
      testID: 'hero-bubble-home-tertiary',
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.24)',
        height: 126,
        right: 36,
        top: 168,
        width: 126,
      },
    },
  ],
  settings: [
    {
      testID: 'hero-bubble-settings-primary',
      style: {
        backgroundColor: 'rgba(146, 191, 255, 0.2)',
        boxShadow: '0 22px 54px rgba(126, 168, 255, 0.16)',
        height: 328,
        right: -104,
        top: -42,
        width: 328,
      },
    },
    {
      testID: 'hero-bubble-settings-secondary',
      style: {
        backgroundColor: 'rgba(211, 239, 230, 0.38)',
        height: 208,
        right: 84,
        top: 24,
        width: 208,
      },
    },
    {
      testID: 'hero-bubble-settings-tertiary',
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.22)',
        height: 118,
        right: 12,
        top: 176,
        width: 118,
      },
    },
  ],
};

export function HeroBubbleBackground({
  variant = 'settings',
}: HeroBubbleBackgroundProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        bottom: 0,
        left: 0,
        overflow: 'hidden',
        position: 'absolute',
        right: 0,
        top: 0,
      }}
      testID={`hero-bubble-background-${variant}`}>
      {bubbleVariants[variant].map((bubble) => (
        <View
          key={bubble.testID}
          pointerEvents="none"
          style={{
            borderColor: 'rgba(255,255,255,0.34)',
            borderRadius: bookleafTheme.radii.pill,
            borderWidth: 1,
            position: 'absolute',
            ...bubble.style,
          }}
          testID={bubble.testID}
        />
      ))}
    </View>
  );
}
