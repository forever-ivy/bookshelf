import { Image } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';

export function IllustrationScene({
  variant = 'home',
}: {
  variant?: 'home' | 'profile';
}) {
  const { theme } = useAppTheme();
  const isProfile = variant === 'profile';
  const source = isProfile ? appArtwork.profileHero : appArtwork.recommendationHero;
  const testID = isProfile ? 'illustration-profile' : 'illustration-home';

  return (
    <View
      pointerEvents="none"
      style={{
        height: isProfile ? 312 : 404,
        overflow: 'hidden',
      }}>
      <View
        style={{
          backgroundColor: theme.colors.accentLavender,
          borderRadius: theme.radii.pill,
          height: isProfile ? 210 : 240,
          left: isProfile ? -24 : -16,
          opacity: 0.8,
          position: 'absolute',
          top: isProfile ? 20 : 28,
          width: isProfile ? 210 : 240,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.accentMint,
          borderRadius: theme.radii.pill,
          height: isProfile ? 144 : 180,
          opacity: 0.76,
          position: 'absolute',
          right: isProfile ? -22 : -12,
          top: isProfile ? 118 : 156,
          width: isProfile ? 144 : 180,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.accentApricot,
          borderRadius: theme.radii.pill,
          height: isProfile ? 96 : 112,
          left: isProfile ? 104 : 128,
          opacity: 0.84,
          position: 'absolute',
          top: isProfile ? 216 : 276,
          width: isProfile ? 96 : 112,
        }}
      />
      <View
        style={{
          backgroundColor: theme.colors.surfaceStrong,
          borderColor: theme.colors.borderSoft,
          borderRadius: isProfile ? 34 : 40,
          borderWidth: 1,
          boxShadow: theme.shadows.float,
          height: isProfile ? 276 : 364,
          left: 0,
          overflow: 'hidden',
          padding: isProfile ? 10 : 12,
          position: 'absolute',
          right: 0,
          top: 0,
        }}>
        <Image
          contentFit="cover"
          source={source}
          style={{
            borderRadius: isProfile ? 26 : 30,
            flex: 1,
            width: '100%',
          }}
          testID={testID}
        />
        <View
          style={{
            backgroundColor: theme.colors.glassTint,
            borderRadius: theme.radii.pill,
            height: isProfile ? 18 : 20,
            left: isProfile ? 18 : 20,
            position: 'absolute',
            top: isProfile ? 18 : 20,
            width: isProfile ? 72 : 84,
          }}>
          <View
            style={{
              backgroundColor: theme.colors.surfaceTint,
              borderRadius: theme.radii.pill,
              bottom: 0,
              left: isProfile ? 80 : 94,
              position: 'absolute',
              right: 0,
              top: 0,
            }}
          />
        </View>
      </View>
    </View>
  );
}
