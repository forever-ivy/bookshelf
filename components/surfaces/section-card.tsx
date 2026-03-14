import React from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { GlassSurface } from '@/components/surfaces/glass-surface';
import { useGlassMountMotion } from '@/components/surfaces/glass/glass-mount-motion';
import { bookleafTheme } from '@/constants/bookleaf-theme';
import { motionTransitions } from '@/lib/presentation/motion';

type SectionCardProps = {
  children: React.ReactNode;
  description?: string;
  title?: string;
};

export function SectionCard({ children, description, title }: SectionCardProps) {
  const { animatedStyle } = useGlassMountMotion('card');

  return (
    <Animated.View layout={motionTransitions.gentle} style={animatedStyle}>
      <GlassSurface
        fallbackMode="material"
        motionPreset="card"
        style={{
          borderCurve: 'continuous',
          gap: 16,
          padding: 20,
        }}
        tone="neutral"
        variant="regular">
        <View style={{ gap: 16 }}>
          {title ? (
            <View style={{ gap: 6 }}>
              <Text
                selectable
                style={{
                  color: bookleafTheme.colors.text,
                  fontFamily: bookleafTheme.fonts.heading,
                  fontSize: 28,
                }}>
                {title}
              </Text>
              {description ? (
                <Text
                  selectable
                  style={{
                    color: bookleafTheme.colors.textMuted,
                    fontFamily: bookleafTheme.fonts.body,
                    fontSize: 14,
                    lineHeight: 20,
                  }}>
                  {description}
                </Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
