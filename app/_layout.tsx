import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  const { theme } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
              headerShown: false,
            }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="profile"
              options={{
                presentation: 'card',
              }}
            />
            <Stack.Screen
              name="marker-examples"
              options={{
                presentation: 'card',
              }}
            />
          </Stack>
          <StatusBar style="dark" />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
