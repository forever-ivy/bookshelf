import type { AppTabItem, AppTabKey } from '@/lib/app/types';
import { appRoutes } from '@/lib/app/routes';

export const appTabs = [
  { href: appRoutes.home, key: 'home', label: '首页', icon: 'home' },
  { href: appRoutes.library, key: 'library', label: '书库', icon: 'book' },
  { href: appRoutes.reports, key: 'reports', label: '报告', icon: 'chart' },
  { href: appRoutes.settings, key: 'settings', label: '设置', icon: 'settings' },
] as const satisfies readonly AppTabItem[];

export const appTabHrefByKey: Record<AppTabKey, AppTabItem['href']> =
  {
    home: appRoutes.home,
    library: appRoutes.library,
    reports: appRoutes.reports,
    settings: appRoutes.settings,
  };

export function getInitialHref({
  hasConnection,
  isAuthenticated,
}: {
  hasConnection: boolean;
  isAuthenticated: boolean;
}) {
  if (!hasConnection) {
    return appRoutes.connect;
  }

  return isAuthenticated ? appRoutes.home : appRoutes.authLogin;
}
