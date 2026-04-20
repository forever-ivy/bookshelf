import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function SearchGroupLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        gestureEnabled: false,
        headerBackButtonDisplayMode: 'minimal',
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: isIos ? 'transparent' : theme.colors.backgroundTask,
        },
        headerTitleStyle: isIos
          ? {
              color: 'transparent',
            }
          : undefined,
        headerTintColor: theme.colors.text,
        headerTransparent: isIos,
      }}>
      <Stack.Screen
        name="borrow-now"
        options={{
          headerLeft: () => <SecondaryBackButton testID="search-borrow-now-back-button" variant="inline" />,
          title: '',
        }}
      />
    </Stack>
  );
}
