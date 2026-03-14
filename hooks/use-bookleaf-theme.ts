import { useColorScheme } from 'react-native';

import {
  normalizeBookleafColorScheme,
  resolveBookleafTheme,
} from '@/constants/bookleaf-theme';

export function useBookleafTheme() {
  const colorScheme = useColorScheme();
  const normalizedColorScheme = normalizeBookleafColorScheme(colorScheme);
  const theme = resolveBookleafTheme(normalizedColorScheme);

  return {
    colorScheme: normalizedColorScheme,
    isDark: theme.isDark,
    theme,
  } as const;
}
