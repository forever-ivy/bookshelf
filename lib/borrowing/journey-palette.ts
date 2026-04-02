import type { AppTheme } from '@/constants/app-theme';

type JourneyTone = 'danger' | 'muted' | 'neutral' | 'success' | 'warning';

export function getJourneyTonePalette(tone: JourneyTone, theme: AppTheme) {
  switch (tone) {
    case 'success':
      return {
        accent: theme.colors.availabilityReady,
        accentSoft: theme.colors.availabilityReadySoft,
        border: theme.colors.availabilityReadyBorder,
      };
    case 'warning':
      return {
        accent: theme.colors.warning,
        accentSoft: theme.colors.warningSoft,
        border: theme.colors.warningBorder,
      };
    case 'danger':
      return {
        accent: theme.colors.danger,
        accentSoft: theme.colors.dangerSoft,
        border: theme.colors.dangerBorder,
      };
    case 'muted':
      return {
        accent: theme.colors.textMuted,
        accentSoft: theme.colors.surfaceMuted,
        border: theme.colors.borderSoft,
      };
    default:
      return {
        accent: theme.colors.primaryStrong,
        accentSoft: theme.colors.primarySoft,
        border: theme.colors.primaryBorder,
      };
  }
}
