import type { AppTheme } from '@/constants/app-theme';

type JourneyTone = 'danger' | 'muted' | 'neutral' | 'success' | 'warning';

export function getJourneyTonePalette(tone: JourneyTone, theme: AppTheme) {
  switch (tone) {
    case 'success':
      return {
        accent: theme.colors.availabilityReady,
        accentSoft: theme.colors.availabilityReadySoft,
        border: 'rgba(31, 138, 67, 0.2)',
      };
    case 'warning':
      return {
        accent: theme.colors.warning,
        accentSoft: theme.colors.warningSoft,
        border: 'rgba(139, 100, 66, 0.16)',
      };
    case 'danger':
      return {
        accent: '#8C5D49',
        accentSoft: '#F1E7E2',
        border: 'rgba(140, 93, 73, 0.18)',
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
        border: 'rgba(78, 99, 121, 0.16)',
      };
  }
}
