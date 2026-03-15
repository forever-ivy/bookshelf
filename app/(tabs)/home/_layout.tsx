import { Stack } from 'expo-router/stack';

import {
  flowScreenOptions,
  profileScreenOptions,
} from '@/lib/app/navigation-transitions';

export default function HomeTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile/[memberId]" options={profileScreenOptions} />
      <Stack.Screen name="profile/[memberId]/goals" options={flowScreenOptions} />
    </Stack>
  );
}
