import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { FloatingBottomNav } from '@/components/navigation/floating-bottom-nav';
import { appNavItems, navHrefByKey } from '@/lib/app/navigation';
import type { BottomNavKey } from '@/lib/app/types';

type AppBottomNavProps = {
  activeKey: BottomNavKey;
};

export function AppBottomNav({ activeKey }: AppBottomNavProps) {
  const router = useRouter();

  return (
    <FloatingBottomNav
      activeKey={activeKey}
      items={appNavItems}
      onSelect={(key) => {
        if (process.env.EXPO_OS === 'ios' && key !== activeKey) {
          Haptics.selectionAsync().catch(() => null);
        }

        router.replace(navHrefByKey[key]);
      }}
    />
  );
}
