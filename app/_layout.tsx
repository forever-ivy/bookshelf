import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { GlobalSecondaryBackLayer } from '@/components/navigation/global-secondary-back-layer';
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
            <Stack.Screen name="login" options={{ presentation: 'card' }} />
            <Stack.Screen name="register" options={{ presentation: 'card' }} />
            <Stack.Screen name="onboarding/profile" options={{ presentation: 'card' }} />
            <Stack.Screen name="onboarding/interests" options={{ presentation: 'card' }} />
            <Stack.Screen name="books/[bookId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="borrow/[bookId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="orders/[orderId]" options={{ presentation: 'card' }} />
            <Stack.Screen name="returns/[returnRequestId]" options={{ presentation: 'card' }} />
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
          <GlobalSecondaryBackLayer />
          <StatusBar style="dark" />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
