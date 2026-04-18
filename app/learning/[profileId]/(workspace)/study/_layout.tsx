import { Stack } from 'expo-router';
import React from 'react';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function LearningWorkspaceStudyLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.backgroundWorkspace,
        },
        headerTintColor: theme.colors.text,
      }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
