import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider } from 'heroui-native/provider';
import React from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { Toaster } from 'sonner-native';

import { SecondaryBackButton } from '@/components/navigation/secondary-back-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AppProviders } from '@/providers/app-providers';
import { ProfileSheetProvider } from '@/providers/profile-sheet-provider';

function createSecondaryHeaderOptions() {
  return {
    headerLeft: () => <SecondaryBackButton testID="secondary-inline-back-button" variant="inline" />,
    presentation: 'card' as const,
    title: '',
  };
}

export default function RootLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider config={{ devInfo: { stylingPrinciples: false }, toast: 'disabled' }}>
          <AppProviders>
            <ProfileSheetProvider>
              <Stack
                screenOptions={{
                  contentStyle: {
                    backgroundColor: theme.colors.background,
                  },
                  gestureEnabled: false,
                  headerBackButtonDisplayMode: 'minimal',
                  headerShadowVisible: false,
                  headerStyle: {
                    backgroundColor: isIos ? 'transparent' : theme.colors.backgroundWorkspace,
                  },
                  headerTitleStyle: isIos
                    ? {
                        color: 'transparent',
                      }
                    : undefined,
                  headerTintColor: theme.colors.text,
                  headerTransparent: isIos,
                }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="login"
                  options={{ headerShown: false, presentation: 'card', title: '登录与身份绑定' }}
                />
                <Stack.Screen name="register" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="onboarding/profile" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="onboarding/interests" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="books/[bookId]" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="booklists/[booklistId]" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="favorites/index" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="orders/[orderId]" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="returns/[returnRequestId]" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="profile" options={createSecondaryHeaderOptions()} />
                <Stack.Screen name="learning/[profileId]" options={{ headerShown: false }} />
                <Stack.Screen name="marker-examples" options={createSecondaryHeaderOptions()} />
              </Stack>
            </ProfileSheetProvider>
            <StatusBar style="dark" />
          </AppProviders>
        </HeroUINativeProvider>
        <Toaster position="top-center" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
