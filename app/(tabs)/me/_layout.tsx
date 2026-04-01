import { Stack } from 'expo-router';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function MeLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        headerTintColor: theme.colors.text,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '我的',
        }}
      />
    </Stack>
  );
}
