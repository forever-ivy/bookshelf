import {
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  PublicSans_400Regular,
  PublicSans_500Medium,
  PublicSans_600SemiBold,
  PublicSans_700Bold,
} from '@expo-google-fonts/public-sans';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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

SplashScreen.preventAutoHideAsync().catch(() => null);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_700Bold,
    PublicSans_400Regular,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    PublicSans_700Bold,
  });

  React.useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => null);
    }
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
            <Stack.Screen name="(app)" />
          </Stack>
          <StatusBar style="dark" />
        </AppProviders>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
