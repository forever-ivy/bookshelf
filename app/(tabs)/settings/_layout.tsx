import { Stack } from 'expo-router/stack';

import { flowScreenOptions } from '@/lib/app/navigation-transitions';

export default function SettingsTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="accounts/index" options={flowScreenOptions} />
      <Stack.Screen name="accounts/[accountId]" options={flowScreenOptions} />
      <Stack.Screen name="cabinet" options={flowScreenOptions} />
      <Stack.Screen name="family" options={flowScreenOptions} />
      <Stack.Screen name="members" options={flowScreenOptions} />
      <Stack.Screen name="members/form" options={flowScreenOptions} />
    </Stack>
  );
}
