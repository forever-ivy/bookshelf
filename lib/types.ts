import type { AppIconName } from '@/components/app-icon';

export type BottomNavKey = 'home' | 'library' | 'reports' | 'settings';

export type BottomNavItem = {
  key: BottomNavKey;
  label: string;
  icon: AppIconName;
};
