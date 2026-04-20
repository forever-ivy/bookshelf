import { Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function LearningWorkspaceGraphLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
        gestureEnabled: false,
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerShown: true,
        headerStyle: {
          backgroundColor: isIos ? 'transparent' : theme.colors.backgroundWorkspace,
        },
        headerTintColor: theme.colors.text,
        headerTransparent: isIos,
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
