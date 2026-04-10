import { Stack } from 'expo-router';
import { Platform } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';

export default function TutorWorkspaceSearchLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';

  return (
    <Stack
      screenOptions={{
        contentStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerLargeTitle: false,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: isIos ? 'transparent' : theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: isIos
          ? {
              color: 'transparent',
            }
          : undefined,
        headerTransparent: isIos,
        headerTitle: '',
      }}
    />
  );
}
