import { hideAsync as hideSplashAsync } from 'expo-splash-screen';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import {
  rootStackScreenOptions,
  scannerScreenOptions,
} from '@/lib/app/navigation-transitions';
import { useBookleafTheme } from '@/hooks/use-bookleaf-theme';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  const pathname = usePathname();
  const { theme } = useBookleafTheme();

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
          <Stack
            screenOptions={{
              ...rootStackScreenOptions,
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(connect)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(modals)" options={scannerScreenOptions} />
          </Stack>
          <StatusBar style={theme.statusBarStyle} />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
