import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import { Toaster } from 'sonner-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AppProviders } from '@/providers/app-providers';
import { ProfileSheetProvider } from '@/providers/profile-sheet-provider';

export default function RootLayout() {
  const { theme } = useAppTheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProviders>
          <ProfileSheetProvider>
            <Stack
              screenOptions={{
                contentStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerBackButtonDisplayMode: 'minimal',
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: theme.colors.backgroundWorkspace,
                },
                headerTintColor: theme.colors.text,
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="login"
                options={{ headerShown: false, presentation: 'card', title: '登录与身份绑定' }}
              />
              <Stack.Screen name="register" options={{ presentation: 'card', title: '创建账号' }} />
              <Stack.Screen
                name="onboarding/profile"
                options={{ presentation: 'card', title: '完善借阅资料' }}
              />
              <Stack.Screen
                name="onboarding/interests"
                options={{ presentation: 'card', title: '选择借阅偏好' }}
              />
              <Stack.Screen name="books/[bookId]" options={{ presentation: 'card', title: '图书详情' }} />
              <Stack.Screen name="booklists/[booklistId]" options={{ presentation: 'card', title: '书单详情' }} />
              <Stack.Screen name="favorites/index" options={{ presentation: 'card', title: '收藏图书' }} />
              <Stack.Screen name="borrow/[bookId]" options={{ presentation: 'card', title: '借阅下单' }} />
              <Stack.Screen name="orders/[orderId]" options={{ presentation: 'card', title: '借阅状态' }} />
              <Stack.Screen
                name="returns/[returnRequestId]"
                options={{ presentation: 'card', title: '归还请求详情' }}
              />
              <Stack.Screen
                name="profile"
                options={{
                  presentation: 'card',
                  title: '借阅偏好',
                }}
              />
              <Stack.Screen
                name="marker-examples"
                options={{
                  presentation: 'card',
                  title: '文字高亮示例',
                }}
              />
            </Stack>
          </ProfileSheetProvider>
          <StatusBar style="dark" />
        </AppProviders>
        <Toaster position="top-center" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
