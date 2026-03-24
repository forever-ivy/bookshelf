import React from 'react';
import { Image, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { appArtwork } from '@/lib/app/artwork';

export function BrandMark({
  size = 56,
  testID,
}: {
  size?: number;
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.borderSoft,
        borderRadius: Math.round(size * 0.34),
        borderWidth: 1,
        boxShadow: theme.shadows.card,
        height: size,
        justifyContent: 'center',
        overflow: 'hidden',
        width: size,
      }}>
      <Image
        source={appArtwork.appIcon}
        style={{
          borderRadius: Math.round(size * 0.28),
          height: size,
          width: size,
        }}
        testID={testID}
      />
    </View>
  );
}
