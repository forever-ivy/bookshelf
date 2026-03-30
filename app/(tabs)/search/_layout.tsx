import { Stack } from 'expo-router';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function SearchLayout() {
  const { theme } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        headerBackButtonDisplayMode: 'minimal',
        headerShown: true,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.backgroundTask,
        },
        headerTintColor: theme.colors.text,
        headerTransparent: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
        }}
      />
    </Stack>
  );
}
