import { Platform, type ColorSchemeName, useColorScheme } from 'react-native';

import { appThemes } from '@/constants/app-theme';

type ResolvedAppTheme = {
  colorScheme: 'dark' | 'light';
  isDark: boolean;
  theme: (typeof appThemes)[keyof typeof appThemes];
};

export function resolveAppTheme(
  platformOs: typeof Platform.OS,
  preferredScheme: ColorSchemeName
): ResolvedAppTheme {
  if (platformOs === 'web') {
    return {
      colorScheme: 'light',
      isDark: false,
      theme: appThemes.light,
    };
  }

  const colorScheme = preferredScheme === 'dark' ? 'dark' : 'light';

  return {
    colorScheme,
    isDark: colorScheme === 'dark',
    theme: colorScheme === 'dark' ? appThemes.dark : appThemes.light,
  };
}

export function useAppTheme() {
  return resolveAppTheme(Platform.OS, useColorScheme());
}
