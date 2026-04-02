import { appTheme } from '@/constants/app-theme';

export function useAppTheme() {
  return {
    theme: appTheme,
  } as const;
}
