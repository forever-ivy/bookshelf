import { Stack } from 'expo-router/stack';

import { flowScreenOptions } from '@/lib/app/navigation-transitions';

export default function ReportsTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reading-events" options={flowScreenOptions} />
    </Stack>
  );
}
