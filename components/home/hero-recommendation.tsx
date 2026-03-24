import Animated, { FadeInUp } from 'react-native-reanimated';
import React from 'react';
import { Text, View } from 'react-native';

import { PillButton } from '@/components/base/pill-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { homeHero } from '@/lib/app/mock-data';

export function HeroRecommendation() {
  const { theme } = useAppTheme();

  return (
    <Animated.View entering={FadeInUp.duration(520)}>
      <View
        style={{
          backgroundColor: theme.colors.surfaceDiscovery,
          borderColor: theme.colors.borderSoft,
          borderRadius: theme.radii.xl,
          borderWidth: 1,
          boxShadow: theme.shadows.card,
          gap: theme.spacing.xl,
          marginTop: -88,
          padding: theme.spacing.xl,
        }}>
        <View
          style={{
            gap: theme.spacing.md,
          }}>
          <Text
            style={{
              color: theme.colors.primaryStrong,
              ...theme.typography.semiBold,
              fontSize: 12,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}>
            {homeHero.eyebrow}
          </Text>
          <Text
            style={{
              color: theme.colors.textMuted,
              ...theme.typography.medium,
              fontSize: 13,
            }}>
            {homeHero.meta}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {homeHero.chips.map((chip) => (
              <View
                key={chip}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radii.pill,
                  borderWidth: 1,
                  borderColor: theme.colors.borderSoft,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                }}>
                <Text
                  style={{
                    color: theme.colors.inkBlue,
                    ...theme.typography.semiBold,
                    fontSize: 12,
                  }}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>
          <View style={{ gap: theme.spacing.md }}>
            <Text
              style={{
                color: theme.colors.text,
                ...theme.typography.heading,
                fontSize: 30,
                letterSpacing: -0.8,
                lineHeight: 36,
              }}>
              {homeHero.title}
            </Text>
            <Text
              style={{
                color: theme.colors.textMuted,
                ...theme.typography.body,
                fontSize: 15,
                lineHeight: 22,
              }}>
                {homeHero.subtitle}
              </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: 4 }}>
            <View style={{ flex: 1.1 }}>
              <PillButton icon="spark" label={homeHero.primaryCta} />
            </View>
            <View
              style={{
                alignItems: 'center',
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderSoft,
                borderRadius: theme.radii.pill,
                borderWidth: 1,
                flex: 1,
                justifyContent: 'center',
                minHeight: 46,
                paddingHorizontal: 16,
              }}>
              <Text
                style={{
                  color: theme.colors.text,
                  ...theme.typography.semiBold,
                  fontSize: 14,
                }}>
                {homeHero.secondaryCta}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}
