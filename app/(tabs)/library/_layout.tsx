import { Stack } from 'expo-router/stack';

import { flowScreenOptions } from '@/lib/app/navigation-transitions';

export default function LibraryTabLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="shelf" options={flowScreenOptions} />
      <Stack.Screen name="booklist" options={flowScreenOptions} />
      <Stack.Screen name="take-book" options={flowScreenOptions} />
      <Stack.Screen name="store-book" options={flowScreenOptions} />
    </Stack>
  );
}
