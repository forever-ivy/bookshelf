import type { AppTabItem, AppTabKey } from '@/lib/app/types';

export const appTabs = [
  { href: '/home', key: 'home', label: '首页', icon: 'home' },
  { href: '/library', key: 'library', label: '书库', icon: 'book' },
  { href: '/reports', key: 'reports', label: '报告', icon: 'chart' },
  { href: '/settings', key: 'settings', label: '设置', icon: 'settings' },
] as const satisfies readonly AppTabItem[];

export const appTabHrefByKey: Record<AppTabKey, AppTabItem['href']> =
  {
    home: '/home',
    library: '/library',
    reports: '/reports',
    settings: '/settings',
  };

export function getInitialHref(hasConnection: boolean) {
  return hasConnection ? '/home' : '/connect';
}
