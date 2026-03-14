import { hideAsync as hideSplashAsync } from 'expo-splash-screen';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import {
  flowScreenOptions,
  rootStackScreenOptions,
  scannerScreenOptions,
} from '@/lib/app/navigation-transitions';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  const pathname = usePathname();

  React.useEffect(() => {
    console.log('[startup] RootLayout mounted');
    hideSplashAsync().catch(() => null);
  }, []);

  React.useEffect(() => {
    console.log('[nav] pathname', pathname);
  }, [pathname]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <Stack screenOptions={rootStackScreenOptions}>
            <Stack.Screen name="index" />
            <Stack.Screen name="connect" />
            <Stack.Screen name="scanner" options={scannerScreenOptions} />
            <Stack.Screen name="shelf" options={flowScreenOptions} />
            <Stack.Screen name="store-book" options={flowScreenOptions} />
            <Stack.Screen name="take-book" options={flowScreenOptions} />
            <Stack.Screen name="booklist-manage" options={flowScreenOptions} />
            <Stack.Screen name="goal-settings" options={flowScreenOptions} />
            <Stack.Screen name="members" options={flowScreenOptions} />
            <Stack.Screen name="member-form" options={flowScreenOptions} />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <StatusBar style="dark" />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
