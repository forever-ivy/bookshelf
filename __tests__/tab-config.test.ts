import { appTabs, getInitialHref } from '@/lib/app/navigation';

describe('tab config', () => {
  it('returns the new home route when a connection exists', () => {
    expect(getInitialHref(true)).toBe('/home');
  });

  it('keeps connect as the unauthenticated entry route', () => {
    expect(getInitialHref(false)).toBe('/connect');
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
