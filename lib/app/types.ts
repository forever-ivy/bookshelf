import type { AppIconName } from '@/components/base/app-icon';

export type AppTabKey = 'home' | 'library' | 'reports' | 'settings';

export type AppTabItem = {
  href: '/home' | '/library' | '/reports' | '/settings';
  key: AppTabKey;
  label: string;
  icon: AppIconName;
};
