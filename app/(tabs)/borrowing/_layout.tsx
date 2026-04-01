import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function BorrowingLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        headerBackButtonDisplayMode: 'minimal',
        headerLargeStyle: isIos
          ? {
              backgroundColor: 'transparent',
            }
          : undefined,
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
      <Stack.Screen name="index" options={{ headerLargeTitleShadowVisible: false }} />
    </Stack>
  );
}
