import { Stack, usePathname } from 'expo-router';
import { View } from 'react-native';

import { AppBottomNav } from '@/components/app-bottom-nav';
import {
  appStackScreenOptions,
  profileScreenOptions,
} from '@/lib/navigation-transitions';
import type { BottomNavKey } from '@/lib/types';

function resolveActiveNavKey(pathname: string): BottomNavKey {
  if (pathname.includes('/library')) {
    return 'library';
  }

  if (pathname.includes('/reports')) {
    return 'reports';
  }

  if (pathname.includes('/settings')) {
    return 'settings';
  }

  return 'home';
}

export default function AppLayout() {
  const pathname = usePathname();

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={appStackScreenOptions}>
        <Stack.Screen name="home" />
        <Stack.Screen name="library" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="profile/[memberId]" options={profileScreenOptions} />
      </Stack>
      <AppBottomNav activeKey={resolveActiveNavKey(pathname)} />
    </View>
  );
}
