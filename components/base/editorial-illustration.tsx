import { Image, type ImageSource } from 'expo-image';
import React from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export function EditorialIllustration({
  height = 196,
  inset = false,
  source,
  testID,
}: {
  height?: number;
  inset?: boolean;
  source: ImageSource | number;
  testID?: string;
}) {
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        marginHorizontal: inset ? theme.spacing.sm : 0,
      }}>
      <Image
        contentFit="contain"
        source={source}
        style={{
          height,
          width: '100%',
        }}
        testID={testID}
      />
    </View>
  );
}
