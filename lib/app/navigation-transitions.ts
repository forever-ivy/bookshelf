import { bookleafTheme } from '@/constants/bookleaf-theme';

export const rootStackScreenOptions = {
  animation: 'none',
  contentStyle: {
    backgroundColor: bookleafTheme.colors.background,
  },
  headerShown: false,
} as const;

export const appStackScreenOptions = {
  animation: 'none',
  headerShown: false,
} as const;

export const profileScreenOptions = {
  animation: 'default',
  headerShown: false,
} as const;

export const flowScreenOptions = {
  animation: 'slide_from_right',
  headerShown: false,
} as const;

export const scannerScreenOptions = {
  animation: 'slide_from_bottom',
  presentation: 'fullScreenModal',
} as const;
