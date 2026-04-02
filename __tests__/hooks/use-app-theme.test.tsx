import { appThemes } from '@/constants/app-theme';
import { resolveAppTheme } from '@/hooks/use-app-theme';

describe('useAppTheme', () => {
  it('returns the dark theme on native when the system appearance is dark', () => {
    expect(resolveAppTheme('ios', 'dark')).toEqual({
      colorScheme: 'dark',
      isDark: true,
      theme: appThemes.dark,
    });
  });

  it('keeps web pinned to the light theme even if the browser prefers dark', () => {
    expect(resolveAppTheme('web', 'dark')).toEqual({
      colorScheme: 'light',
      isDark: false,
      theme: appThemes.light,
    });
  });
});
