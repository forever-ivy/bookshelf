import { Stack, useLocalSearchParams } from 'expo-router';
import { Platform } from 'react-native';

import { TutorWorkspaceProvider } from '@/components/tutor/tutor-workspace-provider';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TutorWorkspaceStackLayout() {
  const { theme } = useAppTheme();
  const isIos = Platform.OS === 'ios';
  const params = useLocalSearchParams<{ profileId?: string }>();
  const profileId = Number(params.profileId ?? 0);

  return (
    <TutorWorkspaceProvider profileId={profileId}>
      <Stack
        screenOptions={{
          contentStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
          },
          headerTransparent: false,
        }}>
        <Stack.Screen name="(workspace)" options={{ headerShown: false }} />
        <Stack.Screen
          name="info-sheet"
          options={{
            contentStyle: { backgroundColor: theme.colors.surface },
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: [0.45, 0.75, 1],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="session/[sessionId]"
          options={{
            title: '学习会话',
            headerShadowVisible: !isIos,
          }}
        />
      </Stack>
    </TutorWorkspaceProvider>
  );
}
