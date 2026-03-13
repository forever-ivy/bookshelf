import type { BottomNavItem, BottomNavKey } from '@/lib/app/types';

export const appNavItems = [
  { key: 'home', label: '首页', icon: 'home' },
  { key: 'library', label: '书库', icon: 'book' },
  { key: 'reports', label: '报告', icon: 'chart' },
  { key: 'settings', label: '设置', icon: 'settings' },
] as const satisfies readonly BottomNavItem[];

export const navHrefByKey: Record<BottomNavKey, '/(app)/home' | '/(app)/library' | '/(app)/reports' | '/(app)/settings'> =
  {
    home: '/(app)/home',
    library: '/(app)/library',
    reports: '/(app)/reports',
    settings: '/(app)/settings',
  };

export function getInitialHref(hasConnection: boolean) {
  return hasConnection ? '/(app)/home' : '/connect';
}
