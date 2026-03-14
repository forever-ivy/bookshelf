import React from 'react';
import { View, type ViewStyle } from 'react-native';

import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';

type HeroBubbleBackgroundProps = {
  variant?: 'home' | 'settings';
};

type BubbleConfig = {
  tone: 'primary' | 'secondary' | 'tertiary';
  style: ViewStyle;
  testID: string;
};

const bubbleVariants: Record<NonNullable<HeroBubbleBackgroundProps['variant']>, BubbleConfig[]> = {
  home: [
    {
      testID: 'hero-bubble-home-primary',
      tone: 'primary',
      style: {
        height: 360,
        right: -128,
        top: -54,
        width: 360,
      },
    },
    {
      testID: 'hero-bubble-home-secondary',
      tone: 'secondary',
      style: {
        height: 224,
        right: 92,
        top: 8,
        width: 224,
      },
    },
    {
      testID: 'hero-bubble-home-tertiary',
      tone: 'tertiary',
      style: {
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
      tone: 'primary',
      style: {
        height: 328,
        right: -104,
        top: -42,
        width: 328,
      },
    },
    {
      testID: 'hero-bubble-settings-secondary',
      tone: 'secondary',
      style: {
        height: 208,
        right: 84,
        top: 24,
        width: 208,
      },
    },
    {
      testID: 'hero-bubble-settings-tertiary',
      tone: 'tertiary',
      style: {
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
  const { theme } = useBookleafTheme();
  const bubbleToneMap = theme.heroBubbles[variant];

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
      {bubbleVariants[variant].map((bubble) => {
        const tone = bubbleToneMap[bubble.tone];

        return (
          <View
            key={bubble.testID}
            pointerEvents="none"
            style={{
              backgroundColor: tone.fill,
              borderColor: tone.border,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              boxShadow: tone.shadow,
              position: 'absolute',
              ...bubble.style,
            }}
            testID={bubble.testID}
          />
        );
      })}
    </View>
  );
}
