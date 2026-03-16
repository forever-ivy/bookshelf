import { appTabs, getInitialHref } from '@/lib/app/navigation';

describe('tab config', () => {
  it('returns the login route when a cabinet is bound but auth is missing', () => {
    expect(getInitialHref({ hasConnection: true, isAuthenticated: false })).toBe('/login');
  });

  it('keeps connect as the entry route before the cabinet is bound', () => {
    expect(getInitialHref({ hasConnection: false, isAuthenticated: false })).toBe('/connect');
  });

  it('returns the home route when both cabinet binding and auth are ready', () => {
    expect(getInitialHref({ hasConnection: true, isAuthenticated: true })).toBe('/home');
  });

  it('defines four tabs with public hrefs and lucide icons', () => {
    expect(appTabs).toEqual([
      { href: '/home', icon: 'home', key: 'home', label: '首页' },
      { href: '/library', icon: 'book', key: 'library', label: '书库' },
      { href: '/reports', icon: 'chart', key: 'reports', label: '报告' },
      { href: '/settings', icon: 'settings', key: 'settings', label: '设置' },
    ]);
  });
});
